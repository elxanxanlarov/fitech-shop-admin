import xlsx from "xlsx";

const filepath = "c:\\Users\\Elxan\\Desktop\\638 eded 3 kateqoriya.xlsx";
try {
  const workbook = xlsx.readFile(filepath);
  const sheet = workbook.Sheets[workbook.SheetNames[0]];
  
  // Let's print the cells around row 644
  // Columns: A=0, B=1, C=2, D=3, E=4, F=5, G=6, H=7, I=8
  // Row 644 (0-indexed) is row 645 in Excel, so cells are A645, B645, C645, D645, E645, etc.
  
  const cellsToInspect = ['E645', 'F645', 'G645', 'H645', 'I645', 'E644', 'F644', 'G644', 'H644', 'I644'];
  for (const cellRef of cellsToInspect) {
    console.log(`Cell ${cellRef}:`, sheet[cellRef]);
  }
} catch (err) {
  console.error(err);
}
