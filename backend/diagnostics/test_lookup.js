const ExcelJS = require('exceljs');

async function run() {
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.readFile('../sheets/collegedata.xlsx');
    
    let targetSheet = null;
    workbook.eachSheet((sheet) => {
        if (sheet.name.trim().toLowerCase() === 'proposal' || sheet.name.trim().toLowerCase() === 'proposals') {
            targetSheet = sheet;
        }
    });
    const sheet = targetSheet || workbook.getWorksheet('Proposal') || workbook.getWorksheet(7);
    
    if (sheet) {
        console.log('SUCCESS: Found sheet:', sheet.name);
    } else {
        console.log('FAILED: Sheet not found');
    }
}
run().catch(console.error);
