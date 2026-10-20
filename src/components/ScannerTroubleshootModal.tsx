import React, { useState, useEffect } from 'react';
import {
  Barcode,
  CheckCircle,
  AlertCircle,
  HelpCircle,
  Sparkles,
  Zap,
  Layers,
  X,
  Play,
  Monitor,
  FileText,
  Keyboard,
  Info,
} from 'lucide-react';
import { AppStorage } from '../services/storage';
import { generateCode128Svg } from '../utils/code128';
import { GlobalScannerListener, normalizeBarcodeScan } from '../utils/scanner';
import { formatCurrency } from '../utils/formatters';

interface ScannerTroubleshootModalProps {
  isOpen: boolean;
  onClose: () => void;
  onTestBarcodeScanned?: (barcode: string) => void;
}

export const ScannerTroubleshootModal: React.FC<ScannerTroubleshootModalProps> = ({
  isOpen,
  onClose,
  onTestBarcodeScanned,
}) => {
  const data = AppStorage.getInstance().getData();
  const [lastScanned, setLastScanned] = useState<string | null>(null);
  const [lastRawKey, setLastRawKey] = useState<string>('');
  const [keystrokeSpeed, setKeystrokeSpeed] = useState<number | null>(null);
  const [activeTab, setActiveTab] = useState<'live-test' | 'causes'>('live-test');
  const [matchedVariant, setMatchedVariant] = useState<any>(null);

  // Global listener while modal is open
  useEffect(() => {
    if (!isOpen) return;

    const listener = new GlobalScannerListener();
    listener.start(
      (scannedCode) => {
        setLastScanned(scannedCode);
        const v = data.variants.find(
          item => item.barcode === scannedCode || item.sku.toLowerCase() === scannedCode.toLowerCase()
        );
        if (v) {
          const m = data.models.find(mod => mod.id === v.modelId);
          const c = data.colors.find(col => col.id === v.colorId);
          const s = data.sizes.find(sz => sz.id === v.sizeId);
          setMatchedVariant({ variant: v, model: m, color: c, size: s });
        } else {
          setMatchedVariant(null);
        }
        if (onTestBarcodeScanned) {
          onTestBarcodeScanned(scannedCode);
        }
      },
      (key, interval) => {
        setLastRawKey(key);
        if (interval > 0) {
          setKeystrokeSpeed(interval);
        }
      }
    );

    return () => listener.stop();
  }, [isOpen, data, onTestBarcodeScanned]);

  if (!isOpen) return null;

  // Test sample barcode
  const sampleVariant = data.variants[0];
  const sampleModel = data.models.find(m => m.id === sampleVariant.modelId);
  const sampleSvg = generateCode128Svg(sampleVariant.barcode, {
    barWidth: 2.2,
    height: 56,
    showText: true,
    quietZone: 20,
  });

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-2xl w-full p-6 text-slate-200 shadow-2xl space-y-5">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-amber-500/20 text-amber-400">
              <Barcode className="w-6 h-6" />
            </div>
            <div>
              <h3 className="font-bold text-base text-slate-100">
                فاحص ومساعد قارئ الباركود (Barcode Scanner Diagnostic)
              </h3>
              <p className="text-xs text-slate-400">
                تشخيص فوري لسبب عدم قراءة الاسكانر للباركود مع اختبار حي للموجات والمفاتيح
              </p>
            </div>
          </div>

          <button onClick={onClose} className="text-slate-400 hover:text-slate-100 p-1">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab switch */}
        <div className="flex items-center gap-2 border-b border-slate-800 pb-1 text-xs">
          <button
            onClick={() => setActiveTab('live-test')}
            className={`px-3 py-1.5 rounded-xl font-bold transition-all ${
              activeTab === 'live-test'
                ? 'bg-amber-500 text-slate-950'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            🟢 شاشة الاختبار الحي (وجّه الاسكانر الآن)
          </button>
          <button
            onClick={() => setActiveTab('causes')}
            className={`px-3 py-1.5 rounded-xl font-bold transition-all ${
              activeTab === 'causes'
                ? 'bg-amber-500 text-slate-950'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            📋 أسباب عدم القراءة وحلولها العملية
          </button>
        </div>

        {activeTab === 'live-test' && (
          <div className="space-y-4">
            {/* Live Scan Radar Box */}
            <div className={`p-5 rounded-2xl border transition-all text-center space-y-3 ${
              lastScanned
                ? 'bg-emerald-950/30 border-emerald-500/50 text-emerald-200'
                : 'bg-slate-950 border-amber-500/30 animate-pulse'
            }`}>
              <div className="flex justify-center">
                <span className={`p-3 rounded-2xl ${lastScanned ? 'bg-emerald-500/20 text-emerald-400' : 'bg-amber-500/20 text-amber-400'}`}>
                  <Zap className="w-8 h-8" />
                </span>
              </div>

              <div>
                <h4 className="font-bold text-sm text-slate-100">
                  {lastScanned ? 'تم التقاط إشارة الاسكانر بنجاح!' : 'الاسكانر في وضع الاستعداد... اضغط على زر الاسكانر الآن'}
                </h4>
                <p className="text-xs text-slate-400 mt-1">
                  قم بتوجيه قارئ الباركود واضغط على الزناد نحو الباركود التجريبي بالأسفل
                </p>
              </div>

              {lastScanned && (
                <div className="p-3 bg-slate-900 rounded-xl border border-emerald-500/40 font-mono text-xs space-y-1 text-right">
                  <div className="flex justify-between">
                    <span className="text-slate-400">الكود المستلم:</span>
                    <strong className="text-emerald-400 text-sm">{lastScanned}</strong>
                  </div>
                  {keystrokeSpeed && (
                    <div className="flex justify-between text-[11px] text-slate-400">
                      <span>سرعة الإدخال:</span>
                      <span>{keystrokeSpeed} مللي ثانية (سرعة عتاد الاسكانر الفائقة)</span>
                    </div>
                  )}
                  {matchedVariant ? (
                    <div className="pt-1 border-t border-slate-800 text-slate-200 text-xs">
                      الصنف المطابق: <strong className="text-amber-400">{matchedVariant.model?.nameAr}</strong> ({matchedVariant.variant.sku}) - السعر: {formatCurrency(matchedVariant.model?.basePrice)}
                    </div>
                  ) : (
                    <div className="text-rose-400 text-[11px] pt-1">
                      ⚠️ الاسكانر أرسل الكود بنجاح ولكن هذا الباركود غير مسجل في كتالوج الأصناف.
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Test Sample Barcode for Scanning */}
            <div className="p-4 bg-slate-950 rounded-xl border border-slate-800 space-y-2 text-center">
              <span className="text-xs text-slate-300 font-semibold block">
                باركود تجريبي عالي الدقة (يمكنك مسحه بكاميرا الاسكانر من الشاشة أو تجربه):
              </span>

              <div
                className="flex justify-center p-3 bg-white rounded-lg border border-slate-300 overflow-hidden max-w-sm mx-auto shadow-inner"
                dangerouslySetInnerHTML={{ __html: sampleSvg.svg }}
              />

              <div className="flex justify-center gap-2 pt-1">
                <button
                  onClick={() => {
                    setLastScanned(sampleVariant.barcode);
                    setMatchedVariant({
                      variant: sampleVariant,
                      model: sampleModel,
                      color: data.colors[0],
                      size: data.sizes[0],
                    });
                  }}
                  className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-amber-400 text-xs font-semibold flex items-center gap-1.5 cursor-pointer"
                >
                  <Play className="w-3.5 h-3.5" />
                  <span>محاكاة مسح ضوئي تجريبي (Test Scan)</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'causes' && (
          <div className="space-y-3 max-h-[380px] overflow-y-auto text-xs">
            {/* Cause 1: 1D Laser vs Screen Reflection */}
            <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 space-y-1">
              <div className="flex items-center gap-2 font-bold text-amber-400">
                <Monitor className="w-4 h-4" />
                <span>1. هل تمسح الباركود من شاشة الكمبيوتر / الموبايل؟ (أهم سبب)</span>
              </div>
              <p className="text-slate-300 pr-6 leading-relaxed">
                معظم أجهزة الاسكانر الشائعة في المحلات هي من نوع <strong>1D Laser (شعاع ليزر أحمر خطي)</strong>. هذا النوع <strong>لا يستطيع إطلاقاً قراءة الباركود المعروض على شاشات الزجاج أو الموبايل أو اللابتوب</strong> بسبب الانعكاس الضوئي لشاشة الكريستال!
              </p>
              <div className="text-emerald-400 pr-6 font-semibold mt-1">
                💡 الحل: اطبع ملصق الباركود على ورقة أو كرتونة واقرأه، أو استخدم اسكانر 2D Imager (كاميرا).
              </div>
            </div>

            {/* Cause 2: Keyboard Language layout */}
            <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 space-y-1">
              <div className="flex items-center gap-2 font-bold text-amber-400">
                <Keyboard className="w-4 h-4" />
                <span>2. لغة لوحة المفاتيح في نظام ويندوز (عربي بدل إنجليزي):</span>
              </div>
              <p className="text-slate-300 pr-6 leading-relaxed">
                قارئ الباركود يعمل ككيبورد (USB Keyboard). إذا كانت لغة الكيبورد في ويندوز مضبوطة على <strong>عربي (AR)</strong>، قد يترجم الويندوز الأرقام إلى أحرف عربية مشوهة.
              </p>
              <div className="text-emerald-400 pr-6 font-semibold mt-1">
                💡 الحل: تم دمج نظام تصحيح وترجمة تلقائية للأحرف العربية في هذا التحديث! ولكن يُفضل دائماً الضغط على (Alt + Shift) وجعل اللغة EN.
              </div>
            </div>

            {/* Cause 3: Suffix / Enter key terminator */}
            <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 space-y-1">
              <div className="flex items-center gap-2 font-bold text-amber-400">
                <Sparkles className="w-4 h-4" />
                <span>3. الاسكانر لا يرسل مفتاح Enter بعد القراءة:</span>
              </div>
              <p className="text-slate-300 pr-6 leading-relaxed">
                الاسكانر يحتاج لإرسال علامة الإدخال (Enter / Carriage Return) في نهاية الكود لكي تعتمد الفاتورة الصنف فوراً. في الكتالوج المرفق مع كرتونة الاسكانر يوجد باركود مكتوب تحته <strong>"Add Enter Suffix"</strong> أو <strong>"CR/LF"</strong> قم بمسحه مرة واحدة فقط لبرمجة الجهاز.
              </p>
            </div>

            {/* Cause 4: Distance & Angle */}
            <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 space-y-1">
              <div className="flex items-center gap-2 font-bold text-amber-400">
                <Info className="w-4 h-4" />
                <span>4. المسافة وزاوية المسح:</span>
              </div>
              <p className="text-slate-300 pr-6 leading-relaxed">
                اجعل المسافة بين فوهة الاسكانر والملصق حوالي 10 إلى 15 سم، واجعل الشعاع الأحمر يغطي كامل خطوط الباركود من أولها لآخرها مع مراعاة المساحة البيضاء على الجانبين (Quiet Zones).
              </p>
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="flex justify-between items-center pt-2 border-t border-slate-800 text-xs">
          <span className="text-slate-400">نظام MontuCode يدعم قارئات الباركود السلكية واللاسلكية USB HID و 2D</span>
          <button
            onClick={onClose}
            className="px-5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold rounded-xl transition-colors cursor-pointer"
          >
            إغلاق المساعد
          </button>
        </div>
      </div>
    </div>
  );
};
