const ExcelJS = require('exceljs');

async function run() {
    const wb = new ExcelJS.Workbook();
    await wb.xlsx.readFile('../sheets/collegedata.xlsx');
    
    wb.eachSheet((sheet) => {
        let found = false;
        for (let i = 1; i <= 20; i++) {
            const row = sheet.getRow(i);
            row.eachCell((cell) => {
                let val = cell.value;
                if (val && val.richText) val = val.richText.map(t => t.text).join('');
                if (typeof val === 'string' && val.toLowerCase().includes("consultancy amount received")) {
                    console.log(`Found in sheet: '${sheet.name}', Row: ${i}`);
                    found = true;
                    // Print the row
                    let rowData = [];
                    row.eachCell({ includeEmpty: true }, (c) => {
                        let cVal = c.value;
                        if (cVal && cVal.richText) cVal = cVal.richText.map(t => t.text).join('');
                        rowData.push(cVal);
                    });
                    console.log(JSON.stringify(rowData.slice(0, 15)));
                }
            });
            if (found) break;
        }
    });
}
run().catch(console.error);
