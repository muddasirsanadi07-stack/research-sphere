const ExcelJS = require('exceljs');

async function run() {
    const wb = new ExcelJS.Workbook();
    await wb.xlsx.readFile('../sheets/collegedata.xlsx');
    
    let targetSheet = null;
    wb.eachSheet((sheet) => {
        if (sheet.name.trim().toLowerCase() === 'incentives') {
            targetSheet = sheet;
        }
    });
    
    if (!targetSheet) {
        console.log("Incentives sheet not found");
        return;
    }
    
    for (let i = 1; i <= 6; i++) {
        const row = targetSheet.getRow(i);
        let rowData = [];
        row.eachCell({ includeEmpty: true }, (cell) => {
            let val = cell.value;
            if (val && val.richText) val = val.richText.map(t => t.text).join('');
            rowData.push(val);
        });
        console.log(`Row ${i}:`, JSON.stringify(rowData.slice(0, 10)));
    }
}
run().catch(console.error);
