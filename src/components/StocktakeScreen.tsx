import React, { useState } from 'react';
import {
  ClipboardCheck,
  Plus,
  Eye,
  EyeOff,
  CheckCircle,
  AlertTriangle,
  Barcode,
  Search,
  Building2,
  Calendar,
  Lock,
  Unlock,
  ShieldAlert,
} from 'lucide-react';
import { Location, RoleId, StocktakeLine, StocktakeSession } from '../types';
import { AppStorage } from '../services/storage';
import { InventoryEngine } from '../services/inventoryEngine';
import { formatCurrency, formatDateTime, generateDocNumber, round2 } from '../utils/formatters';

interface StocktakeScreenProps {
  currentLocation: Location;
  currentRole: RoleId;
}

export const StocktakeScreen: React.FC<StocktakeScreenProps> = ({
  currentLocation,
  currentRole,
}) => {
  const storage = AppStorage.getInstance();
  const data = storage.getData();
  const engine = new InventoryEngine();

  const [activeSession, setActiveSession] = useState<StocktakeSession | null>(
    data.stocktakeSessions[0] || null
  );
  const [showNewSessionModal, setShowNewSessionModal] = useState(false);
  const [sessionLocationId, setSessionLocationId] = useState(currentLocation.id);
  const [isFreeze, setIsFreeze] = useState(false);

  // Counting scan input
  const [scanCode, setScanCode] = useState('');
  const [countQty, setCountQty] = useState(1);
  const [countFeedback, setCountFeedback] = useState<string | null>(null);

  const canApprove = currentRole === 'approver' || currentRole === 'admin';

  // Open new stocktake session (Docs 05 §9 & 08 Screen #20)
  const handleOpenSession = (e: React.FormEvent) => {
    e.preventDefault();
    const sessionNo = generateDocNumber('STK', data.nextDocSeq.STK++);
    const now = new Date().toISOString();

    // Prepare snapshot lines for all variants at that location
    const lines: StocktakeLine[] = data.variants.map(v => {
      const bal = engine.getBalance(v.id, sessionLocationId);
      return {
        id: `STL-${Date.now()}-${v.id}`,
        variantId: v.id,
        snapshotQty: bal.onHand,
        countedQty: undefined,
        expectedQty: bal.onHand,
        unitCost: engine.getLastKnownCost(v.id),
      };
    });

    const newSession: StocktakeSession = {
      id: `SES-${Date.now()}`,
      sessionNo,
      locationId: sessionLocationId,
      scope: 'all',
      kind: 'periodic',
      blind: true, // Blind counting: counter doesn't see snapshot!
      freeze: isFreeze,
      status: 'COUNTING',
      snapshotAt: now,
      openedBy: 'أمين المخزن',
      lines,
    };

    data.stocktakeSessions.unshift(newSession);
    data.auditLogs.push({
      id: `AUD-${Date.now()}`,
      userId: 'inv-01',
      userName: 'أمين المخزن',
      action: 'STOCKTAKE_OPENED',
      entity: 'STOCKTAKE',
      entityId: sessionNo,
      after: { location: sessionLocationId, freeze: isFreeze },
      at: now,
    });

    storage.save();
    setActiveSession(newSession);
    setShowNewSessionModal(false);
  };

  // Blind count record (Docs 08 Screen #21)
  const handleRecordCount = (e: React.FormEvent) => {
    e.preventDefault();
    setCountFeedback(null);
    if (!activeSession) return;

    const code = scanCode.trim();
    const variant = data.variants.find(v => v.barcode === code || v.sku.toLowerCase() === code.toLowerCase());
    if (!variant) {
      setCountFeedback(`الباركود ده مش موجود [${code}]`);
      return;
    }

    const line = activeSession.lines.find(l => l.variantId === variant.id);
    if (line) {
      const newCount = (line.countedQty || 0) + countQty;
      line.countedQty = newCount;
      line.countedAt = new Date().toISOString();
      line.countedBy = 'فريق العد';

      setCountFeedback(`تم تسجيل: ${variant.sku} (العدد الحالي: ${newCount})`);
      setScanCode('');
      setCountQty(1);
      storage.save();
    }
  };

  // Approver review & post stocktake adjustments (Docs 06 §4.4 & 05 §9)
  const handleApproveStocktake = () => {
    if (!activeSession) return;

    try {
      const adjDocNo = `ADJ-${activeSession.sessionNo}`;
      const postLines = [];

      for (const line of activeSession.lines) {
        const counted = line.countedQty !== undefined ? line.countedQty : line.snapshotQty;
        const variance = counted - line.snapshotQty;
        line.varianceQty = variance;
        line.varianceValue = round2(variance * (line.unitCost || 0));

        if (variance !== 0) {
          postLines.push({
            variantId: line.variantId,
            locationId: activeSession.locationId,
            qtyDelta: variance, // positive = gain, negative = loss
            unitCost: line.unitCost,
            costSource: 'ADJUSTMENT' as const,
          });
        }
      }

      if (postLines.length > 0) {
        engine.postDocument({
          type: 'STOCKTAKE_ADJUSTMENT',
          documentNo: adjDocNo,
          notes: `تسوية جرد معتمد لجلسة ${activeSession.sessionNo}`,
          postedBy: currentRole === 'approver' ? 'خالد عثمان (المعتمد)' : 'مدير النظام',
          lines: postLines,
        });
      }

      activeSession.status = 'APPROVED';
      activeSession.approvedBy = 'معتمد الجرد';
      activeSession.approvedAt = new Date().toISOString();

      data.auditLogs.push({
        id: `AUD-${Date.now()}`,
        userId: 'approver-01',
        userName: 'معتمد الجرد',
        action: 'STOCKTAKE_APPROVED',
        entity: 'STOCKTAKE',
        entityId: activeSession.sessionNo,
        after: { adjustedLinesCount: postLines.length },
        at: new Date().toISOString(),
      });

      storage.save();
      alert(`تم اعتماد تسوية الجرد بنجاح! تم إنشاء وثيقة التسوية ${adjDocNo} وتحديث أرصدة المخزون ولوطات FIFO.`);
    } catch (err: any) {
      alert(err.message || 'فشل اعتماد الجرد');
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-md flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="p-1 rounded-lg bg-purple-500/10 text-purple-400">
              <ClipboardCheck className="w-5 h-5" />
            </span>
            <h2 className="text-xl font-bold text-slate-100">الجرد الأعمى ومراجعة الفروق (4.4 Stocktake)</h2>
          </div>
          <p className="text-xs text-slate-400">
            العد الأعمى (Blind Counting) دون كشف الرصيد المتوقع للعدادين لمنع التلاعب، مع اعتماد الفروق بواسطة معتمد مستقل.
          </p>
        </div>

        <button
          onClick={() => setShowNewSessionModal(true)}
          className="flex items-center gap-2 bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold px-4 py-2.5 rounded-xl text-xs shadow-lg shadow-amber-500/20 transition-all cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>فتح جلسة جرد جديدة</span>
        </button>
      </div>

      {activeSession ? (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left Column: Active Session Info & Counting Input */}
          <div className="lg:col-span-5 space-y-4">
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-sm space-y-4">
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <div>
                  <span className="font-mono text-xs font-bold text-amber-400">{activeSession.sessionNo}</span>
                  <div className="text-xs text-slate-300 mt-0.5">
                    موقع الجرد: <strong className="text-slate-100">{data.locations.find(l => l.id === activeSession.locationId)?.nameAr}</strong>
                  </div>
                </div>

                <span className={`text-[10px] font-bold px-2.5 py-1 rounded-full ${
                  activeSession.status === 'APPROVED'
                    ? 'bg-emerald-500/20 text-emerald-300'
                    : 'bg-purple-500/20 text-purple-300 animate-pulse'
                }`}>
                  {activeSession.status === 'APPROVED' ? '✓ جرد معتمد ومقفل' : 'جارٍ العد (Blind Counting)'}
                </span>
              </div>

              {/* Counting Box */}
              {activeSession.status !== 'APPROVED' ? (
                <form onSubmit={handleRecordCount} className="space-y-3 bg-slate-950 p-4 rounded-xl border border-slate-800">
                  <div className="flex items-center justify-between text-xs text-slate-300 font-bold">
                    <span>مسح وتسجيل القطع المعدودة</span>
                    <span className="text-[10px] text-amber-400 flex items-center gap-1">
                      <EyeOff className="w-3.5 h-3.5" />
                      <span>العد الأعمى نشط</span>
                    </span>
                  </div>

                  <div className="relative">
                    <input
                      type="text"
                      value={scanCode}
                      onChange={(e) => setScanCode(e.target.value)}
                      placeholder="امسح الباركود أو اكتب كود الصنف..."
                      className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2.5 pl-9 text-xs text-slate-100 font-mono outline-none focus:border-amber-400"
                    />
                    <Barcode className="w-4 h-4 text-amber-400 absolute left-3 top-3" />
                  </div>

                  <div className="flex items-center gap-2">
                    <div className="flex-1 space-y-0.5">
                      <span className="text-[10px] text-slate-400">الكمية المعدودة:</span>
                      <input
                        type="number"
                        min="1"
                        value={countQty}
                        onChange={(e) => setCountQty(parseInt(e.target.value, 10) || 1)}
                        className="w-full bg-slate-900 border border-slate-700 rounded-lg p-1.5 text-xs text-slate-100 font-mono outline-none text-center"
                      />
                    </div>

                    <button
                      type="submit"
                      className="flex-1 mt-3.5 py-2 bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold rounded-lg text-xs cursor-pointer"
                    >
                      تسجيل بالعد
                    </button>
                  </div>

                  {countFeedback && (
                    <div className="p-2 bg-amber-500/10 border border-amber-500/30 rounded-lg text-[11px] text-amber-300">
                      {countFeedback}
                    </div>
                  )}
                </form>
              ) : (
                <div className="p-4 bg-emerald-950/20 border border-emerald-500/30 rounded-xl text-xs text-emerald-300 text-center">
                  تم اعتماد هذه الجلسة وترحيل فروق المخزون إلى دفتر الأستاذ العام وتعديل لوطات التكلفة.
                </div>
              )}

              {/* Separation of duties note */}
              <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 text-[11px] text-slate-400 space-y-1">
                <div className="font-semibold text-slate-300">فصل المهام الرقابي (Separation of Duties):</div>
                <p>العدّاد لا يرى الرصيد الدفتري المتوقع لمنع التطابق الشكلي. واعتماد الجلسة يتطلب دور المعتمد أو مدير النظام.</p>
              </div>
            </div>
          </div>

          {/* Right Column: Variance Review Table (Docs 08 Screen #22) */}
          <div className="lg:col-span-7 bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-sm space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div>
                <h3 className="font-bold text-sm text-slate-200">
                  {canApprove ? 'مراجعة فروق الجرد (Approver Review)' : 'بيان الأصناف المشمولة بالجرد'}
                </h3>
                <p className="text-[11px] text-slate-400">
                  {canApprove ? 'الأرصدة المتوقعة والفروق تظهر للمعتمد فقط' : 'الرصيد المتوقع مخفي عن العداد'}
                </p>
              </div>

              {canApprove && activeSession.status !== 'APPROVED' && (
                <button
                  onClick={handleApproveStocktake}
                  className="px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-bold rounded-xl text-xs shadow-lg shadow-emerald-500/20 transition-all cursor-pointer flex items-center gap-1.5"
                >
                  <CheckCircle className="w-4 h-4" />
                  <span>اعتماد الفروق وترحيل التسوية</span>
                </button>
              )}
            </div>

            <div className="overflow-x-auto max-h-[500px]">
              <table className="w-full text-right text-xs">
                <thead className="bg-slate-950 text-slate-400 border-b border-slate-800">
                  <tr>
                    <th className="p-2.5 font-bold">الصنف (SKU)</th>
                    <th className="p-2.5 font-bold text-center">الكمية المعدودة</th>
                    {canApprove && (
                      <>
                        <th className="p-2.5 font-bold text-center">الرصيد المتوقع</th>
                        <th className="p-2.5 font-bold text-center">الفرق (عجز/فائض)</th>
                        <th className="p-2.5 font-bold text-left">قيمة الفرق</th>
                      </>
                    )}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800 font-mono text-slate-200">
                  {activeSession.lines.map(line => {
                    const variant = data.variants.find(v => v.id === line.variantId);
                    const counted = line.countedQty !== undefined ? line.countedQty : 0;
                    const diff = counted - line.snapshotQty;
                    const val = round2(diff * (line.unitCost || 0));

                    return (
                      <tr key={line.id} className="hover:bg-slate-800/30">
                        <td className="p-2.5">
                          <span className="font-bold text-amber-400">{variant?.sku}</span>
                        </td>

                        <td className="p-2.5 text-center font-bold text-slate-100">
                          {line.countedQty !== undefined ? `${line.countedQty} قطعة` : <span className="text-slate-600">لم يُعد بعد</span>}
                        </td>

                        {canApprove && (
                          <>
                            <td className="p-2.5 text-center text-slate-400">{line.snapshotQty} قطعة</td>
                            <td className="p-2.5 text-center">
                              <span className={`px-2 py-0.5 rounded font-bold ${
                                diff === 0
                                  ? 'text-slate-400'
                                  : diff > 0
                                  ? 'bg-emerald-500/20 text-emerald-300'
                                  : 'bg-rose-500/20 text-rose-300'
                              }`}>
                                {diff > 0 ? `+${diff}` : diff}
                              </span>
                            </td>
                            <td className={`p-2.5 text-left font-bold ${
                              diff === 0 ? 'text-slate-500' : diff > 0 ? 'text-emerald-400' : 'text-rose-400'
                            }`}>
                              {formatCurrency(val)}
                            </td>
                          </>
                        )}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      ) : (
        <div className="py-20 text-center text-slate-500 text-xs bg-slate-900 border border-slate-800 rounded-2xl">
          لا توجد جلسة جرد نشطة حالياً. اضغط "فتح جلسة جرد جديدة" للبدء.
        </div>
      )}

      {/* New Session Modal */}
      {showNewSessionModal && (
        <div className="fixed inset-0 bg-black/75 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <form onSubmit={handleOpenSession} className="bg-slate-900 border border-slate-800 rounded-2xl max-w-md w-full p-6 text-slate-200 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="font-bold text-base text-slate-100 flex items-center gap-2">
                <ClipboardCheck className="w-5 h-5 text-amber-400" />
                <span>فتح جلسة جرد أعمى جديدة</span>
              </h3>
              <button type="button" onClick={() => setShowNewSessionModal(false)} className="text-slate-400 hover:text-slate-100">
                ✕
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="space-y-1">
                <label className="text-slate-400 font-semibold">موقع / فرع الجرد:</label>
                <select
                  value={sessionLocationId}
                  onChange={(e) => setSessionLocationId(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2 text-slate-100 outline-none"
                >
                  {data.locations.filter(l => l.type !== 'IN_TRANSIT').map(l => (
                    <option key={l.id} value={l.id}>{l.nameAr}</option>
                  ))}
                </select>
              </div>

              <div className="flex items-center gap-2 p-3 bg-slate-950 rounded-xl border border-slate-800">
                <input
                  type="checkbox"
                  id="freezeCheck"
                  checked={isFreeze}
                  onChange={(e) => setIsFreeze(e.target.checked)}
                  className="rounded bg-slate-900 border-slate-700 text-amber-500 w-4 h-4 cursor-pointer"
                />
                <label htmlFor="freezeCheck" className="text-slate-300 font-semibold cursor-pointer">
                  تجميد الحركات بالموقع أثناء الجرد (Freeze Movements)
                </label>
              </div>

              <div className="p-2.5 bg-slate-950 rounded-lg border border-slate-800 text-[11px] text-slate-400">
                ℹ️ ستسجل الجلسة لقطة لحظية للأرصدة المتوقعة (Snapshot Qty) وتتيح للعدادين تسجيل القطع عبر مسح الباركود بنمط أعمى كامل.
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowNewSessionModal(false)}
                className="px-4 py-2 bg-slate-800 text-slate-300 rounded-xl text-xs font-semibold"
              >
                إلغاء
              </button>
              <button
                type="submit"
                className="px-5 py-2 bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold rounded-xl text-xs cursor-pointer"
              >
                فتح الجلسة وبدء العد
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};
