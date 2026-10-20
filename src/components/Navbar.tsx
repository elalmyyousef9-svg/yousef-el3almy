import React, { useState } from 'react';
import { 
  Building2, 
  UserCheck, 
  ShieldCheck, 
  AlertTriangle, 
  Barcode, 
  Clock, 
  CheckCircle2, 
  Search,
  Sparkles,
  Info,
  Sun,
  Moon,
  Palette
} from 'lucide-react';
import { Location, RoleId, UserRole } from '../types';
import { ROLES } from '../services/storage';
import { InventoryEngine } from '../services/inventoryEngine';
import { formatDateTime } from '../utils/formatters';

export type AppTheme = 'luxury-light' | 'dark' | 'royal-navy' | 'emerald';

interface NavbarProps {
  currentLocation: Location;
  onLocationChange: (loc: Location) => void;
  locations: Location[];
  currentRole: RoleId;
  onRoleChange: (roleId: RoleId) => void;
  onOpenQuickScan: () => void;
  onOpenPrinterTroubleshoot?: () => void;
  onOpenScannerTroubleshoot?: () => void;
  currentTheme?: AppTheme;
  onThemeChange?: (theme: AppTheme) => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  currentLocation,
  onLocationChange,
  locations,
  currentRole,
  onRoleChange,
  onOpenQuickScan,
  onOpenPrinterTroubleshoot,
  onOpenScannerTroubleshoot,
  currentTheme,
  onThemeChange,
}) => {
  const [showIntegrityModal, setShowIntegrityModal] = useState(false);
  const engine = new InventoryEngine();
  const integrity = engine.checkInvariants();

  const activeRoleObj = ROLES.find(r => r.id === currentRole) || ROLES[0];

  return (
    <header className="no-print bg-slate-900 border-b border-slate-800 text-slate-100 sticky top-0 z-40 px-4 py-2.5 shadow-md">
      <div className="flex items-center justify-between gap-4">
        {/* Brand / Logo */}
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-amber-500 to-amber-700 flex items-center justify-center shadow-lg shadow-amber-500/20 font-bold text-slate-950 text-xl tracking-wider">
            MC
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="font-bold text-lg text-slate-100 tracking-tight">نظام مخزون ومحاسبة الملابس</h1>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/30">
                MontuCode v1.0
              </span>
            </div>
            <p className="text-xs text-slate-400">وثيقة المعايير المحاسبية 06-accounting-rules.md و FIFO</p>
          </div>
        </div>

        {/* Center: Invariants / Integrity Live Status Indicator */}
        <div className="hidden lg:flex items-center gap-3">
          <button
            onClick={() => setShowIntegrityModal(true)}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border text-xs font-medium transition-all ${
              integrity.passed
                ? 'bg-emerald-950/40 text-emerald-300 border-emerald-500/30 hover:bg-emerald-900/50 hover:border-emerald-500/60'
                : 'bg-rose-950/40 text-rose-300 border-rose-500/30 hover:bg-rose-900/50 animate-pulse'
            }`}
            title="فحص القواعد الحسابية الخمس (Invariants 1-5)"
          >
            {integrity.passed ? (
              <>
                <ShieldCheck className="w-4 h-4 text-emerald-400" />
                <span>الدفاتر متطابقة محاسبياً (5/5)</span>
                <span className="inline-block w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
              </>
            ) : (
              <>
                <AlertTriangle className="w-4 h-4 text-rose-400" />
                <span>يوجد عدم تطابق في الدفاتر! اضغط للفحص</span>
              </>
            )}
          </button>

          {/* Quick Barcode Scanner Button */}
          <button
            onClick={onOpenQuickScan}
            className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-xs text-slate-200 transition-colors shadow-sm cursor-pointer"
          >
            <Barcode className="w-4 h-4 text-amber-400" />
            <span>ماسح الباركود</span>
            <span className="bg-slate-900 text-[10px] px-1.5 py-0.5 rounded text-slate-400 font-mono">F9</span>
          </button>

          {/* Scanner Troubleshooter Button */}
          <button
            onClick={onOpenScannerTroubleshoot}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 text-xs text-amber-300 transition-colors shadow-sm cursor-pointer"
            title="مساعد تشخيص واختبار قارئ الباركود"
          >
            <span>⚡</span>
            <span>فحص الاسكانر</span>
          </button>

          {/* Printer Troubleshooter Button */}
          <button
            onClick={onOpenPrinterTroubleshoot}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-xs text-slate-200 transition-colors shadow-sm cursor-pointer"
            title="مساعد فحص وإعداد الطابعة الحرارية وطابعة الباركود"
          >
            <span className="text-sm">🖨️</span>
            <span>فحص الطابعة</span>
          </button>
        </div>

        {/* Right side: Branch switcher, Role selector, and Theme Switcher */}
        <div className="flex items-center gap-2.5 flex-wrap">
          {/* Theme Switcher */}
          {onThemeChange && (
            <div className="flex items-center gap-1.5 bg-slate-950/80 px-2.5 py-1.5 rounded-lg border border-slate-800 text-xs shadow-sm">
              <Palette className="w-4 h-4 text-amber-400" />
              <select
                value={currentTheme || 'luxury-light'}
                onChange={(e) => onThemeChange(e.target.value as AppTheme)}
                className="bg-transparent text-slate-200 text-xs outline-none cursor-pointer pr-1 font-semibold"
                title="تغيير ثيم ومظهر النظام"
              >
                <option value="luxury-light" className="bg-slate-900 text-slate-200">☀️ فاتح عصري (Luxury Light)</option>
                <option value="dark" className="bg-slate-900 text-slate-200">🌙 ليلي داكن (Dark Midnight)</option>
                <option value="royal-navy" className="bg-slate-900 text-slate-200">👑 كحلي ملكي (Royal Navy)</option>
                <option value="emerald" className="bg-slate-900 text-slate-200">🌿 زمردي راقي (Emerald)</option>
              </select>
            </div>
          )}

          {/* Location Selector */}
          <div className="flex items-center gap-1.5 bg-slate-950/80 px-2.5 py-1.5 rounded-lg border border-slate-800 text-xs shadow-sm">
            <Building2 className="w-4 h-4 text-amber-400" />
            <select
              value={currentLocation.id}
              onChange={(e) => {
                const found = locations.find(l => l.id === e.target.value);
                if (found) onLocationChange(found);
              }}
              className="bg-transparent text-slate-200 text-xs outline-none cursor-pointer pr-1"
            >
              {locations.map(loc => (
                <option key={loc.id} value={loc.id} className="bg-slate-900 text-slate-200">
                  {loc.nameAr} {loc.canSell ? '🛒' : '📦'}
                </option>
              ))}
            </select>
          </div>

          {/* Role Switcher */}
          <div className="flex items-center gap-1.5 bg-slate-950/80 px-2.5 py-1.5 rounded-lg border border-slate-800 text-xs shadow-sm">
            <UserCheck className="w-4 h-4 text-indigo-400" />
            <select
              value={currentRole}
              onChange={(e) => onRoleChange(e.target.value as RoleId)}
              className="bg-transparent text-indigo-300 font-medium text-xs outline-none cursor-pointer pr-1"
            >
              {ROLES.map(role => (
                <option key={role.id} value={role.id} className="bg-slate-900 text-slate-200">
                  {role.nameAr}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Invariants Integrity Modal */}
      {showIntegrityModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-2xl w-full p-6 text-slate-200 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-3">
                <div className={`p-2 rounded-xl ${integrity.passed ? 'bg-emerald-500/20 text-emerald-400' : 'bg-rose-500/20 text-rose-400'}`}>
                  <ShieldCheck className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="font-bold text-base text-slate-100">فحص التكامل المحاسبي (05 §7 Invariants)</h3>
                  <p className="text-xs text-slate-400">تطبيق معادلات الاتساق الصارمة لدفتر الأستاذ واللوطات التكليفية</p>
                </div>
              </div>
              <button
                onClick={() => setShowIntegrityModal(false)}
                className="text-slate-400 hover:text-slate-100 p-1 rounded-lg"
              >
                ✕
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
              <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 space-y-1">
                <div className="flex items-center justify-between font-semibold">
                  <span>1. الرصيد = مجموع حركات دفتر الأستاذ</span>
                  <span className={integrity.summary.rule1Passed ? 'text-emerald-400' : 'text-rose-400'}>
                    {integrity.summary.rule1Passed ? '✓ مطابق' : '✗ غير مطابق'}
                  </span>
                </div>
                <p className="text-[11px] text-slate-400">on_hand = Σ qty_delta (دفتر الحركات غير القابل للتعديل هو الحقيقة الوحيدة)</p>
              </div>

              <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 space-y-1">
                <div className="flex items-center justify-between font-semibold">
                  <span>2. متبقي اللوطات = الرصيد الفعلي الموجب</span>
                  <span className={integrity.summary.rule2Passed ? 'text-emerald-400' : 'text-rose-400'}>
                    {integrity.summary.rule2Passed ? '✓ مطابق' : '✗ غير مطابق'}
                  </span>
                </div>
                <p className="text-[11px] text-slate-400">Σ cost_lot.remaining_qty = max(on_hand, 0)</p>
              </div>

              <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 space-y-1">
                <div className="flex items-center justify-between font-semibold">
                  <span>3. التكلفة التقديرية = الرصيد السالب</span>
                  <span className={integrity.summary.rule3Passed ? 'text-emerald-400' : 'text-rose-400'}>
                    {integrity.summary.rule3Passed ? '✓ مطابق' : '✗ غير مطابق'}
                  </span>
                </div>
                <p className="text-[11px] text-slate-400">Σ open provisional qty = max(-on_hand, 0)</p>
              </div>

              <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 space-y-1">
                <div className="flex items-center justify-between font-semibold">
                  <span>4. اتزان قيمة المخزون والتسويات</span>
                  <span className={integrity.summary.rule4Passed ? 'text-emerald-400' : 'text-rose-400'}>
                    {integrity.summary.rule4Passed ? '✓ مطابق' : '✗ غير مطابق'}
                  </span>
                </div>
                <p className="text-[11px] text-slate-400">قيمة الدفتر + التسويات = لوطات FIFO − التكلفة التقديرية المفتوحة</p>
              </div>

              <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 space-y-1 md:col-span-2">
                <div className="flex items-center justify-between font-semibold">
                  <span>5. بضاعة الترانزيت غير قابلة للسالب إطلاقاً</span>
                  <span className={integrity.summary.rule5Passed ? 'text-emerald-400' : 'text-rose-400'}>
                    {integrity.summary.rule5Passed ? '✓ مطابق' : '✗ غير مطابق'}
                  </span>
                </div>
                <p className="text-[11px] text-slate-400">IN_TRANSIT on_hand ≥ 0 (لا يمكن بيع أو صرف بضاعة أثناء النقل)</p>
              </div>
            </div>

            <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 text-xs flex items-center justify-between text-slate-300">
              <span>عدد أزواج (الصنف / الفرع) المفحوصة: <strong className="text-amber-400">{integrity.checkedPairsCount}</strong></span>
              <span>وقت آخر فحص: {formatDateTime(integrity.timestamp)}</span>
            </div>

            <div className="flex justify-end pt-2">
              <button
                onClick={() => setShowIntegrityModal(false)}
                className="px-4 py-2 bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold rounded-xl text-xs transition-colors"
              >
                إغلاق التقرير
              </button>
            </div>
          </div>
        </div>
      )}
    </header>
  );
};
