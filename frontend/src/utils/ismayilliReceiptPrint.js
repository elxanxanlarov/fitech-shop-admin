import { formatAmountInWords, formatCashParenthetical } from './azerbaijaniAmountWords.js';
import {
  formatCheckDate,
  formatCheckNumber,
  fmtMoney,
  fmtQty,
  escapeHtml,
} from './ismayilliReceiptFormat.js';
import { buildPaperConfig, getPrintPageStyle, DEFAULT_RECEIPT_PAPER_PRESET_ID } from '../constants/ismayilliReceiptPaper.js';

const STORE_TITLE = 'EKONOM';
const CURRENCY = 'AZN';

function buildItemsRows(items = [], tableFontSizePx = 10) {
  return items
    .map((item, index) => {
      const name = item.product?.name || item.name || '-';
      const barcode = item.product?.barcode || item.barcode || '';
      const qty = fmtQty(item.quantity);
      const price = fmtMoney(item.pricePerItem ?? item.price);
      const total = fmtMoney(
        item.totalPrice ?? parseFloat(item.quantity || 0) * parseFloat(item.pricePerItem ?? item.price ?? 0)
      );

      return `
        <tr class="item-row">
          <td class="col-no">${index + 1}</td>
          <td class="col-name">${escapeHtml(name)}</td>
          <td class="col-qty">${qty}</td>
          <td class="col-price">${price}</td>
          <td class="col-pct"></td>
          <td class="col-disc"></td>
          <td class="col-total">${total}</td>
        </tr>
        <tr class="barcode-row">
          <td></td>
          <td colspan="6" class="col-barcode">${escapeHtml(barcode)}</td>
        </tr>
      `;
    })
    .join('');
}

/**
 * @param {object} sale
 * @param {{ type?: 'sale'|'return', autoPrint?: boolean, paperPresetId?: string, paper?: object }} options
 */
export function buildIsmayilliReceiptHtml(sale, options = {}) {
  const {
    type = 'sale',
    autoPrint = false,
    paperPresetId = DEFAULT_RECEIPT_PAPER_PRESET_ID,
    paper: paperOverride,
  } = options;

  const paper = paperOverride || buildPaperConfig(paperPresetId);
  const isReturn = type === 'return';
  const checkLabel = isReturn ? 'Çek (qaytarma)' : 'Çek (satış)';
  const checkNo = formatCheckNumber(sale.checkNumber, sale.id);
  const dateStr = formatCheckDate(sale.createdAt || new Date());
  const total = parseFloat(sale.totalAmount || 0);
  const paid = parseFloat(sale.paidAmount ?? sale.totalAmount ?? 0);
  const itemsHtml = buildItemsRows(sale.items || [], paper.tableFontSizePx);
  const pageSize = paper.heightMm ? `${paper.widthMm}mm ${paper.heightMm}mm` : `${paper.widthMm}mm auto`;

  const paymentLine = isReturn
    ? `<div class="line">Qaytarılmalı: -${fmtMoney(total).replace('.', ',')} (${formatAmountInWords(total)})</div>`
    : `<div class="line">Nəğd: ${formatCashParenthetical(paid)}</div>`;

  return `<!DOCTYPE html>
<html>
  <head>
    <meta charset="utf-8" />
    <title>${escapeHtml(checkLabel)} №${checkNo}</title>
    <style>
      @page { size: ${pageSize}; margin: ${paper.marginMm}mm; }
      * { box-sizing: border-box; margin: 0; padding: 0; }
      body {
        font-family: "Courier New", Courier, monospace;
        font-size: ${paper.fontSizePx}px;
        line-height: 1.35;
        color: #000;
        background: #fff;
        width: ${paper.bodyWidthMm}mm;
        margin: 0 auto;
        padding: ${paper.marginMm + 2}mm ${paper.marginMm}mm;
      }
      .store-title {
        font-weight: bold;
        font-size: ${paper.titleFontSizePx}px;
        letter-spacing: 2px;
        margin-bottom: 8px;
      }
      .line { margin: 2px 0; white-space: pre-wrap; word-break: break-word; }
      .spacer { height: 6px; }
      .meta-label { display: inline-block; min-width: 52px; }
      table.items {
        width: 100%;
        border-collapse: collapse;
        margin-top: 6px;
        font-size: ${paper.tableFontSizePx}px;
      }
      table.items th, table.items td {
        padding: 1px 2px;
        vertical-align: top;
        text-align: left;
      }
      .col-qty, .col-price, .col-pct, .col-disc, .col-total { text-align: right; white-space: nowrap; }
      tr.barcode-row td { font-size: ${Math.max(paper.tableFontSizePx - 1, 8)}px; padding-bottom: 4px; }
      .total-row { text-align: right; font-weight: bold; margin-top: 4px; }
      .footer-block { margin-top: 8px; border-top: 1px dashed #000; padding-top: 6px; }
    </style>
  </head>
  <body>
    <div class="store-title">${STORE_TITLE}</div>
    <div class="spacer"></div>
    <div class="line">${checkLabel} №${checkNo}</div>
    <div class="line">${dateStr}</div>
    <div class="spacer"></div>
    <div class="line"><span class="meta-label">Alıcı:</span></div>
    <div class="line"><span class="meta-label">Satıcı:</span></div>
    <div class="line"><span class="meta-label">Valyuta:</span> ${CURRENCY}</div>
    <div class="spacer"></div>
    <table class="items">
      <thead>
        <tr>
          <th>№</th><th>Mal</th>
          <th class="col-qty">Miq.</th><th class="col-price">Qiymət</th>
          <th class="col-pct">%</th><th class="col-disc">Endirim</th><th class="col-total">Məbləğ</th>
        </tr>
        <tr><th></th><th colspan="6">Ştrixkod</th></tr>
      </thead>
      <tbody>${itemsHtml}</tbody>
    </table>
    <div class="total-row">${fmtMoney(total)}</div>
    <div class="footer-block">
      <div class="line">${formatAmountInWords(total)}</div>
      ${paymentLine}
      <div class="line">IlkinQaliqBonus:--</div>
      <div class="line">CekinBonusu:--</div>
      <div class="line">SonQaliqBonus:--</div>
    </div>
    ${
      autoPrint
        ? `<script>window.onload=function(){window.print();setTimeout(function(){window.close();},600);};</script>`
        : ''
    }
  </body>
</html>`;
}

/** Köhnə birbaşa çap — modal əvəzinə istifadə olunmur */
export function printIsmayilliReceipt(sale, options = {}) {
  if (!sale) return;
  const html = buildIsmayilliReceiptHtml(sale, { ...options, autoPrint: true });
  const printWindow = window.open('', '_blank', 'width=320,height=640');
  if (!printWindow) return;
  printWindow.document.write(html);
  printWindow.document.close();
}

export { getPrintPageStyle };
