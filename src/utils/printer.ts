/**
 * Thermal Printer & Barcode Label Utility
 * Optimized for 80mm POS Thermal Receipt Printers & 40x25mm / 50x25mm Label Printers (Xprinter, Epson, Zebra, Rongta)
 * Works robustly inside and outside iframes by using dedicated hidden iframe printing and popup window bridges.
 */

export interface ReceiptPrintData {
  shopName: string;
  branchName: string;
  invoiceNo: string;
  cashierName: string;
  dateStr: string;
  items: {
    sku: string;
    name: string;
    qty: number;
    price: number;
    total: number;
  }[];
  subtotal: number;
  discount: number;
  total: number;
  paymentMethod: string;
  receiptHeader?: string;
  receiptFooter?: string;
}

export interface LabelPrintData {
  shopName: string;
  modelName: string;
  colorName: string;
  sizeCode: string;
  barcode: string;
  sku: string;
  price: number;
  svgHtml: string;
  copies: number;
  labelWidthMm?: number;
  labelHeightMm?: number;
  showPrice?: boolean;
}

/**
 * Print via a dedicated hidden iframe.
 * This NEVER gets blocked by browser popup blockers!
 */
function printViaHiddenIframe(htmlContent: string): Promise<boolean> {
  return new Promise((resolve) => {
    try {
      const existing = document.getElementById('montu-print-frame');
      if (existing) {
        existing.remove();
      }

      const iframe = document.createElement('iframe');
      iframe.id = 'montu-print-frame';
      iframe.style.position = 'fixed';
      iframe.style.right = '0';
      iframe.style.bottom = '0';
      iframe.style.width = '0';
      iframe.style.height = '0';
      iframe.style.border = '0';
      iframe.style.opacity = '0';
      iframe.style.pointerEvents = 'none';
      document.body.appendChild(iframe);

      const frameDoc = iframe.contentWindow?.document || iframe.contentDocument;
      if (!frameDoc) {
        resolve(false);
        return;
      }

      frameDoc.open();
      frameDoc.write(htmlContent);
      frameDoc.close();

      setTimeout(() => {
        try {
          iframe.contentWindow?.focus();
          iframe.contentWindow?.print();
          resolve(true);
        } catch (err) {
          console.warn('Iframe print failed, falling back to window', err);
          resolve(false);
        }
      }, 350);
    } catch (e) {
      console.error('Failed to create print iframe:', e);
      resolve(false);
    }
  });
}

/**
 * Open dedicated print window for 80mm thermal receipt
 */
