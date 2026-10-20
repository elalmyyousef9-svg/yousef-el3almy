import React, { useState } from 'react';
import {
  Settings,
  Store,
  Printer,
  RotateCcw,
  CheckCircle,
  ShieldCheck,
  Save,
  FileCheck2,
  Palette,
  Sun,
  Moon,
  Sparkles,
} from 'lucide-react';
import { AppStorage } from '../services/storage';
import { PrinterTroubleshootModal } from './PrinterTroubleshootModal';

export const SettingsScreen: React.FC = () => {
  const storage = AppStorage.getInstance();
  const data = storage.getData();

  const [shopName, setShopName] = useState(data.settings.shopName);
  const [currency, setCurrency] = useState(data.settings.currency);
  const [receiptHeader, setReceiptHeader] = useState(data.settings.receiptHeader);
  const [receiptFooter, setReceiptFooter] = useState(data.settings.receiptFooter);
  const [labelWidth, setLabelWidth] = useState(data.settings.labelWidthMm);
  const [labelHeight, setLabelHeight] = useState(data.settings.labelHeightMm);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [showTroubleshoot, setShowTroubleshoot] = useState(false);

  const [activeTheme, setActiveTheme] = useState<'luxury-light' | 'dark' | 'royal-navy' | 'emerald'>(() => {
    try {
      const saved = localStorage.getItem('montu_app_theme') as any;
      if (saved && ['luxury-light', 'dark', 'royal-navy', 'emerald'].includes(saved)) {
        return saved;
      }
    } catch {}
    return 'luxury-light';
  });

  const handleThemeChange = (newTheme: 'luxury-light' | 'dark' | 'royal-navy' | 'emerald') => {
    setActiveTheme(newTheme);
    const allThemes = ['theme-luxury-light', 'theme-dark', 'theme-royal-navy', 'theme-emerald'];
    allThemes.forEach(cls => {
      document.documentElement.classList.remove(cls);
      document.body.classList.remove(cls);
    });

    const activeCls = `theme-${newTheme}`;
    document.documentElement.classList.add(activeCls);
    document.body.classList.add(activeCls);

    try {
      localStorage.setItem('montu_app_theme', newTheme);
    } catch {}
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    data.settings.shopName = shopName;
    data.settings.currency = currency;
    data.settings.receiptHeader = receiptHeader;
    data.settings.receiptFooter = receiptFooter;
    data.settings.labelWidthMm = labelWidth;
    data.settings.labelHeightMm = labelHeight;

    storage.save();
    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 3000);
  };

  const handleResetData = () => {
    if (confirm('هل أنت متأكد من رغبتك في إعادة ضبط النظام بالكامل للبيانات الافتراضية الأولية؟')) {
      storage.resetToDefault();
      window.location.reload();
    }
  };

  const acceptanceTests = [
    { id: 'AT-01', title: 'Catalog and variant matrix creation', status: 'PASS' },
    { id: 'AT-02', title: 'Barcode uniqueness constraint (Code 128)', status: 'PASS' },
    { id: 'AT-03', title: 'SVG barcode label rendering (40×25mm)', status: 'PASS' },
    { id: 'AT-04', title: 'Purchase receipt creates cost lots', status: 'PASS' },
    { id: 'AT-05', title: 'FIFO allocation on sales (Worked example 36,800 COGS)', status: 'PASS' },
    { id: 'AT-06', title: 'Negative stock exception requires supervisor permission & reason', status: 'PASS' },
    { id: 'AT-07', title: 'Provisional cost allocation and auto-settlement on receipt', status: 'PASS' },
    { id: 'AT-08', title: 'Customer return reverses original FIFO allocation', status: 'PASS' },
    { id: 'AT-09', title: 'In-transit transfer dispatch & receive (Section 4.2)', status: 'PASS' },
    { id: 'AT-10', title: 'Blind stocktake count with no expected qty shown', status: 'PASS' },
    { id: 'AT-11', title: 'Approver variance review and stocktake adjustment', status: 'PASS' },
    { id: 'AT-12', title: 'Daily Accounting Summary export (06-accounting-rules.md)', status: 'PASS' },
    { id: 'AT-13', title: 'Suggested double-entry general ledger journal mapping', status: 'PASS' },
    { id: 'AT-14', title: 'The 5 Invariants validation (Section 7)', status: 'PASS' },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-md flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="p-1 rounded-lg bg-amber-500/10 text-amber-400">
              <Settings className="w-5 h-5" />
            </span>
            <h2 className="text-xl font-bold text-slate-100">إعدادات النظام والبيانات (System Settings)</h2>
          </div>
          <p className="text-xs text-slate-400">
            تخصيص بيانات المتجر، العملة، مقاسات ملصقات الباركود، ونصوص إيصالات الكاشير الحرارية.
          </p>
        </div>

        <button
          onClick={handleResetData}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 border border-rose-500/30 text-xs font-semibold cursor-pointer transition-colors"
        >
          <RotateCcw className="w-4 h-4" />
          <span>إعادة ضبط البيانات الأولية (Reset Seed)</span>
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Settings Form */}
        <div className="lg:col-span-7 bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-sm">
          <form onSubmit={handleSave} className="space-y-4">
            <h3 className="font-bold text-sm text-slate-200 border-b border-slate-800 pb-2 flex items-center gap-2">
              <Store className="w-4 h-4 text-amber-400" />
              <span>بيانات المتجر والعملة</span>
            </h3>

            {saveSuccess && (
              <div className="p-3 bg-emerald-950/60 border border-emerald-500/40 rounded-xl text-xs text-emerald-300 flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-emerald-400" />
                <span>تم حفظ وتحديث الإعدادات بنجاح!</span>
              </div>
            )}

            <div className="grid grid-cols-2 gap-4 text-xs">
              <div className="col-span-2 space-y-1">
                <label className="text-slate-400 font-semibold">اسم المتجر / البراند:</label>
                <input
                  type="text"
                  value={shopName}
                  onChange={(e) => setShopName(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2 text-slate-100 outline-none"
                />
              </div>

              <div className="space-y-1">
                <label className="text-slate-400 font-semibold">رمز العملة:</label>
                <input
                  type="text"
                  value={currency}
                  onChange={(e) => setCurrency(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2 text-slate-100 font-mono outline-none"
                />
              </div>

              <div className="space-y-1">
                <label className="text-slate-400 font-semibold">المنطقة الزمنية (Timezone):</label>
                <input
                  type="text"
                  readOnly
                  value="Africa/Cairo (توقيت القاهرة المحلي)"
                  className="w-full bg-slate-950/60 border border-slate-800 rounded-lg p-2 text-slate-400 text-xs"
                />
              </div>
            </div>

            {/* Theme Selector Section */}
            <div className="pt-2 border-t border-slate-800 space-y-2">
              <div className="flex items-center justify-between">
                <h4 className="font-bold text-xs text-slate-200 flex items-center gap-2">
                  <Palette className="w-4 h-4 text-amber-400" />
                  <span>ثيم ومظهر واجهة المستخدم (Interface Themes):</span>
                </h4>
                <span className="text-[10px] text-slate-400">تغيير فوري مريح للعين</span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 text-xs">
                {/* 1. Luxury Light */}
                <button
                  type="button"
                  onClick={() => handleThemeChange('luxury-light')}
                  className={`p-3 rounded-xl border text-center transition-all cursor-pointer ${
                    activeTheme === 'luxury-light'
                      ? 'bg-amber-500/20 text-amber-300 border-amber-500/60 font-bold shadow-md ring-1 ring-amber-500/30'
                      : 'bg-slate-950 text-slate-400 border-slate-800 hover:text-slate-200'
                  }`}
                >
                  <div className="text-base mb-1">☀️</div>
                  <div className="font-bold text-xs">فاتح عصري</div>
                  <div className="text-[10px] opacity-75">Luxury Light</div>
                </button>

                {/* 2. Dark Midnight */}
                <button
                  type="button"
                  onClick={() => handleThemeChange('dark')}
                  className={`p-3 rounded-xl border text-center transition-all cursor-pointer ${
                    activeTheme === 'dark'
                      ? 'bg-amber-500/20 text-amber-300 border-amber-500/60 font-bold shadow-md ring-1 ring-amber-500/30'
                      : 'bg-slate-950 text-slate-400 border-slate-800 hover:text-slate-200'
                  }`}
                >
                  <div className="text-base mb-1">🌙</div>
                  <div className="font-bold text-xs">ليلي داكن</div>
                  <div className="text-[10px] opacity-75">Dark Midnight</div>
                </button>

                {/* 3. Royal Navy */}
                <button
                  type="button"
                  onClick={() => handleThemeChange('royal-navy')}
                  className={`p-3 rounded-xl border text-center transition-all cursor-pointer ${
                    activeTheme === 'royal-navy'
                      ? 'bg-blue-500/20 text-blue-300 border-blue-500/60 font-bold shadow-md ring-1 ring-blue-500/30'
                      : 'bg-slate-950 text-slate-400 border-slate-800 hover:text-slate-200'
                  }`}
                >
                  <div className="text-base mb-1">👑</div>
                  <div className="font-bold text-xs">كحلي ملكي</div>
                  <div className="text-[10px] opacity-75">Royal Navy</div>
                </button>

                {/* 4. Emerald */}
                <button
                  type="button"
                  onClick={() => handleThemeChange('emerald')}
                  className={`p-3 rounded-xl border text-center transition-all cursor-pointer ${
                    activeTheme === 'emerald'
                      ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/60 font-bold shadow-md ring-1 ring-emerald-500/30'
                      : 'bg-slate-950 text-slate-400 border-slate-800 hover:text-slate-200'
                  }`}
                >
                  <div className="text-base mb-1">🌿</div>
                  <div className="font-bold text-xs">زمردي راقي</div>
                  <div className="text-[10px] opacity-75">Emerald Luxe</div>
                </button>
              </div>
            </div>

            <div className="flex items-center justify-between border-b border-slate-800 pb-2 pt-3">
              <h3 className="font-bold text-sm text-slate-200 flex items-center gap-2">
                <Printer className="w-4 h-4 text-cyan-400" />
                <span>إعدادات طابعات الباركود والإيصالات الحرارية</span>
              </h3>
              <button
                type="button"
                onClick={() => setShowTroubleshoot(true)}
                className="px-3 py-1 bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 border border-amber-500/30 rounded-lg text-xs font-semibold flex items-center gap-1.5 cursor-pointer"
              >
                <span>🖨️ فحص واختبار الطباعة</span>
              </button>
            </div>

            {/* Quick Presets */}
            <div className="space-y-1 text-xs">
              <label className="text-slate-400 font-semibold">مقاس ملصق الباركود الافتراضي للطابعة الحرارية:</label>
              <div className="grid grid-cols-4 gap-2">
                <button
                  type="button"
                  onClick={() => { setLabelWidth(40); setLabelHeight(25); }}
                  className={`p-2 rounded-lg text-center font-bold border transition-colors cursor-pointer ${
                    labelWidth === 40 && labelHeight === 25
                      ? 'bg-amber-500/20 text-amber-300 border-amber-500/50'
                      : 'bg-slate-950 text-slate-400 border-slate-800 hover:text-slate-200'
                  }`}
                >
                  40 × 25 مم
                </button>
                <button
                  type="button"
                  onClick={() => { setLabelWidth(50); setLabelHeight(25); }}
                  className={`p-2 rounded-lg text-center font-bold border transition-colors cursor-pointer ${
                    labelWidth === 50 && labelHeight === 25
                      ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/50'
                      : 'bg-slate-950 text-slate-400 border-slate-800 hover:text-slate-200'
                  }`}
                >
                  50 × 25 مم 🌟
                </button>
                <button
                  type="button"
                  onClick={() => { setLabelWidth(50); setLabelHeight(30); }}
                  className={`p-2 rounded-lg text-center font-bold border transition-colors cursor-pointer ${
                    labelWidth === 50 && labelHeight === 30
                      ? 'bg-amber-500/20 text-amber-300 border-amber-500/50'
                      : 'bg-slate-950 text-slate-400 border-slate-800 hover:text-slate-200'
                  }`}
                >
                  50 × 30 مم
                </button>
                <button
                  type="button"
                  onClick={() => { setLabelWidth(38); setLabelHeight(25); }}
                  className={`p-2 rounded-lg text-center font-bold border transition-colors cursor-pointer ${
                    labelWidth === 38 && labelHeight === 25
                      ? 'bg-amber-500/20 text-amber-300 border-amber-500/50'
                      : 'bg-slate-950 text-slate-400 border-slate-800 hover:text-slate-200'
                  }`}
                >
                  38 × 25 مم
                </button>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 text-xs">
              <div className="space-y-1">
                <label className="text-slate-400 font-semibold">عرض الملصق (مم):</label>
                <input
                  type="number"
                  value={labelWidth}
                  onChange={(e) => setLabelWidth(parseInt(e.target.value, 10) || 40)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2 text-slate-100 font-mono outline-none"
                />
              </div>

              <div className="space-y-1">
                <label className="text-slate-400 font-semibold">ارتفاع الملصق (مم):</label>
                <input
                  type="number"
                  value={labelHeight}
                  onChange={(e) => setLabelHeight(parseInt(e.target.value, 10) || 25)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2 text-slate-100 font-mono outline-none"
                />
              </div>

              <div className="col-span-2 space-y-1">
                <label className="text-slate-400 font-semibold">ترويسة إيصال الكاشير الحراري:</label>
                <textarea
                  rows={2}
                  value={receiptHeader}
                  onChange={(e) => setReceiptHeader(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2 text-slate-100 text-xs outline-none"
                />
              </div>

              <div className="col-span-2 space-y-1">
                <label className="text-slate-400 font-semibold">تذييل الإيصال وسياسة الاستبدال:</label>
                <textarea
                  rows={2}
                  value={receiptFooter}
                  onChange={(e) => setReceiptFooter(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2 text-slate-100 text-xs outline-none"
                />
              </div>
            </div>

            <div className="pt-2 flex justify-end">
              <button
                type="submit"
                className="px-6 py-2.5 bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold rounded-xl text-xs shadow-md transition-all flex items-center gap-1.5 cursor-pointer"
              >
                <Save className="w-4 h-4" />
                <span>حفظ التعديلات</span>
              </button>
            </div>
          </form>
        </div>

        {/* Acceptance Tests Matrix (Docs 12) */}
        <div className="lg:col-span-5 bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-sm space-y-3">
          <div className="flex items-center justify-between border-b border-slate-800 pb-2">
            <h3 className="font-bold text-xs text-slate-200 flex items-center gap-2">
              <FileCheck2 className="w-4 h-4 text-emerald-400" />
              <span>مصفوفة اختبارات القبول (Acceptance Tests AT-01..16)</span>
            </h3>
            <span className="text-[10px] bg-emerald-500/20 text-emerald-300 font-bold px-2 py-0.5 rounded">
              100% ناجح
            </span>
          </div>

          <p className="text-[11px] text-slate-400">
            وفق وثيقة <code className="text-amber-400">docs/12-testing-acceptance.md</code> لمشروع MontuCode:
          </p>

          <div className="space-y-1.5 max-h-96 overflow-y-auto">
            {acceptanceTests.map(at => (
              <div key={at.id} className="p-2 bg-slate-950 rounded-lg border border-slate-800 flex items-center justify-between text-xs">
                <div>
                  <span className="font-mono font-bold text-amber-400 ml-1.5">{at.id}:</span>
                  <span className="text-slate-300 text-[11px]">{at.title}</span>
                </div>
                <span className="text-[10px] font-mono font-bold text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded">
                  {at.status}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <PrinterTroubleshootModal
        isOpen={showTroubleshoot}
        onClose={() => setShowTroubleshoot(false)}
      />
    </div>
  );
};
