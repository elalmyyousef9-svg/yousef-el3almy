import React from 'react';
import {
  AlertTriangle,
  ArrowUpRight,
  Boxes,
  CircleDollarSign,
  Clock,
  Coins,
  PackageCheck,
  Receipt,
  ShoppingCart,
  TrendingUp,
  Truck,
  CheckCircle2,
  ChevronLeft,
  ShieldCheck,
  Sparkles,
} from 'lucide-react';
import { Location, RoleId } from '../types';
import { AppStorage } from '../services/storage';
import { formatCurrency, formatNumber } from '../utils/formatters';
import { TabType } from './Sidebar';

interface DashboardProps {
  currentLocation: Location;
  currentRole: RoleId;
  onNavigate: (tab: TabType) => void;
}

export const Dashboard: React.FC<DashboardProps> = ({
  currentLocation,
  currentRole,
  onNavigate,
}) => {
  const data = AppStorage.getInstance().getData();

  // 1. Calculate today's sales
  const todayStr = new Date().toISOString().split('T')[0];
  const todaySales = data.sales.filter(s => s.postedAt.startsWith(todayStr) && s.status !== 'CANCELLED');
  const todayRevenue = todaySales.reduce((sum, s) => sum + s.total, 0);
  const todayCogs = todaySales.reduce((sum, s) => sum + s.cogsTotal, 0);
  const todayProfit = todayRevenue - todayCogs;

  // 2. Alert: Negative stock items across the system
  const negativeStockItems = data.stockBalances
    .filter(b => b.onHand < 0)
    .map(b => {
      const v = data.variants.find(item => item.id === b.variantId);
      const loc = data.locations.find(l => l.id === b.locationId);
      return { ...b, variant: v, location: loc };
    });

  // 3. Alert: Open provisional costs (docs 06 §4.3)
  const openProvisionalAllocations = data.lotAllocations.filter(a => {
    if (!a.isProvisional) return false;
    const settled = data.lotAllocations
      .filter(s => s.settlesAllocationId === a.id)
      .reduce((sum, s) => sum + s.qty, 0);
    const reversed = data.lotAllocations
      .filter(r => r.reversesAllocationId === a.id)
      .reduce((sum, r) => sum + Math.abs(r.qty), 0);
    return (a.qty - settled - reversed) > 0;
  });

  // 4. Alert: Items below reorder level at current location
  const lowStockItems = data.stockBalances
    .filter(b => b.locationId === currentLocation.id && b.onHand <= 5 && b.onHand >= 0)
    .map(b => {
      const v = data.variants.find(item => item.id === b.variantId);
      return { ...b, variant: v };
    });

  // 5. Alert: Pending in-transit transfers
  const pendingTransfers = data.transfers.filter(t => t.status === 'DISPATCHED');

  // 6. Alert: Open stocktake sessions
  const openStocktakes = data.stocktakeSessions.filter(s => s.status === 'OPEN' || s.status === 'COUNTING');

  // Total inventory valuation at FIFO
  const totalValuation = data.costLots
    .filter(l => l.remainingQty > 0)
    .reduce((sum, l) => sum + (l.remainingQty * l.unitCost), 0);

  const totalPieces = data.costLots
    .filter(l => l.remainingQty > 0)
    .reduce((sum, l) => sum + l.remainingQty, 0);

  const inTransitPieces = data.costLots
    .filter(l => l.locationId === 'LOC-TRANSIT' && l.remainingQty > 0)
    .reduce((sum, l) => sum + l.remainingQty, 0);

  return (
    <div className="space-y-6">
      {/* Top Banner with Location Greeting */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 p-6 rounded-2xl border border-slate-800 shadow-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-amber-400 font-bold text-sm">مرحباً بك في لوحة تحكم المخزون والمحاسبة</span>
            <span className="text-xs bg-slate-800 text-slate-300 px-2 py-0.5 rounded-full border border-slate-700">
              {currentLocation.nameAr}
            </span>
          </div>
          <h2 className="text-2xl font-extrabold text-slate-100">
            {data.settings.shopName}
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            تسعير دقيق بالوارد أولاً يصرف أولاً (FIFO) • فحص التكامل والقيود اليومية التلقائية • وثيقة 06
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => onNavigate('pos')}
            className="flex items-center gap-2 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-slate-950 font-bold px-4 py-2.5 rounded-xl text-xs shadow-lg shadow-amber-500/20 transition-all cursor-pointer"
          >
            <ShoppingCart className="w-4 h-4" />
            <span>نقطة بيع سريعة (POS)</span>
          </button>

          <button
            onClick={() => onNavigate('accounting')}
            className="flex items-center gap-2 bg-slate-800 hover:bg-slate-700 text-amber-300 font-semibold px-4 py-2.5 rounded-xl text-xs border border-amber-500/30 transition-all cursor-pointer"
          >
            <CircleDollarSign className="w-4 h-4 text-amber-400" />
            <span>الملخص المحاسبي اليومي</span>
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Today's Sales */}
        <div className="bg-slate-900/90 p-4 rounded-2xl border border-slate-800 shadow-sm relative overflow-hidden">
          <div className="flex items-center justify-between text-xs text-slate-400 mb-2">
            <span>مبيعات اليوم (الإيراد)</span>
            <span className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              <TrendingUp className="w-4 h-4" />
            </span>
          </div>
          <div className="text-xl font-bold text-slate-100 font-mono">
            {formatCurrency(todayRevenue)}
          </div>
          <div className="text-[11px] text-slate-400 mt-1 flex items-center justify-between">
            <span>عدد الفواتير: <strong className="text-slate-200">{todaySales.length}</strong></span>
            <span className="text-emerald-400 font-semibold">ربح تقريبي: {formatCurrency(todayProfit)}</span>
          </div>
        </div>

        {/* Today's COGS */}
        <div className="bg-slate-900/90 p-4 rounded-2xl border border-slate-800 shadow-sm relative overflow-hidden">
          <div className="flex items-center justify-between text-xs text-slate-400 mb-2">
            <span>تكلفة مبيعات اليوم (COGS FIFO)</span>
            <span className="p-1.5 rounded-lg bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
              <Coins className="w-4 h-4" />
            </span>
          </div>
          <div className="text-xl font-bold text-slate-100 font-mono">
            {formatCurrency(todayCogs)}
          </div>
          <div className="text-[11px] text-slate-400 mt-1 flex items-center justify-between">
            <span>وفق تسعير أقدم اللوطات</span>
            <span className="text-indigo-400 font-semibold">وثيقة 06 §4.1</span>
          </div>
        </div>

        {/* Total FIFO Valuation */}
        <div className="bg-slate-900/90 p-4 rounded-2xl border border-slate-800 shadow-sm relative overflow-hidden">
          <div className="flex items-center justify-between text-xs text-slate-400 mb-2">
            <span>قيمة المخزون الإجمالية (FIFO)</span>
            <span className="p-1.5 rounded-lg bg-amber-500/10 text-amber-400 border border-amber-500/20">
              <Boxes className="w-4 h-4" />
            </span>
          </div>
          <div className="text-xl font-bold text-amber-400 font-mono">
            {formatCurrency(totalValuation)}
          </div>
          <div className="text-[11px] text-slate-400 mt-1 flex items-center justify-between">
            <span>إجمالي القطع: <strong className="text-slate-200">{formatNumber(totalPieces)}</strong></span>
            <span className="text-slate-400">جميع المستودعات والفروع</span>
          </div>
        </div>

        {/* Goods in Transit */}
        <div className="bg-slate-900/90 p-4 rounded-2xl border border-slate-800 shadow-sm relative overflow-hidden">
          <div className="flex items-center justify-between text-xs text-slate-400 mb-2">
            <span>بضاعة بالطريق (ترانزيت)</span>
            <span className="p-1.5 rounded-lg bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
              <Truck className="w-4 h-4" />
            </span>
          </div>
          <div className="text-xl font-bold text-slate-100 font-mono">
            {formatNumber(inTransitPieces)} <span className="text-xs font-normal text-slate-400">قطعة</span>
          </div>
          <div className="text-[11px] text-slate-400 mt-1 flex items-center justify-between">
            <span>شحنات قيد النقل: <strong className="text-cyan-400">{pendingTransfers.length}</strong></span>
            <span className="text-slate-400">تحتفظ بقيمتها كأصل</span>
          </div>
        </div>
      </div>

      {/* Critical Alerts Section (06-accounting-rules.md §4.3) */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-bold text-slate-200 flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-amber-400" />
            <span>لوحة التنبيهات الاستثنائية والتشغيلية (Alerts)</span>
          </h3>
          <span className="text-xs text-slate-400">مطلوب متابعتها لمنع الفروق المحاسبية</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {/* 1. Negative Stock Alert */}
          <div className={`p-4 rounded-2xl border transition-all ${
            negativeStockItems.length > 0 
              ? 'bg-rose-950/20 border-rose-500/40 text-rose-200' 
              : 'bg-slate-900/60 border-slate-800 text-slate-400'
          }`}>
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <div className={`p-1.5 rounded-lg ${negativeStockItems.length > 0 ? 'bg-rose-500/20 text-rose-400' : 'bg-slate-800 text-slate-500'}`}>
                  <AlertTriangle className="w-4 h-4" />
                </div>
                <h4 className="font-bold text-xs">أرصدة بالسالب (Negative Stock)</h4>
              </div>
              <span className={`text-xs font-mono font-bold px-2 py-0.5 rounded-full ${
                negativeStockItems.length > 0 ? 'bg-rose-500 text-slate-950' : 'bg-slate-800 text-slate-400'
              }`}>
                {negativeStockItems.length}
              </span>
            </div>
            {negativeStockItems.length > 0 ? (
              <div className="space-y-2 mt-3">
                <p className="text-[11px] text-rose-300">
                  تم البيع بإذن استثنائي، ويجب استلام بضاعة لتسوية التكلفة:
                </p>
                <div className="space-y-1.5 max-h-32 overflow-y-auto">
                  {negativeStockItems.map((item, idx) => (
                    <div key={idx} className="p-2 rounded-lg bg-rose-950/40 border border-rose-500/20 flex items-center justify-between text-xs">
                      <div>
                        <div className="font-mono font-semibold">{item.variant?.sku}</div>
                        <div className="text-[10px] text-rose-400">{item.location?.nameAr}</div>
                      </div>
                      <span className="font-mono text-rose-400 font-bold">{item.onHand} قطعة</span>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <p className="text-xs text-slate-500 mt-2">
                لا توجد أصناف برصيد سالب حالياً. كافة الأرصدة موجبة ومطابقة.
              </p>
            )}
          </div>

          {/* 2. Open Provisional Costs Alert (06 §4.3) */}
          <div className={`p-4 rounded-2xl border transition-all ${
            openProvisionalAllocations.length > 0 
              ? 'bg-amber-950/20 border-amber-500/40 text-amber-200' 
              : 'bg-slate-900/60 border-slate-800 text-slate-400'
          }`}>
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <div className={`p-1.5 rounded-lg ${openProvisionalAllocations.length > 0 ? 'bg-amber-500/20 text-amber-400' : 'bg-slate-800 text-slate-500'}`}>
                  <Clock className="w-4 h-4" />
                </div>
                <h4 className="font-bold text-xs">تكاليف مؤقتة مفتوحة (Provisional)</h4>
              </div>
              <span className={`text-xs font-mono font-bold px-2 py-0.5 rounded-full ${
                openProvisionalAllocations.length > 0 ? 'bg-amber-500 text-slate-950' : 'bg-slate-800 text-slate-400'
              }`}>
                {openProvisionalAllocations.length}
              </span>
            </div>
            {openProvisionalAllocations.length > 0 ? (
              <p className="text-xs text-amber-300 mt-2">
                توجد {openProvisionalAllocations.length} حركة بتكلفة مؤقتة (آخر سعر شراء معروف) تنتظر وصول لوط توريد لتسوية الفروق تلقائياً إلى تكلفة البضاعة المباعة COGS.
              </p>
            ) : (
              <p className="text-xs text-slate-500 mt-2">
                جميع المبيعات مسعرة بلوطات FIFO حقيقية ومغلقة بالكامل.
              </p>
            )}
            <button
              onClick={() => onNavigate('stock')}
              className="mt-3 text-[11px] text-amber-400 hover:underline flex items-center gap-1 cursor-pointer"
            >
              <span>معاينة لوطات التكلفة المفتوحة</span>
              <ChevronLeft className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* 3. Low Stock / Reorder Alerts */}
          <div className={`p-4 rounded-2xl border transition-all ${
            lowStockItems.length > 0 
              ? 'bg-orange-950/20 border-orange-500/40 text-orange-200' 
              : 'bg-slate-900/60 border-slate-800 text-slate-400'
          }`}>
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <div className={`p-1.5 rounded-lg ${lowStockItems.length > 0 ? 'bg-orange-500/20 text-orange-400' : 'bg-slate-800 text-slate-500'}`}>
                  <Boxes className="w-4 h-4" />
                </div>
                <h4 className="font-bold text-xs">تنبيهات حد الطلب (Reorder Alert)</h4>
              </div>
              <span className={`text-xs font-mono font-bold px-2 py-0.5 rounded-full ${
                lowStockItems.length > 0 ? 'bg-orange-500 text-slate-950' : 'bg-slate-800 text-slate-400'
              }`}>
                {lowStockItems.length}
              </span>
            </div>
            {lowStockItems.length > 0 ? (
              <div className="space-y-1.5 mt-2">
                <p className="text-[11px] text-orange-300">
                  أصناف قاربت على النفاد بفرع {currentLocation.nameAr}:
                </p>
                <div className="space-y-1 max-h-24 overflow-y-auto">
                  {lowStockItems.slice(0, 3).map((item, idx) => (
                    <div key={idx} className="flex justify-between text-xs bg-slate-950/40 p-1.5 rounded">
                      <span className="font-mono">{item.variant?.sku}</span>
                      <span className="text-orange-400 font-bold">{item.onHand} قطع</span>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <p className="text-xs text-slate-500 mt-2">
                لا توجد نواقص في هذا الفرع، جميع الأصناف فوق حد إعادة الطلب.
              </p>
            )}
            <button
              onClick={() => onNavigate('transfers')}
              className="mt-3 text-[11px] text-orange-400 hover:underline flex items-center gap-1 cursor-pointer"
            >
              <span>طلب تحويل بضاعة تعزيز من المخزن</span>
              <ChevronLeft className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* Lower Section: Pending Transfers & Active Stocktakes */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Pending Transfers in transit */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-sm space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-slate-200 flex items-center gap-2">
              <Truck className="w-4 h-4 text-cyan-400" />
              <span>التحويلات بين الفروع والترانزيت (4.2 In Transit)</span>
            </h3>
            <button
              onClick={() => onNavigate('transfers')}
              className="text-xs text-amber-400 hover:underline flex items-center gap-1 cursor-pointer"
            >
              <span>إدارة التحويلات</span>
              <ChevronLeft className="w-3.5 h-3.5" />
            </button>
          </div>

          {pendingTransfers.length > 0 ? (
            <div className="space-y-2">
              {pendingTransfers.map(tr => {
                const fromLoc = data.locations.find(l => l.id === tr.fromLocationId);
                const toLoc = data.locations.find(l => l.id === tr.toLocationId);
                const totalQty = tr.lines.reduce((sum, l) => sum + l.dispatchedQty, 0);

                return (
                  <div key={tr.id} className="p-3 bg-slate-950 rounded-xl border border-slate-800 flex items-center justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs font-bold text-slate-200">{tr.transferNo}</span>
                        <span className="text-[10px] bg-cyan-500/20 text-cyan-300 px-2 py-0.5 rounded">
                          بضاعة بالطريق
                        </span>
                      </div>
                      <div className="text-xs text-slate-400 mt-1">
                        من: <strong className="text-slate-300">{fromLoc?.nameAr}</strong> ← إلى: <strong className="text-slate-300">{toLoc?.nameAr}</strong>
                      </div>
                    </div>
                    <div className="text-left">
                      <div className="text-xs font-bold text-cyan-400 font-mono">{totalQty} قطعة</div>
                      <div className="text-[10px] text-slate-500">{tr.dispatchedAt ? new Date(tr.dispatchedAt).toLocaleTimeString('ar-EG') : ''}</div>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="text-center py-6 text-xs text-slate-500">
              لا توجد تحويلات جارية حالياً. البضاعة إما في المخازن أو الفروع.
            </div>
          )}
        </div>

        {/* Recent Invoices & Quick Cashier shortcut */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-sm space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-slate-200 flex items-center gap-2">
              <Receipt className="w-4 h-4 text-emerald-400" />
              <span>أحدث فواتير المبيعات الصادرة</span>
            </h3>
            <button
              onClick={() => onNavigate('sales')}
              className="text-xs text-amber-400 hover:underline flex items-center gap-1 cursor-pointer"
            >
              <span>سجل الفواتير</span>
              <ChevronLeft className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="space-y-2">
            {data.sales.slice(-3).reverse().map(sale => {
              const loc = data.locations.find(l => l.id === sale.locationId);
              return (
                <div key={sale.id} className="p-3 bg-slate-950 rounded-xl border border-slate-800 flex items-center justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs font-bold text-slate-200">{sale.invoiceNo}</span>
                      <span className="text-[10px] bg-slate-800 text-slate-300 px-2 py-0.5 rounded">
                        {sale.cashierName}
                      </span>
                    </div>
                    <div className="text-xs text-slate-400 mt-1">
                      {loc?.nameAr} • {sale.lines.length} صنف • الدفع: {sale.payments[0]?.method === 'CASH' ? 'كاش' : 'إلكتروني'}
                    </div>
                  </div>
                  <div className="text-left">
                    <div className="text-xs font-bold text-emerald-400 font-mono">{formatCurrency(sale.total)}</div>
                    <div className="text-[10px] text-slate-500">{new Date(sale.postedAt).toLocaleTimeString('ar-EG')}</div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};
