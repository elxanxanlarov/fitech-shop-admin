import { Fragment } from 'react';
import {
  formatCheckDate,
  formatCheckNumber,
  fmtMoney,
  fmtQty,
} from '../../utils/ismayilliReceiptFormat';
import { formatAmountInWords, formatCashParenthetical } from '../../utils/azerbaijaniAmountWords';

const STORE_TITLE = 'EKONOM';
const CURRENCY = 'AZN';

export default function IsmayilliReceiptBody({ sale, type = 'sale', paper }) {
  if (!sale || !paper) return null;

  const isReturn = type === 'return';
  const checkLabel = isReturn ? 'Çek (qaytarma)' : 'Çek (satış)';
  const checkNo = formatCheckNumber(sale.checkNumber, sale.id);
  const dateStr = formatCheckDate(sale.createdAt || new Date());
  const total = parseFloat(sale.totalAmount || 0);
  const paid = parseFloat(sale.paidAmount ?? sale.totalAmount ?? 0);
  const returnedAmount = parseFloat(sale.returnedAmount || 0);
  const originalSaleAmount = parseFloat(sale.originalSaleAmount || 0);
  const items = sale.items || [];

  return (
    <div
      style={{
        fontFamily: '"Courier New", Courier, monospace',
        fontSize: `${paper.fontSizePx}px`,
        lineHeight: 1.35,
        color: '#000',
        background: '#fff',
        width: `${paper.bodyWidthMm}mm`,
        maxWidth: '100%',
        margin: '0 auto',
        padding: `${paper.marginMm + 2}mm ${paper.marginMm}mm`,
      }}
    >
      <div
        style={{
          fontWeight: 'bold',
          fontSize: `${paper.titleFontSizePx}px`,
          letterSpacing: '2px',
          marginBottom: '8px',
        }}
      >
        {STORE_TITLE}
      </div>
      <div style={{ height: 6 }} />
      <div>{checkLabel} №{checkNo}</div>
      <div>{dateStr}</div>
      <div style={{ height: 6 }} />
      <div>
        <span style={{ display: 'inline-block', minWidth: 52 }}>Alıcı:</span>
        {sale.customerName || sale.customerSurname
          ? ` ${[sale.customerName, sale.customerSurname].filter(Boolean).join(' ')}`
          : ''}
      </div>
      <div>
        <span style={{ display: 'inline-block', minWidth: 52 }}>Satıcı:</span>
        {sale.sellerName ? ` ${sale.sellerName}` : ''}
      </div>
      <div><span style={{ display: 'inline-block', minWidth: 52 }}>Valyuta:</span> {CURRENCY}</div>
      <div style={{ height: 6 }} />

      <table
        style={{
          width: '100%',
          borderCollapse: 'collapse',
          marginTop: 6,
          fontSize: `${paper.tableFontSizePx}px`,
        }}
      >
        <thead>
          <tr>
            <th style={{ textAlign: 'left', padding: '1px 2px' }}>№</th>
            <th style={{ textAlign: 'left', padding: '1px 2px' }}>Mal</th>
            <th style={{ textAlign: 'right', padding: '1px 2px', whiteSpace: 'nowrap' }}>Miq.</th>
            <th style={{ textAlign: 'right', padding: '1px 2px', whiteSpace: 'nowrap' }}>Qiymət</th>
            <th style={{ textAlign: 'right', padding: '1px 2px' }}>%</th>
            <th style={{ textAlign: 'right', padding: '1px 2px' }}>Endirim</th>
            <th style={{ textAlign: 'right', padding: '1px 2px', whiteSpace: 'nowrap' }}>Məbləğ</th>
          </tr>
          <tr>
            <th />
            <th colSpan={6} style={{ textAlign: 'left', padding: '1px 2px' }}>Ştrixkod</th>
          </tr>
        </thead>
        <tbody>
          {items.map((item, index) => {
            const name = item.product?.name || item.name || '-';
            const barcode = item.product?.barcode || item.barcode || '';
            const lineTotal =
              item.totalPrice ??
              parseFloat(item.quantity || 0) * parseFloat(item.pricePerItem ?? item.price ?? 0);

            return (
              <Fragment key={item.id || `item-${index}`}>
                <tr>
                  <td style={{ verticalAlign: 'top', padding: '1px 2px' }}>{index + 1}</td>
                  <td style={{ wordBreak: 'break-word', padding: '1px 2px' }}>{name}</td>
                  <td style={{ textAlign: 'right', whiteSpace: 'nowrap', padding: '1px 2px' }}>{fmtQty(item.quantity)}</td>
                  <td style={{ textAlign: 'right', whiteSpace: 'nowrap', padding: '1px 2px' }}>
                    {fmtMoney(item.pricePerItem ?? item.price)}
                  </td>
                  <td style={{ padding: '1px 2px' }} />
                  <td style={{ padding: '1px 2px' }} />
                  <td style={{ textAlign: 'right', whiteSpace: 'nowrap', padding: '1px 2px' }}>{fmtMoney(lineTotal)}</td>
                </tr>
                <tr>
                  <td />
                  <td colSpan={6} style={{ fontSize: `${Math.max(paper.tableFontSizePx - 1, 8)}px`, paddingBottom: 4 }}>
                    {barcode}
                  </td>
                </tr>
              </Fragment>
            );
          })}
        </tbody>
      </table>

      <div style={{ textAlign: 'right', fontWeight: 'bold', marginTop: 4, paddingRight: 2 }}>
        {fmtMoney(total)}
      </div>
      <div style={{ marginTop: 8, borderTop: '1px dashed #000', paddingTop: 6 }}>
        {isReturn && originalSaleAmount > 0 && (
          <div>
            <span style={{ display: 'inline-block', minWidth: 110 }}>Satış məbləği:</span>
            {fmtMoney(originalSaleAmount)}
          </div>
        )}
        <div>{formatAmountInWords(total)}</div>
        <div>Nəğd: {formatCashParenthetical(paid)}</div>
        <div>IlkinQaliqBonus:--</div>
        <div>CekinBonusu:--</div>
        <div>SonQaliqBonus:--</div>
        {returnedAmount > 0 && (
          <div>
            Qaytarılmalı: -{fmtMoney(returnedAmount).replace('.', ',')} (
            {formatAmountInWords(returnedAmount)})
          </div>
        )}
        {!isReturn && returnedAmount > 0 && total - returnedAmount > 0 && (
          <div style={{ fontWeight: 'bold', marginTop: 2 }}>
            <span style={{ display: 'inline-block', minWidth: 110 }}>Qalıq məbləğ:</span>
            {fmtMoney(total - returnedAmount)}
          </div>
        )}
      </div>
    </div>
  );
}
