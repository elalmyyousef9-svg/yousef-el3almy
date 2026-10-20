import React, { useState, useEffect, useRef } from 'react';
import {
  Barcode,
  Printer,
  Copy,
  Layers,
  Search,
  Check,
  History,
  Tag,
  Settings2,
  Sliders,
  Sparkles,
  Zap,
  HelpCircle,
  Eye,
  CheckCircle2,
  AlertTriangle,
  Save,
  Download,
  RotateCcw,
} from 'lucide-react';
import { LabelPrintLog, Variant } from '../types';
import { AppStorage } from '../services/storage';
import { generateCode128Svg } from '../utils/code128';
import { formatCurrency, formatDateTime } from '../utils/formatters';
import { printThermalLabels } from '../utils/printer';
import { GlobalScannerListener, normalizeBarcodeScan } from '../utils/scanner';
import { ScannerTroubleshootModal } from './ScannerTroubleshootModal';
import { PrinterTroubleshootModal } from './PrinterTroubleshootModal';

export const LabelPrintingScreen: React.FC = () => {
  const storage = AppStorage.getInstance();
  const data = storage.getData();

  const [selectedVariantId, setSelectedVariantId] = useState(data.variants[0]?.id || '');
  const [printCopies, setPrintCopies] = useState(4);
  const [searchQuery, setSearchQuery] = useState('');
  const [reprintReason, setReprintReason] = useState('');
  const [showPrintLogs, setShowPrintLogs] = useState(false);
  const [showScannerModal, setShowScannerModal] = useState(false);
  const [showPrinterModal, setShowPrinterModal] = useState(false);

  // --- Barcode Dimension & Tuning Controls ---
  const [labelWidth, setLabelWidth] = useState<number>(data.settings.labelWidthMm || 40);
  const [labelHeight, setLabelHeight] = useState<number>(data.settings.labelHeightMm || 25);
  const [barWidth, setBarWidth] = useState<number>(2.1);      // Module thickness (1.6 to 2.8px)
  const [barHeight, setBarHeight] = useState<number>(52);     // Barcode height (36 to 65px)
  const [quietZone, setQuietZone] = useState<number>(20);     // Left & right white space (12 to 28px)
  const [showPrice, setShowPrice] = useState<boolean>(true);
  const [selectedPreset, setSelectedPreset] = useState<'40x25' | '50x25' | '50x30' | '38x25' | 'custom'>('40x25');
  const [viewScale, setViewScale] = useState<'fit' | 'real'>('fit');
  const [saveSettingsSuccess, setSaveSettingsSuccess] = useState(false);

  // --- Live Barcode Scanner Test State ---
  const [scannedCode, setScannedCode] = useState<string | null>(null);
  const [scanSpeed, setScanSpeed] = useState<number | null>(null);
  const [scanSuccessAnim, setScanSuccessAnim] = useState<boolean>(false);

  const selectedVariant = data.variants.find(v => v.id === selectedVariantId) || data.variants[0];
  const model = data.models.find(m => m.id === selectedVariant?.modelId);
  const color = data.colors.find(c => c.id === selectedVariant?.colorId);
  const size = data.sizes.find(s => s.id === selectedVariant?.sizeId);

  // Play audio beep on successful scanner reading
  const playScanBeep = () => {
    try {
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.connect(gain);
      gain.connect(audioCtx.destination);
      osc.frequency.value = 850;
      osc.start();
      gain.gain.exponentialRampToValueAtTime(0.0001, audioCtx.currentTime + 0.12);
      osc.stop(audioCtx.currentTime + 0.12);
    } catch {}
  };

  // Background scanner listener while on this screen
  useEffect(() => {
    const listener = new GlobalScannerListener();
    listener.start(
      (code) => {
        setScannedCode(code);
        setScanSuccessAnim(true);
        playScanBeep();
        setTimeout(() => setScanSuccessAnim(false), 2500);

        // Auto-select the scanned variant if it exists
        const matched = data.variants.find(v => v.barcode === code || v.sku.toLowerCase() === code.toLowerCase());
        if (matched) {
          setSelectedVariantId(matched.id);
        }
      },
      (_key, interval) => {
        if (interval > 0) setScanSpeed(interval);
      }
    );

    return () => listener.stop();
  }, [data]);

  // Apply preset dimensions
  const applyPreset = (preset: '40x25' | '50x25' | '50x30' | '38x25') => {
    setSelectedPreset(preset);
    if (preset === '40x25') {
      setLabelWidth(40);
      setLabelHeight(25);
      setBarWidth(2.1);
      setBarHeight(52);
      setQuietZone(20);
    } else if (preset === '50x25') {
      // 50x25mm: Wider label allows 2.4x bar width - easiest for 1D optical laser scanners
      setLabelWidth(50);
      setLabelHeight(25);
      setBarWidth(2.4);
      setBarHeight(54);
      setQuietZone(24);
    } else if (preset === '50x30') {
      setLabelWidth(50);
      setLabelHeight(30);
      setBarWidth(2.4);
      setBarHeight(62);
      setQuietZone(24);
    } else if (preset === '38x25') {
      setLabelWidth(38);
      setLabelHeight(25);
      setBarWidth(1.9);
      setBarHeight(48);
      setQuietZone(16);
    }
  };

  // Save current calibrated settings as permanent defaults
  const handleSaveDefaults = () => {
    data.settings.labelWidthMm = labelWidth;
    data.settings.labelHeightMm = labelHeight;
    data.settings.showPriceOnLabel = showPrice;
    storage.save();
    setSaveSettingsSuccess(true);
    setTimeout(() => setSaveSettingsSuccess(false), 3000);
  };

  // Generate SVG Code 128 barcode with exact user-configured dimensions
  const barcodeResult = selectedVariant
    ? generateCode128Svg(selectedVariant.barcode, {
        barWidth,
        height: barHeight,
        showText: false,
        quietZone,
      })
    : null;

  // Filter variants
  const filteredVariants = data.variants.filter(v => {
    const m = data.models.find(mod => mod.id === v.modelId);
    return (
      v.sku.toLowerCase().includes(searchQuery.toLowerCase()) ||
      v.barcode.includes(searchQuery) ||
      m?.nameAr.toLowerCase().includes(searchQuery.toLowerCase())
    );
  });

  // Handle thermal label printing
  const handlePrint = (copiesToPrint: number = printCopies, forcePopup: boolean = false) => {
    if (!selectedVariant || !barcodeResult) return;

    // Check if previously printed to mark as reprint
    const prevPrint = data.labelPrintLogs.find(l => l.variantId === selectedVariant.id);
    const isReprint = !!prevPrint;

    const log: LabelPrintLog = {
      id: `LBL-${Date.now()}`,
      variantId: selectedVariant.id,
      variantSku: selectedVariant.sku,
      variantBarcode: selectedVariant.barcode,
      qty: copiesToPrint,
      isReprint,
      reason: isReprint ? (reprintReason || 'إعادة طباعة ملصق تالف') : 'طباعة استلام بضاعة جديدة',
      printedBy: 'أمين المخزن',
      printedAt: new Date().toISOString(),
    };

    data.labelPrintLogs.unshift(log);
    storage.save();

    printThermalLabels({
      shopName: data.settings.shopName,
      modelName: model?.nameAr || 'موديل ملابس',
      colorName: color?.nameAr || '',
      sizeCode: size?.code || '',
      barcode: selectedVariant.barcode,
      sku: selectedVariant.sku,
      price: selectedVariant.priceOverride || model?.basePrice || 0,
      svgHtml: barcodeResult.svg,
      copies: copiesToPrint,
      labelWidthMm: labelWidth,
      labelHeightMm: labelHeight,
      showPrice,
    }, forcePopup);
  };

  return (
    <div className="space-y-6">
      {/* Header Bar */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-md flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="p-1.5 rounded-xl bg-amber-500/10 text-amber-400">
              <Barcode className="w-6 h-6" />
            </span>
            <h2 className="text-xl font-bold text-slate-100">
              معايرة وطباعة ملصقات الباركود (Barcode Sizing & Label Printing)
            </h2>
          </div>
          <p className="text-xs text-slate-400">
            توليد كود 128 بدقة متناهية (ISO 15417)، تحكم كامل في سُمك وارتفاع الخطوط لضمان قراءة سريعة للاسكانر، ودعم مقاسات 40×25مم و 50×25مم.
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={() => setShowScannerModal(true)}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-semibold cursor-pointer"
          >
            <Zap className="w-4 h-4 text-emerald-400" />
            <span>فحص الاسكانر</span>
          </button>

          <button
            onClick={() => setShowPrinterModal(true)}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-semibold cursor-pointer"
          >
            <Printer className="w-4 h-4 text-cyan-400" />
            <span>فحص الطابعة</span>
          </button>

          <button
            onClick={() => setShowPrintLogs(!showPrintLogs)}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-semibold cursor-pointer"
          >
            <History className="w-4 h-4 text-amber-400" />
            <span>السجل ({data.labelPrintLogs.length})</span>
          </button>
        </div>
      </div>

      {/* Main 2-Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Left Column: Variant Selector & Geometry Sizing Controls */}
        <div className="lg:col-span-5 space-y-5">
          
          {/* Step 1: Variant Selection */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-sm space-y-3">
            <label className="text-xs font-bold text-slate-200 flex items-center gap-1.5">
              <Search className="w-4 h-4 text-amber-400" />
              <span>1. اختيار الصنف المراد طباعة ملصقاته:</span>
            </label>

            <div className="relative">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="ابحث برقم الباركود أو SKU أو اسم الموديل..."
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 pl-9 text-xs text-slate-100 outline-none focus:border-amber-400 transition-colors"
              />
              <Search className="w-4 h-4 text-slate-500 absolute left-3 top-3" />
            </div>

            <div className="max-h-48 overflow-y-auto space-y-1.5 border border-slate-800/80 rounded-xl p-2 bg-slate-950">
              {filteredVariants.map(v => {
                const m = data.models.find(mod => mod.id === v.modelId);
                const c = data.colors.find(col => col.id === v.colorId);
                const s = data.sizes.find(sz => sz.id === v.sizeId);
                const isSelected = v.id === selectedVariantId;

                return (
                  <button
                    key={v.id}
                    onClick={() => setSelectedVariantId(v.id)}
                    className={`w-full text-right p-2.5 rounded-lg text-xs transition-all flex items-center justify-between ${
                      isSelected
                        ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40 font-bold'
                        : 'text-slate-300 hover:bg-slate-900'
                    }`}
                  >
                    <div>
                      <div className="font-mono flex items-center gap-2">
                        <span>{v.sku}</span>
                        <span className="text-[10px] bg-slate-800 px-1.5 py-0.5 rounded text-slate-400 font-normal">
                          {v.barcode}
                        </span>
                      </div>
                      <div className="text-[11px] text-slate-400 mt-0.5">
                        {m?.nameAr} - {c?.nameAr} ({s?.code})
                      </div>
                    </div>
                    {isSelected && <Check className="w-4 h-4 text-amber-400" />}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Step 2: Barcode Size & Sizing Calibration Panel */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-sm space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-2.5">
              <h3 className="font-bold text-xs text-slate-200 flex items-center gap-2">
                <Sliders className="w-4 h-4 text-amber-400" />
                <span>2. ضبط ومعايرة مقاس الباركود لقارئ الاسكانر</span>
              </h3>
              <span className="text-[10px] text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded font-mono font-bold">
                ISO 15417
              </span>
            </div>

            {/* Label Presets Buttons */}
            <div className="space-y-1.5">
              <label className="text-[11px] text-slate-400 font-semibold block">
                مقاس بكرة الملصقات الحرارية الجاهزة:
              </label>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <button
                  type="button"
                  onClick={() => applyPreset('40x25')}
                  className={`p-2 rounded-xl text-center font-bold border transition-all cursor-pointer ${
                    selectedPreset === '40x25'
                      ? 'bg-amber-500/20 text-amber-300 border-amber-500/50 shadow-sm'
                      : 'bg-slate-950 text-slate-400 border-slate-800 hover:text-slate-200'
                  }`}
                >
                  <div>40 × 25 مم</div>
                  <div className="text-[10px] font-normal text-slate-400">القياسي لملابس مصر</div>
                </button>

                <button
                  type="button"
                  onClick={() => applyPreset('50x25')}
                  className={`p-2 rounded-xl text-center font-bold border transition-all cursor-pointer ${
                    selectedPreset === '50x25'
                      ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/50 shadow-sm'
                      : 'bg-slate-950 text-slate-400 border-slate-800 hover:text-slate-200'
                  }`}
                >
                  <div>50 × 25 مم 🌟</div>
                  <div className="text-[10px] font-normal text-emerald-400">الأسهل لقراءة الليزر</div>
                </button>

                <button
                  type="button"
                  onClick={() => applyPreset('50x30')}
                  className={`p-2 rounded-xl text-center font-bold border transition-all cursor-pointer ${
                    selectedPreset === '50x30'
                      ? 'bg-amber-500/20 text-amber-300 border-amber-500/50 shadow-sm'
                      : 'bg-slate-950 text-slate-400 border-slate-800 hover:text-slate-200'
                  }`}
                >
                  <div>50 × 30 مم</div>
                  <div className="text-[10px] font-normal text-slate-400">مقاس كبير للجاكيت</div>
                </button>

                <button
                  type="button"
                  onClick={() => applyPreset('38x25')}
                  className={`p-2 rounded-xl text-center font-bold border transition-all cursor-pointer ${
                    selectedPreset === '38x25'
                      ? 'bg-amber-500/20 text-amber-300 border-amber-500/50 shadow-sm'
                      : 'bg-slate-950 text-slate-400 border-slate-800 hover:text-slate-200'
                  }`}
                >
                  <div>38 × 25 مم</div>
                  <div className="text-[10px] font-normal text-slate-400">طابعات Xprinter مدمجة</div>
                </button>
              </div>
            </div>

            {/* Fine Sizing Controls */}
            <div className="space-y-3 pt-2 border-t border-slate-800 text-xs">
              
              {/* Bar Module Thickness */}
              <div className="space-y-1">
                <div className="flex justify-between items-center">
                  <label className="text-slate-300 font-semibold">
                    سُمك خطوط الباركود (Bar Module Width):
                  </label>
                  <span className="font-mono text-amber-400 font-bold">{barWidth.toFixed(1)} px</span>
                </div>
                <input
                  type="range"
                  min="1.6"
                  max="2.8"
                  step="0.1"
                  value={barWidth}
                  onChange={(e) => {
                    setBarWidth(parseFloat(e.target.value));
                    setSelectedPreset('custom');
                  }}
                  className="w-full accent-amber-500 bg-slate-950"
                />
                <div className="flex justify-between text-[10px] text-slate-500">
                  <span>1.6px (مضغوط)</span>
                  <span className="text-emerald-400">2.1 - 2.4px (المثالي للاسكانر)</span>
                  <span>2.8px (عريض)</span>
                </div>
              </div>

              {/* Barcode Height */}
              <div className="space-y-1">
                <div className="flex justify-between items-center">
                  <label className="text-slate-300 font-semibold">
                    ارتفاع خطوط الباركود (Barcode Height):
                  </label>
                  <span className="font-mono text-amber-400 font-bold">{barHeight} px (~{(barHeight * 0.26).toFixed(1)} مم)</span>
                </div>
                <input
                  type="range"
                  min="36"
                  max="65"
                  step="2"
                  value={barHeight}
                  onChange={(e) => {
                    setBarHeight(parseInt(e.target.value, 10));
                    setSelectedPreset('custom');
                  }}
                  className="w-full accent-amber-500 bg-slate-950"
                />
                <div className="flex justify-between text-[10px] text-slate-500">
                  <span>36px (قصير)</span>
                  <span className="text-emerald-400">52 - 58px (التقاط فوري لشعاع الليزر)</span>
                  <span>65px (مرتفع جداً)</span>
                </div>
              </div>

              {/* Quiet Zone Margins */}
              <div className="space-y-1">
                <div className="flex justify-between items-center">
                  <label className="text-slate-300 font-semibold">
                    المنطقة الهادئة البيضاء (Quiet Zones):
                  </label>
                  <span className="font-mono text-amber-400 font-bold">{quietZone} px</span>
                </div>
                <input
                  type="range"
                  min="12"
                  max="28"
                  step="2"
                  value={quietZone}
                  onChange={(e) => {
                    setQuietZone(parseInt(e.target.value, 10));
                    setSelectedPreset('custom');
                  }}
                  className="w-full accent-amber-500 bg-slate-950"
                />
                <div className="text-[10px] text-slate-500">
                  * مسافة الأمان البيضاء الإلزامية على اليمين واليسار التي يعتمد عليها الاسكانر لمعرفة بداية ونهاية الكود.
                </div>
              </div>

              {/* Toggle Options */}
              <div className="flex items-center justify-between pt-2">
                <label className="text-slate-300 font-semibold cursor-pointer flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={showPrice}
                    onChange={(e) => setShowPrice(e.target.checked)}
                    className="accent-amber-500 rounded"
                  />
                  <span>إظهار سعر البيع على الملصق</span>
                </label>

                <button
                  type="button"
                  onClick={handleSaveDefaults}
                  className="text-xs text-amber-400 hover:text-amber-300 flex items-center gap-1 cursor-pointer font-semibold"
                >
                  <Save className="w-3.5 h-3.5" />
                  <span>حفظ كافتراضي للنظام</span>
                </button>
              </div>

              {saveSettingsSuccess && (
                <div className="p-2 bg-emerald-950/60 border border-emerald-500/40 rounded-lg text-emerald-300 text-[11px] flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                  <span>تم حفظ مقاسات الباركود الافتراضية بنجاح!</span>
                </div>
              )}
            </div>
          </div>

          {/* Step 3: Print Action Card */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-sm space-y-4">
            <h3 className="font-bold text-xs text-slate-200 flex items-center gap-2">
              <Printer className="w-4 h-4 text-amber-400" />
              <span>3. تنفيذ الطباعة على الطابعة الحرارية</span>
            </h3>

            <div className="grid grid-cols-2 gap-3 text-xs">
              <div className="space-y-1">
                <label className="text-slate-400 font-semibold">عدد النسخ:</label>
                <input
                  type="number"
                  min="1"
                  max="500"
                  value={printCopies}
                  onChange={(e) => setPrintCopies(parseInt(e.target.value, 10) || 1)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl p-2 text-center font-mono text-slate-100 font-bold text-sm"
                />
              </div>

              <div className="space-y-1">
                <label className="text-slate-400 font-semibold">سبب إعادة الطباعة:</label>
                <input
                  type="text"
                  value={reprintReason}
                  onChange={(e) => setReprintReason(e.target.value)}
                  placeholder="إذا كان تالفاً أو مفقوداً..."
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl p-2 text-slate-100 text-xs"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
              <button
                type="button"
                onClick={() => handlePrint(printCopies, false)}
                className="py-3 px-4 bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold rounded-xl text-xs shadow-lg shadow-amber-500/20 transition-all cursor-pointer flex items-center justify-center gap-2"
              >
                <Printer className="w-4 h-4" />
                <span>طباعة {printCopies} ملصق مباشرة</span>
              </button>

              <button
                type="button"
                onClick={() => handlePrint(1, false)}
                className="py-3 px-4 bg-slate-800 hover:bg-slate-700 text-amber-400 border border-slate-700 font-bold rounded-xl text-xs transition-all cursor-pointer flex items-center justify-center gap-2"
              >
                <Sparkles className="w-4 h-4" />
                <span>تجربة ملصق واحد (1x Test)</span>
              </button>
            </div>

            <div className="flex items-center justify-between text-[11px] text-slate-400 pt-1">
              <span>طريقة الطباعة: طباعة صامتة فورية (Direct Iframe)</span>
              <button
                type="button"
                onClick={() => handlePrint(printCopies, true)}
                className="text-cyan-400 hover:underline cursor-pointer"
              >
                فتح نافذة طباعة خارجية (Popup)
              </button>
            </div>
          </div>
        </div>

        {/* Right Column: Live Calibrated Label Preview & Real-Time Scanner Reader Radar */}
        <div className="lg:col-span-7 space-y-5">
          
          {/* Real-time Scanner Radar / Verification Target */}
          <div className={`p-5 rounded-2xl border transition-all text-center space-y-3 ${
            scanSuccessAnim
              ? 'bg-emerald-950/40 border-emerald-500 text-emerald-200 ring-2 ring-emerald-500/50'
              : 'bg-slate-900 border-slate-800'
          }`}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className={`p-2 rounded-xl ${scanSuccessAnim ? 'bg-emerald-500/30 text-emerald-400' : 'bg-amber-500/20 text-amber-400'}`}>
                  <Zap className="w-5 h-5" />
                </span>
                <div className="text-right">
                  <h4 className="font-bold text-xs text-slate-100">
                    رادار فحص الاسكانر المباشر (Scanner Live Test Target)
                  </h4>
                  <p className="text-[11px] text-slate-400">
                    وجّه قارئ الباركود واضغط الزناد نحو الباركود أدناه لتتأكد من سهولة القراءة
                  </p>
                </div>
              </div>

              {scannedCode && (
                <span className="text-[11px] font-mono px-2.5 py-1 rounded-full bg-emerald-500/20 text-emerald-300 font-bold border border-emerald-500/30">
                  ✅ تم التقاط إشارة الاسكانر
                </span>
              )}
            </div>

            {scannedCode && (
              <div className="p-3 bg-slate-950 rounded-xl border border-emerald-500/40 font-mono text-xs space-y-1 text-right">
                <div className="flex justify-between items-center">
                  <span className="text-slate-400">الكود المقروء:</span>
                  <strong className="text-emerald-400 text-sm tracking-wider">{scannedCode}</strong>
                </div>
                {scanSpeed && (
                  <div className="flex justify-between text-[11px] text-slate-400">
                    <span>سرعة النقل:</span>
                    <span>{scanSpeed} مللي ثانية (سرعة عتاد الاسكانر الفائقة)</span>
                  </div>
                )}
                {selectedVariant && selectedVariant.barcode === scannedCode && (
                  <div className="text-emerald-300 font-bold pt-1 border-t border-slate-800">
                    🎉 تطابق مثالي 100%! الأبعاد والتباين جاهزان للطباعة في المحل.
                  </div>
                )}
              </div>
            )}
          </div>

          {/* High-Fidelity Label Preview (Blueprint Specs) */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-sm space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <Tag className="w-4 h-4 text-amber-400" />
                <h3 className="font-bold text-xs text-slate-200">
                  معاينة الملصق الحراري (Thermal Label Preview - {labelWidth} × {labelHeight} مم)
                </h3>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setViewScale(viewScale === 'fit' ? 'real' : 'fit')}
                  className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-[11px] font-semibold flex items-center gap-1 cursor-pointer"
                >
                  <Eye className="w-3.5 h-3.5 text-amber-400" />
                  <span>{viewScale === 'fit' ? 'عرض الحجم الفعلي 1:1' : 'عرض مكبر للوضوح'}</span>
                </button>
              </div>
            </div>

            {/* Label Display Card */}
            <div className="flex flex-col items-center justify-center py-8 bg-slate-950 rounded-xl border border-slate-800 min-h-[300px]">
              {selectedVariant && barcodeResult ? (
                <div className="space-y-4 flex flex-col items-center">
                  
                  {/* Sticker Mockup */}
                  <div
                    className={`bg-white text-slate-950 rounded-lg shadow-2xl flex flex-col justify-between select-none border-2 border-slate-300 font-sans transition-all relative ${
                      viewScale === 'real'
                        ? 'p-2'
                        : 'w-[320px] min-h-[200px] p-4'
                    }`}
                    style={{
                      direction: 'rtl',
                      width: viewScale === 'real' ? `${labelWidth * 3.78}px` : undefined,
                      height: viewScale === 'real' ? `${labelHeight * 3.78}px` : undefined,
                    }}
                  >
                    {/* Corner Tag */}
                    <span className="absolute -top-3 -right-3 bg-amber-500 text-slate-950 text-[10px] font-bold px-2 py-0.5 rounded-full shadow">
                      {labelWidth}×{labelHeight}mm
                    </span>

                    {/* Shop Name & Model Title */}
                    <div className="text-center">
                      <div className="text-[11px] font-bold tracking-tight text-slate-900 leading-tight">
                        {data.settings.shopName}
                      </div>
                      <div className="text-[12px] font-extrabold text-slate-950 mt-0.5 truncate leading-tight">
                        {model?.nameAr} — {color?.nameAr} {size?.code}
                      </div>
                    </div>

                    {/* Crisp Vector SVG Barcode */}
                    <div
                      className="flex items-center justify-center my-1.5 overflow-hidden"
                      dangerouslySetInnerHTML={{ __html: barcodeResult.svg }}
                    />

                    {/* Digits & Price Footer */}
                    <div className="flex items-center justify-between text-[11px] font-mono px-1 border-t-2 border-slate-900 pt-1">
                      <span className="font-extrabold tracking-wider text-slate-950 text-[12px]">
                        {selectedVariant.barcode}
                      </span>
                      {showPrice ? (
                        <span className="font-black text-[13px] text-slate-950">
                          {formatCurrency(selectedVariant.priceOverride || model?.basePrice || 0)}
                        </span>
                      ) : (
                        <span className="font-bold text-slate-700 text-[10px]">
                          {selectedVariant.sku}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Calibration details info */}
                  <div className="text-[11px] text-slate-400 text-center space-y-1">
                    <div>
                      عرض الموديول: <strong className="text-amber-400 font-mono">{barWidth}px</strong> | ارتفاع الخطوط: <strong className="text-amber-400 font-mono">{barHeight}px</strong> | المنطقة الهادئة: <strong className="text-amber-400 font-mono">{quietZone}px</strong>
                    </div>
                    <div className="text-slate-500 text-[10px]">
                      مصفوفة التشفير: Code 128 Subset C (للأرقام) لضمان سُمك خطوط مزدوج يتيح للاسكانر القراءة من زاوية واسعة ومسافة 15 سم.
                    </div>
                  </div>
                </div>
              ) : null}
            </div>

            {/* Quick Scanner Troubleshooting Checklist Box */}
            <div className="p-4 bg-slate-950 rounded-xl border border-slate-800 space-y-2 text-xs">
              <div className="flex items-center justify-between">
                <span className="font-bold text-slate-200 flex items-center gap-1.5">
                  <AlertTriangle className="w-4 h-4 text-amber-400" />
                  <span>إرشادات عملية إذا كان الاسكانر لا يقرأ:</span>
                </span>
                <button
                  type="button"
                  onClick={() => setShowScannerModal(true)}
                  className="text-amber-400 hover:underline font-semibold"
                >
                  فتح دليل التشخيص الكامل
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-[11px] text-slate-400">
                <div className="p-2 rounded-lg bg-slate-900/60 border border-slate-800">
                  <strong className="text-slate-200 block mb-0.5">1. المسح من الشاشة vs الورق:</strong>
                  أجهزة ليزر 1D لا تقرأ شاشات اللابتوب الزجاجية. اطبع ملصقاً تجريبياً واقرأه بالليزر، أو استخدم كاميرا 2D.
                </div>
                <div className="p-2 rounded-lg bg-slate-900/60 border border-slate-800">
                  <strong className="text-slate-200 block mb-0.5">2. لغة لوحة المفاتيح:</strong>
                  تأكد أن لغة الكيبورد في ويندوز مضبوطة على الإنجليزية (EN) لتفادي تشويه أرقام الباركود.
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Audit Log Modal */}
      {showPrintLogs && (
        <div className="fixed inset-0 bg-black/75 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-2xl w-full p-6 text-slate-200 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="font-bold text-sm text-slate-100 flex items-center gap-2">
                <History className="w-5 h-5 text-amber-400" />
                <span>سجل طباعة وإعادة طباعة الملصقات (Label Print Audit Log)</span>
              </h3>
              <button onClick={() => setShowPrintLogs(false)} className="text-slate-400 hover:text-slate-100">
                ✕
              </button>
            </div>

            <div className="overflow-x-auto max-h-72 border border-slate-800 rounded-xl">
              <table className="w-full text-right text-xs">
                <thead className="bg-slate-950 text-slate-400 border-b border-slate-800">
                  <tr>
                    <th className="p-2.5 font-bold">وقت الطباعة</th>
                    <th className="p-2.5 font-bold">الصنف (SKU)</th>
                    <th className="p-2.5 font-bold text-center">الكمية</th>
                    <th className="p-2.5 font-bold text-center">النوع</th>
                    <th className="p-2.5 font-bold">السبب الموثق</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800 text-slate-300">
                  {data.labelPrintLogs.map(log => (
                    <tr key={log.id} className="hover:bg-slate-800/30">
                      <td className="p-2.5 text-slate-400 font-mono text-[11px]">{formatDateTime(log.printedAt)}</td>
                      <td className="p-2.5 font-mono font-bold text-amber-400">{log.variantSku}</td>
                      <td className="p-2.5 text-center font-mono">{log.qty}</td>
                      <td className="p-2.5 text-center">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          log.isReprint ? 'bg-amber-500/20 text-amber-300' : 'bg-slate-800 text-slate-400'
                        }`}>
                          {log.isReprint ? 'إعادة طباعة (Reprint)' : 'أصلية'}
                        </span>
                      </td>
                      <td className="p-2.5 text-slate-400">{log.reason || '-'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="flex justify-end pt-2">
              <button
                onClick={() => setShowPrintLogs(false)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-semibold cursor-pointer"
              >
                إغلاق
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Troubleshoot Modals */}
      <ScannerTroubleshootModal
        isOpen={showScannerModal}
        onClose={() => setShowScannerModal(false)}
      />

      <PrinterTroubleshootModal
        isOpen={showPrinterModal}
        onClose={() => setShowPrinterModal(false)}
      />
    </div>
  );
};
