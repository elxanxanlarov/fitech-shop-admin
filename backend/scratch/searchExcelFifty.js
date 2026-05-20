import xlsx from "xlsx";

const filepath = "c:\\Users\\Elxan\\Desktop\\638 eded 3 kateqoriya.xlsx";
try {
  const workbook = xlsx.readFile(filepath);
  
  for (const sheetName of workbook.SheetNames) {
    const sheet = workbook.Sheets[sheetName];
    const rawRows = xlsx.utils.sheet_to_json(sheet, { header: 1, defval: null });
    
    console.log(`Sheet: ${sheetName}`);
    let matchCount = 0;
    for (let i = 0; i < rawRows.length; i++) {
      const row = rawRows[i];
      if (!row || !Array.isArray(row)) continue;
      
      const qty = row[4];
      const name = row[1];
      if (name && (name.includes("QUTU") || name.includes("30 ML") || name.includes("20 ML"))) {
        console.log(`Row ${i}: Name="${name}", Barcode="${row[3]}", Qty=${qty}, TotalPurchase=${row[5]}, TotalSale=${row[6]}, UnitPurchase=${row[7]}, UnitSale=${row[8]}`);
        matchCount++;
      }
    }
    console.log(`Total matching rows: ${matchCount}`);
  }
} catch (err) {
  console.error("Error reading excel:", err);
}
