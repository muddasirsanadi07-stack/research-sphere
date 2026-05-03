const ExcelJS = require('exceljs');
const fs = require('fs');

async function run() {
    const wb = new ExcelJS.Workbook();
    await wb.xlsx.readFile('../sheets/collegedata.xlsx');
    
    let result = {};
    wb.eachSheet((sheet, id) => {
        const row1 = sheet.getRow(1);
        const row2 = sheet.getRow(2);
        let headers = [];
        row1.eachCell({ includeEmpty: true }, (cell) => {
            let val = cell.value;
            if (val && val.richText) val = val.richText.map(t => t.text).join('');
            headers.push(val);
        });
        let subheaders = [];
        row2.eachCell({ includeEmpty: true }, (cell) => {
            let val = cell.value;
            if (val && val.richText) val = val.richText.map(t => t.text).join('');
            subheaders.push(val);
        });
        result[sheet.name] = { headers: headers.slice(0, 15), subheaders: subheaders.slice(0, 15) };
    });
    fs.writeFileSync('sheet_info.json', JSON.stringify(result, null, 2));
}
run().catch(console.error);
