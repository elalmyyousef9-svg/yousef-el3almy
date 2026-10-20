/**
 * Persistent Storage & Seed Data for MontuCode Blueprint
 */
import {
  Category,
  ClothingModel,
  Color,
  CostLot,
  Location,
  LotAllocation,
  Purchase,
  RoleId,
  Sale,
  Size,
  StockBalance,
  StockDocument,
  StockMovement,
  StocktakeSession,
  Supplier,
  Transfer,
  UserRole,
  Variant,
  AuditLog,
  LabelPrintLog,
  CashierShift,
  DrawerTransaction,
} from '../types';

export const ROLES: UserRole[] = [
  {
    id: 'admin',
    name: 'Administrator',
    nameAr: 'مدير النظام (Admin)',
    description: 'صلاحيات كاملة على النظام والإعدادات والتقارير',
    permissions: ['admin.*', 'catalog.*', 'inventory.*', 'purchasing.*', 'sales.*'],
  },
  {
    id: 'inventory',
    name: 'Inventory Clerk',
    nameAr: 'أمين المخزن (Inventory)',
    description: 'الكتالوج، أذون الاستلام، التحويلات، طباعة الملصقات',
    permissions: ['catalog.*', 'inventory.read', 'inventory.receive', 'inventory.transfer', 'inventory.stocktake', 'purchasing.manage'],
  },
  {
    id: 'cashier',
    name: 'Cashier',
    nameAr: 'الكاشير (Cashier)',
    description: 'تسجيل المبيعات والمرتجعات، الاستعلام عن رصيد الفرع',
    permissions: ['sales.sell', 'sales.return', 'catalog.read', 'inventory.read'],
  },
  {
    id: 'supervisor',
    name: 'Supervisor',
    nameAr: 'المشرف (Supervisor)',
    description: 'صلاحية البيع بالسالب الاستثنائي، إلغاء الفواتير',
    permissions: ['inventory.allow_negative', 'sales.*', 'inventory.read'],
  },
  {
    id: 'approver',
    name: 'Approver',
    nameAr: 'المعتمد (Approver)',
    description: 'اعتماد تسويات الجرد، فروق التحويلات، وإهلاك التوالف',
    permissions: ['inventory.approve_adjustment', 'inventory.read', 'sales.cancel'],
  },
  {
    id: 'counter',
    name: 'Stocktake Counter',
    nameAr: 'العدّاد (Counter)',
    description: 'العد الأعمى في جلسات الجرد فقط دون رؤية الرصيد المتوقع',
    permissions: ['inventory.stocktake'],
  },
  {
    id: 'auditor',
    name: 'Auditor',
    nameAr: 'المراجع الداخلي (Auditor)',
    description: 'قراءة سجل التدقيق، تقارير الحسابات، وفحص تطابق الأرصدة',
    permissions: ['inventory.audit', 'inventory.read', 'catalog.read', 'sales.read'],
  },
];

export const INITIAL_LOCATIONS: Location[] = [
  {
    id: 'LOC-WH',
    code: 'WH01',
    name: 'Central Warehouse',
    nameAr: 'المخزن الرئيسي (العاشر من رمضان)',
    type: 'CENTRAL_WAREHOUSE',
    canSell: false,
    address: 'المنطقة الصناعية الثالثة، العاشر من رمضان',
  },
  {
    id: 'LOC-MAADI',
    code: 'ST01',
    name: 'Maadi Branch',
    nameAr: 'فرع المعادي (شارع النصر)',
    type: 'STORE',
    canSell: true,
    address: 'شارع النصر، المعادي الجديدة، القاهرة',
  },
  {
    id: 'LOC-TAGAMMO',
    code: 'ST02',
    name: 'New Cairo Branch',
    nameAr: 'فرع التجمع الخامس (الداون تاون)',
    type: 'STORE',
    canSell: true,
    address: 'مول الداون تاون، شارع التسعين، التجمع الخامس',
  },
  {
    id: 'LOC-TRANSIT',
    code: 'TR01',
    name: 'In Transit',
    nameAr: 'بضاعة بالطريق (ترانزيت)',
    type: 'IN_TRANSIT',
    canSell: false,
    address: 'نظام النقل والشحن الداخلي',
  },
  {
    id: 'LOC-QUARANTINE',
    code: 'QR01',
    name: 'Quarantine & Inspection',
    nameAr: 'حجر الفحص والاسترجاع',
    type: 'QUARANTINE',
    canSell: false,
    address: 'منطقة الفحص، المخزن الرئيسي',
  },
  {
    id: 'LOC-DAMAGED',
    code: 'DM01',
    name: 'Damaged & Write-off',
    nameAr: 'مخزن التوالف والهالك',
    type: 'DAMAGED',
    canSell: false,
    address: 'منطقة التوالف، المخزن الرئيسي',
  },
];

