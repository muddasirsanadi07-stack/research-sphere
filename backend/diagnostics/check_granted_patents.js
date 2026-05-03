const ExcelJS = require('exceljs');

async function run() {
    const wb = new ExcelJS.Workbook();
    await wb.xlsx.readFile('../sheets/collegedata.xlsx');
    const s = wb.getWorksheet('Granted Patent');
    
    console.log(`Sheet Name: ${s.name}`);
    for (let i = 1; i <= 6; i++) {
        const row = s.getRow(i);
        let rowData = [];
        row.eachCell({ includeEmpty: true }, (cell, colNumber) => {
            let val = cell.value;
            if (val && val.richText) val = val.richText.map(t => t.text).join('');
            rowData.push(val);
        });
        console.log(`Row ${i}:`, JSON.stringify(rowData));
    }
}
run().catch(console.error);
