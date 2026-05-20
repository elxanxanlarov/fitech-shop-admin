import xlsx from "xlsx";

const filepath = "c:\\Users\\Elxan\\Desktop\\638 eded 3 kateqoriya.xlsx";
try {
  const workbook = xlsx.readFile(filepath);
  const sheet = workbook.Sheets[workbook.SheetNames[0]];
  
  // Row index 1 is row 2 in Excel
  const rowIdx = 1; 
  console.log("Row 2 (KƏTAN SADƏ 01 (əd.)):");
  const cols = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I'];
  for (const col of cols) {
    const ref = `${col}${rowIdx + 1}`;
    console.log(`  Cell ${ref}:`, sheet[ref]);
  }
} catch (err) {
  console.error(err);
}
