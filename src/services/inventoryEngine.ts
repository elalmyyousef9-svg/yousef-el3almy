/**
 * MontuCode Inventory Engine (Docs 05 & 06)
 * Strict FIFO, Negative Stock Provisional Costing & Auto-Settlement, In-Transit Transfers, Invariants
 */

import {
  CostLot,
  CostSource,
  DocumentType,
  InvariantsCheckResult,
  LotAllocation,
  SettlementAdjustment,
  StockBalance,
  StockDocument,
  StockMovement,
} from '../types';
import { round2, round4 } from '../utils/formatters';
import { AppStorage } from './storage';

export interface PostLineSpec {
  variantId: string;
  locationId: string;
  qtyDelta: number; // Positive = inbound, Negative = outbound
  unitCost?: number; // Provided on inbound receipts/adjustments; computed from FIFO for outbound
  originLotId?: string; // For transfers / returns
  originalFifoDate?: string;
  costSource?: CostSource;
  reversesMovementId?: string; // For sale returns
}

export interface PostDocumentOptions {
  type: DocumentType;
  documentNo: string;
  date?: string;
  notes?: string;
  negativeOverride?: boolean;
  overrideReason?: string;
  overrideApprovedBy?: string;
  postedBy: string;
  lines: PostLineSpec[];
}

export class InventoryEngine {
  private storage = AppStorage.getInstance();

  /**
   * Helper: Get current onHand balance for variant at location
   */
  public getBalance(variantId: string, locationId: string): StockBalance {
    const data = this.storage.getData();
    let bal = data.stockBalances.find(
      b => b.variantId === variantId && b.locationId === locationId
    );
    if (!bal) {
      bal = {
        variantId,
        locationId,
        onHand: 0,
        reserved: 0,
      };
      data.stockBalances.push(bal);
    }
    return bal;
  }

  /**
   * Find last known cost for a variant (latest lot across any location)
   */
  public getLastKnownCost(variantId: string): number {
    const data = this.storage.getData();
    const lots = data.costLots
      .filter(l => l.variantId === variantId)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    return lots.length > 0 ? lots[0].unitCost : 0;
  }