export const INITIAL_CATEGORIES: Category[] = [
  { id: 'CAT-SHIRTS', code: 'SH', name: 'Shirts', nameAr: 'قمصان كلاسيك وكاجوال' },
  { id: 'CAT-TEES', code: 'TS', name: 'T-Shirts', nameAr: 'تيشيرتات وبولو' },
  { id: 'CAT-PANTS', code: 'PT', name: 'Pants', nameAr: 'بنطلونات تشينو وجينز' },
  { id: 'CAT-JACKETS', code: 'JK', name: 'Jackets', nameAr: 'بليزر وجواكت' },
];

export const INITIAL_COLORS: Color[] = [
  { id: 'COL-BLK', code: 'BLK', name: 'Black', nameAr: 'أسود', hex: '#111827' },
  { id: 'COL-WHT', code: 'WHT', name: 'White', nameAr: 'أبيض', hex: '#F8FAFC' },
  { id: 'COL-NVY', code: 'NVY', name: 'Navy', nameAr: 'كحلي داكن', hex: '#1E3A8A' },
  { id: 'COL-BGE', code: 'BGE', name: 'Beige', nameAr: 'بيج رملي', hex: '#D4B996' },
  { id: 'COL-OLV', code: 'OLV', name: 'Olive', nameAr: 'زيتي عسكري', hex: '#3F6212' },
];

export const INITIAL_SIZES: Size[] = [
  { id: 'SZ-S', code: 'S', name: 'Small', nameAr: 'صغير (S)', sortOrder: 1 },
  { id: 'SZ-M', code: 'M', name: 'Medium', nameAr: 'وسط (M)', sortOrder: 2 },
  { id: 'SZ-L', code: 'L', name: 'Large', nameAr: 'كبير (L)', sortOrder: 3 },
  { id: 'SZ-XL', code: 'XL', name: 'X-Large', nameAr: 'كبير جداً (XL)', sortOrder: 4 },
  { id: 'SZ-2XL', code: '2XL', name: '2X-Large', nameAr: 'كبير مضاعف (XXL)', sortOrder: 5 },
];

export const INITIAL_MODELS: ClothingModel[] = [
  {
    id: 'MOD-SH101',
    code: 'SH101',
    name: 'Classic Oxford Cotton Shirt',
    nameAr: 'قميص أكسفورد قطن كلاسيك',
    categoryId: 'CAT-SHIRTS',
    basePrice: 480.00,
    description: 'قميص قطن مصري فاخر 100% مناسب للعمل والمناسبات',
    colorIds: ['COL-WHT', 'COL-NVY', 'COL-BGE'],
    sizeIds: ['SZ-M', 'SZ-L', 'SZ-XL'],
    createdAt: '2026-10-01T08:00:00Z',
  },
  {
    id: 'MOD-TS202',
    code: 'TS202',
    name: 'Heavyweight Oversized Tee',
    nameAr: 'تيشيرت أوفرسايز هيفي قطن',
    categoryId: 'CAT-TEES',
    basePrice: 320.00,
    description: 'تيشيرت كاجوال خامة 240 جرام معالجة ضد الانكماش',
    colorIds: ['COL-BLK', 'COL-WHT', 'COL-OLV'],
    sizeIds: ['SZ-S', 'SZ-M', 'SZ-L', 'SZ-XL'],
    createdAt: '2026-10-02T08:00:00Z',
  },
  {
    id: 'MOD-PT303',
    code: 'PT303',
    name: 'Slim Fit Chino Pants',
    nameAr: 'بنطلون تشينو سليم فيت',
    categoryId: 'CAT-PANTS',
    basePrice: 590.00,
    description: 'بنطلون جبردين مطاطي مريح للغاية لجميع الإطلالات',
    colorIds: ['COL-BGE', 'COL-NVY', 'COL-BLK'],
    sizeIds: ['SZ-M', 'SZ-L', 'SZ-XL'],
    createdAt: '2026-10-03T08:00:00Z',
  },
  {
    id: 'MOD-JK404',
    code: 'JK404',
    name: 'Tailored Casual Linen Blazer',
    nameAr: 'بليزر كاجوال كتان مبطن',
    categoryId: 'CAT-JACKETS',
    basePrice: 1250.00,
    description: 'بليزر أنيق مصنوع من الكتان الطبيعي خفيف الوزن',
    colorIds: ['COL-NVY', 'COL-BGE'],
    sizeIds: ['SZ-M', 'SZ-L', 'SZ-XL'],
    createdAt: '2026-10-04T08:00:00Z',
  },
];

