const UNITS = ['', 'bir', 'iki', 'üç', 'dörd', 'beş', 'altı', 'yeddi', 'səkkiz', 'doqquz'];
const TENS = ['', 'on', 'iyirmi', 'otuz', 'qırx', 'əlli', 'altmış', 'yetmiş', 'səksən', 'doxsan'];

function capitalizeFirst(str) {
  if (!str) return '';
  return str.charAt(0).toLocaleUpperCase('az-AZ') + str.slice(1);
}

function numberToAzWords(n) {
  const num = Math.floor(Math.abs(n));
  if (num === 0) return 'sıfır';
  if (num < 10) return UNITS[num];
  if (num < 100) {
    const t = Math.floor(num / 10);
    const u = num % 10;
    return u ? `${TENS[t]} ${UNITS[u]}` : TENS[t];
  }
  if (num < 1000) {
    const h = Math.floor(num / 100);
    const rest = num % 100;
    const hundredPart = h === 1 ? 'yüz' : `${UNITS[h]} yüz`;
    return rest ? `${hundredPart} ${numberToAzWords(rest)}` : hundredPart;
  }
  return String(num);
}

/** "Sıfır man. 80 qəp." */
export function formatAmountInWords(amount) {
  const value = Math.round(parseFloat(amount || 0) * 100) / 100;
  const manat = Math.floor(value);
  const qepik = Math.round((value - manat) * 100);

  const manatWord = capitalizeFirst(numberToAzWords(manat));
  if (qepik === 0) {
    return `${manatWord} man.`;
  }
  return `${manatWord} man. ${qepik} qəp.`;
}

/** "0.80 (Sıfır  80)" — EKONOM nəğd formatı */
export function formatCashParenthetical(amount) {
  const value = Math.round(parseFloat(amount || 0) * 100) / 100;
  const manat = Math.floor(value);
  const qepik = Math.round((value - manat) * 100);
  const manatWord = capitalizeFirst(numberToAzWords(manat));
  const qepikPart = String(qepik).padStart(qepik < 10 ? 2 : 1, '0');
  return `${value.toFixed(2)} (${manatWord}  ${qepikPart === '00' ? '0' : qepik})`;
}
