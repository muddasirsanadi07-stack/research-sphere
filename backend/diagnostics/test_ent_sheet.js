const ExcelJS = require('exceljs');

async function run() {
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.readFile('../sheets/collegedata.xlsx');
    
    let targetSheet = null;
    workbook.eachSheet((sheet) => {
        if (sheet.name.trim().toLowerCase() === 'entrepreneurship') {
            targetSheet = sheet;
        }
    });
    
    console.log("targetSheet found?", !!targetSheet);
    const sheetById = workbook.getWorksheet(8);
    console.log("Sheet by ID 8 name:", sheetById ? sheetById.name : 'null');
    const sheetByString = workbook.getWorksheet('Entrepreneurship');
    console.log("Sheet by String name:", sheetByString ? sheetByString.name : 'null');
    
    const sheet = targetSheet || workbook.getWorksheet('Entrepreneurship') || workbook.getWorksheet(8);
    console.log("FINAL SHEET SELECTED:", sheet.name);
    
    const row2 = sheet.getRow(2);
    console.log("Row 2 Col 2:", row2.getCell(2).value);
}
run().catch(console.error);
