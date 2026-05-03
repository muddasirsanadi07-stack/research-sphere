const ExcelJS = require('exceljs');

async function run() {
    const wb = new ExcelJS.Workbook();
    await wb.xlsx.readFile('../sheets/collegedata.xlsx');
    
    let targetSheet = null;
    wb.eachSheet((sheet) => {
        if (sheet.name.trim().toLowerCase() === 'students publications') {
            targetSheet = sheet;
        }
    });
    
    if (!targetSheet) {
        console.log("Students Publications sheet not found");
        return;
    }
    
    for (let i = 1; i <= 5; i++) {
        const row = targetSheet.getRow(i);
        let rowData = [];
        row.eachCell({ includeEmpty: true }, (cell) => {
            let val = cell.value;
            if (val && val.richText) val = val.richText.map(t => t.text).join('');
            rowData.push(val);
        });
        console.log(`Row ${i}:`, JSON.stringify(rowData.slice(0, 15)));
    }
}
run().catch(console.error);