export const INITIAL_SUPPLIERS: Supplier[] = [
  { id: 'SUP-01', code: 'SUP01', name: 'مصنع النيل للمنسوجات والملابس الجاهزة', phone: '01001234567', status: 'active' },
  { id: 'SUP-02', code: 'SUP02', name: 'شركة الأهرام لغزل وحياكة القطن المصري', phone: '01229876543', status: 'active' },
  { id: 'SUP-03', code: 'SUP03', name: 'الشركة الدولية للملابس الكاجوال والجينز', phone: '01114567890', status: 'active' },
];

// Helper to seed variants and initial FIFO lots
export function generateInitialData() {
  const variants: Variant[] = [];
  let barcodeCounter = 1001;

  for (const model of INITIAL_MODELS) {
    for (const colorId of model.colorIds) {
      const color = INITIAL_COLORS.find(c => c.id === colorId);
      for (const sizeId of model.sizeIds) {
        const size = INITIAL_SIZES.find(s => s.id === sizeId);
        if (color && size) {
          const sku = `${model.code}-${color.code}-${size.code}`;
          const barcode = `20${String(barcodeCounter++).padStart(10, '0')}`;
          variants.push({
            id: `VAR-${sku}`,
            modelId: model.id,
            colorId: color.id,
            sizeId: size.id,
            sku,
            barcode,
            reorderLevel: 5,
            active: true,
          });
        }
      }
    }
  }

  // Pre-seed FIFO lots, movements and balances
  const costLots: CostLot[] = [];
  const stockMovements: StockMovement[] = [];
  const lotAllocations: LotAllocation[] = [];
  const stockBalances: StockBalance[] = [];
  const stockDocuments: StockDocument[] = [];

  let seqNum = 1;

  // Let's create an initial receipt document
  const initDoc: StockDocument = {
    id: 'DOC-INIT-001',
    documentNo: 'RCP-00001',
    type: 'RECEIPT',
    date: '2026-10-10T09:00:00Z',
    notes: 'بضاعة رصيد افتتاحي واستلام شحنة مصنع النيل',
    negativeOverride: false,
    postedBy: 'محمود رأفت (أمين المخزن)',
    postedAt: '2026-10-10T09:00:00Z',
  };
  stockDocuments.push(initDoc);

  // Distribute initial stock for each variant across Central Warehouse and Branches
  variants.forEach((v, idx) => {
    // Model base cost: SH101 -> 240, TS202 -> 160, PT303 -> 290, JK404 -> 650
    let unitCost = 200;
    if (v.sku.startsWith('SH101')) unitCost = 240;
    else if (v.sku.startsWith('TS202')) unitCost = 160;
    else if (v.sku.startsWith('PT303')) unitCost = 290;
    else if (v.sku.startsWith('JK404')) unitCost = 650;

    // 1. Warehouse quantity: 30 pieces
    const whQty = 30;
    const whMovId = `MOV-WH-${idx}`;
    const whLotId = `LOT-WH-${idx}`;
    
    costLots.push({
      id: whLotId,
      variantId: v.id,
      locationId: 'LOC-WH',
      fifoDate: '2026-10-10T09:00:00Z',
      seq: seqNum++,
      originalQty: whQty,
      remainingQty: whQty,
      unitCost,
      costSource: 'PURCHASE_RECEIPT',
      isProvisional: false,
      sourceMovementId: whMovId,
      createdAt: '2026-10-10T09:00:00Z',
    });

    stockMovements.push({
      id: whMovId,
      documentId: initDoc.id,
      variantId: v.id,
      locationId: 'LOC-WH',
      qtyDelta: whQty,
      balanceAfter: whQty,
      unitCost,
      valueDelta: whQty * unitCost,
      createdAt: '2026-10-10T09:00:00Z',
    });

    stockBalances.push({
      variantId: v.id,
      locationId: 'LOC-WH',
      onHand: whQty,
      reserved: 0,
      lastMovementId: whMovId,
    });

    // 2. Maadi Branch quantity: 10 pieces
    const maadiQty = 10;
    const maadiMovId = `MOV-MAADI-${idx}`;
    const maadiLotId = `LOT-MAADI-${idx}`;

    costLots.push({
      id: maadiLotId,
      variantId: v.id,
      locationId: 'LOC-MAADI',
      fifoDate: '2026-10-10T10:00:00Z',
      seq: seqNum++,
      originalQty: maadiQty,
      remainingQty: maadiQty,
      unitCost,
      costSource: 'TRANSFER_IN',
      isProvisional: false,
      sourceMovementId: maadiMovId,
      originLotId: whLotId,
      createdAt: '2026-10-10T10:00:00Z',
    });

    stockMovements.push({
      id: maadiMovId,
      documentId: initDoc.id,
      variantId: v.id,
      locationId: 'LOC-MAADI',
      qtyDelta: maadiQty,
      balanceAfter: maadiQty,
      unitCost,
      valueDelta: maadiQty * unitCost,
      createdAt: '2026-10-10T10:00:00Z',
    });

    stockBalances.push({
      variantId: v.id,
      locationId: 'LOC-MAADI',
      onHand: maadiQty,
      reserved: 0,
      lastMovementId: maadiMovId,
    });

    // 3. New Cairo Branch: 8 pieces
    const tagammoQty = 8;
    const tagammoMovId = `MOV-TAG-${idx}`;
    const tagammoLotId = `LOT-TAG-${idx}`;

    costLots.push({
      id: tagammoLotId,
      variantId: v.id,
      locationId: 'LOC-TAGAMMO',
      fifoDate: '2026-10-10T10:30:00Z',
      seq: seqNum++,
      originalQty: tagammoQty,
      remainingQty: tagammoQty,
      unitCost,
      costSource: 'TRANSFER_IN',
      isProvisional: false,
      sourceMovementId: tagammoMovId,
      originLotId: whLotId,
      createdAt: '2026-10-10T10:30:00Z',
    });

    stockMovements.push({
      id: tagammoMovId,
      documentId: initDoc.id,
      variantId: v.id,
      locationId: 'LOC-TAGAMMO',
      qtyDelta: tagammoQty,
      balanceAfter: tagammoQty,
      unitCost,
      valueDelta: tagammoQty * unitCost,
      createdAt: '2026-10-10T10:30:00Z',
    });

    stockBalances.push({
      variantId: v.id,
      locationId: 'LOC-TAGAMMO',
      onHand: tagammoQty,
      reserved: 0,
      lastMovementId: tagammoMovId,
    });
  });

  // Sample sales at Maadi branch to populate daily accounting revenue & COGS
  const sales: Sale[] = [];
  const testSaleVariant = variants[0]; // SH101-WHT-M
  const testSaleLot = costLots.find(l => l.variantId === testSaleVariant.id && l.locationId === 'LOC-MAADI')!;
  
  if (testSaleLot) {
    const saleDoc: StockDocument = {
      id: 'DOC-SALE-001',
      documentNo: 'INV-10001',
      type: 'SALE',
      date: '2026-10-20T09:15:00Z',
      notes: 'مبيعات نقدية للفرع',
      negativeOverride: false,
      postedBy: 'أحمد سامي (الكاشير)',
      postedAt: '2026-10-20T09:15:00Z',
    };
    stockDocuments.push(saleDoc);

    const saleQty = 2;
    testSaleLot.remainingQty -= saleQty;

    const saleMovId = 'MOV-SALE-001';
    stockMovements.push({
      id: saleMovId,
      documentId: saleDoc.id,
      variantId: testSaleVariant.id,
      locationId: 'LOC-MAADI',
      qtyDelta: -saleQty,
      balanceAfter: 8,
      unitCost: testSaleLot.unitCost,
      valueDelta: -(saleQty * testSaleLot.unitCost),
      createdAt: '2026-10-20T09:15:00Z',
    });

    const allocId = 'ALLOC-SALE-001';
    lotAllocations.push({
      id: allocId,
      movementId: saleMovId,
      costLotId: testSaleLot.id,
      qty: saleQty,
      unitCost: testSaleLot.unitCost,
      value: saleQty * testSaleLot.unitCost,
      isProvisional: false,
      createdAt: '2026-10-20T09:15:00Z',
    });

    // Update balance
    const maadiBal = stockBalances.find(b => b.variantId === testSaleVariant.id && b.locationId === 'LOC-MAADI');
    if (maadiBal) {
      maadiBal.onHand = 8;
      maadiBal.lastMovementId = saleMovId;
    }

    sales.push({
      id: 'SALE-10001',
      invoiceNo: 'INV-10001',
      locationId: 'LOC-MAADI',
      status: 'POSTED',
      customerName: 'عميل نقدي',
      subtotal: 960.00,
      discount: 0,
      total: 960.00,
      cogsTotal: saleQty * testSaleLot.unitCost,
      cashierId: 'cashier-01',
      cashierName: 'أحمد سامي',
      payments: [{ id: 'PAY-1', method: 'CASH', amount: 960.00 }],
      lines: [{
        id: 'SL-01',
        variantId: testSaleVariant.id,
        qty: saleQty,
        unitPrice: 480.00,
        lineDiscount: 0,
        returnedQty: 0,
        costTotal: saleQty * testSaleLot.unitCost,
      }],
      postedAt: '2026-10-20T09:15:00Z',
    });
  }

  // Sample In-Transit Transfer (Warehouse -> New Cairo) to demonstrate Section 4.2 In-Transit Accounting
  const transferVariant = variants[2]; // SH101-WHT-XL
  const whSourceLot = costLots.find(l => l.variantId === transferVariant.id && l.locationId === 'LOC-WH')!;
  const transferQty = 5;

  const dispatchDoc: StockDocument = {
    id: 'DOC-TR-001',
    documentNo: 'TR-00001',
    type: 'TRANSFER_DISPATCH',
    date: '2026-10-20T08:30:00Z',
    notes: 'إرسال طلبية تعزيز من المستودع إلى فرع التجمع',
    negativeOverride: false,
    postedBy: 'محمود رأفت (أمين المخزن)',
    postedAt: '2026-10-20T08:30:00Z',
  };
  stockDocuments.push(dispatchDoc);

  // Source deduction: source -
  whSourceLot.remainingQty -= transferQty;
  const dispatchMovId = 'MOV-TR-DISPATCH-001';
  stockMovements.push({
    id: dispatchMovId,
    documentId: dispatchDoc.id,
    variantId: transferVariant.id,
    locationId: 'LOC-WH',
    qtyDelta: -transferQty,
    balanceAfter: 25,
    unitCost: whSourceLot.unitCost,
    valueDelta: -(transferQty * whSourceLot.unitCost),
    createdAt: '2026-10-20T08:30:00Z',
  });
  const whBal = stockBalances.find(b => b.variantId === transferVariant.id && b.locationId === 'LOC-WH')!;
  whBal.onHand = 25;
  whBal.lastMovementId = dispatchMovId;

  // Transit addition: transit +
  const transitMovId = 'MOV-TR-TRANSIT-001';
  const transitLotId = 'LOT-TRANSIT-001';
  costLots.push({
    id: transitLotId,
    variantId: transferVariant.id,
    locationId: 'LOC-TRANSIT',
    fifoDate: whSourceLot.fifoDate, // Keeps original FIFO date
    seq: seqNum++,
    originalQty: transferQty,
    remainingQty: transferQty,
    unitCost: whSourceLot.unitCost,
    costSource: 'TRANSFER_IN',
    isProvisional: false,
    sourceMovementId: transitMovId,
    originLotId: whSourceLot.id,
    createdAt: '2026-10-20T08:30:00Z',
  });

  stockMovements.push({
    id: transitMovId,
    documentId: dispatchDoc.id,
    variantId: transferVariant.id,
    locationId: 'LOC-TRANSIT',
    qtyDelta: transferQty,
    balanceAfter: transferQty,
    unitCost: whSourceLot.unitCost,
    valueDelta: transferQty * whSourceLot.unitCost,
    createdAt: '2026-10-20T08:30:00Z',
  });

  stockBalances.push({
    variantId: transferVariant.id,
    locationId: 'LOC-TRANSIT',
    onHand: transferQty,
    reserved: 0,
    lastMovementId: transitMovId,
  });

  const transfers: Transfer[] = [
    {
      id: 'TR-1001',
      transferNo: 'TR-00001',
      fromLocationId: 'LOC-WH',
      toLocationId: 'LOC-TAGAMMO',
      transitLocationId: 'LOC-TRANSIT',
      status: 'DISPATCHED',
      lines: [{
        id: 'TRL-01',
        variantId: transferVariant.id,
        requestedQty: transferQty,
        dispatchedQty: transferQty,
        receivedQty: 0,
        settledQty: 0,
      }],
      createdBy: 'محمود رأفت (أمين المخزن)',
      createdAt: '2026-10-20T08:30:00Z',
      dispatchedAt: '2026-10-20T08:30:00Z',
    }
  ];

  const purchases: Purchase[] = [
    {
      id: 'PO-001',
      purchaseNo: 'PO-2026-001',
      supplierId: 'SUP-01',
      supplierInvoiceNo: 'INV-NILE-8841',
      locationId: 'LOC-WH',
      status: 'RECEIVED',
      lines: [
        {
          id: 'POL-01',
          variantId: variants[0].id,
          orderedQty: 50,
          receivedQty: 50,
          returnedQty: 0,
          unitCost: 240.00,
        },
        {
          id: 'POL-02',
          variantId: variants[1].id,
          orderedQty: 40,
          receivedQty: 40,
          returnedQty: 0,
          unitCost: 240.00,
        }
      ],
      createdBy: 'محمد الشريف',
      createdAt: '2026-10-09T10:00:00Z',
      receivedAt: '2026-10-10T09:00:00Z',
    }
  ];

  const stocktakeSessions: StocktakeSession[] = [];
  const auditLogs: AuditLog[] = [
    {
      id: 'AUD-01',
      userId: 'admin-01',
      userName: 'محمد الشريف (مدير النظام)',
      action: 'SYSTEM_BOOTSTRAP',
      entity: 'SYSTEM',
      entityId: 'ROOT',
      after: { version: '1.0.0-blueprint', standard: 'MontuCode 06-accounting-rules' },
      at: '2026-10-10T08:00:00Z',
    },
    {
      id: 'AUD-02',
      userId: 'inv-01',
      userName: 'محمود رأفت (أمين المخزن)',
      action: 'STOCK_RECEIPT',
      entity: 'RECEIPT',
      entityId: 'RCP-00001',
      after: { itemsReceived: variants.length, location: 'LOC-WH' },
      at: '2026-10-10T09:00:00Z',
    },
    {
      id: 'AUD-03',
      userId: 'inv-01',
      userName: 'محمود رأفت (أمين المخزن)',
      action: 'TRANSFER_DISPATCH',
      entity: 'TRANSFER',
      entityId: 'TR-00001',
      after: { from: 'LOC-WH', to: 'LOC-TAGAMMO', inTransitQty: 5 },
      at: '2026-10-20T08:30:00Z',
    },
  ];

  const labelPrintLogs: LabelPrintLog[] = [
    {
      id: 'LBL-01',
      variantId: variants[0].id,
      variantSku: variants[0].sku,
      variantBarcode: variants[0].barcode,
      qty: 10,
      isReprint: false,
      printedBy: 'محمود رأفت',
      printedAt: '2026-10-10T09:15:00Z',
    }
  ];

  return {
    locations: INITIAL_LOCATIONS,
    categories: INITIAL_CATEGORIES,
    colors: INITIAL_COLORS,
    sizes: INITIAL_SIZES,
    models: INITIAL_MODELS,
    variants,
    costLots,
    stockMovements,
    lotAllocations,
    stockBalances,
    stockDocuments,
    sales,
    transfers,
    purchases,
    suppliers: INITIAL_SUPPLIERS,
    stocktakeSessions,
    auditLogs,
    labelPrintLogs,
    shifts: [
      {
        id: 'SHIFT-001',
        shiftNo: 'SH-001',
        locationId: 'LOC-MAADI',
        cashierId: 'cashier-01',
        cashierName: 'أحمد سامي (الكاشير)',
        openedAt: new Date(Date.now() - 4 * 3600 * 1000).toISOString(),
        status: 'OPEN' as const,
        openingFloat: 500.0,
        totalCashSales: 0,
        totalCardSales: 0,
        totalWalletSales: 0,
        totalExpenses: 50.0,
        expectedCashInDrawer: 450.0,
        transactions: [
          {
            id: 'DT-01',
            shiftId: 'SHIFT-001',
            type: 'CASH_OUT' as const,
            amount: 50.0,
            reason: 'شراء ضيافة وبوفيه للمحل',
            performedBy: 'أحمد سامي (الكاشير)',
            createdAt: new Date(Date.now() - 2 * 3600 * 1000).toISOString(),
          }
        ],
        notes: 'وردية صباحية منتظمة'
      }
    ],
    nextDocSeq: {
      INV: 10002,
      RCP: 2,
      TR: 2,
      STK: 1,
      BARCODE: barcodeCounter,
    },
    settings: {
      shopName: 'بوتيك مونتو للأزياء الراقية (Montu Fashion)',
      currency: 'ج.م',
      timezone: 'Africa/Cairo',
      receiptHeader: 'أهلاً بكم في بوتيك مونتو كود للأزياء\nس.ت: 492010 | ب.ض: 512-880-991',
      receiptFooter: 'شكراً لزيارتكم! يمكن استبدال المنتجات السليمة خلال 14 يوماً بالفاتورة وأصل الباركود.',
      allowNegativeByDefault: false,
      requireSupervisorNegativeAuth: true,
      labelWidthMm: 40,
      labelHeightMm: 25,
      showPriceOnLabel: true,
    }
  };
}

