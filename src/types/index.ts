/**
 * MontuCode Clothing Inventory & Accounting Blueprint
 * Core Types according to docs 02, 04, 05, 06, 09, 10
 */

export type RoleId = 
  | 'admin'        // مدير النظام
  | 'inventory'    // أمين المخزن
  | 'cashier'      // الكاشير
  | 'counter'      // العدّاد
  | 'approver'     // المعتمد
  | 'supervisor'   // المشرف
  | 'auditor';     // المراجع

export interface UserRole {
  id: RoleId;
  name: string;
  nameAr: string;
  description: string;
  permissions: string[];
}

export type LocationType = 
  | 'CENTRAL_WAREHOUSE' 
  | 'STORE' 
  | 'IN_TRANSIT' 
  | 'QUARANTINE' 
  | 'DAMAGED';

export interface Location {
  id: string;
  code: string;
  name: string;
  nameAr: string;
  type: LocationType;
  canSell: boolean;
  address?: string;
}

export interface Category {
  id: string;
  code: string;
  name: string;
  nameAr: string;
}

export interface Color {
  id: string;
  code: string; // e.g. BLK, WHT, NVY
  name: string;
  nameAr: string;
  hex: string;
}

export interface Size {
  id: string;
  code: string; // e.g. S, M, L, XL
  name: string;
  nameAr: string;
  sortOrder: number;
}

export interface ClothingModel {
  id: string;
  code: string; // e.g. SH1024
  name: string;
  nameAr: string;
  categoryId: string;
  basePrice: number; // e.g. 450.00 EGP
  description?: string;
  colorIds: string[];
  sizeIds: string[];
  createdAt: string;
}

export interface Variant {
  id: string;
  modelId: string;
  colorId: string;
  sizeId: string;
  sku: string;         // e.g. SH1024-BLK-M
  barcode: string;     // e.g. 200000001001 (Code 128)
  priceOverride?: number;
  reorderLevel: number;
  active: boolean;
}

export type CostSource = 
  | 'PURCHASE_RECEIPT' 
  | 'TRANSFER_IN' 
  | 'OPENING_LAST_COST' 
  | 'SALE_RETURN' 
  | 'ADJUSTMENT'
  | 'COST_REVALUATION';

export interface CostLot {
  id: string;
  variantId: string;
  locationId: string;
  fifoDate: string;           // ISO timestamp (survives transfers/returns)
  seq: number;
  originalQty: number;
  remainingQty: number;
  unitCost: number;           // Numeric(14,4)
  costSource: CostSource;
  isProvisional: boolean;     // Opening balance at last cost
  sourceMovementId: string;
  originLotId?: string;       // For transfers / returns: the lot it came from
  createdAt: string;
}

export interface LotAllocation {
  id: string;
  movementId: string;
  costLotId?: string | null;  // NULL = provisional (negative-stock sale)
  qty: number;                // Negative on reversals
  unitCost: number;
  value: number;              // Round2(qty * unitCost)
  isProvisional: boolean;
  settlesAllocationId?: string;  // Settlement piece of a provisional
  reversesAllocationId?: string; // Return / cancel piece
  createdAt: string;
}

export interface StockBalance {
  variantId: string;
  locationId: string;
  onHand: number;
  reserved: number;
  lastMovementId?: string;
}

export type DocumentType = 
  | 'RECEIPT'
  | 'SALE'
  | 'SALE_RETURN'
  | 'SALE_CANCEL'
  | 'TRANSFER_DISPATCH'
  | 'TRANSFER_RECEIVE'
  | 'STOCKTAKE_ADJUSTMENT'
  | 'DAMAGE_WRITEOFF'
  | 'COST_REVALUATION'
  | 'OPENING_BALANCE';

export interface StockDocument {
  id: string;
  documentNo: string;
  type: DocumentType;
  date: string;
  notes?: string;
  negativeOverride: boolean;
  overrideReason?: string;
  overrideApprovedBy?: string;
  postedBy: string;
  postedAt: string;
}

