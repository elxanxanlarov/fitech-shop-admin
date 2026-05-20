import xlsx from "xlsx";

const filepath = "c:\\Users\\Elxan\\Desktop\\638 eded 3 kateqoriya.xlsx";
try {
  const workbook = xlsx.readFile(filepath);
  
  for (const sheetName of workbook.SheetNames) {
    const sheet = workbook.Sheets[sheetName];
    const rawRows = xlsx.utils.sheet_to_json(sheet, { header: 1, defval: null });
    
    for (let i = 0; i < rawRows.length; i++) {
      const row = rawRows[i];
      if (!row || !Array.isArray(row)) continue;
      
      if (row.some(cell => cell !== null && String(cell).includes("QUTU GÜL"))) {
        console.log(`Sheet: ${sheetName}, Row index: ${i}`);
        row.forEach((cell, idx) => {
          const cellRef = xlsx.utils.encode_cell({ r: i, c: idx });
          console.log(`  Col ${idx} (${cellRef}):`, sheet[cellRef]);
        });
      }
    }
  }
} catch (err) {
  console.error(err);
}
