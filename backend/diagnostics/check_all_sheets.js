const ExcelJS = require('exceljs');

async function run() {
    const wb = new ExcelJS.Workbook();
    await wb.xlsx.readFile('../sheets/collegedata.xlsx');
    
    wb.eachSheet((sheet, id) => {
        console.log(`\n--- Sheet ${id}: ${sheet.name} ---`);
        const row = sheet.getRow(1);
        let headers = [];
        row.eachCell({ includeEmpty: true }, (cell) => {
            let val = cell.value;
            if (val && val.richText) val = val.richText.map(t => t.text).join('');
            headers.push(val);
        });
        console.log(`Headers: ${JSON.stringify(headers.slice(0, 10))}`);
    });
}
run().catch(console.error);