export interface StockMovement {
  id: string;
  documentId: string;
  variantId: string;
  locationId: string;
  qtyDelta: number;           // Positive = inbound, Negative = outbound
  balanceAfter: number;
  unitCost: number;           // |valueDelta| / |qtyDelta|
  valueDelta: number;         // Monetary impact
  createdAt: string;
}

export interface Supplier {
  id: string;
  code: string;
  name: string;
  phone: string;
  status: 'active' | 'inactive';
}

export type PurchaseStatus = 'DRAFT' | 'APPROVED' | 'PARTIALLY_RECEIVED' | 'RECEIVED' | 'CLOSED' | 'CANCELLED';

export interface PurchaseLine {
  id: string;
  variantId: string;
  orderedQty: number;
  receivedQty: number;
  returnedQty: number;
  unitCost: number;
}

export interface Purchase {
  id: string;
  purchaseNo: string;
  supplierId: string;
  supplierInvoiceNo?: string;
  locationId: string;
  status: PurchaseStatus;
  lines: PurchaseLine[];
  createdBy: string;
  createdAt: string;
  receivedAt?: string;
}

export type TransferStatus = 'DRAFT' | 'DISPATCHED' | 'RECEIVED' | 'SETTLED' | 'CANCELLED';

export interface TransferLine {
  id: string;
  variantId: string;
  requestedQty: number;
  dispatchedQty: number;
  receivedQty: number;
  settledQty: number;
}

export interface Transfer {
  id: string;
  transferNo: string;
  fromLocationId: string;
  toLocationId: string;
  transitLocationId: string;
  status: TransferStatus;
  lines: TransferLine[];
  closeException?: string;
  closeApprovedBy?: string;
  createdBy: string;
  createdAt: string;
  dispatchedAt?: string;
  receivedAt?: string;
}

export type SaleStatus = 'DRAFT' | 'POSTED' | 'PARTIALLY_RETURNED' | 'RETURNED' | 'CANCELLED';

export type PaymentMethod = 'CASH' | 'CARD' | 'WALLET';

export interface SalePayment {
  id: string;
  method: PaymentMethod;
  amount: number;
}

export interface SaleLine {
  id: string;
  variantId: string;
  qty: number;
  unitPrice: number;
  lineDiscount: number;
  returnedQty: number;
  costTotal: number;          // Filled from FIFO allocations
}

export interface Sale {
  id: string;
  invoiceNo: string;
  locationId: string;
  status: SaleStatus;
  customerName?: string;
  customerPhone?: string;
  subtotal: number;
  discount: number;
  total: number;
  cogsTotal: number;
  cashierId: string;
  cashierName: string;
  payments: SalePayment[];
  lines: SaleLine[];
  postedAt: string;
  negativeOverride?: boolean;
  overrideReason?: string;
}

export type StocktakeStatus = 'OPEN' | 'COUNTING' | 'RECOUNT' | 'PENDING_APPROVAL' | 'APPROVED' | 'CANCELLED';

export interface StocktakeLine {
  id: string;
  variantId: string;
  snapshotQty: number;
  countedQty?: number;
  countedAt?: string;
  countedBy?: string;
  recountQty?: number;
  recountedAt?: string;
  expectedQty?: number;
  varianceQty?: number;
  unitCost?: number;
  varianceValue?: number;
  reason?: string;
}

export interface StocktakeSession {
  id: string;
  sessionNo: string;
  locationId: string;
  scope: string; // all, category, etc.
  categoryId?: string;
  kind: 'full' | 'periodic' | 'surprise';
  blind: boolean;  // When true, counter never sees expected quantities
  freeze: boolean; // When true, prevents any movements during counting
  status: StocktakeStatus;
  snapshotAt: string;
  openedBy: string;
  approvedBy?: string;
  approvedAt?: string;
  lines: StocktakeLine[];
}

export interface AuditLog {
  id: string;
  userId: string;
  userName: string;
  action: string;
  entity: string;
  entityId: string;
  before?: any;
  after?: any;
  at: string;
}

export interface LabelPrintLog {
  id: string;
  variantId: string;
  variantSku: string;
  variantBarcode: string;
  qty: number;
  isReprint: boolean;
  reason?: string;
  printedBy: string;
  printedAt: string;
}

