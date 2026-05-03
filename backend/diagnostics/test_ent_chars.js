const ExcelJS = require('exceljs');

async function run() {
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.readFile('../sheets/collegedata.xlsx');
    
    workbook.eachSheet((sheet) => {
        let name = sheet.name.trim().toLowerCase();
        if (name.includes('entrepreneur')) {
            console.log("Found something with entrepreneur:", name);
            console.log("Length:", name.length);
            for (let i = 0; i < name.length; i++) {
                console.log(name[i], name.charCodeAt(i));
            }
        }
    });
}
run().catch(console.error);
