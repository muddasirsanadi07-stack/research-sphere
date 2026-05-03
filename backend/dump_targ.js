const ExcelJS = require('exceljs');
const path = require('path');

async function dumpTargVsAch() {
    const workbook = new ExcelJS.Workbook();
    const DB_PATH = path.join(__dirname, "..", "sheets", "collegedata.xlsx");
    await workbook.xlsx.readFile(DB_PATH);
    const sheet = workbook.getWorksheet('targ vs ach');
    
    for (let i = 1; i <= 60; i++) {
        const row = sheet.getRow(i);
        console.log(`Row ${i}: ${JSON.stringify(row.values.slice(1))}`);
    }
}

dumpTargVsAch();