export interface SettlementAdjustment {
  date: string;
  variantId: string;
  locationId: string;
  settledQty: number;
  actualCost: number;
  provisionalCost: number;
  costDifference: number; // (actual - provisional) * qty
}

// 06: Accounting Rules Summary Output
export interface DailyAccountingSummary {
  dateRange: { from: string; to: string };
  locationId?: string; // Optional filter or all locations
  salesRevenue: {
    totalRevenue: number; // Net of discounts minus returns
    byPaymentMethod: {
      cash: number;
      card: number;
      wallet: number;
    };
    totalDiscounts: number;
    grossSales: number;
    returnsDeduction: number;
  };
  cogs: {
    saleAllocationsValue: number;
    saleReturnsValue: number;
    settlementAdjustments: number; // (actual - provisional)
    netCogs: number;
  };
  inventoryAdjustments: {
    gains: number; // Stocktake surplus
    losses: number; // Stocktake deficit or damage writeoffs
    netAdjustment: number;
  };
  purchases: {
    receiptsPayable: number;
    vendorReturns: number;
    netPurchases: number;
    bySupplier: { supplierId: string; supplierName: string; amount: number }[];
  };
  inventoryValueEnd: {
    totalValue: number;
    byLocation: {
      locationId: string;
      locationName: string;
      type: LocationType;
      openLotsValue: number;
      openProvisionalDeduction: number;
      netValue: number;
      pieceCount: number;
    }[];
    inTransitValue: number;
  };
  suggestedJournalEntries: JournalEntry[];
}

export interface JournalLine {
  accountCode: string;
  accountNameAr: string;
  accountNameEn: string;
  debit: number;
  credit: number;
  note?: string;
}

export interface JournalEntry {
  id: string;
  date: string;
  referenceDoc: string;
  descriptionAr: string;
  lines: JournalLine[];
}

export interface InvariantsCheckResult {
  passed: boolean;
  timestamp: string;
  checkedPairsCount: number;
  details: {
    variantId: string;
    variantSku: string;
    locationId: string;
    locationName: string;
    onHand: number;
    sumLedgerDeltas: number;
    rule1_LedgerMatchesBalance: boolean;
    remainingLotsQty: number;
    rule2_RemainingLotsMatchesPositiveOnHand: boolean;
    openProvisionalQty: number;
    rule3_ProvisionalMatchesNegativeOnHand: boolean;
    rule4_ValueInvariantsMatches: boolean;
    rule5_InTransitNonNegative: boolean;
    errors: string[];
  }[];
  summary: {
    allPassed: boolean;
    rule1Passed: boolean;
    rule2Passed: boolean;
    rule3Passed: boolean;
    rule4Passed: boolean;
    rule5Passed: boolean;
  };
}

// Cashier Shifts & Cash Drawer (وردية الكاشير وحركة الدرج)
export interface DrawerTransaction {
  id: string;
  shiftId: string;
  type: 'CASH_IN' | 'CASH_OUT';
  amount: number;
  reason: string;
  performedBy: string;
  createdAt: string;
}

export interface CashierShift {
  id: string;
  shiftNo: string;
  locationId: string;
  cashierId: string;
  cashierName: string;
  openedAt: string;
  closedAt?: string;
  status: 'OPEN' | 'CLOSED';
  openingFloat: number;          // العهدة الافتتاحية (الفكة)
  closingCashActual?: number;    // المبلغ الفعلي بالدرج عند الإغلاق
  totalCashSales: number;        // إجمالي المبيعات كاش
  totalCardSales: number;        // إجمالي المبيعات فيزا
  totalWalletSales: number;      // إجمالي مبيعات المحافظ
  totalExpenses: number;         // المصروفات النثرية المسحوبة من الدرج
  expectedCashInDrawer: number;  // المتوقع بالدرج = openingFloat + totalCashSales - totalExpenses
  variance?: number;             // العجز أو الزيادة = closingCashActual - expectedCashInDrawer
  transactions: DrawerTransaction[];
  notes?: string;
}
