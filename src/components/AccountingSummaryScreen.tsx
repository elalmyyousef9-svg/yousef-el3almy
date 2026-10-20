import React, { useState } from 'react';
import {
  Calculator,
  Calendar,
  FileSpreadsheet,
  Printer,
  Download,
  Building2,
  TrendingUp,
  Receipt,
  Boxes,
  Truck,
  Coins,
  CheckCircle2,
  ArrowDownRight,
  ArrowUpRight,
  Layers,
  BookOpen,
  DollarSign,
  Info,
} from 'lucide-react';
import { Location, RoleId } from '../types';
import { AccountingEngine } from '../services/accountingEngine';
import { AppStorage } from '../services/storage';
import { formatCurrency, formatDate, formatNumber, round2 } from '../utils/formatters';

interface AccountingSummaryScreenProps {
  currentLocation: Location;
  currentRole: RoleId;
}

export const AccountingSummaryScreen: React.FC<AccountingSummaryScreenProps> = ({
  currentLocation,
  currentRole,
}) => {
  const storage = AppStorage.getInstance();
  const data = storage.getData();
  const engine = new AccountingEngine();

  // Date filters
  const today = new Date().toISOString().split('T')[0];
  const [dateFrom, setDateFrom] = useState('2026-10-01');
  const [dateTo, setDateTo] = useState(today);
  const [selectedLocationId, setSelectedLocationId] = useState<string>(''); // empty = all locations
  const [activeTab, setActiveTab] = useState<'summary' | 'journal' | 'raw'>('summary');

  // Compute summary using 06-accounting-rules.md engine
  const summary = engine.generateSummary(
    `${dateFrom}T00:00:00Z`,
    `${dateTo}T23:59:59Z`,
    selectedLocationId || undefined
  );

  // Quick preset ranges
  const setPreset = (type: 'today' | 'week' | 'month' | 'all') => {
    if (type === 'today') {
      setDateFrom(today);
      setDateTo(today);
    } else if (type === 'week') {
      const d = new Date();
      d.setDate(d.getDate() - 7);
      setDateFrom(d.toISOString().split('T')[0]);
      setDateTo(today);
    } else if (type === 'month') {
      const d = new Date();
      d.setDate(1);
      setDateFrom(d.toISOString().split('T')[0]);
      setDateTo(today);
    } else if (type === 'all') {
      setDateFrom('2026-10-01');
      setDateTo(today);
    }
  };

  // Export JSON summary
  const handleExportJson = () => {
    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(summary, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', dataStr);
    downloadAnchor.setAttribute('download', `montucode-accounting-summary-${dateFrom}-to-${dateTo}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  // Export CSV summary
  const handleExportCsv = () => {
    let csv = 'بند التقرير المحاسبي (06-accounting-rules),المعادلة,القيمة (ج.م)\n';
    csv += `إيرادات المبيعات,صافي المبيعات بعد الخصومات والمرتجعات,${summary.salesRevenue.totalRevenue}\n`;
    csv += `تكلفة البضاعة المباعة (COGS),لوطات FIFO - المرتجعات + تسويات التكلفة المؤقتة,${summary.cogs.netCogs}\n`;
    csv += `تسويات عجز وفروق الجرد,فروق الجرد والتوالف والهالك,${summary.inventoryAdjustments.netAdjustment}\n`;
    csv += `المشتريات واستحقاق الموردين,إجمالي فواتير الاستلام - المرتجع,${summary.purchases.netPurchases}\n`;
    csv += `إجمالي تقييم المخزون الختامي,لوطات التكلفة المفتوحة - التكاليف المؤقتة,${summary.inventoryValueEnd.totalValue}\n`;
    csv += `بضاعة بالطريق (ترانزيت),المخزون المشحون بين المستودعات,${summary.inventoryValueEnd.inTransitValue}\n`;

    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `montucode-accounting-${dateFrom}-to-${dateTo}.csv`;
    a.click();
  };

  const grossProfit = round2(summary.salesRevenue.totalRevenue - summary.cogs.netCogs);
  const profitMargin = summary.salesRevenue.totalRevenue > 0
    ? Math.round((grossProfit / summary.salesRevenue.totalRevenue) * 100)
    : 0;

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="p-1 rounded-lg bg-amber-500/10 text-amber-400 border border-amber-500/30">
              <Calculator className="w-5 h-5" />
            </span>
            <h2 className="text-xl font-extrabold text-slate-100">
              الملخص المحاسبي والقيود اليومية (Daily Accounting Summary)
            </h2>
            <span className="text-[10px] bg-amber-500/20 text-amber-300 font-mono px-2 py-0.5 rounded border border-amber-500/30">
              docs/06-accounting-rules.md
            </span>
          </div>
          <p className="text-xs text-slate-400 max-w-2xl leading-relaxed">
            يصدر النظام ملخصات رقمية دقيقة قابلة للتصدير والترحيل لنظام الحسابات العامة (General Ledger) 
            وفق قواعد تسعير FIFO وتتبع بضاعة الترانزيت وتسويات البيع بالسالب.
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => window.print()}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-semibold transition-all cursor-pointer shadow-sm"
          >
            <Printer className="w-4 h-4 text-amber-400" />
            <span>طباعة التقرير</span>
          </button>

          <button
            onClick={handleExportCsv}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-semibold transition-all cursor-pointer shadow-sm"
          >
            <FileSpreadsheet className="w-4 h-4 text-emerald-400" />
            <span>تصدير Excel/CSV</span>
          </button>

          <button
            onClick={handleExportJson}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-slate-950 text-xs font-bold transition-all cursor-pointer shadow-md shadow-amber-500/20"
          >
            <Download className="w-4 h-4" />
            <span>تصدير قيود GL (JSON)</span>
          </button>
        </div>
      </div>

      {/* Filter Toolbar */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-sm flex flex-col md:flex-row items-center justify-between gap-4">
        {/* Preset Buttons */}
        <div className="flex items-center gap-1.5 overflow-x-auto w-full md:w-auto">
          <button
            onClick={() => setPreset('today')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
              dateFrom === today && dateTo === today ? 'bg-amber-500 text-slate-950' : 'bg-slate-950 text-slate-400 hover:text-slate-200'
            }`}
          >
            اليوم
          </button>
          <button
            onClick={() => setPreset('week')}
            className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-slate-950 text-slate-400 hover:text-slate-200 transition-colors"
          >
            آخر 7 أيام
          </button>
          <button
            onClick={() => setPreset('month')}
            className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-slate-950 text-slate-400 hover:text-slate-200 transition-colors"
          >
            هذا الشهر
          </button>
          <button
            onClick={() => setPreset('all')}
            className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-slate-950 text-slate-400 hover:text-slate-200 transition-colors"
          >
            كافة الحركات
          </button>
        </div>

        {/* Date Inputs & Branch Selector */}
        <div className="flex flex-wrap items-center gap-3 w-full md:w-auto justify-end">
          <div className="flex items-center gap-2 bg-slate-950 px-3 py-1.5 rounded-xl border border-slate-800 text-xs">
            <span className="text-slate-500">من:</span>
            <input
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              className="bg-transparent text-slate-200 outline-none font-mono text-xs"
            />
          </div>

          <div className="flex items-center gap-2 bg-slate-950 px-3 py-1.5 rounded-xl border border-slate-800 text-xs">
            <span className="text-slate-500">إلى:</span>
            <input
              type="date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              className="bg-transparent text-slate-200 outline-none font-mono text-xs"
            />
          </div>

          <div className="flex items-center gap-2 bg-slate-950 px-3 py-1.5 rounded-xl border border-slate-800 text-xs">
            <Building2 className="w-3.5 h-3.5 text-amber-400" />
            <select
              value={selectedLocationId}
              onChange={(e) => setSelectedLocationId(e.target.value)}
              className="bg-transparent text-slate-200 outline-none cursor-pointer text-xs"
            >
              <option value="" className="bg-slate-900 text-slate-200">كافة الفروع والمستودعات</option>
              {data.locations.map(loc => (
                <option key={loc.id} value={loc.id} className="bg-slate-900 text-slate-200">
                  {loc.nameAr}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Tabs: Summary View / Journal Entries View / JSON Raw View */}
      <div className="flex items-center gap-2 border-b border-slate-800">
        <button
          onClick={() => setActiveTab('summary')}
          className={`flex items-center gap-2 px-4 py-2.5 text-xs font-bold border-b-2 transition-all ${
            activeTab === 'summary'
              ? 'border-amber-400 text-amber-400'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <Layers className="w-4 h-4" />
          <span>جدول الملخص المحاسبي المعتمد (المواصفة 06)</span>
        </button>

        <button
          onClick={() => setActiveTab('journal')}
          className={`flex items-center gap-2 px-4 py-2.5 text-xs font-bold border-b-2 transition-all ${
            activeTab === 'journal'
              ? 'border-amber-400 text-amber-400'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <BookOpen className="w-4 h-4" />
          <span>قيود اليومية المقترحة (Suggested Journal Entries)</span>
          <span className="bg-slate-800 text-slate-300 px-1.5 py-0.2 rounded-full text-[10px] font-mono">
            {summary.suggestedJournalEntries.length}
          </span>
        </button>
      </div>

      {activeTab === 'summary' && (
        <div className="space-y-6">
          {/* Top Key Metrics Banner */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800">
              <span className="text-xs text-slate-400">صافي المبيعات (Revenue)</span>
              <div className="text-xl font-bold font-mono text-emerald-400 mt-1">
                {formatCurrency(summary.salesRevenue.totalRevenue)}
              </div>
              <div className="text-[11px] text-slate-500 mt-1">بعد استبعاد الخصومات والمرتجع</div>
            </div>

            <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800">
              <span className="text-xs text-slate-400">تكلفة المبيعات (COGS FIFO)</span>
              <div className="text-xl font-bold font-mono text-indigo-400 mt-1">
                {formatCurrency(summary.cogs.netCogs)}
              </div>
              <div className="text-[11px] text-slate-500 mt-1">شاملة تسويات التكلفة المؤقتة</div>
            </div>

            <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800">
              <span className="text-xs text-slate-400">مجمل الربح (Gross Margin)</span>
              <div className="text-xl font-bold font-mono text-amber-400 mt-1">
                {formatCurrency(grossProfit)}
              </div>
              <div className="text-[11px] text-emerald-400 mt-1 font-semibold">هامش ربح: {profitMargin}%</div>
            </div>

            <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800">
              <span className="text-xs text-slate-400">قيمة المخزون الختامي (Ending Inventory)</span>
              <div className="text-xl font-bold font-mono text-slate-100 mt-1">
                {formatCurrency(summary.inventoryValueEnd.totalValue)}
              </div>
              <div className="text-[11px] text-cyan-400 mt-1">منها بالترانزيت: {formatCurrency(summary.inventoryValueEnd.inTransitValue)}</div>
            </div>
          </div>

          {/* Table from 06-accounting-rules.md: Daily Accounting Summary */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-lg">
            <div className="p-4 bg-slate-950 border-b border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="font-bold text-sm text-slate-200">الجدول الموحد للملخص المحاسبي (Section 4 Summary Table)</span>
                <span className="text-xs text-slate-500 font-mono">({formatDate(dateFrom)} إلى {formatDate(dateTo)})</span>
              </div>
              <span className="text-xs text-amber-400 font-mono">التقريب: نصف للأعلى لمنزلتين عشريتين</span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-right text-xs">
                <thead className="bg-slate-950/80 text-slate-400 border-b border-slate-800">
                  <tr>
                    <th className="p-3 font-bold">البند المحاسبي (Line)</th>
                    <th className="p-3 font-bold">طريقة الاحتساب (Computation)</th>
                    <th className="p-3 font-bold">التفصيل (Breakdown)</th>
                    <th className="p-3 font-bold text-left">القيمة الصافية</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800 text-slate-200">
                  {/* Line 1: Sales Revenue */}
                  <tr className="hover:bg-slate-800/40 transition-colors">
                    <td className="p-3.5 font-bold text-slate-100 flex items-center gap-2">
                      <Receipt className="w-4 h-4 text-emerald-400 shrink-0" />
                      <span>إيرادات المبيعات (Sales Revenue)</span>
                    </td>
                    <td className="p-3 text-slate-400 leading-relaxed">
                      Σ إجمالي الفواتير (صافي الخصومات) − المرتجعات والإلغاءات، مقسمة حسب وسيلة الدفع.
                    </td>
                    <td className="p-3 text-[11px] text-slate-300">
                      <div className="space-y-0.5 font-mono">
                        <div>نقدية: {formatCurrency(summary.salesRevenue.byPaymentMethod.cash)}</div>
                        <div>فيزا / بنك: {formatCurrency(summary.salesRevenue.byPaymentMethod.card)}</div>
                        <div>محافظ إلكترونية: {formatCurrency(summary.salesRevenue.byPaymentMethod.wallet)}</div>
                      </div>
                    </td>
                    <td className="p-3 text-left font-mono font-bold text-emerald-400 text-sm">
                      {formatCurrency(summary.salesRevenue.totalRevenue)}
                    </td>
                  </tr>

                  {/* Line 2: COGS */}
                  <tr className="hover:bg-slate-800/40 transition-colors">
                    <td className="p-3.5 font-bold text-slate-100 flex items-center gap-2">
                      <Coins className="w-4 h-4 text-indigo-400 shrink-0" />
                      <span>تكلفة البضاعة المباعة (COGS)</span>
                    </td>
                    <td className="p-3 text-slate-400 leading-relaxed">
                      Σ قيمة مخصصات SALE − Σ قيمة مخصصات SALE_RETURN + تسويات وصول التكلفة المؤقتة (الفعلي − التقديري).
                    </td>
                    <td className="p-3 text-[11px] text-slate-300">
                      <div className="space-y-0.5 font-mono">
                        <div>تكلفة لوطات المبيعات: {formatCurrency(summary.cogs.saleAllocationsValue)}</div>
                        <div>رد تكلفة المرتجعات: -{formatCurrency(summary.cogs.saleReturnsValue)}</div>
                        <div>تسويات التكلفة المؤقتة: {formatCurrency(summary.cogs.settlementAdjustments)}</div>
                      </div>
                    </td>
                    <td className="p-3 text-left font-mono font-bold text-indigo-400 text-sm">
                      {formatCurrency(summary.cogs.netCogs)}
                    </td>
                  </tr>

                  {/* Line 3: Inventory Adjustments */}
                  <tr className="hover:bg-slate-800/40 transition-colors">
                    <td className="p-3.5 font-bold text-slate-100 flex items-center gap-2">
                      <Layers className="w-4 h-4 text-amber-400 shrink-0" />
                      <span>تسويات وفروق الجرد (Inventory Adjustments)</span>
                    </td>
                    <td className="p-3 text-slate-400 leading-relaxed">
                      Σ قيمة تسويات الجرد STOCKTAKE_ADJUSTMENT وهالك التوالف DAMAGE_WRITEOFF (أرباح وخسائر).
                    </td>
                    <td className="p-3 text-[11px] text-slate-300">
                      <div className="space-y-0.5 font-mono">
                        <div className="text-emerald-400">فائض جرد (+): {formatCurrency(summary.inventoryAdjustments.gains)}</div>
                        <div className="text-rose-400">عجز جرد وتوالف (-): {formatCurrency(summary.inventoryAdjustments.losses)}</div>
                      </div>
                    </td>
                    <td className={`p-3 text-left font-mono font-bold text-sm ${summary.inventoryAdjustments.netAdjustment >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                      {formatCurrency(summary.inventoryAdjustments.netAdjustment)}
                    </td>
                  </tr>

                  {/* Line 4: Purchases */}
                  <tr className="hover:bg-slate-800/40 transition-colors">
                    <td className="p-3.5 font-bold text-slate-100 flex items-center gap-2">
                      <Boxes className="w-4 h-4 text-cyan-400 shrink-0" />
                      <span>المشتريات واستحقاق الموردين (Purchases)</span>
                    </td>
                    <td className="p-3 text-slate-400 leading-relaxed">
                      Σ قيمة أذون استلام الموردين (أرصدة الموردين الدائنة) − مرتجعات الموردين.
                    </td>
                    <td className="p-3 text-[11px] text-slate-300">
                      <div className="space-y-0.5">
                        {summary.purchases.bySupplier.map((sup, idx) => (
                          <div key={idx} className="font-mono">
                            {sup.supplierName}: {formatCurrency(sup.amount)}
                          </div>
                        ))}
                      </div>
                    </td>
                    <td className="p-3 text-left font-mono font-bold text-cyan-400 text-sm">
                      {formatCurrency(summary.purchases.netPurchases)}
                    </td>
                  </tr>

                  {/* Line 5: Inventory Value End */}
                  <tr className="hover:bg-slate-800/40 transition-colors bg-slate-950/40">
                    <td className="p-3.5 font-bold text-slate-100 flex items-center gap-2">
                      <Truck className="w-4 h-4 text-amber-400 shrink-0" />
                      <span>قيمة المخزون الختامي (Inventory Value End)</span>
                    </td>
                    <td className="p-3 text-slate-400 leading-relaxed">
                      Σ اللوطات المفتوحة × سعر التكلفة حسب الموقع (الترانزيت مفصولاً) − التكلفة المؤقتة المفتوحة.
                    </td>
                    <td className="p-3 text-[11px] text-slate-300">
                      <div className="space-y-0.5">
                        <div>بضاعة الفروع والمخازن: {formatCurrency(summary.inventoryValueEnd.totalValue - summary.inventoryValueEnd.inTransitValue)}</div>
                        <div className="text-cyan-400 font-semibold">بضاعة بالطريق (ترانزيت): {formatCurrency(summary.inventoryValueEnd.inTransitValue)}</div>
                      </div>
                    </td>
                    <td className="p-3 text-left font-mono font-bold text-amber-400 text-sm">
                      {formatCurrency(summary.inventoryValueEnd.totalValue)}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          {/* Location-by-Location Valuation Breakdown */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-lg space-y-3">
            <h3 className="font-bold text-sm text-slate-200 flex items-center gap-2">
              <Building2 className="w-4 h-4 text-amber-400" />
              <span>تفصيل قيمة المخزون الختامي حسب الموقع والفرع</span>
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {summary.inventoryValueEnd.byLocation.map((loc) => {
                const isTransit = loc.type === 'IN_TRANSIT';

                return (
                  <div
                    key={loc.locationId}
                    className={`p-3.5 rounded-xl border ${
                      isTransit
                        ? 'bg-cyan-950/20 border-cyan-500/40'
                        : 'bg-slate-950 border-slate-800'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-semibold text-xs text-slate-200">{loc.locationName}</span>
                      <span className={`text-[10px] px-2 py-0.5 rounded-full font-mono ${
                        isTransit ? 'bg-cyan-500/20 text-cyan-300' : 'bg-slate-800 text-slate-400'
                      }`}>
                        {loc.pieceCount} قطعة
                      </span>
                    </div>

                    <div className="space-y-1 text-xs font-mono">
                      <div className="flex justify-between text-slate-400">
                        <span>لوطات التكلفة المفتوحة:</span>
                        <span>{formatCurrency(loc.openLotsValue)}</span>
                      </div>
                      {loc.openProvisionalDeduction > 0 && (
                        <div className="flex justify-between text-rose-400">
                          <span>خصم عجز التكلفة المؤقتة:</span>
                          <span>-{formatCurrency(loc.openProvisionalDeduction)}</span>
                        </div>
                      )}
                      <div className="flex justify-between font-bold text-amber-400 pt-1 border-t border-slate-800">
                        <span>صافي القيمة الدفترية:</span>
                        <span>{formatCurrency(loc.netValue)}</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Suggested Journal Entries Tab (Docs 06 Section 4.5 Journal Mapping) */}
      {activeTab === 'journal' && (
        <div className="space-y-4">
          <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 text-xs text-slate-300 flex items-start gap-3">
            <Info className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
            <div>
              <strong className="text-slate-100">القيود المحاسبية المقترحة لبرنامج الحسابات العامة (General Ledger Mapping):</strong>
              <p className="text-slate-400 mt-1 leading-relaxed">
                وفق وثيقة MontuCode، لا يتطلب النظام دفتر أستاذ عام داخلي، بل يولد تلقائياً هذه القيود المتوازنة 
                (مدين = دائن) لتصديرها مباشرةً إلى أنظمة ERP والمحاسبة المالية مثل Odoo، SAP، أو دفاتر الحسابات المحلية.
              </p>
            </div>
          </div>

          <div className="space-y-4">
            {summary.suggestedJournalEntries.map((entry) => {
              const totalDebit = round2(entry.lines.reduce((s, l) => s + l.debit, 0));
              const totalCredit = round2(entry.lines.reduce((s, l) => s + l.credit, 0));
              const isBalanced = Math.abs(totalDebit - totalCredit) < 0.01;

              return (
                <div key={entry.id} className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-sm">
                  <div className="p-3.5 bg-slate-950 border-b border-slate-800 flex items-center justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs font-bold text-amber-400">{entry.referenceDoc}</span>
                        <span className="text-xs text-slate-200 font-semibold">{entry.descriptionAr}</span>
                      </div>
                      <span className="text-[10px] text-slate-500 font-mono mt-0.5 block">التاريخ: {entry.date}</span>
                    </div>

                    <div className="flex items-center gap-2">
                      <span className={`text-[10px] font-mono px-2 py-0.5 rounded-full ${
                        isBalanced ? 'bg-emerald-500/20 text-emerald-300' : 'bg-rose-500/20 text-rose-300'
                      }`}>
                        {isBalanced ? '✓ قيد متوازن' : '✗ غير متوازن'}
                      </span>
                    </div>
                  </div>

                  <div className="overflow-x-auto">
                    <table className="w-full text-right text-xs">
                      <thead className="bg-slate-950/60 text-slate-400 border-b border-slate-800">
                        <tr>
                          <th className="p-2.5 font-bold">كود الحساب</th>
                          <th className="p-2.5 font-bold">اسم الحساب (عربي / إنجليزي)</th>
                          <th className="p-2.5 font-bold text-left">مدين (Debit)</th>
                          <th className="p-2.5 font-bold text-left">دائن (Credit)</th>
                          <th className="p-2.5 font-bold">البيان</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-800 font-mono">
                        {entry.lines.map((line, idx) => (
                          <tr key={idx} className="hover:bg-slate-800/30">
                            <td className="p-2.5 text-amber-400">{line.accountCode}</td>
                            <td className="p-2.5 font-sans">
                              <span className="text-slate-200 font-medium">{line.accountNameAr}</span>
                              <span className="text-[10px] text-slate-500 mr-2">({line.accountNameEn})</span>
                            </td>
                            <td className="p-2.5 text-left text-emerald-400 font-bold">
                              {line.debit > 0 ? formatCurrency(line.debit) : '-'}
                            </td>
                            <td className="p-2.5 text-left text-indigo-400 font-bold">
                              {line.credit > 0 ? formatCurrency(line.credit) : '-'}
                            </td>
                            <td className="p-2.5 text-slate-400 font-sans text-[11px]">{line.note || '-'}</td>
                          </tr>
                        ))}
                      </tbody>
                      <tfoot className="bg-slate-950/80 font-bold border-t border-slate-800">
                        <tr>
                          <td colSpan={2} className="p-2.5 text-left font-sans text-slate-300">الإجمالي:</td>
                          <td className="p-2.5 text-left font-mono text-emerald-400">{formatCurrency(totalDebit)}</td>
                          <td className="p-2.5 text-left font-mono text-indigo-400">{formatCurrency(totalCredit)}</td>
                          <td></td>
                        </tr>
                      </tfoot>
                    </table>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};
