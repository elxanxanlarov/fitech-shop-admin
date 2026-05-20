import xlsx from "xlsx";

const filepath = "c:\\Users\\Elxan\\Desktop\\638 eded 3 kateqoriya.xlsx";
try {
  const workbook = xlsx.readFile(filepath);
  
  for (const sheetName of workbook.SheetNames) {
    const sheet = workbook.Sheets[sheetName];
    const rawRows = xlsx.utils.sheet_to_json(sheet, { header: 1, defval: null });
    
    console.log(`Sheet: ${sheetName}`);
    for (let i = 0; i < rawRows.length; i++) {
      const row = rawRows[i];
      if (!row || !Array.isArray(row)) continue;
      
      const containsTarget = row.some(cell => cell !== null && String(cell).includes("QUTU GÜL"));
      if (containsTarget) {
        console.log(`Found row at index ${i}:`, row);
        
        // Let's also print the column headers for this sheet
        // Find the header row (typically row with index < i)
        for (let h = Math.max(0, i - 15); h < i; h++) {
          if (rawRows[h] && rawRows[h].some(cell => cell && String(cell).toLowerCase().includes("miqdar"))) {
            console.log(`Possible header at row ${h}:`, rawRows[h]);
          }
        }
      }
    }
  }
} catch (err) {
  console.error("Error reading excel:", err);
}
