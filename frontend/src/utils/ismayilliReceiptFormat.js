export function formatCheckDate(dateInput) {
  const d = new Date(dateInput);
  const pad = (n) => String(n).padStart(2, '0');
  return `${pad(d.getDate())}.${pad(d.getMonth() + 1)}.${d.getFullYear()} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
}

export function formatCheckNumber(checkNumber, saleId) {
  if (checkNumber != null && !Number.isNaN(Number(checkNumber))) {
    return String(checkNumber).padStart(9, '0');
  }
  const digits = (saleId || '').replace(/\D/g, '');
  const tail = digits.slice(-9) || '0';
  return tail.padStart(9, '0');
}

export function fmtQty(qty) {
  return parseFloat(qty || 0).toFixed(3);
}

export function fmtMoney(amount) {
  return parseFloat(amount || 0).toFixed(2);
}

export function escapeHtml(str) {
  return String(str ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