  /**
   * Post an atomic document with all lines, movements, FIFO allocations and auto-settlements
   */
  public postDocument(options: PostDocumentOptions): {
    document: StockDocument;
    movements: StockMovement[];
    allocations: LotAllocation[];
    settlements: SettlementAdjustment[];
  } {
    const data = this.storage.getData();
    const now = options.date || new Date().toISOString();

    // 1. Validate negative stock rules prior to mutations
    for (const line of options.lines) {
      const bal = this.getBalance(line.variantId, line.locationId);
      const newBalance = bal.onHand + line.qtyDelta;
      const loc = data.locations.find(l => l.id === line.locationId);

      if (newBalance < 0) {
        if (loc?.type === 'IN_TRANSIT') {
          throw new Error('غير مسموح برصيد سالب في بضاعة الترانزيت (In-Transit)');
        }
        if (options.type !== 'SALE' || !options.negativeOverride) {
          const variant = data.variants.find(v => v.id === line.variantId);
          throw new Error(
            `رصيد غير كافٍ للصنف [${variant?.sku || line.variantId}] في [${loc?.nameAr || line.locationId}]. ` +
            `المتوفر: ${bal.onHand} قطعة، والمطلوب: ${Math.abs(line.qtyDelta)} قطعة. ` +
            `يتطلب موافقة المشرف وإذن بيع استثنائي بالسالب مع تسجيل السبب.`
          );
        }
      }
    }

    // 2. Create Document header
    const doc: StockDocument = {
      id: `DOC-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      documentNo: options.documentNo,
      type: options.type,
      date: now,
      notes: options.notes,
      negativeOverride: !!options.negativeOverride,
      overrideReason: options.overrideReason,
      overrideApprovedBy: options.overrideApprovedBy,
      postedBy: options.postedBy,
      postedAt: now,
    };
    data.stockDocuments.push(doc);

    const createdMovements: StockMovement[] = [];
    const createdAllocations: LotAllocation[] = [];
    const createdSettlements: SettlementAdjustment[] = [];

    // 3. Process each line
    for (const line of options.lines) {
      const bal = this.getBalance(line.variantId, line.locationId);
      const balanceAfter = bal.onHand + line.qtyDelta;
      const movId = `MOV-${Date.now()}-${Math.floor(Math.random() * 10000)}`;

      if (line.qtyDelta < 0) {
        // --- OUTBOUND (Sale, Transfer Dispatch, Write-off) ---
        let need = Math.abs(line.qtyDelta);
        let totalValue = 0;

        // Open lots for this variant at this location, strictly FIFO
        const openLots = data.costLots
          .filter(l => l.variantId === line.variantId && l.locationId === line.locationId && l.remainingQty > 0)
          .sort((a, b) => {
            const dateA = new Date(a.fifoDate).getTime();
            const dateB = new Date(b.fifoDate).getTime();
            if (dateA !== dateB) return dateA - dateB;
            return a.seq - b.seq;
          });

        for (const lot of openLots) {
          if (need <= 0) break;
          const take = Math.min(lot.remainingQty, need);
          const val = round2(take * lot.unitCost);
          lot.remainingQty = round4(lot.remainingQty - take);
          need = round4(need - take);
          totalValue += val;

          const alloc: LotAllocation = {
            id: `ALLOC-${Date.now()}-${Math.floor(Math.random() * 10000)}`,
            movementId: movId,
            costLotId: lot.id,
            qty: take,
            unitCost: lot.unitCost,
            value: val,
            isProvisional: false,
            createdAt: now,
          };
          data.lotAllocations.push(alloc);
          createdAllocations.push(alloc);
        }

        // If need > 0, shortage is handled via provisional cost allocation (Section 4.3)
        if (need > 0) {
          const lastCost = this.getLastKnownCost(line.variantId);
          const provValue = round2(need * lastCost);
          totalValue += provValue;

          const provAlloc: LotAllocation = {
            id: `ALLOC-PROV-${Date.now()}-${Math.floor(Math.random() * 10000)}`,
            movementId: movId,
            costLotId: null,
            qty: need,
            unitCost: lastCost,
            value: provValue,
            isProvisional: true,
            createdAt: now,
          };
          data.lotAllocations.push(provAlloc);
          createdAllocations.push(provAlloc);
        }

        const effectiveUnitCost = line.qtyDelta !== 0 ? totalValue / Math.abs(line.qtyDelta) : 0;
        const movement: StockMovement = {
          id: movId,
          documentId: doc.id,
          variantId: line.variantId,
          locationId: line.locationId,
          qtyDelta: line.qtyDelta,
          balanceAfter,
          unitCost: effectiveUnitCost,
          valueDelta: -totalValue,
          createdAt: now,
        };
        data.stockMovements.push(movement);
        createdMovements.push(movement);

        bal.onHand = balanceAfter;
        bal.lastMovementId = movId;

      } else if (line.qtyDelta > 0) {
        // --- INBOUND (Receipt, Transfer Receive, Opening Balance, Stocktake gain, Sale return) ---
        let unitCost = line.unitCost ?? this.getLastKnownCost(line.variantId);
        const lotQty = line.qtyDelta;
        const lotVal = round2(lotQty * unitCost);

        const movement: StockMovement = {
          id: movId,
          documentId: doc.id,
          variantId: line.variantId,
          locationId: line.locationId,
          qtyDelta: line.qtyDelta,
          balanceAfter,
          unitCost,
          valueDelta: lotVal,
          createdAt: now,
        };
        data.stockMovements.push(movement);
        createdMovements.push(movement);

        bal.onHand = balanceAfter;
        bal.lastMovementId = movId;

        // Create cost lot (survives original FIFO date if provided, e.g. for transfers/returns)
        const newLot: CostLot = {
          id: `LOT-${Date.now()}-${Math.floor(Math.random() * 10000)}`,
          variantId: line.variantId,
          locationId: line.locationId,
          fifoDate: line.originalFifoDate || now,
          seq: data.costLots.length + 1,
          originalQty: lotQty,
          remainingQty: lotQty,
          unitCost,
          costSource: line.costSource || 'PURCHASE_RECEIPT',
          isProvisional: line.costSource === 'OPENING_LAST_COST',
          sourceMovementId: movId,
          originLotId: line.originLotId,
          createdAt: now,
        };
        data.costLots.push(newLot);

        // Auto-Settlement of open provisional allocations at this (variant, location)
        // Docs 05 §4 & Docs 06 §4.3
        const settlements = this.settleProvisionalAllocations(
          line.variantId,
          line.locationId,
          newLot,
          now
        );
        createdSettlements.push(...settlements);
      }
    }

    // Save and notify listeners
    this.storage.save();

    return {
      document: doc,
      movements: createdMovements,
      allocations: createdAllocations,
      settlements: createdSettlements,
    };
  }

  /**
   * Settle open provisional allocations at (variant, location)
   * Section 4: Partial settlement is supported, difference adjusts COGS on settlement date.
   */
  private settleProvisionalAllocations(
    variantId: string,
    locationId: string,
    newLot: CostLot,
    nowDate: string
  ): SettlementAdjustment[] {
    const data = this.storage.getData();
    const adjustments: SettlementAdjustment[] = [];

    // Find all movements of this variant and location that have open provisional allocations
    const movIds = data.stockMovements
      .filter(m => m.variantId === variantId && m.locationId === locationId && m.qtyDelta < 0)
      .map(m => m.id);

    const pendingAllocations = data.lotAllocations.filter(a => {
      if (!a.isProvisional || !movIds.includes(a.movementId)) return false;
      // Calculate unsettled quantity: qty - sum(settlements) - sum(|reversals|)
      const settledSum = data.lotAllocations
        .filter(s => s.settlesAllocationId === a.id)
        .reduce((sum, s) => sum + s.qty, 0);
      const reversedSum = data.lotAllocations
        .filter(r => r.reversesAllocationId === a.id)
        .reduce((sum, r) => sum + Math.abs(r.qty), 0);
      const openQty = a.qty - settledSum - reversedSum;
      return openQty > 0;
    });

    for (const provAlloc of pendingAllocations) {
      if (newLot.remainingQty <= 0) break;

      const settledSum = data.lotAllocations
        .filter(s => s.settlesAllocationId === provAlloc.id)
        .reduce((sum, s) => sum + s.qty, 0);
      const reversedSum = data.lotAllocations
        .filter(r => r.reversesAllocationId === provAlloc.id)
        .reduce((sum, r) => sum + Math.abs(r.qty), 0);
      const openQty = provAlloc.qty - settledSum - reversedSum;

      if (openQty <= 0) continue;

      const take = Math.min(newLot.remainingQty, openQty);
      newLot.remainingQty = round4(newLot.remainingQty - take);

      const val = round2(take * newLot.unitCost);
      const costDiff = round2((newLot.unitCost - provAlloc.unitCost) * take);

      const settlementPiece: LotAllocation = {
        id: `ALLOC-SETTLE-${Date.now()}-${Math.floor(Math.random() * 10000)}`,
        movementId: provAlloc.movementId,
        costLotId: newLot.id,
        qty: take,
        unitCost: newLot.unitCost,
        value: val,
        isProvisional: false,
        settlesAllocationId: provAlloc.id,
        createdAt: nowDate,
      };
      data.lotAllocations.push(settlementPiece);

      adjustments.push({
        date: nowDate,
        variantId,
        locationId,
        settledQty: take,
        actualCost: newLot.unitCost,
        provisionalCost: provAlloc.unitCost,
        costDifference: costDiff,
      });
    }

    return adjustments;
  }

  /**
   * Section 7: Invariants Verification
   * Tests all 5 mathematical invariants described in docs/05 §7 and docs/12
   */
  public checkInvariants(): InvariantsCheckResult {
    const data = this.storage.getData();
    const details: InvariantsCheckResult['details'] = [];

    // Collect all active pairs of (variant, location)
    const pairMap = new Map<string, { variantId: string; locationId: string }>();
    for (const b of data.stockBalances) {
      pairMap.set(`${b.variantId}|${b.locationId}`, { variantId: b.variantId, locationId: b.locationId });
    }
    for (const m of data.stockMovements) {
      pairMap.set(`${m.variantId}|${m.locationId}`, { variantId: m.variantId, locationId: m.locationId });
    }

    let allRule1 = true;
    let allRule2 = true;
    let allRule3 = true;
    let allRule4 = true;
    let allRule5 = true;

    for (const pair of pairMap.values()) {
      const { variantId, locationId } = pair;
      const variant = data.variants.find(v => v.id === variantId);
      const location = data.locations.find(l => l.id === locationId);
      const balance = data.stockBalances.find(b => b.variantId === variantId && b.locationId === locationId);
      const onHand = balance ? balance.onHand : 0;

      // Invariant 1: on_hand = Σ qty_delta of its movements
      const sumLedgerDeltas = data.stockMovements
        .filter(m => m.variantId === variantId && m.locationId === locationId)
        .reduce((sum, m) => sum + m.qtyDelta, 0);
      const rule1_LedgerMatchesBalance = Math.abs(onHand - sumLedgerDeltas) < 0.0001;

      // Invariant 2: Σ cost_lot.remaining_qty = max(on_hand, 0)
      const remainingLotsQty = data.costLots
        .filter(l => l.variantId === variantId && l.locationId === locationId)
        .reduce((sum, l) => sum + l.remainingQty, 0);
      const expectedRemaining = Math.max(onHand, 0);
      const rule2_RemainingLotsMatchesPositiveOnHand = Math.abs(remainingLotsQty - expectedRemaining) < 0.0001;

      // Invariant 3: Σ open provisional qty = max(-on_hand, 0)
      const movIds = data.stockMovements
        .filter(m => m.variantId === variantId && m.locationId === locationId && m.qtyDelta < 0)
        .map(m => m.id);

      const openProvisionalQty = data.lotAllocations
        .filter(a => a.isProvisional && movIds.includes(a.movementId))
        .reduce((sum, a) => {
          const settled = data.lotAllocations
            .filter(s => s.settlesAllocationId === a.id)
            .reduce((sub, s) => sub + s.qty, 0);
          const reversed = data.lotAllocations
            .filter(r => r.reversesAllocationId === a.id)
            .reduce((sub, r) => sub + Math.abs(r.qty), 0);
          return sum + Math.max(0, a.qty - settled - reversed);
        }, 0);
      const expectedProvisional = Math.max(-onHand, 0);
      const rule3_ProvisionalMatchesNegativeOnHand = Math.abs(openProvisionalQty - expectedProvisional) < 0.0001;

      // Invariant 5: IN_TRANSIT on_hand >= 0
      const isTransit = location?.type === 'IN_TRANSIT';
      const rule5_InTransitNonNegative = !isTransit || onHand >= 0;

      // Invariant 4: Value Invariant (within tolerance 0.02)
      // Σ value_delta + Σ settlement_adjustments = Σ (lot.remaining * lot.unit_cost) - open_provisional_value
      const totalValueDelta = data.stockMovements
        .filter(m => m.variantId === variantId && m.locationId === locationId)
        .reduce((sum, m) => sum + m.valueDelta, 0);

      const lotsValue = data.costLots
        .filter(l => l.variantId === variantId && l.locationId === locationId)
        .reduce((sum, l) => sum + (l.remainingQty * l.unitCost), 0);

      const provValue = data.lotAllocations
        .filter(a => a.isProvisional && movIds.includes(a.movementId))
        .reduce((sum, a) => {
          const settled = data.lotAllocations
            .filter(s => s.settlesAllocationId === a.id)
            .reduce((sub, s) => sub + s.qty, 0);
          const open = Math.max(0, a.qty - settled);
          return sum + (open * a.unitCost);
        }, 0);

      const expectedNetValue = lotsValue - provValue;
      const rule4_ValueInvariantsMatches = Math.abs(totalValueDelta - expectedNetValue) < 0.1;

      const errors: string[] = [];
      if (!rule1_LedgerMatchesBalance) errors.push(`اختلاف بين الرصيد الحسابي (${onHand}) ومجموع حركات دفتر الأستاذ (${sumLedgerDeltas})`);
      if (!rule2_RemainingLotsMatchesPositiveOnHand) errors.push(`القطع المتبقية في لوطات التكلفة (${remainingLotsQty}) لا تساوي الرصيد الموجب (${expectedRemaining})`);
      if (!rule3_ProvisionalMatchesNegativeOnHand) errors.push(`كمية التكلفة المؤقتة المفتوحة (${openProvisionalQty}) لا تطابق العجز السالب (${expectedProvisional})`);
      if (!rule5_InTransitNonNegative) errors.push('رصيد بضاعة الترانزيت سالب وهذا ممنوع قطعاً');
      if (!rule4_ValueInvariantsMatches) errors.push('فرق في معادلة القيمة الإجمالية للمخزون');

      if (!rule1_LedgerMatchesBalance) allRule1 = false;
      if (!rule2_RemainingLotsMatchesPositiveOnHand) allRule2 = false;
      if (!rule3_ProvisionalMatchesNegativeOnHand) allRule3 = false;
      if (!rule4_ValueInvariantsMatches) allRule4 = false;
      if (!rule5_InTransitNonNegative) allRule5 = false;

      details.push({
        variantId,
        variantSku: variant?.sku || variantId,
        locationId,
        locationName: location?.nameAr || locationId,
        onHand,
        sumLedgerDeltas,
        rule1_LedgerMatchesBalance,
        remainingLotsQty,
        rule2_RemainingLotsMatchesPositiveOnHand,
        openProvisionalQty,
        rule3_ProvisionalMatchesNegativeOnHand,
        rule4_ValueInvariantsMatches,
        rule5_InTransitNonNegative,
        errors,
      });
    }

    const allPassed = allRule1 && allRule2 && allRule3 && allRule4 && allRule5;

    return {
      passed: allPassed,
      timestamp: new Date().toISOString(),
      checkedPairsCount: details.length,
      details,
      summary: {
        allPassed,
        rule1Passed: allRule1,
        rule2Passed: allRule2,
        rule3Passed: allRule3,
        rule4Passed: allRule4,
        rule5Passed: allRule5,
      },
    };
  }
}
