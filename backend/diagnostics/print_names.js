const ExcelJS = require('exceljs');

async function run() {
    const wb = new ExcelJS.Workbook();
    await wb.xlsx.readFile('../sheets/collegedata.xlsx');
    wb.eachSheet((sheet, id) => {
        console.log(`ID: ${id}, Name: '${sheet.name}', Length: ${sheet.name.length}`);
    });
}
run().catch(console.error);