export function printThermalReceipt(data: ReceiptPrintData, forcePopup: boolean = false): boolean {
  const content = `
    <!DOCTYPE html>
    <html lang="ar" dir="rtl">
    <head>
      <meta charset="utf-8">
      <title>فاتورة ${data.invoiceNo} - ${data.shopName}</title>
      <style>
        @page {
          size: 80mm auto;
          margin: 0;
        }
        * {
          box-sizing: border-box;
          -webkit-print-color-adjust: exact;
          print-color-adjust: exact;
        }
        body {
          font-family: 'Courier New', Courier, monospace, system-ui, sans-serif;
          font-size: 12px;
          line-height: 1.35;
          width: 72mm;
          margin: 0 auto;
          padding: 8px 4px;
          color: #000;
          background: #fff;
        }
        .text-center { text-align: center; }
        .text-left { text-align: left; }
        .text-right { text-align: right; }
        .font-bold { font-weight: bold; }
        .divider {
          border-top: 1px dashed #000;
          margin: 6px 0;
        }
        .header-title {
          font-size: 15px;
          font-weight: 900;
          margin-bottom: 2px;
        }
        .subtitle {
          font-size: 11px;
          color: #222;
        }
        table {
          width: 100%;
          border-collapse: collapse;
          font-size: 11px;
          margin: 4px 0;
        }
        th {
          border-bottom: 1px dashed #000;
          padding: 3px 0;
          font-weight: bold;
        }
        td {
          padding: 4px 0;
          vertical-align: top;
        }
        .totals-row {
          display: flex;
          justify-content: space-between;
          font-size: 12px;
          padding: 2px 0;
        }
        .grand-total {
          font-size: 14px;
          font-weight: 900;
          border-top: 1px solid #000;
          border-bottom: 1px solid #000;
          padding: 4px 0;
          margin-top: 4px;
        }
        .footer-note {
          font-size: 10px;
          text-align: center;
          margin-top: 8px;
        }
        .no-print-bar {
          background: #0f172a;
          color: #fff;
          padding: 12px;
          text-align: center;
          border-radius: 8px;
          margin-bottom: 15px;
          font-family: system-ui, sans-serif;
        }
        .btn-print {
          background: #f59e0b;
          color: #000;
          border: none;
          padding: 9px 20px;
          font-weight: 800;
          border-radius: 8px;
          cursor: pointer;
          font-size: 14px;
          box-shadow: 0 4px 6px rgba(0,0,0,0.15);
        }
        @media print {
          .no-print-bar { display: none !important; }
        }
      </style>
    </head>
    <body>
      <div class="no-print-bar">
        <button class="btn-print" onclick="window.print()">🖨️ اضغط هنا لتأكيد الطباعة</button>
        <div style="font-size:11px;color:#cbd5e1;margin-top:6px;">
          تأكد من اختيار طابعة الإيصالات الحرارية (80mm) وإلغاء الهوامش (Margins: None)
        </div>
      </div>

      <div class="text-center">
        <div class="header-title">${data.shopName}</div>
        <div class="subtitle">${data.branchName}</div>
        ${data.receiptHeader ? `<div style="font-size:10px;margin-top:2px;">${data.receiptHeader.replace(/\n/g, '<br>')}</div>` : ''}
      </div>

      <div class="divider"></div>

      <div style="display:flex;justify-content:space-between;font-size:11px;">
        <span>فاتورة: <strong>${data.invoiceNo}</strong></span>
        <span>${data.dateStr}</span>
      </div>
      <div style="font-size:10px;margin-top:2px;">الكاشير: ${data.cashierName}</div>

      <div class="divider"></div>

      <table>
        <thead>
          <tr>
            <th class="text-right">الصنف</th>
            <th class="text-center">الكمية</th>
            <th class="text-left">السعر</th>
            <th class="text-left">الإجمالي</th>
          </tr>
        </thead>
        <tbody>
          ${data.items.map(item => `
            <tr>
              <td>
                <div class="font-bold">${item.name}</div>
                <div style="font-size:9px;color:#333;">${item.sku}</div>
              </td>
              <td class="text-center font-bold">${item.qty}</td>
              <td class="text-left">${item.price.toFixed(2)}</td>
              <td class="text-left font-bold">${item.total.toFixed(2)}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>

      <div class="divider"></div>

      <div class="totals-row">
        <span>المجموع:</span>
        <span>${data.subtotal.toFixed(2)} ج.م</span>
      </div>
      ${data.discount > 0 ? `
        <div class="totals-row" style="color:#b91c1c;">
          <span>الخصم:</span>
          <span>-${data.discount.toFixed(2)} ج.م</span>
        </div>
      ` : ''}

      <div class="totals-row grand-total">
        <span>الصافي المطلوب:</span>
        <span>${data.total.toFixed(2)} ج.م</span>
      </div>

      <div class="totals-row" style="font-size:10px;margin-top:3px;">
        <span>وسيلة الدفع:</span>
        <span>${data.paymentMethod}</span>
      </div>

      <div class="divider"></div>

      <div class="footer-note">
        ${data.receiptFooter ? data.receiptFooter.replace(/\n/g, '<br>') : 'شكراً لتسوقكم معنا!'}
      </div>

      <script>
        window.onload = function() {
          setTimeout(function() {
            window.print();
          }, 350);
        };
      </script>
    </body>
    </html>
  `;

  if (forcePopup) {
    const printWindow = window.open('', '_blank', 'width=450,height=680');
    if (printWindow) {
      printWindow.document.open();
      printWindow.document.write(content);
      printWindow.document.close();
      return true;
    }
  }

  // Use hidden iframe as robust primary method
  printViaHiddenIframe(content);
  return true;
}

/**
 * High-Precision Barcode Sticky Labels Printing
 * Optimized for optical laser & 2D handheld scanners on 40x25mm, 50x25mm, 50x30mm thermal rolls
 */
export function printThermalLabels(data: LabelPrintData, forcePopup: boolean = false): boolean {
  const widthMm = data.labelWidthMm || 40;
  const heightMm = data.labelHeightMm || 25;
  const showPrice = data.showPrice ?? true;

  const labelsHtml = Array.from({ length: data.copies }).map(() => `
    <div class="label-page">
      <div class="header-block">
        <div class="shop-name">${data.shopName}</div>
        <div class="item-title">${data.modelName} — ${data.colorName} ${data.sizeCode}</div>
      </div>
      
      <div class="barcode-container">
        ${data.svgHtml}
      </div>

      <div class="footer-row">
        <span class="barcode-digits">${data.barcode}</span>
        ${showPrice ? `<span class="price-tag">${data.price.toFixed(2)} ج.م</span>` : `<span class="sku-tag">${data.sku}</span>`}
      </div>
    </div>
  `).join('');

  const content = `
    <!DOCTYPE html>
    <html lang="ar" dir="rtl">
    <head>
      <meta charset="utf-8">
      <title>طباعة ملصقات باركود ${data.sku} (${data.copies} نسخة)</title>
      <style>
        @page {
          size: ${widthMm}mm ${heightMm}mm;
          margin: 0;
        }
        * {
          box-sizing: border-box;
          -webkit-print-color-adjust: exact;
          print-color-adjust: exact;
          image-rendering: pixelated;
        }
        body {
          margin: 0;
          padding: 0;
          background: #ffffff;
          color: #000000;
          font-family: system-ui, -apple-system, 'Cairo', sans-serif;
        }
        .label-page {
          width: ${widthMm}mm;
          height: ${heightMm}mm;
          page-break-after: always;
          display: flex;
          flex-direction: column;
          justify-content: space-between;
          align-items: center;
          text-align: center;
          padding: 1.2mm 1mm;
          overflow: hidden;
          background: #ffffff;
        }
        .header-block {
          width: 100%;
          display: flex;
          flex-direction: column;
          align-items: center;
          line-height: 1.05;
        }
        .shop-name {
          font-size: 7.5pt;
          font-weight: 700;
          letter-spacing: -0.2px;
          color: #000;
          max-width: 98%;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }
        .item-title {
          font-size: 7.5pt;
          font-weight: 800;
          color: #000;
          max-width: 98%;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
          margin-top: 0.3mm;
        }
        .barcode-container {
          width: 100%;
          flex-grow: 1;
          display: flex;
          justify-content: center;
          align-items: center;
          padding: 0.2mm 0;
          overflow: hidden;
        }
        .barcode-container svg {
          max-width: 96%;
          height: auto;
          max-height: 13.5mm;
          shape-rendering: crispEdges;
          display: block;
        }
        .footer-row {
          width: 96%;
          display: flex;
          justify-content: space-between;
          align-items: center;
          font-family: 'JetBrains Mono', 'Courier New', Courier, monospace;
          font-size: 7.5pt;
          font-weight: 800;
          border-top: 0.8px solid #000000;
          padding-top: 0.4mm;
          line-height: 1;
        }
        .barcode-digits {
          letter-spacing: 0.8px;
          font-weight: 900;
        }
        .price-tag {
          font-weight: 900;
          font-size: 8.5pt;
          letter-spacing: -0.2px;
        }
        .sku-tag {
          font-size: 6.5pt;
          font-weight: 700;
        }
        .no-print-bar {
          background: #0f172a;
          color: #ffffff;
          padding: 12px;
          text-align: center;
          margin-bottom: 10px;
          font-family: system-ui, sans-serif;
        }
        .btn-print {
          background: #f59e0b;
          color: #000000;
          border: none;
          padding: 9px 22px;
          font-weight: 800;
          border-radius: 8px;
          cursor: pointer;
          font-size: 14px;
        }
        @media print {
          .no-print-bar { display: none !important; }
        }
      </style>
    </head>
    <body>
      <div class="no-print-bar">
        <button class="btn-print" onclick="window.print()">🖨️ اضغط هنا لبدء طباعة ملصقات الباركود</button>
        <div style="font-size:11px;color:#cbd5e1;margin-top:6px;">
          إعدادات الطابعة الحرارية: مقاس الورق <strong>${widthMm} × ${heightMm} مم</strong>، بدون هوامش (Margins: None).
        </div>
      </div>

      ${labelsHtml}

      <script>
        window.onload = function() {
          setTimeout(function() {
            window.print();
          }, 350);
        };
      </script>
    </body>
    </html>
  `;

  if (forcePopup) {
    const printWindow = window.open('', '_blank', 'width=460,height=600');
    if (printWindow) {
      printWindow.document.open();
      printWindow.document.write(content);
      printWindow.document.close();
      return true;
    }
  }

  // Use hidden iframe as primary method so popup blockers never interfere
  printViaHiddenIframe(content);
  return true;
}
