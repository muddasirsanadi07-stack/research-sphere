const ExcelJS = require('exceljs');

async function run() {
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.readFile('../sheets/collegedata.xlsx');
    
    let targetSheet = null;
    workbook.eachSheet((sheet) => {
        if (sheet.name.trim().toLowerCase().includes('entrepreneur')) {
            targetSheet = sheet;
        }
    });
    const sheet = targetSheet || workbook.getWorksheet('Entrepreneurships') || workbook.getWorksheet(8);
    
    console.log("Sheet chosen:", sheet.name);
    
    const row2 = sheet.getRow(2);
    console.log("Faculty (Row 2 Col 2):", row2.getCell(2).value);
    console.log("Title (Row 2 Col 4):", row2.getCell(4).value);
}
run().catch(console.error);
