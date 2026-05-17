import xlsx from "xlsx";

const filepath = "c:\\Users\\Elxan\\Desktop\\638 eded 3 kateqoriya.xlsx";
try {
  const workbook = xlsx.readFile(filepath);
  
  const getFieldValue = (row, keys) => {
    // Exact match
    for (const key of keys) {
      const matchedKey = Object.keys(row).find(k => k.toLowerCase().replace(/\s+/g, '') === key.toLowerCase().replace(/\s+/g, ''));
      if (matchedKey && row[matchedKey] !== undefined && row[matchedKey] !== null) {
        return row[matchedKey];
      }
    }
    // Substring match
    for (const key of keys) {
      const matchedKey = Object.keys(row).find(k => k.toLowerCase().replace(/\s+/g, '').includes(key.toLowerCase().replace(/\s+/g, '')));
      if (matchedKey && row[matchedKey] !== undefined && row[matchedKey] !== null) {
        return row[matchedKey];
      }
    }
    return null;
  };

  const getPriceFieldValue = (row, type) => {
    const keys = Object.keys(row);
    for (const k of keys) {
      const normalized = k.toLowerCase().replace(/\s+/g, '').replace(/"/g, '');
      if (type === 'purchase') {
        if ((normalized.includes('alış') || normalized.includes('alis') || normalized.includes('mədaxil') || normalized.includes('medaxil')) && 
            (normalized.includes('eded') || normalized.includes('ədəd') || normalized.includes('vahid') || normalized.includes('ədədinə') || normalized.includes('eden'))) {
          return row[k];
        }
      } else {
        const isSaleWord = normalized.includes('satış') || normalized.includes('satis');
        const isQiymetWord = (normalized.includes('qiymət') || normalized.includes('qiymet')) && 
                             !(normalized.includes('alış') || normalized.includes('alis') || normalized.includes('mədaxil') || normalized.includes('medaxil'));
        if ((isSaleWord || isQiymetWord) && 
            (normalized.includes('eded') || normalized.includes('ədəd') || normalized.includes('vahid') || normalized.includes('ədədinə') || normalized.includes('eden'))) {
          return row[k];
        }
      }
    }
    return null;
  };

  for (const sheetName of workbook.SheetNames) {
    const sheet = workbook.Sheets[sheetName];
    const rawRows = xlsx.utils.sheet_to_json(sheet, { header: 1, defval: null });
    
    let firstHeaderIndex = -1;
    let secondHeaderIndex = -1;
    const headerKeywords = ['mal', 'ad', 'mehsul', 'məhsul', 'strih', 'strix', 'ştrih', 'barcode', 'barkod', 'kod', 'miqdar', 'alis', 'alış', 'satis', 'satış', 'no', 'sira', 'sıra', 'anbar'];

    for (let i = 0; i < rawRows.length; i++) {
      const row = rawRows[i];
      if (!row || !Array.isArray(row)) continue;
      
      const matchCount = row.filter(cell => {
        if (cell === null || cell === undefined) return false;
        const str = String(cell).toLowerCase().replace(/\s+/g, '');
        return headerKeywords.some(kw => str.includes(kw));
      }).length;

      if (matchCount >= 2) {
        firstHeaderIndex = i;
        if (i + 1 < rawRows.length) {
          const nextRow = rawRows[i + 1];
          const nextMatchCount = nextRow.filter(cell => {
            if (cell === null || cell === undefined) return false;
            const str = String(cell).toLowerCase().replace(/\s+/g, '');
            return ['miqdar', 'alis', 'alış', 'satis', 'satış', 'eded', 'ədəd', 'görə', 'gore'].some(kw => str.includes(kw));
          }).length;
          if (nextMatchCount >= 2) {
            secondHeaderIndex = i + 1;
          }
        }
        break;
      }
    }
    
    let headers = [];
    let headerRowIndex = firstHeaderIndex;
    
    if (secondHeaderIndex !== -1) {
      const row1 = rawRows[firstHeaderIndex];
      const row2 = rawRows[secondHeaderIndex];
      const maxLen = Math.max(row1.length, row2.length);
      
      for (let j = 0; j < maxLen; j++) {
        const val1 = row1[j] !== null && row1[j] !== undefined ? String(row1[j]).trim() : '';
        const val2 = row2[j] !== null && row2[j] !== undefined ? String(row2[j]).trim() : '';
        
        if (val1 && val2) {
          headers.push(`${val1} - ${val2}`);
        } else if (val1) {
          headers.push(val1);
        } else if (val2) {
          headers.push(val2);
        } else {
          headers.push('');
        }
      }
      headerRowIndex = secondHeaderIndex;
    } else {
      headers = rawRows[firstHeaderIndex].map(h => h !== null && h !== undefined ? String(h).trim() : '');
    }
    
    const rows = [];
    for (let i = headerRowIndex + 1; i < rawRows.length; i++) {
      const rawRow = rawRows[i];
      if (!rawRow || rawRow.every(c => c === null || c === undefined || c === '')) {
        continue;
      }
      
      const rowObj = {};
      for (let j = 0; j < headers.length; j++) {
        if (headers[j]) {
          rowObj[headers[j]] = rawRow[j] !== undefined ? rawRow[j] : null;
        }
      }
      rows.push(rowObj);
    }
    
    console.log("First 3 parsed product objects with extractors:");
    let printed = 0;
    for (const row of rows) {
      const rowKeys = Object.keys(row).filter(k => row[k] !== null && row[k] !== undefined && row[k] !== '');
      if (rowKeys.length === 1) {
        continue;
      }
      
      const name = getFieldValue(row, ['mal', 'ad', 'mehsul', 'məhsul']);
      if (!name) continue;
      
      const barcode = getFieldValue(row, ['ştrixkod', 'ştrihkod', 'strixkod', 'strihkod', 'barcode', 'barkod']);
      const qty = getFieldValue(row, ['miqdar', 'miqdari', 'miqdarı', 'eded', 'ədəd', 'quantity', 'qty']);
      const pPrice = getPriceFieldValue(row, 'purchase');
      const sPrice = getPriceFieldValue(row, 'sale');
      
      console.log({ name, barcode, qty, pPrice, sPrice });
      printed++;
      if (printed >= 3) break;
    }
  }
} catch (err) {
  console.error("Error reading excel:", err);
}
