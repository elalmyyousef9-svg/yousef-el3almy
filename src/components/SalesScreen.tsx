import React, { useState } from 'react';
import {
  Receipt,
  Search,
  Filter,
  Eye,
  RotateCcw,
  CheckCircle,
  AlertTriangle,
  Building2,
  Calendar,
  DollarSign,
  Printer,
  ShieldCheck,
} from 'lucide-react';
import { Location, RoleId, Sale } from '../types';
import { AppStorage } from '../services/storage';
import { InventoryEngine } from '../services/inventoryEngine';
import { formatCurrency, formatDateTime, generateDocNumber, round2 } from '../utils/formatters';

interface SalesScreenProps {
  currentLocation: Location;
  currentRole: RoleId;
}

export const SalesScreen: React.FC<SalesScreenProps> = ({
  currentLocation,
  currentRole,
}) => {
  const storage = AppStorage.getInstance();
  const data = storage.getData();
  const engine = new InventoryEngine();

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSale, setSelectedSale] = useState<Sale | null>(null);
  const [showReturnModal, setShowReturnModal] = useState(false);
  const [returnDestination, setReturnDestination] = useState<string>(currentLocation.id);
  const [returnQty, setReturnQty] = useState(1);
  const [returnReason, setReturnReason] = useState('');

  // Filter sales
  const filteredSales = data.sales.filter(s => {
    return (
      s.invoiceNo.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.cashierName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (s.customerName && s.customerName.toLowerCase().includes(searchQuery.toLowerCase()))
    );
  }).reverse();

  // Process customer return (Docs 05 §5 & 06 §4.1)
  const handleProcessReturn = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSale) return;

    try {
      const line = selectedSale.lines[0];
      const maxReturnable = line.qty - line.returnedQty;

      if (returnQty > maxReturnable) {
        alert(`الكمية المراد إرجاعها (${returnQty}) تتجاوز المتاح للإرجاع (${maxReturnable})`);
        return;
      }

      const returnDocNo = `RET-${selectedSale.invoiceNo}`;
      const destLoc = data.locations.find(l => l.id === returnDestination);

      // Find original sale movement to obtain unitCost and FIFO date
      const saleMov = data.stockMovements.find(m => m.documentId.includes(selectedSale.invoiceNo) || m.qtyDelta < 0);
      const unitCost = saleMov ? Math.abs(saleMov.unitCost) : 200;

      // Post Return Document to FIFO Engine:
      // Line: {destination, +qty, costSource: 'SALE_RETURN'}
      engine.postDocument({
        type: 'SALE_RETURN',
        documentNo: returnDocNo,
        notes: `مرتجع مبيعات للفاتورة ${selectedSale.invoiceNo} - فحص: ${destLoc?.nameAr} - سبب: ${returnReason || 'طلب العميل'}`,
        postedBy: currentRole === 'cashier' ? 'أحمد سامي (الكاشير)' : 'مدير النظام',
        lines: [
          {
            variantId: line.variantId,
            locationId: returnDestination,
            qtyDelta: returnQty, // Inbound return
            unitCost,
            costSource: 'SALE_RETURN',
          }
        ],
      });

      // Update sale record
      line.returnedQty += returnQty;
      if (line.returnedQty >= line.qty) {
        selectedSale.status = 'RETURNED';
      } else {
        selectedSale.status = 'PARTIALLY_RETURNED';
      }

      data.auditLogs.push({
        id: `AUD-${Date.now()}`,
        userId: 'cashier-01',
        userName: 'الكاشير',
        action: 'SALE_RETURN',
        entity: 'SALE',
        entityId: selectedSale.invoiceNo,
        after: { returnedQty: returnQty, destination: destLoc?.nameAr, reason: returnReason },
        at: new Date().toISOString(),
      });

      storage.save();
      setShowReturnModal(false);
      alert(`تم تسجيل المرتجع بنجاح للفرع [${destLoc?.nameAr}] وإعادة لوط التكلفة بتكلفة الشراء الأصلية.`);
    } catch (err: any) {
      alert(err.message || 'فشل تسجيل المرتجع');
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-md flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="p-1 rounded-lg bg-emerald-500/10 text-emerald-400">
              <Receipt className="w-5 h-5" />
            </span>
            <h2 className="text-xl font-bold text-slate-100">سجل فواتير المبيعات والمرتجعات (Sales & Returns)</h2>
          </div>
          <p className="text-xs text-slate-400">
            البحث في الفواتير الصادرة، تفاصيل المدفوعات، وإجراء المرتجعات مع فحص الوجهة (صالح للبيع / حجر / هالك) ورد تكلفة FIFO الأصلية.
          </p>
        </div>
      </div>

      {/* Filter and List */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-sm">
        <div className="p-4 bg-slate-950 border-b border-slate-800 flex items-center justify-between gap-4">
          <div className="relative flex-1 max-w-md">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="ابحث برقم الفاتورة أو اسم الكاشير أو العميل..."
              className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 pl-9 text-xs text-slate-100 outline-none focus:border-amber-400"
            />
            <Search className="w-4 h-4 text-slate-500 absolute left-3 top-2.5" />
          </div>

          <span className="text-xs text-slate-400">عدد الفواتير: {filteredSales.length}</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-right text-xs">
            <thead className="bg-slate-950/80 text-slate-400 border-b border-slate-800">
              <tr>
                <th className="p-3 font-bold">رقم الفاتورة</th>
                <th className="p-3 font-bold">تاريخ البيع</th>
                <th className="p-3 font-bold">الفرع</th>
                <th className="p-3 font-bold">الكاشير</th>
                <th className="p-3 font-bold">طريقة الدفع</th>
                <th className="p-3 font-bold text-left">إجمالي الفاتورة</th>
                <th className="p-3 font-bold text-left">تكلفة FIFO (COGS)</th>
                <th className="p-3 font-bold text-center">الحالة</th>
                <th className="p-3 font-bold text-center">الإجراء</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800 text-slate-200">
              {filteredSales.map(sale => {
                const loc = data.locations.find(l => l.id === sale.locationId);
                const payment = sale.payments[0];

                return (
                  <tr key={sale.id} className="hover:bg-slate-800/40 transition-colors">
                    <td className="p-3 font-mono font-bold text-amber-400">
                      {sale.invoiceNo}
                    </td>

                    <td className="p-3 text-slate-400 text-[11px]">
                      {formatDateTime(sale.postedAt)}
                    </td>

                    <td className="p-3 text-slate-300">
                      {loc?.nameAr}
                    </td>

                    <td className="p-3 text-slate-300">
                      {sale.cashierName}
                    </td>

                    <td className="p-3">
                      <span className="px-2 py-0.5 rounded text-[10px] bg-slate-800 text-slate-300">
                        {payment?.method === 'CASH' ? 'نقدي (Cash)' :
                         payment?.method === 'CARD' ? 'فيزا / بطاقة' : 'محفظة إلكترونية'}
                      </span>
                    </td>

                    <td className="p-3 text-left font-mono font-bold text-emerald-400">
                      {formatCurrency(sale.total)}
                    </td>

                    <td className="p-3 text-left font-mono text-indigo-400">
                      {formatCurrency(sale.cogsTotal)}
                    </td>

                    <td className="p-3 text-center">
                      <span className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                        sale.status === 'POSTED'
                          ? 'bg-emerald-500/20 text-emerald-300'
                          : sale.status === 'PARTIALLY_RETURNED'
                          ? 'bg-amber-500/20 text-amber-300'
                          : 'bg-rose-500/20 text-rose-300'
                      }`}>
                        {sale.status === 'POSTED' ? 'مكتملة ومرحلة' :
                         sale.status === 'PARTIALLY_RETURNED' ? 'مرتجع جزئي' : 'مرتجع بالكامل'}
                      </span>
                    </td>

                    <td className="p-3 text-center">
                      <div className="flex items-center justify-center gap-1.5">
                        <button
                          onClick={() => setSelectedSale(sale)}
                          className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-amber-400 transition-colors"
                          title="عرض تفاصيل الفاتورة"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        {sale.status !== 'RETURNED' && (
                          <button
                            onClick={() => {
                              setSelectedSale(sale);
                              setShowReturnModal(true);
                            }}
                            className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-rose-400 transition-colors"
                            title="إجراء مرتجع للعميل"
                          >
                            <RotateCcw className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Invoice Details Modal */}
      {selectedSale && !showReturnModal && (
        <div className="fixed inset-0 bg-black/75 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-lg w-full p-6 text-slate-200 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div>
                <span className="font-mono text-sm font-bold text-amber-400">{selectedSale.invoiceNo}</span>
                <div className="text-xs text-slate-400 mt-0.5">
                  الكاشير: {selectedSale.cashierName} • {formatDateTime(selectedSale.postedAt)}
                </div>
              </div>
              <button onClick={() => setSelectedSale(null)} className="text-slate-400 hover:text-slate-100">
                ✕
              </button>
            </div>

            {/* Lines */}
            <div className="border border-slate-800 rounded-xl overflow-hidden">
              <table className="w-full text-right text-xs">
                <thead className="bg-slate-950 text-slate-400 border-b border-slate-800">
                  <tr>
                    <th className="p-2.5 font-bold">الصنف</th>
                    <th className="p-2.5 font-bold text-center">الكمية المباعة</th>
                    <th className="p-2.5 font-bold text-left">سعر البيع</th>
                    <th className="p-2.5 font-bold text-left">الإجمالي</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800 font-mono">
                  {selectedSale.lines.map((l, i) => {
                    const v = data.variants.find(item => item.id === l.variantId);
                    return (
                      <tr key={i} className="hover:bg-slate-800/30">
                        <td className="p-2.5 font-sans font-semibold text-slate-200">{v?.sku}</td>
                        <td className="p-2.5 text-center text-slate-100">{l.qty}</td>
                        <td className="p-2.5 text-left text-slate-300">{formatCurrency(l.unitPrice)}</td>
                        <td className="p-2.5 text-left font-bold text-emerald-400">{formatCurrency(l.qty * l.unitPrice)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 text-xs space-y-1">
              <div className="flex justify-between text-slate-400">
                <span>المجموع الفرعي:</span>
                <span>{formatCurrency(selectedSale.subtotal)}</span>
              </div>
              {selectedSale.discount > 0 && (
                <div className="flex justify-between text-rose-400">
                  <span>الخصم:</span>
                  <span>-{formatCurrency(selectedSale.discount)}</span>
                </div>
              )}
              <div className="flex justify-between font-bold text-amber-400 pt-1 border-t border-slate-800">
                <span>الصافي المدفوع:</span>
                <span>{formatCurrency(selectedSale.total)}</span>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => setSelectedSale(null)}
                className="px-4 py-2 bg-slate-800 text-slate-300 rounded-xl text-xs font-semibold"
              >
                إغلاق
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Customer Return Modal (Docs 05 §5 Reversals) */}
      {showReturnModal && selectedSale && (
        <div className="fixed inset-0 bg-black/75 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <form onSubmit={handleProcessReturn} className="bg-slate-900 border border-slate-800 rounded-2xl max-w-md w-full p-6 text-slate-200 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="font-bold text-base text-slate-100 flex items-center gap-2">
                <RotateCcw className="w-5 h-5 text-rose-400" />
                <span>إجراء مرتجع مبيعات (Customer Return)</span>
              </h3>
              <button type="button" onClick={() => setShowReturnModal(false)} className="text-slate-400 hover:text-slate-100">
                ✕
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="p-2.5 bg-slate-950 rounded-lg border border-slate-800 font-mono flex justify-between">
                <span className="text-slate-400">الفاتورة: {selectedSale.invoiceNo}</span>
                <span className="text-amber-400 font-bold">{data.variants.find(v => v.id === selectedSale.lines[0]?.variantId)?.sku}</span>
              </div>

              <div className="space-y-1">
                <label className="text-slate-400 font-semibold">كمية المرتجع:</label>
                <input
                  type="number"
                  min="1"
                  max={selectedSale.lines[0]?.qty - selectedSale.lines[0]?.returnedQty}
                  value={returnQty}
                  onChange={(e) => setReturnQty(parseInt(e.target.value, 10) || 1)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2 text-slate-100 font-mono outline-none"
                />
              </div>

              <div className="space-y-1">
                <label className="text-slate-400 font-semibold">وجهة استلام المرتجع بعد الفحص (Inspection):</label>
                <select
                  value={returnDestination}
                  onChange={(e) => setReturnDestination(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2 text-slate-100 outline-none"
                >
                  <option value={currentLocation.id}>فرع البيع نفسه (سليم وصالح لإعادة العرض والبيع)</option>
                  <option value="LOC-QUARANTINE">حجر الفحص والاسترجاع (يحتاج تدقيق جودة)</option>
                  <option value="LOC-DAMAGED">مخزن التوالف والهالك (به عيب صناعة أو تمزق)</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-slate-400 font-semibold">سبب المرتجع:</label>
                <input
                  type="text"
                  value={returnReason}
                  onChange={(e) => setReturnReason(e.target.value)}
                  placeholder="مثال: مقاس غير مناسب أو رغبة العميل..."
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2 text-slate-100 outline-none"
                />
              </div>

              <div className="p-2.5 bg-slate-950 rounded-lg border border-slate-800 text-[11px] text-slate-400">
                ℹ️ وفق وثيقة المحاسبة (Section 4.1): ينشئ المرتجع لوط تكلفة جديد بالوجهة المحددة يحتفظ بنفس تاريخ وتكلفة الـ FIFO الأصلية للبيع، ويخفض تكلفة المبيعات COGS بنفس القيمة.
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowReturnModal(false)}
                className="px-4 py-2 bg-slate-800 text-slate-300 rounded-xl text-xs font-semibold"
              >
                إلغاء
              </button>
              <button
                type="submit"
                className="px-5 py-2 bg-rose-500 hover:bg-rose-600 text-slate-950 font-bold rounded-xl text-xs cursor-pointer"
              >
                تأكيد المرتجع ورد القيمة
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};
