import React, { useState } from 'react';
import {
  ScrollText,
  Search,
  Filter,
  Building2,
  ArrowDownLeft,
  ArrowUpRight,
  ShieldCheck,
  Calendar,
} from 'lucide-react';
import { Location } from '../types';
import { AppStorage } from '../services/storage';
import { formatCurrency, formatDateTime } from '../utils/formatters';

interface LedgerScreenProps {
  currentLocation: Location;
}

export const LedgerScreen: React.FC<LedgerScreenProps> = ({
  currentLocation,
}) => {
  const storage = AppStorage.getInstance();
  const data = storage.getData();

  const [selectedLocationId, setSelectedLocationId] = useState(currentLocation.id);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterDocType, setFilterDocType] = useState<string>('all');

  // Filter movements
  const filteredMovements = data.stockMovements.filter(mov => {
    const doc = data.stockDocuments.find(d => d.id === mov.documentId);
    const variant = data.variants.find(v => v.id === mov.variantId);

    const matchesLoc = !selectedLocationId || mov.locationId === selectedLocationId;
    const matchesDocType = filterDocType === 'all' || doc?.type === filterDocType;
    const matchesSearch =
      variant?.sku.toLowerCase().includes(searchQuery.toLowerCase()) ||
      doc?.documentNo.toLowerCase().includes(searchQuery.toLowerCase());

    return matchesLoc && matchesDocType && matchesSearch;
  }).reverse(); // Newest first

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-md flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="p-1 rounded-lg bg-amber-500/10 text-amber-400">
              <ScrollText className="w-5 h-5" />
            </span>
            <h2 className="text-xl font-bold text-slate-100">دفتر حركات المخزون غير القابل للتعديل (Immutable Ledger)</h2>
          </div>
          <p className="text-xs text-slate-400">
            سجل دائم لكل حركة واردة أو منصرفة؛ لا يتم تعديل أو حذف أي حركة، والتصحيح يتم بوثائق عكسية فقط.
          </p>
        </div>

        <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-semibold">
          <ShieldCheck className="w-4 h-4" />
          <span>سجل غير قابل للتعديل (Immutable DB Guard)</span>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-sm flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="relative flex-1 w-full md:max-w-xs">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="بحث برقم الإذن أو الـ SKU..."
            className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 pl-9 text-xs text-slate-100 outline-none focus:border-amber-400"
          />
          <Search className="w-4 h-4 text-slate-500 absolute left-3 top-2.5" />
        </div>

        <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
          {/* Location filter */}
          <div className="flex items-center gap-2 bg-slate-950 px-3 py-2 rounded-xl border border-slate-800 text-xs">
            <Building2 className="w-4 h-4 text-amber-400" />
            <select
              value={selectedLocationId}
              onChange={(e) => setSelectedLocationId(e.target.value)}
              className="bg-transparent text-slate-100 outline-none cursor-pointer"
            >
              <option value="" className="bg-slate-900 text-slate-200">كافة المواقع والفروع</option>
              {data.locations.map(loc => (
                <option key={loc.id} value={loc.id} className="bg-slate-900 text-slate-200">
                  {loc.nameAr}
                </option>
              ))}
            </select>
          </div>

          {/* Doc Type Filter */}
          <div className="flex items-center gap-2 bg-slate-950 px-3 py-2 rounded-xl border border-slate-800 text-xs">
            <Filter className="w-4 h-4 text-slate-400" />
            <select
              value={filterDocType}
              onChange={(e) => setFilterDocType(e.target.value)}
              className="bg-transparent text-slate-100 outline-none cursor-pointer"
            >
              <option value="all" className="bg-slate-900 text-slate-200">كافة أنواع الوثائق</option>
              <option value="SALE" className="bg-slate-900 text-slate-200">مبيعات (SALE)</option>
              <option value="SALE_RETURN" className="bg-slate-900 text-slate-200">مرتجعات مبيعات (RETURN)</option>
              <option value="RECEIPT" className="bg-slate-900 text-slate-200">استلام مشتريات (RECEIPT)</option>
              <option value="TRANSFER_DISPATCH" className="bg-slate-900 text-slate-200">إرسال تحويل (DISPATCH)</option>
              <option value="TRANSFER_RECEIVE" className="bg-slate-900 text-slate-200">استلام تحويل (RECEIVE)</option>
              <option value="STOCKTAKE_ADJUSTMENT" className="bg-slate-900 text-slate-200">تسوية جرد (STOCKTAKE)</option>
            </select>
          </div>
        </div>
      </div>

      {/* Movements Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-right text-xs">
            <thead className="bg-slate-950 text-slate-400 border-b border-slate-800">
              <tr>
                <th className="p-3 font-bold">التاريخ والوقت</th>
                <th className="p-3 font-bold">رقم المستند / النوع</th>
                <th className="p-3 font-bold">الصنف (SKU)</th>
                <th className="p-3 font-bold">الموقع</th>
                <th className="p-3 font-bold text-center">حركة الكمية (Delta)</th>
                <th className="p-3 font-bold text-center">الرصيد بعدها (Balance)</th>
                <th className="p-3 font-bold text-left">تكلفة الوحدة</th>
                <th className="p-3 font-bold text-left">الأثر المالي (Value Delta)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800 text-slate-200 font-mono">
              {filteredMovements.map(mov => {
                const doc = data.stockDocuments.find(d => d.id === mov.documentId);
                const variant = data.variants.find(v => v.id === mov.variantId);
                const loc = data.locations.find(l => l.id === mov.locationId);
                const isInbound = mov.qtyDelta > 0;

                return (
                  <tr key={mov.id} className="hover:bg-slate-800/40 transition-colors">
                    <td className="p-3 text-slate-400 text-[11px] font-sans">
                      {formatDateTime(mov.createdAt)}
                    </td>

                    <td className="p-3 font-sans">
                      <div className="font-bold text-amber-400 font-mono text-xs">{doc?.documentNo}</div>
                      <span className="text-[10px] px-1.5 py-0.2 rounded bg-slate-800 text-slate-300">
                        {doc?.type}
                      </span>
                    </td>

                    <td className="p-3">
                      <span className="font-bold text-slate-100">{variant?.sku}</span>
                    </td>

                    <td className="p-3 font-sans text-slate-300">
                      {loc?.nameAr}
                    </td>

                    <td className="p-3 text-center">
                      <span className={`inline-flex items-center gap-1 font-bold px-2 py-0.5 rounded-full text-xs ${
                        isInbound ? 'bg-emerald-500/20 text-emerald-300' : 'bg-rose-500/20 text-rose-300'
                      }`}>
                        {isInbound ? <ArrowDownLeft className="w-3 h-3" /> : <ArrowUpRight className="w-3 h-3" />}
                        <span>{isInbound ? `+${mov.qtyDelta}` : mov.qtyDelta}</span>
                      </span>
                    </td>

                    <td className="p-3 text-center font-bold text-slate-200">
                      {mov.balanceAfter}
                    </td>

                    <td className="p-3 text-left text-slate-300">
                      {formatCurrency(mov.unitCost)}
                    </td>

                    <td className={`p-3 text-left font-bold ${
                      isInbound ? 'text-emerald-400' : 'text-slate-300'
                    }`}>
                      {formatCurrency(mov.valueDelta)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
