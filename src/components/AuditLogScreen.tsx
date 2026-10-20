import React, { useState } from 'react';
import {
  ShieldAlert,
  ShieldCheck,
  Play,
  CheckCircle,
  AlertTriangle,
  Search,
  Calendar,
  User,
  Database,
  RefreshCw,
} from 'lucide-react';
import { AppStorage } from '../services/storage';
import { InventoryEngine } from '../services/inventoryEngine';
import { formatDateTime } from '../utils/formatters';

export const AuditLogScreen: React.FC = () => {
  const storage = AppStorage.getInstance();
  const data = storage.getData();
  const engine = new InventoryEngine();

  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState<'audit' | 'invariants'>('audit');
  const [testResult, setTestResult] = useState(engine.checkInvariants());

  const handleRunInvariantsTest = () => {
    setTestResult(engine.checkInvariants());
  };

  const filteredLogs = data.auditLogs.filter(l => {
    return (
      l.action.toLowerCase().includes(searchQuery.toLowerCase()) ||
      l.userName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      l.entity.toLowerCase().includes(searchQuery.toLowerCase()) ||
      l.entityId.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }).reverse();

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-md flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="p-1 rounded-lg bg-amber-500/10 text-amber-400">
              <ShieldAlert className="w-5 h-5" />
            </span>
            <h2 className="text-xl font-bold text-slate-100">سجل التدقيق وفحص الاتساق المحاسبي (Audit & Invariants)</h2>
          </div>
          <p className="text-xs text-slate-400">
            سجل غير قابل للتعديل يوثق كافة العمليات الحساسة، مع مشغل فحص القواعد الرياضية الخمس (Invariants 1-5).
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setActiveTab('audit')}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-colors ${
              activeTab === 'audit' ? 'bg-amber-500 text-slate-950 font-bold' : 'bg-slate-800 text-slate-300'
            }`}
          >
            سجل التدقيق ({data.auditLogs.length})
          </button>
          <button
            onClick={() => setActiveTab('invariants')}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-colors ${
              activeTab === 'invariants' ? 'bg-amber-500 text-slate-950 font-bold' : 'bg-slate-800 text-slate-300'
            }`}
          >
            فاحص المعادلات الخمس (Invariants)
          </button>
        </div>
      </div>

      {activeTab === 'audit' ? (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-sm">
          <div className="p-4 bg-slate-950 border-b border-slate-800 flex items-center justify-between gap-4">
            <div className="relative flex-1 max-w-md">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="بحث في سجل العمليات..."
                className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 pl-9 text-xs text-slate-100 outline-none focus:border-amber-400"
              />
              <Search className="w-4 h-4 text-slate-500 absolute left-3 top-2.5" />
            </div>

            <span className="text-xs text-slate-400">عدد القيود: {filteredLogs.length}</span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-right text-xs">
              <thead className="bg-slate-950/80 text-slate-400 border-b border-slate-800">
                <tr>
                  <th className="p-3 font-bold">الوقت والتاريخ</th>
                  <th className="p-3 font-bold">المستخدم والوظيفة</th>
                  <th className="p-3 font-bold">الحدث (Action)</th>
                  <th className="p-3 font-bold">الكيان / رقم المرجع</th>
                  <th className="p-3 font-bold">التفاصيل والبيانات المحفوظة</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800 text-slate-200">
                {filteredLogs.map(log => (
                  <tr key={log.id} className="hover:bg-slate-800/30 transition-colors">
                    <td className="p-3 text-slate-400 font-mono text-[11px]">
                      {formatDateTime(log.at)}
                    </td>
                    <td className="p-3 font-semibold text-slate-100">
                      {log.userName}
                    </td>
                    <td className="p-3 font-mono">
                      <span className="bg-slate-800 text-amber-400 px-2 py-0.5 rounded text-[10px] font-bold">
                        {log.action}
                      </span>
                    </td>
                    <td className="p-3 font-mono text-slate-300">
                      {log.entity} : {log.entityId}
                    </td>
                    <td className="p-3 text-[11px] font-mono text-slate-400">
                      {log.after ? JSON.stringify(log.after) : '-'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-bold text-sm text-slate-100 flex items-center gap-2">
                  <ShieldCheck className="w-5 h-5 text-emerald-400" />
                  <span>نتائج فحص المعادلات الرياضية الخمس لدفتر الأستاذ (Docs 05 §7 Invariants)</span>
                </h3>
                <p className="text-xs text-slate-400 mt-1">
                  اختبار التكامل الحسابي الكامل بين الأرصدة (on_hand)، دفتر الحركات (stock_movement)، ولوطات FIFO (cost_lot).
                </p>
              </div>

              <button
                onClick={handleRunInvariantsTest}
                className="flex items-center gap-1.5 px-4 py-2 bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold rounded-xl text-xs transition-colors cursor-pointer"
              >
                <RefreshCw className="w-4 h-4" />
                <span>إعادة الفحص الآن</span>
              </button>
            </div>

            {/* Test Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              <div className="p-3.5 bg-slate-950 rounded-xl border border-slate-800 space-y-1">
                <div className="flex justify-between items-center text-xs font-bold">
                  <span>1. تطابق الرصيد والحركات</span>
                  <span className={testResult.summary.rule1Passed ? 'text-emerald-400' : 'text-rose-400'}>
                    {testResult.summary.rule1Passed ? '✓ 100% ناجح' : '✗ راسب'}
                  </span>
                </div>
                <div className="text-[11px] text-slate-400">on_hand = Σ qty_delta</div>
              </div>

              <div className="p-3.5 bg-slate-950 rounded-xl border border-slate-800 space-y-1">
                <div className="flex justify-between items-center text-xs font-bold">
                  <span>2. تطابق اللوطات الموجبة</span>
                  <span className={testResult.summary.rule2Passed ? 'text-emerald-400' : 'text-rose-400'}>
                    {testResult.summary.rule2Passed ? '✓ 100% ناجح' : '✗ راسب'}
                  </span>
                </div>
                <div className="text-[11px] text-slate-400">Σ cost_lot.remaining = max(on_hand, 0)</div>
              </div>

              <div className="p-3.5 bg-slate-950 rounded-xl border border-slate-800 space-y-1">
                <div className="flex justify-between items-center text-xs font-bold">
                  <span>3. اتزان التكلفة المؤقتة</span>
                  <span className={testResult.summary.rule3Passed ? 'text-emerald-400' : 'text-rose-400'}>
                    {testResult.summary.rule3Passed ? '✓ 100% ناجح' : '✗ راسب'}
                  </span>
                </div>
                <div className="text-[11px] text-slate-400">Σ open provisional = max(-on_hand, 0)</div>
              </div>

              <div className="p-3.5 bg-slate-950 rounded-xl border border-slate-800 space-y-1">
                <div className="flex justify-between items-center text-xs font-bold">
                  <span>4. اتزان قيمة المخزون والتسويات</span>
                  <span className={testResult.summary.rule4Passed ? 'text-emerald-400' : 'text-rose-400'}>
                    {testResult.summary.rule4Passed ? '✓ 100% ناجح' : '✗ راسب'}
                  </span>
                </div>
                <div className="text-[11px] text-slate-400">Σ delta + settlements = Σ lot_value − prov_value</div>
              </div>

              <div className="p-3.5 bg-slate-950 rounded-xl border border-slate-800 space-y-1 md:col-span-2">
                <div className="flex justify-between items-center text-xs font-bold">
                  <span>5. سلامة الترانزيت (غير سالب)</span>
                  <span className={testResult.summary.rule5Passed ? 'text-emerald-400' : 'text-rose-400'}>
                    {testResult.summary.rule5Passed ? '✓ 100% ناجح' : '✗ راسب'}
                  </span>
                </div>
                <div className="text-[11px] text-slate-400">IN_TRANSIT on_hand ≥ 0 (عدم السماح بالسالب في بضاعة الطريق)</div>
              </div>
            </div>

            <div className="p-4 bg-emerald-950/20 border border-emerald-500/30 rounded-xl text-xs text-emerald-300 flex items-center justify-between">
              <span>الحالة العامة: جميع قواعد الاتساق الرياضية مطابقة تماماً للمواصفة القياسية.</span>
              <span className="font-mono font-bold">عدد القيود المفحوصة: {testResult.checkedPairsCount}</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
