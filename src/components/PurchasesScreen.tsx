import React, { useState } from 'react';
import {
  PackageCheck,
  Plus,
  Truck,
  Building2,
  Calendar,
  CheckCircle,
  Clock,
  Sparkles,
  Receipt,
  FileText,
} from 'lucide-react';
import { Location, Purchase, RoleId, Supplier, Variant } from '../types';
import { AppStorage } from '../services/storage';
import { InventoryEngine } from '../services/inventoryEngine';
import { formatCurrency, formatDateTime, generateDocNumber } from '../utils/formatters';

interface PurchasesScreenProps {
  currentLocation: Location;
  currentRole: RoleId;
}

export const PurchasesScreen: React.FC<PurchasesScreenProps> = ({
  currentLocation,
  currentRole,
}) => {
  const storage = AppStorage.getInstance();
  const data = storage.getData();
  const engine = new InventoryEngine();

  const [showNewPoModal, setShowNewPoModal] = useState(false);
  const [selectedSupplierId, setSelectedSupplierId] = useState(data.suppliers[0]?.id || '');
  const [invoiceNo, setInvoiceNo] = useState('');
  const [targetLocationId, setTargetLocationId] = useState('LOC-WH');
  const [selectedVariantId, setSelectedVariantId] = useState(data.variants[0]?.id || '');
  const [orderQty, setOrderQty] = useState(40);
  const [unitCost, setUnitCost] = useState(240);
  const [settlementNotice, setSettlementNotice] = useState<string | null>(null);

  const purchases = data.purchases;

  // Handle create and receive PO (which creates FIFO cost lots & triggers auto-settlement)
  const handleCreateAndReceivePo = (e: React.FormEvent) => {
    e.preventDefault();
    setSettlementNotice(null);

    const variant = data.variants.find(v => v.id === selectedVariantId);
    const supplier = data.suppliers.find(s => s.id === selectedSupplierId);
    if (!variant || !supplier) return;

    try {
      const purchaseNo = generateDocNumber('PO-2026', data.nextDocSeq.RCP++);
      const receiptDocNo = generateDocNumber('RCP', data.nextDocSeq.RCP);

      // Post Inbound Receipt Document to FIFO Engine
      const postResult = engine.postDocument({
        type: 'RECEIPT',
        documentNo: receiptDocNo,
        notes: `استلام فاتورة توريد من [${supplier.name}] - فاتورة مورد: ${invoiceNo || 'بدون'}`,
        postedBy: currentRole === 'inventory' ? 'محمود رأفت (أمين المخزن)' : 'مدير النظام',
        lines: [
          {
            variantId: variant.id,
            locationId: targetLocationId,
            qtyDelta: orderQty,
            unitCost,
            costSource: 'PURCHASE_RECEIPT',
          }
        ],
      });

      // Check if auto-settlements happened!
      if (postResult.settlements.length > 0) {
        const totalSettledQty = postResult.settlements.reduce((sum, s) => sum + s.settledQty, 0);
        const totalDiff = postResult.settlements.reduce((sum, s) => sum + s.costDifference, 0);
        setSettlementNotice(
          `تمت تسوية ${totalSettledQty} قطعة من التكاليف المؤقتة السابقة تلقائياً! فروق التكلفة المسواة: ${formatCurrency(totalDiff)} تم ترحيلها إلى COGS.`
        );
      }

      // Record Purchase object
      const newPurchase: Purchase = {
        id: `PO-${Date.now()}`,
        purchaseNo,
        supplierId: supplier.id,
        supplierInvoiceNo: invoiceNo || `INV-${Date.now()}`,
        locationId: targetLocationId,
        status: 'RECEIVED',
        lines: [
          {
            id: `POL-${Date.now()}`,
            variantId: variant.id,
            orderedQty: orderQty,
            receivedQty: orderQty,
            returnedQty: 0,
            unitCost,
          }
        ],
        createdBy: 'أمين المخزن',
        createdAt: new Date().toISOString(),
        receivedAt: new Date().toISOString(),
      };

      data.purchases.push(newPurchase);

      data.auditLogs.push({
        id: `AUD-${Date.now()}`,
        userId: 'inv-01',
        userName: 'أمين المخزن',
        action: 'PURCHASE_RECEIPT',
        entity: 'PURCHASE',
        entityId: purchaseNo,
        after: {
          supplier: supplier.name,
          variant: variant.sku,
          qty: orderQty,
          unitCost,
          settlementsCount: postResult.settlements.length,
        },
        at: new Date().toISOString(),
      });

      storage.save();
      setShowNewPoModal(false);
      setInvoiceNo('');
    } catch (err: any) {
      alert(err.message || 'فشل استلام أمر الشراء');
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-md flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="p-1 rounded-lg bg-emerald-500/10 text-emerald-400">
              <PackageCheck className="w-5 h-5" />
            </span>
            <h2 className="text-xl font-bold text-slate-100">المشتريات واستلام بضاعة الموردين (Purchases & Receipts)</h2>
          </div>
          <p className="text-xs text-slate-400">
            إنشاء لوطات تكلفة FIFO جديدة عند كل إذن استلام معتمد، وإجراء التسوية التلقائية لأي مبيعات سابقة بالسالب.
          </p>
        </div>

        <button
          onClick={() => setShowNewPoModal(true)}
          className="flex items-center gap-2 bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold px-4 py-2.5 rounded-xl text-xs shadow-lg shadow-amber-500/20 transition-all cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>فاتورة شراء واستلام شحنة جديدة</span>
        </button>
      </div>

      {settlementNotice && (
        <div className="p-4 bg-emerald-950/40 border border-emerald-500/40 rounded-2xl text-xs text-emerald-300 flex items-center justify-between shadow-lg">
          <div className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-emerald-400 shrink-0" />
            <span>{settlementNotice}</span>
          </div>
          <button onClick={() => setSettlementNotice(null)} className="text-emerald-400 hover:text-emerald-200">
            ✕
          </button>
        </div>
      )}

      {/* Purchases List */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-sm">
        <div className="p-4 bg-slate-950 border-b border-slate-800 flex items-center justify-between">
          <span className="font-bold text-xs text-slate-200">سجل فواتير التوريد وأذون الاستلام</span>
          <span className="text-xs text-slate-400">عدد العمليات: {purchases.length}</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-right text-xs">
            <thead className="bg-slate-950/80 text-slate-400 border-b border-slate-800">
              <tr>
                <th className="p-3 font-bold">رقم أمر الشراء</th>
                <th className="p-3 font-bold">تاريخ الاستلام</th>
                <th className="p-3 font-bold">المورد / المصنع</th>
                <th className="p-3 font-bold">رقم فاتورة المورد</th>
                <th className="p-3 font-bold">موقع الاستلام</th>
                <th className="p-3 font-bold">الصنف المستلم</th>
                <th className="p-3 font-bold text-center">الكمية</th>
                <th className="p-3 font-bold text-left">تكلفة الوحدة</th>
                <th className="p-3 font-bold text-left">إجمالي الفاتورة</th>
                <th className="p-3 font-bold text-center">الحالة</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800 text-slate-200">
              {purchases.map(po => {
                const supplier = data.suppliers.find(s => s.id === po.supplierId);
                const loc = data.locations.find(l => l.id === po.locationId);
                const line = po.lines[0];
                const variant = data.variants.find(v => v.id === line.variantId);
                const total = line.receivedQty * line.unitCost;

                return (
                  <tr key={po.id} className="hover:bg-slate-800/40 transition-colors">
                    <td className="p-3 font-mono font-bold text-amber-400">
                      {po.purchaseNo}
                    </td>

                    <td className="p-3 text-slate-400 text-[11px]">
                      {formatDateTime(po.receivedAt)}
                    </td>

                    <td className="p-3 font-semibold text-slate-100">
                      {supplier?.name}
                    </td>

                    <td className="p-3 font-mono text-slate-400 text-[11px]">
                      {po.supplierInvoiceNo || '-'}
                    </td>

                    <td className="p-3 text-slate-300">
                      {loc?.nameAr}
                    </td>

                    <td className="p-3 font-mono">
                      {variant?.sku}
                    </td>

                    <td className="p-3 text-center font-mono font-bold text-slate-200">
                      {line.receivedQty} قطعة
                    </td>

                    <td className="p-3 text-left font-mono text-slate-300">
                      {formatCurrency(line.unitCost)}
                    </td>

                    <td className="p-3 text-left font-mono font-bold text-emerald-400">
                      {formatCurrency(total)}
                    </td>

                    <td className="p-3 text-center">
                      <span className="inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                        ✓ تم الاستلام وإيداع اللوط
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* New Purchase Modal */}
      {showNewPoModal && (
        <div className="fixed inset-0 bg-black/75 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <form onSubmit={handleCreateAndReceivePo} className="bg-slate-900 border border-slate-800 rounded-2xl max-w-lg w-full p-6 text-slate-200 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="font-bold text-base text-slate-100 flex items-center gap-2">
                <PackageCheck className="w-5 h-5 text-amber-400" />
                <span>تسجيل فاتورة شراء واستلام لوط تكلفة جديد</span>
              </h3>
              <button type="button" onClick={() => setShowNewPoModal(false)} className="text-slate-400 hover:text-slate-100">
                ✕
              </button>
            </div>

            <div className="grid grid-cols-2 gap-3 text-xs">
              <div className="space-y-1">
                <label className="text-slate-400 font-semibold">المورد / المصنع:</label>
                <select
                  value={selectedSupplierId}
                  onChange={(e) => setSelectedSupplierId(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2 text-slate-100 outline-none"
                >
                  {data.suppliers.map(s => (
                    <option key={s.id} value={s.id}>{s.name}</option>
                  ))}
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-slate-400 font-semibold">موقع الاستلام:</label>
                <select
                  value={targetLocationId}
                  onChange={(e) => setTargetLocationId(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2 text-slate-100 outline-none"
                >
                  {data.locations.filter(l => l.type !== 'IN_TRANSIT').map(l => (
                    <option key={l.id} value={l.id}>{l.nameAr}</option>
                  ))}
                </select>
              </div>

              <div className="col-span-2 space-y-1">
                <label className="text-slate-400 font-semibold">رقم فاتورة المورد (اختياري):</label>
                <input
                  type="text"
                  value={invoiceNo}
                  onChange={(e) => setInvoiceNo(e.target.value)}
                  placeholder="INV-SUP-1234"
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2 text-slate-100 font-mono outline-none"
                />
              </div>

              <div className="col-span-2 space-y-1">
                <label className="text-slate-400 font-semibold">الصنف المستلم (Variant):</label>
                <select
                  value={selectedVariantId}
                  onChange={(e) => setSelectedVariantId(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2 text-slate-100 font-mono text-xs outline-none"
                >
                  {data.variants.map(v => (
                    <option key={v.id} value={v.id}>{v.sku} - {data.models.find(m => m.id === v.modelId)?.nameAr}</option>
                  ))}
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-slate-400 font-semibold">الكمية المستلمة (قطعة):</label>
                <input
                  type="number"
                  required
                  min="1"
                  value={orderQty}
                  onChange={(e) => setOrderQty(parseInt(e.target.value, 10) || 1)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2 text-slate-100 font-mono outline-none"
                />
              </div>

              <div className="space-y-1">
                <label className="text-slate-400 font-semibold">سعر تكلفة الوحدة (ج.م):</label>
                <input
                  type="number"
                  required
                  min="1"
                  value={unitCost}
                  onChange={(e) => setUnitCost(parseFloat(e.target.value) || 0)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2 text-slate-100 font-mono outline-none"
                />
              </div>
            </div>

            <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 text-xs flex justify-between items-center font-mono">
              <span className="text-slate-400">إجمالي استحقاق المورد:</span>
              <span className="font-bold text-amber-400 text-sm">
                {formatCurrency(orderQty * unitCost)}
              </span>
            </div>

            <div className="text-[11px] text-slate-400 bg-slate-950 p-2.5 rounded-lg border border-slate-800">
              ℹ️ سينشئ هذا الإذن لوط تكلفة FIFO جديد بالتاريخ الحالي، وسيقوم تلقائياً بتسوية أي مبيعات سابقة بالسالب لنفس الصنف في هذا الموقع وفق المادة 4.3 من وثيقة المحاسبة.
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowNewPoModal(false)}
                className="px-4 py-2 bg-slate-800 text-slate-300 rounded-xl text-xs font-semibold"
              >
                إلغاء
              </button>
              <button
                type="submit"
                className="px-5 py-2 bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-bold rounded-xl text-xs cursor-pointer"
              >
                تأكيد الاستلام وإنشاء لوط التكلفة
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};
