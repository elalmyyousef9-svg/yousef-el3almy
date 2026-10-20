/**
 * MontuCode Accounting Engine (Docs 06: Accounting Rules)
 * Produces exact, exportable summaries and journal mappings for the General Ledger.
 */

import { DailyAccountingSummary, JournalEntry } from '../types';
import { round2 } from '../utils/formatters';
import { AppStorage } from './storage';

export class AccountingEngine {
  private storage = AppStorage.getInstance();

  /**
   * Compute the full Daily Accounting Summary for a given date range
   */
  public generateSummary(fromIso: string, toIso: string, filterLocationId?: string): DailyAccountingSummary {
    const data = this.storage.getData();

    const fromTime = new Date(fromIso).getTime();
    const toTime = new Date(toIso).getTime();

    const isDateInRange = (dateStr: string) => {
      const t = new Date(dateStr).getTime();
      return t >= fromTime && t <= toTime;
    };

    // 1. Sales Revenue
    // Σ sale totals (net of discounts), minus returns and cancels, by payment method
    let grossSales = 0;
    let totalDiscounts = 0;
    let returnsDeduction = 0;
    const byPaymentMethod = { cash: 0, card: 0, wallet: 0 };

    const targetSales = data.sales.filter(s => {
      if (filterLocationId && s.locationId !== filterLocationId) return false;
      return isDateInRange(s.postedAt);
    });

    for (const sale of targetSales) {
      if (sale.status === 'CANCELLED') continue;

      grossSales += sale.subtotal;
      totalDiscounts += sale.discount;

      if (sale.status === 'POSTED' || sale.status === 'PARTIALLY_RETURNED') {
        for (const p of sale.payments) {
          if (p.method === 'CASH') byPaymentMethod.cash += p.amount;
          else if (p.method === 'CARD') byPaymentMethod.card += p.amount;
          else if (p.method === 'WALLET') byPaymentMethod.wallet += p.amount;
        }
      }

      if (sale.status === 'RETURNED') {
        returnsDeduction += sale.total;
      }
    }

    const totalRevenue = round2(grossSales - totalDiscounts - returnsDeduction);

    // 2. Cost of Goods Sold (COGS)
    // Σ allocation value of SALE documents − Σ allocation value of SALE_RETURN/SALE_CANCEL + settlement adjustments
    let saleAllocationsValue = 0;
    let saleReturnsValue = 0;
    let settlementAdjustmentsVal = 0;

    // Movement IDs of sales in date range
    const saleDocIds = data.stockDocuments
      .filter(d => isDateInRange(d.postedAt))
      .map(d => d.id);

    const periodMovements = data.stockMovements.filter(m => {
      if (filterLocationId && m.locationId !== filterLocationId) return false;
      return saleDocIds.includes(m.documentId) || isDateInRange(m.createdAt);
    });

    const periodMovementIds = periodMovements.map(m => m.id);

    for (const alloc of data.lotAllocations) {
      if (!isDateInRange(alloc.createdAt)) continue;

      // Check corresponding movement
      const mov = data.stockMovements.find(m => m.id === alloc.movementId);
      if (!mov || (filterLocationId && mov.locationId !== filterLocationId)) continue;

      const doc = data.stockDocuments.find(d => d.id === mov.documentId);
      if (!doc) continue;

      if (doc.type === 'SALE') {
        saleAllocationsValue += Math.abs(alloc.value);
      } else if (doc.type === 'SALE_RETURN' || doc.type === 'SALE_CANCEL') {
        saleReturnsValue += Math.abs(alloc.value);
      }

      // Check if this allocation settles a provisional
      if (alloc.settlesAllocationId) {
        const provAlloc = data.lotAllocations.find(a => a.id === alloc.settlesAllocationId);
        if (provAlloc) {
          const costDiff = (alloc.unitCost - provAlloc.unitCost) * alloc.qty;
          settlementAdjustmentsVal += costDiff;
        }
      }
    }

    const netCogs = round2(saleAllocationsValue - saleReturnsValue + settlementAdjustmentsVal);

    // 3. Inventory Adjustments
    // Σ value of STOCKTAKE_ADJUSTMENT and DAMAGE_WRITEOFF, split into gains and losses
    let gains = 0;
    let losses = 0;

    for (const mov of periodMovements) {
      const doc = data.stockDocuments.find(d => d.id === mov.documentId);
      if (!doc) continue;

      if (doc.type === 'STOCKTAKE_ADJUSTMENT' || doc.type === 'DAMAGE_WRITEOFF') {
        if (mov.qtyDelta > 0) {
          gains += Math.abs(mov.valueDelta);
        } else if (mov.qtyDelta < 0) {
          losses += Math.abs(mov.valueDelta);
        }
      }
    }

    gains = round2(gains);
    losses = round2(losses);
    const netAdjustment = round2(gains - losses);

    // 4. Purchases
    // Σ receipt value by supplier (payable) − vendor returns
    let receiptsPayable = 0;
    let vendorReturns = 0;
    const supplierMap = new Map<string, number>();

    const targetPurchases = data.purchases.filter(p => {
      if (filterLocationId && p.locationId !== filterLocationId) return false;
      return p.receivedAt && isDateInRange(p.receivedAt);
    });

    for (const po of targetPurchases) {
      let poTotal = 0;
      for (const line of po.lines) {
        poTotal += line.receivedQty * line.unitCost;
      }
      receiptsPayable += poTotal;
      const cur = supplierMap.get(po.supplierId) || 0;
      supplierMap.set(po.supplierId, cur + poTotal);
    }

    const bySupplier = Array.from(supplierMap.entries()).map(([supplierId, amount]) => {
      const sup = data.suppliers.find(s => s.id === supplierId);
      return {
        supplierId,
        supplierName: sup?.name || supplierId,
        amount: round2(amount),
      };
    });

    const netPurchases = round2(receiptsPayable - vendorReturns);

    // 5. Inventory Value (End)
    // Σ open lots × unit cost, by location (in-transit shown separately), minus open provisional value
    const locationValues = data.locations
      .filter(l => !filterLocationId || l.id === filterLocationId)
      .map(loc => {
        const lots = data.costLots.filter(l => l.locationId === loc.id && l.remainingQty > 0);
        const openLotsValue = lots.reduce((sum, l) => sum + (l.remainingQty * l.unitCost), 0);
        const pieceCount = lots.reduce((sum, l) => sum + l.remainingQty, 0);

        // Open provisional allocations at this location
        const movIds = data.stockMovements
          .filter(m => m.locationId === loc.id && m.qtyDelta < 0)
          .map(m => m.id);

        const openProvDeduction = data.lotAllocations
          .filter(a => a.isProvisional && movIds.includes(a.movementId))
          .reduce((sum, a) => {
            const settled = data.lotAllocations
              .filter(s => s.settlesAllocationId === a.id)
              .reduce((sub, s) => sub + s.qty, 0);
            const open = Math.max(0, a.qty - settled);
            return sum + (open * a.unitCost);
          }, 0);

        const netVal = round2(openLotsValue - openProvDeduction);

        return {
          locationId: loc.id,
          locationName: loc.nameAr,
          type: loc.type,
          openLotsValue: round2(openLotsValue),
          openProvisionalDeduction: round2(openProvDeduction),
          netValue: netVal,
          pieceCount,
        };
      });

    const totalEndingValue = round2(locationValues.reduce((sum, lv) => sum + lv.netValue, 0));
    const inTransitValue = locationValues.find(lv => lv.type === 'IN_TRANSIT')?.netValue || 0;

    // 6. Generate Suggested Journal Entries (Docs 06 Section 4.5)
    const suggestedJournalEntries: JournalEntry[] = [];
    let entrySeq = 1;

    // Journal Entry 1: Sales & Cash/Bank
    if (totalRevenue > 0) {
      suggestedJournalEntries.push({
        id: `JE-${entrySeq++}`,
        date: toIso.split('T')[0],
        referenceDoc: 'DAILY-SALES-REV',
        descriptionAr: `إثبات إيرادات المبيعات النقدية والإلكترونية اليومية للفترة`,
        lines: [
          ...(byPaymentMethod.cash > 0 ? [{
            accountCode: '10101',
            accountNameAr: 'الصندوق / نقدية الخزينة',
            accountNameEn: 'Cash on Hand',
            debit: round2(byPaymentMethod.cash),
            credit: 0,
            note: 'متحصلات المبيعات النقدية',
          }] : []),
          ...(byPaymentMethod.card > 0 ? [{
            accountCode: '10102',
            accountNameAr: 'البنك / حساب شبكة نقاط البيع',
            accountNameEn: 'Bank / POS Card Settlement',
            debit: round2(byPaymentMethod.card),
            credit: 0,
            note: 'متحصلات بطاقات الفيزا والماستركارد',
          }] : []),
          ...(byPaymentMethod.wallet > 0 ? [{
            accountCode: '10103',
            accountNameAr: 'المحافظ الإلكترونية',
            accountNameEn: 'E-Wallets',
            debit: round2(byPaymentMethod.wallet),
            credit: 0,
            note: 'فودافون كاش / انستاباي',
          }] : []),
          {
            accountCode: '40101',
            accountNameAr: 'إيرادات مبيعات الملابس الجاهزة',
            accountNameEn: 'Sales Revenue',
            debit: 0,
            credit: round2(totalRevenue),
            note: 'صافي مبيعات البوتيك',
          },
        ],
      });
    }

    // Journal Entry 2: COGS & Inventory FIFO Cost
    if (netCogs > 0) {
      suggestedJournalEntries.push({
        id: `JE-${entrySeq++}`,
        date: toIso.split('T')[0],
        referenceDoc: 'DAILY-COGS-FIFO',
        descriptionAr: `إثبات تكلفة البضاعة المباعة بنظام FIFO وصرف المخزون`,
        lines: [
          {
            accountCode: '50101',
            accountNameAr: 'تكلفة البضاعة المباعة (COGS)',
            accountNameEn: 'Cost of Goods Sold',
            debit: round2(netCogs),
            credit: 0,
            note: 'تكلفة FIFO للمبيعات مع تسويات التكلفة المؤقتة',
          },
          {
            accountCode: '10301',
            accountNameAr: 'مخزون بضاعة تامة الصنع - ملابس',
            accountNameEn: 'Inventory - Finished Clothing',
            debit: 0,
            credit: round2(netCogs),
            note: 'تخفيض المخزون بتكلفة اللوطات المنصرفة',
          },
        ],
      });
    }

    // Journal Entry 3: Purchases Receipts
    if (netPurchases > 0) {
      suggestedJournalEntries.push({
        id: `JE-${entrySeq++}`,
        date: toIso.split('T')[0],
        referenceDoc: 'DAILY-PURCHASES-REC',
        descriptionAr: `إثبات فواتير المشتريات واستلام بضاعة الموردين في المخزن`,
        lines: [
          {
            accountCode: '10301',
            accountNameAr: 'مخزون بضاعة تامة الصنع - ملابس',
            accountNameEn: 'Inventory - Finished Clothing',
            debit: round2(netPurchases),
            credit: 0,
            note: 'زيادة المخزون بلوطات تكلفة الشراء الواردة',
          },
          {
            accountCode: '20101',
            accountNameAr: 'أرصدة الموردين الدائنة',
            accountNameEn: 'Accounts Payable - Suppliers',
            debit: 0,
            credit: round2(netPurchases),
            note: 'استحقاق قيمة الفواتير للمصانع والموردين',
          },
        ],
      });
    }

    // Journal Entry 4: Stocktake Adjustments
    if (losses > 0 || gains > 0) {
      const adjLines = [];
      if (losses > 0) {
        adjLines.push({
          accountCode: '50201',
          accountNameAr: 'مصروف عجز وفروق الجرد والتوالف',
          accountNameEn: 'Inventory Variance Expense',
          debit: round2(losses),
          credit: 0,
          note: 'عجز جرد معتمد أو إهلاك تلفيات',
        });
        adjLines.push({
          accountCode: '10301',
          accountNameAr: 'مخزون بضاعة تامة الصنع - ملابس',
          accountNameEn: 'Inventory - Finished Clothing',
          debit: 0,
          credit: round2(losses),
          note: 'تخفيض المخزون بقيمة العجز',
        });
      }
      if (gains > 0) {
        adjLines.push({
          accountCode: '10301',
          accountNameAr: 'مخزون بضاعة تامة الصنع - ملابس',
          accountNameEn: 'Inventory - Finished Clothing',
          debit: round2(gains),
          credit: 0,
          note: 'إضافة المخزون بفائض الجرد',
        });
        adjLines.push({
          accountCode: '40201',
          accountNameAr: 'أرباح تسوية فائض الجرد',
          accountNameEn: 'Inventory Surplus Income',
          debit: 0,
          credit: round2(gains),
          note: 'قيد زيادة المخزون بالتكلفة التقديرية الأخيرة',
        });
      }

      suggestedJournalEntries.push({
        id: `JE-${entrySeq++}`,
        date: toIso.split('T')[0],
        referenceDoc: 'DAILY-INV-ADJUSTMENT',
        descriptionAr: `تسوية فروق الجرد المعتمدة وهالك البضاعة`,
        lines: adjLines,
      });
    }

    return {
      dateRange: { from: fromIso, to: toIso },
      locationId: filterLocationId,
      salesRevenue: {
        totalRevenue,
        byPaymentMethod: {
          cash: round2(byPaymentMethod.cash),
          card: round2(byPaymentMethod.card),
          wallet: round2(byPaymentMethod.wallet),
        },
        totalDiscounts: round2(totalDiscounts),
        grossSales: round2(grossSales),
        returnsDeduction: round2(returnsDeduction),
      },
      cogs: {
        saleAllocationsValue: round2(saleAllocationsValue),
        saleReturnsValue: round2(saleReturnsValue),
        settlementAdjustments: round2(settlementAdjustmentsVal),
        netCogs,
      },
      inventoryAdjustments: {
        gains,
        losses,
        netAdjustment,
      },
      purchases: {
        receiptsPayable: round2(receiptsPayable),
        vendorReturns: round2(vendorReturns),
        netPurchases,
        bySupplier,
      },
      inventoryValueEnd: {
        totalValue: totalEndingValue,
        byLocation: locationValues,
        inTransitValue: round2(inTransitValue),
      },
      suggestedJournalEntries,
    };
  }
}
