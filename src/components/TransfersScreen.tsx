import React, { useState } from 'react';
import {
  Truck,
  Plus,
  ArrowRight,
  PackageCheck,
  Send,
  CheckCircle,
  AlertTriangle,
  Building2,
  Calendar,
} from 'lucide-react';
import { Location, RoleId, Transfer, Variant } from '../types';
import { AppStorage } from '../services/storage';
import { InventoryEngine } from '../services/inventoryEngine';
import { formatCurrency, formatDateTime, generateDocNumber } from '../utils/formatters';

interface TransfersScreenProps {
  currentLocation: Location;
  currentRole: RoleId;
}

export const TransfersScreen: React.FC<TransfersScreenProps> = ({
  currentLocation,
  currentRole,
}) => {
  const storage = AppStorage.getInstance();
  const data = storage.getData();
  const engine = new InventoryEngine();

  const [showNewModal, setShowNewModal] = useState(false);
  const [fromLocId, setFromLocId] = useState('LOC-WH');
  const [toLocId, setToLocId] = useState('LOC-MAADI');
  const [selectedVariantId, setSelectedVariantId] = useState(data.variants[0]?.id || '');
  const [transferQty, setTransferQty] = useState(5);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Filter transfers
  const transfers = data.transfers;

  // Handle create and dispatch transfer (Docs 05 §6 & 06 §4.2)
  const handleDispatchTransfer = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (fromLocId === toLocId) {
      setErrorMsg('لا يمكن التحويل من وإلى نفس الموقع');
      return;
    }

    const variant = data.variants.find(v => v.id === selectedVariantId);
    if (!variant) return;

    const sourceBal = engine.getBalance(variant.id, fromLocId);
    if (sourceBal.onHand < transferQty) {
      setErrorMsg(`رصيد المصدر غير كافٍ. المتاح في المخزن: ${sourceBal.onHand} قطعة`);
      return;
    }

    try {
      const transferNo = generateDocNumber('TR', data.nextDocSeq.TR++);

      // 1. Post Dispatch Document:
      // Line 0: {source, -q}
      // Line 1: {transit, +q}
      engine.postDocument({
        type: 'TRANSFER_DISPATCH',
        documentNo: transferNo,
        notes: `تحويل بضاعة بالطريق من [${fromLocId}] إلى [${toLocId}]`,
        postedBy: currentRole === 'inventory' ? 'أمين المخزن' : 'مدير النظام',
        lines: [
          {
            variantId: variant.id,
            locationId: fromLocId,
            qtyDelta: -transferQty, // source -
          },
          {
            variantId: variant.id,
            locationId: 'LOC-TRANSIT',
            qtyDelta: transferQty, // transit +
            costSource: 'TRANSFER_IN',
          }
        ],
      });

      // Record transfer record
      const newTransfer: Transfer = {
        id: `TR-${Date.now()}`,
        transferNo,
        fromLocationId: fromLocId,
        toLocationId: toLocId,
        transitLocationId: 'LOC-TRANSIT',
        status: 'DISPATCHED',
        lines: [{
          id: `TRL-${Date.now()}`,
          variantId: variant.id,
          requestedQty: transferQty,
          dispatchedQty: transferQty,
          receivedQty: 0,
          settledQty: 0,
        }],
        createdBy: 'أمين المخزن',
        createdAt: new Date().toISOString(),
        dispatchedAt: new Date().toISOString(),
      };

      data.transfers.push(newTransfer);
      storage.save();
      setShowNewModal(false);
    } catch (err: any) {
      setErrorMsg(err.message || 'حدث خطأ أثناء إرسال التحويل');
    }
  };

  // Handle receive transfer at destination (Screen #16 & Docs 05 §6)
  const handleReceiveTransfer = (transfer: Transfer) => {
    try {
      const receiveDocNo = `REC-${transfer.transferNo}`;
      const line = transfer.lines[0];
      const receiveQty = line.dispatchedQty; // Assume full receipt

      // Post Receive Document:
      // Line 0: {transit, -r}
      // Line 1: {destination, +r}
      engine.postDocument({
        type: 'TRANSFER_RECEIVE',
        documentNo: receiveDocNo,
        notes: `استلام تحويل في فرع [${transfer.toLocationId}]`,
        postedBy: 'أمين المستودع / مستلم الفرع',
        lines: [
          {
            variantId: line.variantId,
            locationId: transfer.transitLocationId,
            qtyDelta: -receiveQty, // transit -
          },
          {
            variantId: line.variantId,
            locationId: transfer.toLocationId,
            qtyDelta: receiveQty, // destination +
            costSource: 'TRANSFER_IN',
          }
        ],
      });

      transfer.status = 'RECEIVED';
      transfer.lines[0].receivedQty = receiveQty;
      transfer.receivedAt = new Date().toISOString();

      data.auditLogs.push({
        id: `AUD-${Date.now()}`,
        userId: 'inv-01',
        userName: 'أمين المستودع',
        action: 'TRANSFER_RECEIVED',
        entity: 'TRANSFER',
        entityId: transfer.transferNo,
        after: { receivedQty: receiveQty, toLocation: transfer.toLocationId },
        at: new Date().toISOString(),
      });

      storage.save();
    } catch (err: any) {
      alert(err.message || 'فشل استلام التحويل');
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-md flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="p-1 rounded-lg bg-cyan-500/10 text-cyan-400">
              <Truck className="w-5 h-5" />
            </span>
            <h2 className="text-xl font-bold text-slate-100">التحويلات بين الفروع وبضاعة الترانزيت (4.2 In Transit)</h2>
          </div>
          <p className="text-xs text-slate-400">
            تتبع الشحنات بين المستودع والفروع، بقاء القيمة كأصل بالمخزون أثناء النقل، ونقل لوطات التكلفة بعمرها الـ FIFO الأصلي.
          </p>
        </div>

        <button
          onClick={() => setShowNewModal(true)}
          className="flex items-center gap-2 bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold px-4 py-2.5 rounded-xl text-xs shadow-lg shadow-amber-500/20 transition-all cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>طلب وتحويل بضاعة جديد</span>
        </button>
      </div>

      {/* Transfers List */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-sm">
        <div className="p-4 bg-slate-950 border-b border-slate-800 flex items-center justify-between">
          <span className="font-bold text-xs text-slate-200">سجل التحويلات وحالات الشحن</span>
          <span className="text-xs text-slate-400">عدد الأذون: {transfers.length}</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-right text-xs">
            <thead className="bg-slate-950/80 text-slate-400 border-b border-slate-800">
              <tr>
                <th className="p-3 font-bold">رقم الإذن</th>
                <th className="p-3 font-bold">تاريخ الإرسال</th>
                <th className="p-3 font-bold">مسار الشحنة</th>
                <th className="p-3 font-bold">الأصناف المحولة</th>
                <th className="p-3 font-bold text-center">الكمية المشحونة</th>
                <th className="p-3 font-bold text-center">الحالة</th>
                <th className="p-3 font-bold text-center">الإجراء</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800 text-slate-200">
              {transfers.map(tr => {
                const fromLoc = data.locations.find(l => l.id === tr.fromLocationId);
                const toLoc = data.locations.find(l => l.id === tr.toLocationId);
                const line = tr.lines[0];
                const variant = data.variants.find(v => v.id === line.variantId);
                const isDispatched = tr.status === 'DISPATCHED';

                return (
                  <tr key={tr.id} className="hover:bg-slate-800/40 transition-colors">
                    <td className="p-3 font-mono font-bold text-amber-400">
                      {tr.transferNo}
                    </td>

                    <td className="p-3 text-slate-400 text-[11px]">
                      {formatDateTime(tr.dispatchedAt)}
                    </td>

                    <td className="p-3">
                      <div className="flex items-center gap-1.5 text-xs">
                        <span className="font-semibold text-slate-200">{fromLoc?.nameAr}</span>
                        <ArrowRight className="w-3.5 h-3.5 text-slate-500" />
                        <span className="font-semibold text-slate-200">{toLoc?.nameAr}</span>
                      </div>
                    </td>

                    <td className="p-3 font-mono">
                      <span className="text-slate-100 font-semibold">{variant?.sku}</span>
                    </td>

                    <td className="p-3 text-center font-mono font-bold text-slate-200">
                      {line.dispatchedQty} قطعة
                    </td>

                    <td className="p-3 text-center">
                      <span className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                        isDispatched
                          ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 animate-pulse'
                          : 'bg-emerald-500/20 text-emerald-300'
                      }`}>
                        {isDispatched ? '🚚 بضاعة بالطريق (In Transit)' : '✓ تم الاستلام بالفرع'}
                      </span>
                    </td>

                    <td className="p-3 text-center">
                      {isDispatched ? (
                        <button
                          onClick={() => handleReceiveTransfer(tr)}
                          className="px-3 py-1.5 bg-cyan-500 hover:bg-cyan-600 text-slate-950 font-bold rounded-lg text-xs transition-colors cursor-pointer flex items-center justify-center gap-1 mx-auto"
                        >
                          <PackageCheck className="w-3.5 h-3.5" />
                          <span>تأكيد الاستلام</span>
                        </button>
                      ) : (
                        <span className="text-slate-500 text-[11px]">مكتمل</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* New Transfer Modal */}
      {showNewModal && (
        <div className="fixed inset-0 bg-black/75 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <form onSubmit={handleDispatchTransfer} className="bg-slate-900 border border-slate-800 rounded-2xl max-w-md w-full p-6 text-slate-200 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="font-bold text-base text-slate-100 flex items-center gap-2">
                <Truck className="w-5 h-5 text-amber-400" />
                <span>إرسال بضاعة وتحويل بين الفروع</span>
              </h3>
              <button type="button" onClick={() => setShowNewModal(false)} className="text-slate-400 hover:text-slate-100">
                ✕
              </button>
            </div>

            {errorMsg && (
              <div className="p-2.5 bg-rose-950/60 border border-rose-500/40 rounded-xl text-xs text-rose-300">
                {errorMsg}
              </div>
            )}

            <div className="space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-slate-400 font-semibold">من مستودع / فرع المصدر:</label>
                  <select
                    value={fromLocId}
                    onChange={(e) => setFromLocId(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2 text-slate-100 outline-none"
                  >
                    {data.locations.filter(l => l.type !== 'IN_TRANSIT').map(l => (
                      <option key={l.id} value={l.id}>{l.nameAr}</option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-slate-400 font-semibold">إلى فرع المستلم:</label>
                  <select
                    value={toLocId}
                    onChange={(e) => setToLocId(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2 text-slate-100 outline-none"
                  >
                    {data.locations.filter(l => l.type !== 'IN_TRANSIT').map(l => (
                      <option key={l.id} value={l.id}>{l.nameAr}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-slate-400 font-semibold">اختر الصنف المراد تحويله:</label>
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
                <label className="text-slate-400 font-semibold">الكمية المشحونة (قطعة):</label>
                <input
                  type="number"
                  required
                  min="1"
                  value={transferQty}
                  onChange={(e) => setTransferQty(parseInt(e.target.value, 10) || 1)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2 text-slate-100 font-mono text-xs outline-none"
                />
              </div>

              <div className="p-2.5 bg-slate-950 rounded-lg border border-slate-800 text-[11px] text-slate-400">
                ℹ️ سيتم خصم الكمية من المصدر وإضافتها فوراً إلى <strong>بضاعة بالطريق (In Transit)</strong> بنفس تكلفة وتاريخ FIFO الأصليين، ولن تضاف لرصيد الفرع المستلم إلا بعد تأكيد استلامها.
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowNewModal(false)}
                className="px-4 py-2 bg-slate-800 text-slate-300 rounded-xl text-xs font-semibold"
              >
                إلغاء
              </button>
              <button
                type="submit"
                className="px-5 py-2 bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold rounded-xl text-xs cursor-pointer flex items-center gap-1.5"
              >
                <Send className="w-3.5 h-3.5" />
                <span>إرسال التحويل للترانزيت</span>
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};
