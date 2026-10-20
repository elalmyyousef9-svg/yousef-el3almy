import React, { useState } from 'react';
import {
  Printer,
  CheckCircle,
  AlertTriangle,
  HelpCircle,
  Settings,
  ExternalLink,
  Usb,
  X,
  FileText,
  Tag,
} from 'lucide-react';
import { AppStorage } from '../services/storage';
import { generateCode128Svg } from '../utils/code128';
import { printThermalLabels, printThermalReceipt } from '../utils/printer';

interface PrinterTroubleshootModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const PrinterTroubleshootModal: React.FC<PrinterTroubleshootModalProps> = ({
  isOpen,
  onClose,
}) => {
  const [activeStep, setActiveStep] = useState<number>(1);
  const [testStatus, setTestStatus] = useState<string | null>(null);
  const data = AppStorage.getInstance().getData();

  if (!isOpen) return null;

  // Run test receipt print
  const handleTestReceiptPrint = () => {
    setTestStatus('جارٍ إرسال صفحة اختبار الفاتورة الحرارية 80mm...');
    const success = printThermalReceipt({
      shopName: data.settings.shopName,
      branchName: 'تجربة فحص اتصال الطابعة الحرارية',
      invoiceNo: 'TEST-80MM',
      cashierName: 'فاحص الطابعة',
      dateStr: new Date().toLocaleDateString('ar-EG'),
      items: [
        {
          sku: 'SH101-BLK-M',
          name: 'قميص أكسفورد كلاسيك - أسود M',
          qty: 1,
          price: 450.00,
          total: 450.00,
        },
        {
          sku: 'PT303-NVY-L',
          name: 'بنطلون تشينو سليم فيت - كحلي L',
          qty: 1,
          price: 590.00,
          total: 590.00,
        }
      ],
      subtotal: 1040.00,
      discount: 40.00,
      total: 1000.00,
      paymentMethod: 'نقدي (اختبار اتصال)',
      receiptHeader: 'فحص جودة الطباعة الحرارية والمحاذاة',
      receiptFooter: 'إذا خرجت هذه الورقة مقطوعة وواضحة، فإن الطابعة معرفة وجاهزة بنجاح!',
    });

    if (success) {
      setTestStatus('تم فتح نافذة الطباعة بنجاح! اختر طابعتك واضغط Print.');
    } else {
      setTestStatus('تنبيه: يبدو أن المتصفح حظر النافذة المنبثقة. يرجى السماح بـ Popups.');
    }
  };

  // Run test barcode label print
  const handleTestLabelPrint = () => {
    setTestStatus('جارٍ إرسال صفحة اختبار ملصق الباركود 40x25mm مباشرة إلى الطابعة...');
    const barcodeSvg = generateCode128Svg('200000001001', {
      barWidth: 2.1,
      height: 52,
      showText: false,
      quietZone: 20,
    });

    const success = printThermalLabels({
      shopName: data.settings.shopName,
      modelName: 'قميص أكسفورد تجريبي (معايرة)',
      colorName: 'أسود',
      sizeCode: 'M',
      barcode: '200000001001',
      sku: 'SH101-BLK-M',
      price: 450.00,
      svgHtml: barcodeSvg.svg,
      copies: 2,
      labelWidthMm: 40,
      labelHeightMm: 25,
      showPrice: true,
    });

    if (success) {
      setTestStatus('تم إرسال أمر الطباعة بنجاح! إذا لم يخرج الورق، اضغط على زر فتح النافذة المنبثقة.');
    } else {
      setTestStatus('تنبيه: المتصفح حظر الإطار. يرجى السماح بالطباعة.');
    }
  };

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-2xl w-full p-6 text-slate-200 shadow-2xl space-y-5">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-amber-500/20 text-amber-400">
              <Printer className="w-6 h-6" />
            </div>
            <div>
              <h3 className="font-bold text-base text-slate-100">
                مساعد تشغيل وفحص الطابعة (Printer Troubleshooter)
              </h3>
              <p className="text-xs text-slate-400">
                حلول سريعة لعدم استجابة طابعة الفواتير (80mm) أو طابعة ملصقات الباركود (40x25mm)
              </p>
            </div>
          </div>

          <button onClick={onClose} className="text-slate-400 hover:text-slate-100 p-1">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Quick Test Buttons */}
        <div className="p-4 bg-slate-950 rounded-xl border border-slate-800 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-200 flex items-center gap-1.5">
              <Usb className="w-4 h-4 text-emerald-400" />
              <span>اختبار الطباعة الفوري (Test Print):</span>
            </span>
            <span className="text-[11px] text-slate-400">اضغط للاختبار وتحديد الطابعة</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <button
              onClick={handleTestReceiptPrint}
              className="p-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-slate-950 font-bold text-xs flex items-center justify-center gap-2 transition-all cursor-pointer shadow-md"
            >
              <FileText className="w-4 h-4" />
              <span>طباعة فاتورة تجريبية (80mm Receipt)</span>
            </button>

            <button
              onClick={handleTestLabelPrint}
              className="p-3 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs flex items-center justify-center gap-2 transition-all cursor-pointer shadow-md"
            >
              <Tag className="w-4 h-4" />
              <span>طباعة ملصق باركود تجريبي (40x25mm)</span>
            </button>
          </div>

          {testStatus && (
            <div className="p-2.5 rounded-lg bg-slate-900 border border-slate-700 text-xs text-amber-300 font-mono">
              {testStatus}
            </div>
          )}
        </div>

        {/* Checklist of Common Causes & Solutions */}
        <div className="space-y-3">
          <h4 className="font-bold text-xs text-slate-300">
            أسباب شائعة لعدم خروج الورق وكيفية إصلاحها فوراً:
          </h4>

          <div className="space-y-2 text-xs">
            {/* Step 1: Popups blocked */}
            <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 space-y-1">
              <div className="flex items-center gap-2 font-bold text-slate-200">
                <span className="w-5 h-5 rounded-full bg-amber-500/20 text-amber-400 flex items-center justify-center text-[11px]">
                  1
                </span>
                <span>المتصفح حظر النوافذ المنبثقة (Pop-ups Blocked):</span>
              </div>
              <p className="text-slate-400 pr-7 leading-relaxed">
                إذا ضغطت طباعة ولم تظهر أي نافذة، انظر إلى شريط عنوان المتصفح بالأعلى، ستجد علامة باللون الأحمر (تم حظر نافذة منبثقة). اضغط عليها واختر <strong>"السماح دائماً بالنوافذ المنبثقة من هذا الموقع" (Always Allow Pop-ups)</strong>.
              </p>
            </div>

            {/* Step 2: Printer Driver & Selection */}
            <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 space-y-1">
              <div className="flex items-center gap-2 font-bold text-slate-200">
                <span className="w-5 h-5 rounded-full bg-amber-500/20 text-amber-400 flex items-center justify-center text-[11px]">
                  2
                </span>
                <span>اختيار الطابعة الصحيحة في شاشة الويندوز:</span>
              </div>
              <p className="text-slate-400 pr-7 leading-relaxed">
                في نافذة الطباعة التي تظهر من المتصفح (Print Dialog)، تأكد من خانة <strong>Destination / الطابعة</strong> أنها موجهة إلى اسم طابعتك (مثل: <code className="text-amber-400">POS-80</code> أو <code className="text-amber-400">Xprinter XP-80</code> أو <code className="text-amber-400">Zebra ZD220</code>) وليست محفوظة إلى "Save as PDF".
              </p>
            </div>

            {/* Step 3: Paper Size and Margins */}
            <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 space-y-1">
              <div className="flex items-center gap-2 font-bold text-slate-200">
                <span className="w-5 h-5 rounded-full bg-amber-500/20 text-amber-400 flex items-center justify-center text-[11px]">
                  3
                </span>
                <span>ضبط مقاس الورق والهوامش (Paper Size & Margins):</span>
              </div>
              <div className="text-slate-400 pr-7 space-y-0.5">
                <div>• لفواتير الكاشير: اختر المقاس <strong>80mm / Roll Paper</strong> وضبط الهوامش على <strong>None (بلا هوامش)</strong>.</div>
                <div>• لملصقات الباركود: اختر مقاس البكرة <strong>40 × 25 مم</strong>.</div>
              </div>
            </div>

            {/* Step 4: Physical check */}
            <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 space-y-1">
              <div className="flex items-center gap-2 font-bold text-slate-200">
                <span className="w-5 h-5 rounded-full bg-amber-500/20 text-amber-400 flex items-center justify-center text-[11px]">
                  4
                </span>
                <span>فحص كابل الـ USB ولمبة الحالة (Paper Out / Error):</span>
              </div>
              <p className="text-slate-400 pr-7 leading-relaxed">
                تأكد أن لمبة الطابعة خضراء وليست حمراء. إذا كانت تومض بالأحمر، تأكد أن بكرة الورق الحراري مركبة بالاتجاه الصحيح (الوجه الحساس للحرارة للأعلى)، وأن غطاء الطابعة مغلق بإحكام.
              </p>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex justify-between items-center pt-2 border-t border-slate-800 text-xs">
          <span className="text-slate-400">يدعم النظام كافة طابعات ESC/POS و TSPL الحرارية القياسية</span>
          <button
            onClick={onClose}
            className="px-5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold rounded-xl transition-colors"
          >
            إغلاق المساعد
          </button>
        </div>
      </div>
    </div>
  );
};
