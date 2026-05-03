const ExcelJS = require('exceljs');

async function run() {
    const wb = new ExcelJS.Workbook();
    await wb.xlsx.readFile('../sheets/collegedata.xlsx');
    const s = wb.getWorksheet('Journal_Paper_Conference');
    if (!s) {
        console.log('Sheet not found');
        return;
    }
    const headerRow = s.getRow(1);
    const sampleRow = s.getRow(2);
    
    console.log('--- COLUMN MAPPING ---');
    headerRow.eachCell({ includeEmpty: true }, (cell, colNumber) => {
        let headerVal = cell.value;
        if (headerVal && headerVal.richText) {
            headerVal = headerVal.richText.map(t => t.text).join('');
        }
        let sampleVal = sampleRow.getCell(colNumber).value;
        if (sampleVal && sampleVal.richText) {
            sampleVal = sampleVal.richText.map(t => t.text).join('');
        } else if (sampleVal && sampleVal.hyperlink) {
            sampleVal = sampleVal.hyperlink;
        }
        console.log(`Col ${colNumber} -> Header: [${headerVal}] | Sample: [${sampleVal}]`);
    });
}
run().catch(console.error);