const STORAGE_KEY = 'montucode_clothing_inventory_store_v1';

export class AppStorage {
  private static instance: AppStorage;
  private data: ReturnType<typeof generateInitialData>;
  private listeners: (() => void)[] = [];

  private constructor() {
    this.data = this.load();
  }

  public static getInstance(): AppStorage {
    if (!AppStorage.instance) {
      AppStorage.instance = new AppStorage();
    }
    return AppStorage.instance;
  }

  private load(): ReturnType<typeof generateInitialData> {
    const initial = generateInitialData();
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (!parsed.shifts) {
          parsed.shifts = initial.shifts;
        }
        return parsed;
      }
    } catch (e) {
      console.error('Failed to load from localStorage:', e);
    }
    this.saveDirect(initial);
    return initial;
  }

  private saveDirect(data: ReturnType<typeof generateInitialData>) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    } catch (e) {
      console.error('Failed to save to localStorage:', e);
    }
  }

  public save() {
    this.saveDirect(this.data);
    this.notify();
  }

  public resetToDefault() {
    this.data = generateInitialData();
    this.save();
  }

  public subscribe(cb: () => void) {
    this.listeners.push(cb);
    return () => {
      this.listeners = this.listeners.filter(l => l !== cb);
    };
  }

  private notify() {
    for (const listener of this.listeners) {
      listener();
    }
  }

  public getData() {
    return this.data;
  }
}
