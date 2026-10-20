import React, { useState, useRef, useEffect } from 'react';
import {
  Barcode,
  CreditCard,
  DollarSign,
  Plus,
  Minus,
  Trash2,
  Printer,
  CheckCircle,
  AlertCircle,
  ShieldAlert,
  Search,
  ShoppingCart,
  Receipt as ReceiptIcon,
  X,
  Wallet,
} from 'lucide-react';
import { Location, RoleId, Variant, ClothingModel, Color, Size, Sale } from '../types';
import { AppStorage } from '../services/storage';
import { InventoryEngine } from '../services/inventoryEngine';
import { formatCurrency, generateDocNumber, round2 } from '../utils/formatters';
import { printThermalReceipt } from '../utils/printer';
import { GlobalScannerListener, normalizeBarcodeScan } from '../utils/scanner';
import { ScannerTroubleshootModal } from './ScannerTroubleshootModal';

interface PosCartItem {
  variant: Variant;
  model: ClothingModel;
  color: Color;
  size: Size;
  qty: number;
  unitPrice: number;
  availableOnHand: number;
  lineDiscount: number;
}

interface PosScreenProps {
  currentLocation: Location;
  currentRole: RoleId;
}

export const PosScreen: React.FC<PosScreenProps> = ({
  currentLocation,
  currentRole,
}) => {
  const storage = AppStorage.getInstance();
  const engine = new InventoryEngine();
  const data = storage.getData();

  const [scanInput, setScanInput] = useState('');
  const [cart, setCart] = useState<PosCartItem[]>([]);
  const [discountTotal, setDiscountTotal] = useState(0);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Modals
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<'CASH' | 'CARD' | 'WALLET'>('CASH');
  const [receivedCash, setReceivedCash] = useState<number>(0);
  const [lastCompletedSale, setLastCompletedSale] = useState<Sale | null>(null);

  // Negative Stock Override Modal
  const [showNegativeModal, setShowNegativeModal] = useState(false);
  const [negativeItem, setNegativeItem] = useState<{ variant: Variant; requested: number; available: number } | null>(null);
  const [negativeReason, setNegativeReason] = useState('');
  const [showScannerTroubleshoot, setShowScannerTroubleshoot] = useState(false);

  const scanInputRef = useRef<HTMLInputElement>(null);

  // Keep input focused automatically
  useEffect(() => {
    if (!showPaymentModal && !showNegativeModal && !lastCompletedSale && !showScannerTroubleshoot) {
      scanInputRef.current?.focus();
    }
  }, [showPaymentModal, showNegativeModal, lastCompletedSale, showScannerTroubleshoot, cart]);

  // Global background barcode scanner listener
  // Allows the handheld scanner to work even when focus is accidentally lost!
  useEffect(() => {
    if (showPaymentModal || showNegativeModal || showScannerTroubleshoot) return;

    const listener = new GlobalScannerListener();
    listener.start((rawCode) => {
      processScannedCode(rawCode);
    });

    return () => listener.stop();
  }, [showPaymentModal, showNegativeModal, showScannerTroubleshoot, cart, currentLocation, currentRole]);

  // Global keyboard shortcuts (F2 pay, Esc cancel)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'F2') {
        e.preventDefault();
        if (cart.length > 0) {
          setShowPaymentModal(true);
        }
      } else if (e.key === 'Escape') {
        if (showPaymentModal) setShowPaymentModal(false);
        if (showNegativeModal) setShowNegativeModal(false);
        if (lastCompletedSale) setLastCompletedSale(null);
        if (showScannerTroubleshoot) setShowScannerTroubleshoot(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [cart, showPaymentModal, showNegativeModal, lastCompletedSale, showScannerTroubleshoot]);

  // Play short beep sound using Web Audio API for fast feedback
  const playBeep = (freq: number = 600, duration: number = 0.1) => {
    try {
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.connect(gain);
      gain.connect(audioCtx.destination);
      osc.frequency.value = freq;
      osc.start();
      gain.gain.exponentialRampToValueAtTime(0.0001, audioCtx.currentTime + duration);
      osc.stop(audioCtx.currentTime + duration);
    } catch {}
  };

  const findVariantData = (barcodeOrSku: string) => {
    const trimmed = normalizeBarcodeScan(barcodeOrSku);
    const v = data.variants.find(
      item => item.barcode === trimmed || item.sku.toLowerCase() === trimmed.toLowerCase()
    );
    if (!v) return null;

    const m = data.models.find(model => model.id === v.modelId);
    const c = data.colors.find(col => col.id === v.colorId);
    const s = data.sizes.find(sz => sz.id === v.sizeId);

    if (!m || !c || !s) return null;
    return { variant: v, model: m, color: c, size: s };
  };

  // Unified barcode processing function with Arabic layout normalization
  const processScannedCode = (inputString: string) => {
    setErrorMessage(null);
    setSuccessMessage(null);

    // Normalize from Arabic keyboard layout / Hindi digits if typed in AR mode
    const raw = normalizeBarcodeScan(inputString);
    if (!raw) return;

    // Support N*barcode pattern (e.g. 3*200000001001)
    let qty = 1;
    let code = raw;
    if (raw.includes('*')) {
      const parts = raw.split('*');
      const parsedQty = parseInt(parts[0], 10);
      if (!isNaN(parsedQty) && parsedQty > 0) {
        qty = parsedQty;
        code = parts[1].trim();
      }
    }

    const itemData = findVariantData(code);
    if (!itemData) {
      playBeep(250, 0.25); // low error beep
      setErrorMessage(`الباركود ده مش موجود [${code}]`);
      setScanInput('');
      return;
    }

    const { variant, model, color, size } = itemData;
    const balance = engine.getBalance(variant.id, currentLocation.id);
    const currentInCart = cart.find(ci => ci.variant.id === variant.id)?.qty || 0;
    const requestedTotal = currentInCart + qty;

    // Check stock availability
    if (balance.onHand < requestedTotal) {
      playBeep(350, 0.2);
      // If user has allow_negative or admin/supervisor
      const canOverride = currentRole === 'admin' || currentRole === 'supervisor';
      if (canOverride) {
        setNegativeItem({
          variant,
          requested: requestedTotal,
          available: balance.onHand,
        });
        setShowNegativeModal(true);
      } else {
        setErrorMessage(
          `رصيد غير كافٍ للصنف ${variant.sku}. المتاح حالياً: ${balance.onHand} قطعة فقط. (يتطلب موافقة المشرف)`
        );
      }
      setScanInput('');
      return;
    }

    // Add to cart
    playBeep(900, 0.08); // high pleasant scan beep
    addItemToCart(variant, model, color, size, qty, balance.onHand);
    setScanInput('');
  };

  // Handle barcode submit from form input
  const handleScanSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    processScannedCode(scanInput);
  };

  const addItemToCart = (
    variant: Variant,
    model: ClothingModel,
    color: Color,
    size: Size,
    qty: number,
    availableOnHand: number
  ) => {
    setCart(prev => {
      const existingIdx = prev.findIndex(item => item.variant.id === variant.id);
      const price = variant.priceOverride || model.basePrice;

      if (existingIdx >= 0) {
        const updated = [...prev];
        updated[existingIdx].qty += qty;
        return updated;
      } else {
        return [...prev, {
          variant,
          model,
          color,
          size,
          qty,
          unitPrice: price,
          availableOnHand,
          lineDiscount: 0,
        }];
      }
    });
  };

  const updateCartQty = (variantId: string, newQty: number) => {
    if (newQty <= 0) {
      removeCartItem(variantId);
      return;
    }
    const item = cart.find(c => c.variant.id === variantId);
    if (item && newQty > item.availableOnHand && currentRole !== 'admin' && currentRole !== 'supervisor') {
      setErrorMessage(`لا يمكنك تجاوز الرصيد المتاح (${item.availableOnHand} قطعة) دون إذن المشرف`);
      return;
    }
    setCart(prev => prev.map(c => c.variant.id === variantId ? { ...c, qty: newQty } : c));
  };

  const removeCartItem = (variantId: string) => {
    setCart(prev => prev.filter(c => c.variant.id !== variantId));
  };

  const subtotal = round2(cart.reduce((sum, item) => sum + (item.qty * item.unitPrice) - item.lineDiscount, 0));
  const finalTotal = Math.max(0, round2(subtotal - discountTotal));

  const handlePrintReceipt = (sale: Sale) => {
    const loc = data.locations.find(l => l.id === sale.locationId);
    printThermalReceipt({
      shopName: data.settings.shopName,
      branchName: loc?.nameAr || 'الفرع الرئيسي',
      invoiceNo: sale.invoiceNo,
      cashierName: sale.cashierName,
      dateStr: new Date(sale.postedAt).toLocaleDateString('ar-EG'),
      items: sale.lines.map(l => {
        const v = data.variants.find(item => item.id === l.variantId);
        const m = data.models.find(model => model.id === v?.modelId);
        return {
          sku: v?.sku || l.variantId,
          name: m?.nameAr || 'صنف ملابس',
          qty: l.qty,
          price: l.unitPrice,
          total: l.qty * l.unitPrice,
        };
      }),
      subtotal: sale.subtotal,
      discount: sale.discount,
      total: sale.total,
      paymentMethod: sale.payments[0]?.method === 'CASH' ? 'نقدي (Cash)' :
                     sale.payments[0]?.method === 'CARD' ? 'فيزا / بطاقة' : 'محفظة إلكترونية',
      receiptHeader: data.settings.receiptHeader,
      receiptFooter: data.settings.receiptFooter,
    });
  };

  // Process checkout & post document to FIFO inventory engine
  const handleCompleteSale = () => {
    try {
      if (cart.length === 0) return;

      const invoiceNo = generateDocNumber('INV', data.nextDocSeq.INV++);
      const cashierName = currentRole === 'cashier' ? 'أحمد سامي (الكاشير)' : 'مدير النظام';

      // Prepare lines for inventory engine
      const lines = cart.map(item => ({
        variantId: item.variant.id,
        locationId: currentLocation.id,
        qtyDelta: -item.qty, // outbound sale
      }));

      // Check if any line causes negative stock
      const hasNegative = cart.some(item => item.qty > item.availableOnHand);

      const postResult = engine.postDocument({
        type: 'SALE',
        documentNo: invoiceNo,
        notes: hasNegative ? `بيع استثنائي بالسالب: ${negativeReason || 'موافقة المشرف'}` : 'مبيعات الكاشير',
        negativeOverride: hasNegative,
        overrideReason: hasNegative ? (negativeReason || 'موافقة المشرف') : undefined,
        overrideApprovedBy: hasNegative ? 'مشرف الوردية' : undefined,
        postedBy: cashierName,
        lines,
      });

      // Calculate FIFO COGS from allocations
      const cogsTotal = round2(
        postResult.allocations.reduce((sum, a) => sum + a.value, 0)
      );

      // Record Sale
      const newSale: Sale = {
        id: `SALE-${Date.now()}`,
        invoiceNo,
        locationId: currentLocation.id,
        status: 'POSTED',
        customerName: 'عميل نقدي',
        subtotal,
        discount: discountTotal,
        total: finalTotal,
        cogsTotal,
        cashierId: 'cashier-01',
        cashierName,
        payments: [{
          id: `PAY-${Date.now()}`,
          method: paymentMethod,
          amount: finalTotal,
        }],
        lines: cart.map(item => ({
          id: `SL-${Date.now()}-${item.variant.id}`,
          variantId: item.variant.id,
          qty: item.qty,
          unitPrice: item.unitPrice,
          lineDiscount: item.lineDiscount,
          returnedQty: 0,
          costTotal: round2(item.qty * (item.variant.priceOverride || item.model.basePrice) * 0.5), // approximate line cost
        })),
        postedAt: new Date().toISOString(),
        negativeOverride: hasNegative,
        overrideReason: negativeReason,
      };

      data.sales.push(newSale);

      // Add audit log
      data.auditLogs.push({
        id: `AUD-${Date.now()}`,
        userId: 'cashier-01',
        userName: cashierName,
        action: 'SALE_POSTED',
        entity: 'SALE',
        entityId: invoiceNo,
        after: { total: finalTotal, itemsCount: cart.length, hasNegative },
        at: new Date().toISOString(),
      });

      storage.save();

      // Show receipt
      setLastCompletedSale(newSale);
      setShowPaymentModal(false);
      setCart([]);
      setDiscountTotal(0);
      setNegativeReason('');
      setSuccessMessage(`تم تسجيل الفاتورة بنجاح: ${invoiceNo}`);
      playBeep(1200, 0.15);
    } catch (err: any) {
      setErrorMessage(err.message || 'حدث خطأ أثناء حفظ الفاتورة');
    }
  };

  return (
    <div className="h-[calc(100vh-80px)] flex flex-col lg:flex-row gap-4">
      {/* Left / Main POS Panel */}
      <div className="flex-1 flex flex-col bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-lg">
        {/* Top Scanner Bar */}
        <div className="p-4 bg-slate-950 border-b border-slate-800">
          <form onSubmit={handleScanSubmit} className="flex gap-2">
            <div className="relative flex-1">
              <input
                ref={scanInputRef}
                type="text"
                value={scanInput}
                onChange={(e) => setScanInput(e.target.value)}
                placeholder="امسح الباركود بجهاز المسح أو اكتب الكود واضغط Enter (يمكن استخدام N* للكميات مثل 3*200000001001)..."
                className="w-full bg-slate-900 border-2 border-amber-500/50 focus:border-amber-400 rounded-xl px-4 py-3 pl-10 text-slate-100 placeholder:text-slate-500 outline-none font-mono text-sm shadow-inner transition-all"
                autoComplete="off"
              />
              <Barcode className="w-5 h-5 text-amber-400 absolute left-3 top-3.5" />
            </div>

            <button
              type="submit"
              className="bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold px-6 py-3 rounded-xl text-sm transition-colors cursor-pointer shrink-0 shadow-md flex items-center gap-1.5"
            >
              <span>إضافة</span>
              <Plus className="w-4 h-4" />
            </button>

            <button
              type="button"
              onClick={() => setShowScannerTroubleshoot(true)}
              className="bg-slate-800 hover:bg-slate-700 text-amber-300 font-bold px-3 py-3 rounded-xl text-xs border border-amber-500/30 shrink-0 flex items-center gap-1.5 cursor-pointer"
              title="مساعد تشخيص واختبار الاسكانر"
            >
              <Barcode className="w-4 h-4 text-amber-400" />
              <span>فحص الاسكانر</span>
            </button>
          </form>

          {/* Inline alert messages */}
          {errorMessage && (
            <div className="mt-2.5 p-2.5 bg-rose-950/60 border border-rose-500/40 rounded-xl text-xs text-rose-300 flex items-center justify-between animate-shake">
              <div className="flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
                <span>{errorMessage}</span>
              </div>
              <button onClick={() => setErrorMessage(null)} className="text-rose-400 hover:text-rose-200">
                ✕
              </button>
            </div>
          )}

          {successMessage && (
            <div className="mt-2.5 p-2.5 bg-emerald-950/60 border border-emerald-500/40 rounded-xl text-xs text-emerald-300 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>{successMessage}</span>
              </div>
              <button onClick={() => setSuccessMessage(null)} className="text-emerald-400 hover:text-emerald-200">
                ✕
              </button>
            </div>
          )}
        </div>

        {/* Cart Items Table */}
        <div className="flex-1 overflow-y-auto p-4">
          {cart.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-slate-500 space-y-3">
              <div className="p-4 bg-slate-950 rounded-2xl border border-slate-800">
                <ShoppingCart className="w-12 h-12 text-slate-600" />
              </div>
              <div className="text-center">
                <h4 className="font-bold text-slate-400 text-sm">سلة المبيعات فارغة</h4>
                <p className="text-xs text-slate-500 mt-1 max-w-sm">
                  استخدم قارئ الباركود أو اكتب كود الصنف / الباركود أعلاه لإضافة الملابس إلى الفاتورة فوراً.
                </p>
              </div>
            </div>
          ) : (
            <div className="space-y-2">
              <div className="grid grid-cols-12 text-[11px] font-bold text-slate-400 px-3 py-1.5 border-b border-slate-800">
                <span className="col-span-5">الصنف (الموديل - اللون - المقاس)</span>
                <span className="col-span-2 text-center">الكمية</span>
                <span className="col-span-2 text-left">سعر الوحدة</span>
                <span className="col-span-2 text-left">الإجمالي</span>
                <span className="col-span-1 text-center">حذف</span>
              </div>

              {cart.map((item) => {
                const isShortage = item.qty > item.availableOnHand;
                const lineTotal = round2(item.qty * item.unitPrice - item.lineDiscount);

                return (
                  <div
                    key={item.variant.id}
                    className={`grid grid-cols-12 items-center p-3 rounded-xl border transition-all ${
                      isShortage
                        ? 'bg-rose-950/20 border-rose-500/40'
                        : 'bg-slate-950/70 border-slate-800 hover:border-slate-700'
                    }`}
                  >
                    {/* Item info */}
                    <div className="col-span-5">
                      <div className="font-semibold text-xs text-slate-100">{item.model.nameAr}</div>
                      <div className="flex items-center gap-2 text-[11px] text-slate-400 mt-0.5">
                        <span className="font-mono text-amber-400">{item.variant.sku}</span>
                        <span>•</span>
                        <span>{item.color.nameAr}</span>
                        <span>•</span>
                        <span className="font-bold text-slate-300">{item.size.code}</span>
                      </div>
                      {isShortage && (
                        <span className="inline-block text-[10px] text-rose-400 font-medium mt-1">
                          ⚠️ بيع استثنائي بالسالب (المتاح: {item.availableOnHand})
                        </span>
                      )}
                    </div>

                    {/* Qty controls */}
                    <div className="col-span-2 flex items-center justify-center gap-1.5">
                      <button
                        onClick={() => updateCartQty(item.variant.id, item.qty - 1)}
                        className="p-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs"
                      >
                        <Minus className="w-3.5 h-3.5" />
                      </button>
                      <input
                        type="number"
                        min="1"
                        value={item.qty}
                        onChange={(e) => updateCartQty(item.variant.id, parseInt(e.target.value, 10) || 1)}
                        className="w-12 text-center bg-slate-900 border border-slate-700 rounded text-xs py-0.5 font-mono text-slate-100 outline-none"
                      />
                      <button
                        onClick={() => updateCartQty(item.variant.id, item.qty + 1)}
                        className="p-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs"
                      >
                        <Plus className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    {/* Unit price */}
                    <div className="col-span-2 text-left font-mono text-xs text-slate-300">
                      {formatCurrency(item.unitPrice)}
                    </div>

                    {/* Line total */}
                    <div className="col-span-2 text-left font-mono text-xs font-bold text-amber-400">
                      {formatCurrency(lineTotal)}
                    </div>

                    {/* Delete */}
                    <div className="col-span-1 text-center">
                      <button
                        onClick={() => removeCartItem(item.variant.id)}
                        className="text-slate-500 hover:text-rose-400 transition-colors p-1"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Bottom Fast Action Bar */}
        <div className="p-4 bg-slate-950 border-t border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-4 text-xs text-slate-400">
            <span className="flex items-center gap-1">
              <kbd className="px-1.5 py-0.5 rounded bg-slate-800 text-amber-400 font-mono text-[10px]">F2</kbd>
              <span>دفع وإنهاء</span>
            </span>
            <span className="flex items-center gap-1">
              <kbd className="px-1.5 py-0.5 rounded bg-slate-800 text-slate-300 font-mono text-[10px]">Esc</kbd>
              <span>إلغاء</span>
            </span>
            <span className="flex items-center gap-1">
              <kbd className="px-1.5 py-0.5 rounded bg-slate-800 text-slate-300 font-mono text-[10px]">N*</kbd>
              <span>مضاعفة الكمية</span>
            </span>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => setCart([])}
              disabled={cart.length === 0}
              className="px-3 py-2 rounded-xl text-xs text-slate-400 hover:text-rose-400 hover:bg-slate-900 transition-colors disabled:opacity-40"
            >
              مسح السلة
            </button>

            <button
              onClick={() => setShowPaymentModal(true)}
              disabled={cart.length === 0}
              className="flex items-center gap-2 bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700 disabled:opacity-40 text-slate-950 font-bold px-6 py-2.5 rounded-xl text-sm shadow-lg shadow-emerald-500/20 transition-all cursor-pointer"
            >
              <span>دفع الفاتورة [F2]</span>
              <span className="font-mono bg-slate-950/20 px-2 py-0.5 rounded text-xs font-bold">
                {formatCurrency(finalTotal)}
              </span>
            </button>
          </div>
        </div>
      </div>

      {/* Right / Cart Totals and Quick Items Sidebar */}
      <div className="w-full lg:w-80 flex flex-col gap-4">
        {/* Totals Summary Card */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-lg space-y-4">
          <h3 className="font-bold text-sm text-slate-200 border-b border-slate-800 pb-2 flex items-center justify-between">
            <span>ملخص الحساب</span>
            <span className="text-xs text-slate-400 font-normal">{cart.length} أصناف</span>
          </h3>

          <div className="space-y-2 text-xs">
            <div className="flex justify-between text-slate-400">
              <span>المجموع الفرعي:</span>
              <span className="font-mono text-slate-200">{formatCurrency(subtotal)}</span>
            </div>

            <div className="flex items-center justify-between text-slate-400">
              <span>خصم إضافي:</span>
              <div className="flex items-center gap-1">
                <input
                  type="number"
                  min="0"
                  max={subtotal}
                  value={discountTotal}
                  onChange={(e) => setDiscountTotal(parseFloat(e.target.value) || 0)}
                  className="w-20 text-left bg-slate-950 border border-slate-700 rounded px-2 py-0.5 font-mono text-xs text-amber-400"
                />
                <span>ج.م</span>
              </div>
            </div>

            <div className="pt-2 border-t border-slate-800 flex justify-between items-center text-sm">
              <span className="font-bold text-slate-100">الصافي للدفع:</span>
              <span className="font-mono text-lg font-extrabold text-amber-400">
                {formatCurrency(finalTotal)}
              </span>
            </div>
          </div>
        </div>

        {/* Popular Fast-Pick Items for Quick Checkout */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-lg flex-1 overflow-y-auto space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="font-bold text-xs text-slate-300">أصناف سريعة (Fast-Pick)</h4>
            <span className="text-[10px] text-slate-500">نقرة واحدة للإضافة</span>
          </div>

          <div className="grid grid-cols-1 gap-2">
            {data.variants.slice(0, 6).map(v => {
              const model = data.models.find(m => m.id === v.modelId);
              const color = data.colors.find(c => c.id === v.colorId);
              const size = data.sizes.find(s => s.id === v.sizeId);
              const balance = engine.getBalance(v.id, currentLocation.id);
              if (!model || !color || !size) return null;

              return (
                <button
                  key={v.id}
                  onClick={() => {
                    handleScanSubmit({ preventDefault: () => {} } as any);
                    addItemToCart(v, model, color, size, 1, balance.onHand);
                  }}
                  className="p-2.5 rounded-xl bg-slate-950 hover:bg-slate-800/80 border border-slate-800 hover:border-amber-500/40 text-right transition-all group flex items-center justify-between"
                >
                  <div>
                    <div className="text-xs font-semibold text-slate-200 group-hover:text-amber-400 transition-colors">
                      {model.nameAr}
                    </div>
                    <div className="text-[10px] text-slate-400 font-mono">
                      {v.sku} ({color.nameAr} / {size.code})
                    </div>
                  </div>
                  <div className="text-left font-mono">
                    <div className="text-xs font-bold text-slate-200">{formatCurrency(model.basePrice)}</div>
                    <div className={`text-[10px] ${balance.onHand > 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                      {balance.onHand} متاح
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Payment Dialog Modal */}
      {showPaymentModal && (
        <div className="fixed inset-0 bg-black/75 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-md w-full p-6 text-slate-200 shadow-2xl space-y-5">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="font-bold text-base text-slate-100 flex items-center gap-2">
                <DollarSign className="w-5 h-5 text-emerald-400" />
                <span>إتمام عملية الدفع</span>
              </h3>
              <button onClick={() => setShowPaymentModal(false)} className="text-slate-400 hover:text-slate-100">
                ✕
              </button>
            </div>

            {/* Total Display */}
            <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 text-center">
              <span className="text-xs text-slate-400">إجمالي المبلغ المطلوب</span>
              <div className="text-2xl font-mono font-extrabold text-amber-400 mt-1">
                {formatCurrency(finalTotal)}
              </div>
            </div>

            {/* Payment Method Selector */}
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => setPaymentMethod('CASH')}
                className={`py-3 px-2 rounded-xl text-xs font-bold flex flex-col items-center gap-1.5 border transition-all ${
                  paymentMethod === 'CASH'
                    ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500'
                    : 'bg-slate-950 text-slate-400 border-slate-800 hover:border-slate-700'
                }`}
              >
                <DollarSign className="w-5 h-5" />
                <span>نقدي (Cash)</span>
              </button>

              <button
                type="button"
                onClick={() => setPaymentMethod('CARD')}
                className={`py-3 px-2 rounded-xl text-xs font-bold flex flex-col items-center gap-1.5 border transition-all ${
                  paymentMethod === 'CARD'
                    ? 'bg-indigo-500/20 text-indigo-300 border-indigo-500'
                    : 'bg-slate-950 text-slate-400 border-slate-800 hover:border-slate-700'
                }`}
              >
                <CreditCard className="w-5 h-5" />
                <span>فيزا / نقاط بيع</span>
              </button>

              <button
                type="button"
                onClick={() => setPaymentMethod('WALLET')}
                className={`py-3 px-2 rounded-xl text-xs font-bold flex flex-col items-center gap-1.5 border transition-all ${
                  paymentMethod === 'WALLET'
                    ? 'bg-purple-500/20 text-purple-300 border-purple-500'
                    : 'bg-slate-950 text-slate-400 border-slate-800 hover:border-slate-700'
                }`}
              >
                <Wallet className="w-5 h-5" />
                <span>محفظة / انستاباي</span>
              </button>
            </div>

            {/* Cash fast buttons */}
            {paymentMethod === 'CASH' && (
              <div className="space-y-2">
                <span className="text-xs text-slate-400">أزرار النقدية السريعة:</span>
                <div className="grid grid-cols-4 gap-2">
                  {[finalTotal, 200, 500, 1000].map((amt, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => setReceivedCash(amt)}
                      className="py-1.5 bg-slate-950 hover:bg-slate-800 border border-slate-700 rounded-lg text-xs font-mono text-slate-200 transition-colors"
                    >
                      {amt} ج.م
                    </button>
                  ))}
                </div>

                {receivedCash > finalTotal && (
                  <div className="p-2.5 bg-slate-950 rounded-lg border border-slate-800 flex justify-between items-center text-xs">
                    <span className="text-slate-400">المتبقي للعميل (الفكة):</span>
                    <span className="font-mono text-emerald-400 font-bold">
                      {formatCurrency(receivedCash - finalTotal)}
                    </span>
                  </div>
                )}
              </div>
            )}

            <div className="pt-2 flex gap-3">
              <button
                type="button"
                onClick={() => setShowPaymentModal(false)}
                className="flex-1 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-semibold transition-colors"
              >
                رجوع
              </button>
              <button
                type="button"
                onClick={handleCompleteSale}
                className="flex-1 py-2.5 bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-bold rounded-xl text-xs shadow-lg shadow-emerald-500/20 transition-all flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <CheckCircle className="w-4 h-4" />
                <span>تأكيد وطباعة الإيصال</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Negative Stock Supervisor Override Modal (06 §4.3) */}
      {showNegativeModal && negativeItem && (
        <div className="fixed inset-0 bg-black/75 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-rose-500/40 rounded-2xl max-w-md w-full p-6 text-slate-200 shadow-2xl space-y-4">
            <div className="flex items-center gap-3 border-b border-slate-800 pb-3">
              <div className="p-2 bg-rose-500/20 text-rose-400 rounded-xl">
                <ShieldAlert className="w-6 h-6" />
              </div>
              <div>
                <h3 className="font-bold text-sm text-slate-100">إذن بيع استثنائي بالسالب (Negative Stock)</h3>
                <p className="text-[11px] text-slate-400">وفق المادة 4.3 من وثيقة المحاسبة</p>
              </div>
            </div>

            <p className="text-xs text-rose-300 leading-relaxed">
              الرصيد المتاح للصنف <strong>{negativeItem.variant.sku}</strong> هو <strong>{negativeItem.available} قطعة</strong> فقط.
              المطلوب بيعه: <strong>{negativeItem.requested} قطعة</strong>.
            </p>

            <div className="space-y-1">
              <label className="text-xs text-slate-300 font-semibold">سبب السماح بالبيع بالسالب (إلزامي للتدقيق):</label>
              <textarea
                value={negativeReason}
                onChange={(e) => setNegativeReason(e.target.value)}
                rows={2}
                placeholder="مثال: البضاعة وصلت فعلياً في الصباح وجارٍ تسجيل إذن الاستلام في النظام..."
                className="w-full bg-slate-950 border border-slate-700 rounded-xl p-2.5 text-xs text-slate-100 placeholder:text-slate-500 outline-none focus:border-amber-400"
              />
            </div>

            <div className="text-[11px] text-slate-400 bg-slate-950 p-2.5 rounded-lg border border-slate-800">
              ℹ️ سيتم تقييد العجز بتكلفة تقديرية مؤقتة (Last Cost)، وسيقوم النظام بتسويتها تلقائياً إلى تكلفة البضاعة المباعة COGS فور وصول الشحنة.
            </div>

            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={() => {
                  setShowNegativeModal(false);
                  setNegativeItem(null);
                }}
                className="flex-1 py-2 bg-slate-800 text-slate-300 rounded-xl text-xs font-semibold"
              >
                إلغاء
              </button>
              <button
                type="button"
                disabled={!negativeReason.trim()}
                onClick={() => {
                  const m = data.models.find(mod => mod.id === negativeItem.variant.modelId)!;
                  const c = data.colors.find(col => col.id === negativeItem.variant.colorId)!;
                  const s = data.sizes.find(sz => sz.id === negativeItem.variant.sizeId)!;
                  addItemToCart(negativeItem.variant, m, c, s, negativeItem.requested, negativeItem.available);
                  setShowNegativeModal(false);
                  setNegativeItem(null);
                }}
                className="flex-1 py-2 bg-rose-500 hover:bg-rose-600 disabled:opacity-40 text-slate-950 font-bold rounded-xl text-xs transition-colors cursor-pointer"
              >
                اعتماد البيع بالسالب
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 80mm Thermal Receipt Dialog (Docs 08 & 10) */}
      {lastCompletedSale && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-sm w-full p-5 text-slate-200 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-2">
              <h3 className="font-bold text-sm text-slate-100 flex items-center gap-2">
                <ReceiptIcon className="w-4 h-4 text-amber-400" />
                <span>إيصال حراري (80mm)</span>
              </h3>
              <button onClick={() => setLastCompletedSale(null)} className="text-slate-400 hover:text-slate-100">
                ✕
              </button>
            </div>

            {/* Receipt Preview box in thermal styling */}
            <div className="bg-white text-slate-950 p-4 rounded-lg font-mono text-[11px] space-y-2 border border-slate-300 shadow-inner select-text">
              <div className="text-center font-bold text-xs pb-1 border-b border-dashed border-slate-400">
                <div>{data.settings.shopName}</div>
                <div className="text-[10px] text-slate-600 mt-0.5">{currentLocation.nameAr}</div>
              </div>

              <div className="flex justify-between text-[10px] text-slate-700">
                <span>فاتورة: {lastCompletedSale.invoiceNo}</span>
                <span>{new Date(lastCompletedSale.postedAt).toLocaleDateString('ar-EG')}</span>
              </div>
              <div className="text-[10px] text-slate-700">
                الكاشير: {lastCompletedSale.cashierName}
              </div>

              <div className="border-t border-b border-dashed border-slate-400 py-1 space-y-1">
                {lastCompletedSale.lines.map((l, i) => {
                  const v = data.variants.find(item => item.id === l.variantId);
                  return (
                    <div key={i} className="flex justify-between text-[10px]">
                      <span>{v?.sku} × {l.qty}</span>
                      <span>{formatCurrency(l.qty * l.unitPrice)}</span>
                    </div>
                  );
                })}
              </div>

              <div className="space-y-0.5 text-[10px]">
                <div className="flex justify-between">
                  <span>المجموع:</span>
                  <span>{formatCurrency(lastCompletedSale.subtotal)}</span>
                </div>
                {lastCompletedSale.discount > 0 && (
                  <div className="flex justify-between text-rose-600">
                    <span>الخصم:</span>
                    <span>-{formatCurrency(lastCompletedSale.discount)}</span>
                  </div>
                )}
                <div className="flex justify-between font-bold text-xs pt-1 border-t border-slate-300">
                  <span>الصافي:</span>
                  <span>{formatCurrency(lastCompletedSale.total)}</span>
                </div>
              </div>

              <div className="text-center text-[9px] text-slate-600 pt-2 border-t border-dashed border-slate-400">
                {data.settings.receiptFooter}
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => handlePrintReceipt(lastCompletedSale)}
                  className="flex-1 py-2.5 bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold rounded-xl text-xs flex items-center justify-center gap-1.5 cursor-pointer shadow-md"
                >
                  <Printer className="w-4 h-4" />
                  <span>طباعة الإيصال الفوري (80mm)</span>
                </button>
                <button
                  type="button"
                  onClick={() => setLastCompletedSale(null)}
                  className="px-4 py-2.5 bg-slate-800 text-slate-300 hover:bg-slate-700 rounded-xl text-xs font-semibold"
                >
                  فاتورة جديدة
                </button>
              </div>
              <div className="text-[10px] text-center text-slate-400">
                إذا لم تستجب الطابعة، تأكد من السماح بالنوافذ المنبثقة (Pop-ups) بالمتصفح.
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Scanner Troubleshoot and Test Modal */}
      <ScannerTroubleshootModal
        isOpen={showScannerTroubleshoot}
        onClose={() => setShowScannerTroubleshoot(false)}
        onTestBarcodeScanned={(code) => processScannedCode(code)}
      />
    </div>
  );
};
