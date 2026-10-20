import React, { useState } from 'react';
import {
  Boxes,
  Building2,
  Search,
  Layers,
  Eye,
  AlertTriangle,
  Clock,
  Sparkles,
  Info,
  Calendar,
} from 'lucide-react';
import { CostLot, Location, Variant } from '../types';
import { AppStorage } from '../services/storage';
import { InventoryEngine } from '../services/inventoryEngine';
import { formatCurrency, formatDateTime, formatNumber } from '../utils/formatters';

interface StockScreenProps {
  currentLocation: Location;
}

export const StockScreen: React.FC<StockScreenProps> = ({
  currentLocation,
}) => {
  const storage = AppStorage.getInstance();
  const data = storage.getData();
  const engine = new InventoryEngine();

  const [selectedLocationId, setSelectedLocationId] = useState(currentLocation.id);
  const [searchQuery, setSearchQuery] = useState('');
  const [inspectVariant, setInspectVariant] = useState<Variant | null>(null);

  const activeLoc = data.locations.find(l => l.id === selectedLocationId) || data.locations[0];

  // Filter variants
  const filteredVariants = data.variants.filter(v => {
    const model = data.models.find(m => m.id === v.modelId);
    const color = data.colors.find(c => c.id === v.colorId);
    const size = data.sizes.find(s => s.id === v.sizeId);

    const matchesSearch =
      v.sku.toLowerCase().includes(searchQuery.toLowerCase()) ||
      v.barcode.includes(searchQuery) ||
      model?.nameAr.toLowerCase().includes(searchQuery.toLowerCase()) ||
      color?.nameAr.toLowerCase().includes(searchQuery.toLowerCase());

    return matchesSearch;
  });

  // Calculate totals for this location
  const locLots = data.costLots.filter(l => l.locationId === activeLoc.id && l.remainingQty > 0);
  const totalValuation = locLots.reduce((sum, l) => sum + (l.remainingQty * l.unitCost), 0);
  const totalPieces = locLots.reduce((sum, l) => sum + l.remainingQty, 0);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-md flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="p-1 rounded-lg bg-amber-500/10 text-amber-400">
              <Boxes className="w-5 h-5" />
            </span>
            <h2 className="text-xl font-bold text-slate-100">أرصدة المخزون ولوطات التكلفة (FIFO Stock Lots)</h2>
          </div>
          <p className="text-xs text-slate-400">
            أرصدة الأصناف بدقة الألوان والمقاسات، حساب التكلفة وفق لوطات الوارد أولاً يصرف أولاً، وتتبع العجز.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 bg-slate-950 px-3 py-2 rounded-xl border border-slate-800 text-xs">
            <Building2 className="w-4 h-4 text-amber-400" />
            <span className="text-slate-400">الموقع:</span>
            <select
              value={selectedLocationId}
              onChange={(e) => setSelectedLocationId(e.target.value)}
              className="bg-transparent text-slate-100 font-semibold outline-none cursor-pointer"
            >
              {data.locations.map(loc => (
                <option key={loc.id} value={loc.id} className="bg-slate-900 text-slate-200">
                  {loc.nameAr}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* KPI Cards for Selected Location */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-slate-900 p-4 rounded-2xl border border-slate-800">
          <span className="text-xs text-slate-400">قيمة المخزون في {activeLoc.nameAr}</span>
          <div className="text-xl font-bold font-mono text-amber-400 mt-1">
            {formatCurrency(totalValuation)}
          </div>
          <div className="text-[11px] text-slate-500 mt-1">مسعرة بالكامل بنظام FIFO</div>
        </div>

        <div className="bg-slate-900 p-4 rounded-2xl border border-slate-800">
          <span className="text-xs text-slate-400">إجمالي القطع المتوفرة</span>
          <div className="text-xl font-bold font-mono text-slate-100 mt-1">
            {formatNumber(totalPieces)} <span className="text-xs font-normal text-slate-400">قطعة</span>
          </div>
          <div className="text-[11px] text-slate-500 mt-1">موزعة عبر اللوطات المفتوحة</div>
        </div>

        <div className="bg-slate-900 p-4 rounded-2xl border border-slate-800">
          <span className="text-xs text-slate-400">حالة الفرع</span>
          <div className="text-base font-bold text-slate-200 mt-1 flex items-center gap-2">
            <span>{activeLoc.canSell ? 'فرع تجزئة ونقطة بيع' : 'مستودع / حجر تخزين'}</span>
          </div>
          <div className="text-[11px] text-slate-500 mt-1">كود الموقع: {activeLoc.code}</div>
        </div>
      </div>

      {/* Search & Stock Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-sm">
        <div className="p-4 bg-slate-950 border-b border-slate-800 flex items-center justify-between gap-4">
          <div className="relative flex-1 max-w-md">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="بحث بالـ SKU أو الباركود أو اسم الموديل..."
              className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 pl-9 text-xs text-slate-100 outline-none focus:border-amber-400"
            />
            <Search className="w-4 h-4 text-slate-500 absolute left-3 top-2.5" />
          </div>

          <span className="text-xs text-slate-400">
            عدد الأصناف: <strong className="text-slate-200">{filteredVariants.length}</strong>
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-right text-xs">
            <thead className="bg-slate-950/80 text-slate-400 border-b border-slate-800">
              <tr>
                <th className="p-3 font-bold">الصنف (SKU)</th>
                <th className="p-3 font-bold">الموديل واللون والمقاس</th>
                <th className="p-3 font-bold">الباركود (Code 128)</th>
                <th className="p-3 font-bold text-center">الرصيد الفعلي (On Hand)</th>
                <th className="p-3 font-bold text-center">المتاح للبيع (Available)</th>
                <th className="p-3 font-bold text-left">قيمة FIFO الحالية</th>
                <th className="p-3 font-bold text-center">فحص اللوطات</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800 text-slate-200">
              {filteredVariants.map(variant => {
                const model = data.models.find(m => m.id === variant.modelId);
                const color = data.colors.find(c => c.id === variant.colorId);
                const size = data.sizes.find(s => s.id === variant.sizeId);
                const bal = engine.getBalance(variant.id, activeLoc.id);
                const isNegative = bal.onHand < 0;
                const isLow = bal.onHand <= variant.reorderLevel && bal.onHand >= 0;

                // Calculate FIFO value for this variant at this location
                const varLots = data.costLots.filter(
                  l => l.variantId === variant.id && l.locationId === activeLoc.id && l.remainingQty > 0
                );
                const fifoValue = varLots.reduce((sum, l) => sum + (l.remainingQty * l.unitCost), 0);

                return (
                  <tr
                    key={variant.id}
                    className={`hover:bg-slate-800/40 transition-colors ${
                      isNegative ? 'bg-rose-950/20' : ''
                    }`}
                  >
                    <td className="p-3 font-mono font-bold text-amber-400">
                      {variant.sku}
                    </td>

                    <td className="p-3">
                      <div className="font-semibold text-slate-100">{model?.nameAr}</div>
                      <div className="text-[11px] text-slate-400 flex items-center gap-1.5 mt-0.5">
                        <span
                          className="w-2.5 h-2.5 rounded-full inline-block border border-slate-700"
                          style={{ backgroundColor: color?.hex }}
                        />
                        <span>{color?.nameAr}</span>
                        <span>•</span>
                        <span className="font-bold text-slate-300">مقاس {size?.code}</span>
                      </div>
                    </td>

                    <td className="p-3 font-mono text-slate-400 text-[11px]">
                      {variant.barcode}
                    </td>

                    <td className="p-3 text-center font-mono">
                      <span className={`inline-block px-2.5 py-1 rounded-full text-xs font-bold ${
                        isNegative
                          ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40'
                          : isLow
                          ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                          : 'bg-emerald-500/10 text-emerald-300'
                      }`}>
                        {bal.onHand} قطعة
                      </span>
                    </td>

                    <td className="p-3 text-center font-mono text-slate-300">
                      {bal.onHand - bal.reserved}
                    </td>

                    <td className="p-3 text-left font-mono font-bold text-slate-200">
                      {formatCurrency(fifoValue)}
                    </td>

                    <td className="p-3 text-center">
                      <button
                        onClick={() => setInspectVariant(variant)}
                        className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-amber-400 transition-colors cursor-pointer"
                        title="معاينة لوطات التكلفة FIFO لهذا الصنف"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* FIFO Cost Lots Inspector Modal (Section 4.1 & Section 7 Invariants) */}
      {inspectVariant && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-2xl w-full p-6 text-slate-200 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-mono text-sm font-bold text-amber-400">{inspectVariant.sku}</span>
                  <span className="text-xs bg-slate-800 text-slate-300 px-2 py-0.5 rounded">
                    {activeLoc.nameAr}
                  </span>
                </div>
                <p className="text-xs text-slate-400 mt-1">
                  لوطات التكلفة المفتوحة والمنصرفة (Cost Lots Ledger) وفق أولوية التاريخ التسلسلي
                </p>
              </div>

              <button onClick={() => setInspectVariant(null)} className="text-slate-400 hover:text-slate-100">
                ✕
              </button>
            </div>

            {/* Lots table */}
            <div className="overflow-x-auto max-h-72 border border-slate-800 rounded-xl">
              <table className="w-full text-right text-xs">
                <thead className="bg-slate-950 text-slate-400 border-b border-slate-800">
                  <tr>
                    <th className="p-2.5 font-bold">تاريخ FIFO</th>
                    <th className="p-2.5 font-bold">مصدر اللوط</th>
                    <th className="p-2.5 font-bold text-center">الكمية الأصلية</th>
                    <th className="p-2.5 font-bold text-center">المتبقي للصرف</th>
                    <th className="p-2.5 font-bold text-left">تكلفة الوحدة</th>
                    <th className="p-2.5 font-bold text-left">إجمالي القيمة</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800 font-mono">
                  {data.costLots
                    .filter(l => l.variantId === inspectVariant.id && l.locationId === activeLoc.id)
                    .map(lot => {
                      const isClosed = lot.remainingQty === 0;

                      return (
                        <tr key={lot.id} className={isClosed ? 'opacity-40 bg-slate-950/20' : 'bg-slate-950/60'}>
                          <td className="p-2.5 text-slate-300 font-sans text-[11px]">
                            {formatDateTime(lot.fifoDate)}
                          </td>
                          <td className="p-2.5 font-sans">
                            <span className="text-[10px] px-2 py-0.5 rounded bg-slate-800 text-slate-300">
                              {lot.costSource === 'PURCHASE_RECEIPT' ? 'استلام شراء' :
                               lot.costSource === 'TRANSFER_IN' ? 'وارد تحويل' :
                               lot.costSource === 'SALE_RETURN' ? 'مرتجع عميل' : 'رصيد افتتاحي'}
                            </span>
                            {lot.isProvisional && (
                              <span className="text-[9px] mr-1 text-amber-400 font-bold">
                                (تكلفة افتتاحية تقديرية)
                              </span>
                            )}
                          </td>
                          <td className="p-2.5 text-center text-slate-400">{lot.originalQty}</td>
                          <td className="p-2.5 text-center font-bold text-amber-400">{lot.remainingQty}</td>
                          <td className="p-2.5 text-left text-slate-200">{formatCurrency(lot.unitCost)}</td>
                          <td className="p-2.5 text-left font-bold text-emerald-400">
                            {formatCurrency(lot.remainingQty * lot.unitCost)}
                          </td>
                        </tr>
                      );
                    })}
                </tbody>
              </table>
            </div>

            <div className="flex justify-between items-center text-xs text-slate-400 pt-2">
              <span>تستهلك المبيعات اللوطات الأقدم تاريخاً أولاً (Strict FIFO)</span>
              <button
                onClick={() => setInspectVariant(null)}
                className="px-4 py-2 bg-slate-800 text-slate-200 hover:bg-slate-700 rounded-xl text-xs font-semibold"
              >
                إغلاق
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
