/**
 * Mehsul.xlsx üçün İsmayıllı import-un düzgün qiyməti tapdığını test edir.
 * Real import etmir — sadəcə getPriceFieldValue məntiqini simulyasiya edir.
 */
import xlsx from "xlsx";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const FILE = path.join(__dirname, "..", "..", "Mehsul.xlsx");

const wb = xlsx.readFile(FILE);
const sheet = wb.Sheets[wb.SheetNames[0]];
const rawRows = xlsx.utils.sheet_to_json(sheet, { header: 1, defval: null, raw: false });

// Header detection (eyni İsmayıllı kodundakı kimi)
let firstHeaderIndex = -1;
let secondHeaderIndex = -1;
const keywords = ['mal', 'ad', 'name', 'product', 'ştrixkod', 'ştrihkod', 'strixkod', 'strihkod', 'barcode', 'barkod', '№', 'no', 'sira', 'sıra', 'n', 'id', '#'];
for (let i = 0; i < rawRows.length; i++) {
  if (rawRows[i] && rawRows[i].some(cell => cell !== null && cell !== undefined && cell !== '' &&
    keywords.some(kw => String(cell).toLowerCase().includes(kw.toLowerCase())))) {
    firstHeaderIndex = i;
    if (i + 1 < rawRows.length) {
      const nextRow = rawRows[i + 1];
      const nextMatchCount = nextRow.filter(cell => {
        if (cell === null || cell === undefined) return false;
        const str = String(cell).toLowerCase().replace(/\s+/g, '');
        return ['miqdar', 'alis', 'alış', 'satis', 'satış', 'eded', 'ədəd', 'görə', 'gore'].some(kw => str.includes(kw));
      }).length;
      if (nextMatchCount >= 2) secondHeaderIndex = i + 1;
    }
    break;
  }
}

console.log("firstHeaderIndex:", firstHeaderIndex);
console.log("secondHeaderIndex:", secondHeaderIndex);

const row1 = rawRows[firstHeaderIndex];
const row2 = rawRows[secondHeaderIndex];
const headers = [];
const maxLen = Math.max(row1.length, row2.length);
for (let j = 0; j < maxLen; j++) {
  const val1 = row1[j] !== null && row1[j] !== undefined ? String(row1[j]).trim() : '';
  const val2 = row2[j] !== null && row2[j] !== undefined ? String(row2[j]).trim() : '';
  if (val1 && val2) headers.push(`${val1} - ${val2}`);
  else if (val1) headers.push(val1);
  else if (val2) headers.push(val2);
  else headers.push('');
}
console.log("\nBirləşdirilmiş başlıqlar:");
headers.forEach((h, i) => console.log(`  [${i}] "${h}"`));

// İlk məhsul sətirini götür
const firstProductRow = rawRows[secondHeaderIndex + 2]; // +2 çünki [4]=GEYIM kateqoriya
console.log("\nİlk məhsul sətrini (rawRows[" + (secondHeaderIndex + 2) + "]):", firstProductRow);

const rowObj = {};
for (let j = 0; j < headers.length; j++) {
  if (headers[j]) rowObj[headers[j]] = firstProductRow[j];
}
console.log("\nrowObj:", rowObj);

// Yeni `getPriceFieldValue` məntiqini simulyasiya
const getPriceFieldValue = (row, type) => {
  const keys = Object.keys(row);
  for (const k of keys) {
    const normalized = k.toLowerCase().replace(/\s+/g, '').replace(/"/g, '');
    if (type === 'purchase') {
      if (normalized.includes('alisqiymetineeded') || normalized.includes('alışqiymətinəeded')) return row[k];
    } else {
      if (normalized.includes('satisqiymetineeded') || normalized.includes('satışqiymətinəeded')) return row[k];
    }
  }
  for (const k of keys) {
    const normalized = k.toLowerCase().replace(/\s+/g, '').replace(/"/g, '');
    if (type === 'purchase') {
      if ((normalized.includes('alış') || normalized.includes('alis')) &&
        (normalized.includes('eded') || normalized.includes('ədəd') || normalized.includes('vahid'))) return row[k];
    } else {
      const isSaleWord = normalized.includes('satış') || normalized.includes('satis');
      const isQiymetWord = (normalized.includes('qiymət') || normalized.includes('qiymet')) &&
        !(normalized.includes('alış') || normalized.includes('alis'));
      if ((isSaleWord || isQiymetWord) &&
        (normalized.includes('eded') || normalized.includes('ədəd') || normalized.includes('vahid'))) return row[k];
    }
  }
  // Fallback 1: not total
  for (const k of keys) {
    const normalized = k.toLowerCase().replace(/\s+/g, '').replace(/"/g, '');
    const isTotal = normalized.includes('görə') || normalized.includes('gore') || normalized.includes('cəmi') || normalized.includes('cemi');
    if (isTotal) continue;
    if (type === 'purchase') {
      if (normalized.includes('alış') || normalized.includes('alis')) return row[k];
    } else {
      if (normalized.includes('satış') || normalized.includes('satis') || normalized.includes('qiymət') || normalized.includes('qiymet')) return row[k];
    }
  }
  // Fallback 3 (YENİ): total accept
  for (const k of keys) {
    const normalized = k.toLowerCase().replace(/\s+/g, '').replace(/"/g, '');
    if (type === 'purchase') {
      if ((normalized.includes('alış') || normalized.includes('alis') || normalized.includes('maya')) &&
        (normalized.includes('görə') || normalized.includes('gore') || normalized.includes('cəmi') || normalized.includes('cemi'))) return row[k];
    } else {
      if ((normalized.includes('satış') || normalized.includes('satis')) &&
        (normalized.includes('görə') || normalized.includes('gore') || normalized.includes('cəmi') || normalized.includes('cemi'))) return row[k];
    }
  }
  return null;
};

const purchase = getPriceFieldValue(rowObj, 'purchase');
const sale = getPriceFieldValue(rowObj, 'sale');
console.log("\n→ Tapılan ALIŞ:", purchase);
console.log("→ Tapılan SATIŞ:", sale);

// Tirniqları silən cleanNumber
const cleanNumber = (val) => {
  if (val === null || val === undefined || val === "") return 0;
  if (typeof val === "number" && Number.isFinite(val)) return val;
  let s = String(val).trim().replace(/[^\d.,\-]/g, "");
  const hasComma = s.includes(",");
  const hasDot = s.includes(".");
  if (hasComma && hasDot) {
    if (s.lastIndexOf(",") > s.lastIndexOf(".")) s = s.replace(/\./g, "").replace(",", ".");
    else s = s.replace(/,/g, "");
  } else if (hasComma) s = s.replace(",", ".");
  const n = parseFloat(s);
  return Number.isFinite(n) ? n : 0;
};

const qty = cleanNumber(rowObj['Anbar - Miqdar']);
let pp = cleanNumber(purchase);
let sp = cleanNumber(sale);
console.log(`\nQty=${qty}  Alış(raw)=${pp}  Satış(raw)=${sp}`);

// priceMode='total' bölmə
if (qty > 0) {
  pp = Math.round((pp / qty) * 10000) / 10000;
  sp = Math.round((sp / qty) * 10000) / 10000;
}
console.log(`priceMode=total → Vahid alış=${pp}  Vahid satış=${sp}`);
console.log(`\nGözlənilən: Vahid alış = 14.00, Vahid satış = 18.20`);
