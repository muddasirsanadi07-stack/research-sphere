const express = require("express");
const ExcelJS = require("exceljs");
const cors = require("cors");
const path = require("path");
const fs = require("fs");

console.log("Starting Local Excel Server...");

const app = express();
app.use(cors());
app.use(express.json());

const DB_PATH = path.join(__dirname, "..", "sheets", "collegedata.xlsx");

// Helper to Read Excel Data
async function getExcelData() {
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.readFile(DB_PATH);
    
    // Target the specific sheet the user mentioned
    let sheet = workbook.getWorksheet('Journal_Paper_Conference') || workbook.getWorksheet(1);
    
    if (!sheet) throw new Error("No worksheets found in collegedata.xlsx");
    
    console.log(`Analyzing data from sheet: ${sheet.name}`);
    
    let journalCount = 0;
    let conferenceCount = 0;

    sheet.eachRow((row, rowNumber) => {
        if (rowNumber === 1) return; // Skip header

        // Extract text even if it's a RichText object
        const cell = row.getCell(5);
        let cellValue = "";
        
        if (cell.value && cell.value.richText) {
            cellValue = cell.value.richText.map(t => t.text).join("");
        } else {
            cellValue = String(cell.value || "");
        }

        const lowValue = cellValue.toLowerCase();
        
        // Audit first 5 rows in terminal
        if (rowNumber <= 6) {
            console.log(`Row ${rowNumber} Col 5: "${cellValue.substring(0, 30)}..."`);
        }

        if (lowValue.includes("journal")) {
            journalCount++;
        } else if (lowValue.includes("conference")) {
            conferenceCount++;
        }
    });

    console.log(`Final Count -> Journals: ${journalCount}, Conferences: ${conferenceCount}`);

    // Format for the dashboard
    return [
        { category: 'Papers', metric: 'Journal', value: journalCount, unit: 'Count' },
        { category: 'Papers', metric: 'Conference', value: conferenceCount, unit: 'Count' },
        { category: 'Papers', metric: 'Total', value: journalCount + conferenceCount, unit: 'Count' }
    ];
}

// ✅ GET Data API
app.get("/api/data", async (req, res) => {
    try {
        console.log(`[${new Date().toLocaleTimeString()}] Fetching data from Excel...`);
        const data = await getExcelData();
        
        const j = data.find(d => d.metric === 'Journal')?.value || 0;
        const c = data.find(d => d.metric === 'Conference')?.value || 0;
        console.log(`Successfully mapped: ${j} Journals, ${c} Conferences`);
        
        res.json(data);
    } catch (err) {
        console.error("CRITICAL ERROR:", err.message);
        res.status(500).json({ error: err.message });
    }
});

// ✅ GET Full Publications List (for Repository View)
app.get("/api/publications", async (req, res) => {
    try {
        const workbook = new ExcelJS.Workbook();
        await workbook.xlsx.readFile(DB_PATH);
        const sheet = workbook.getWorksheet('Journal_Paper_Conference') || workbook.getWorksheet(1);
        
        const publications = [];
        sheet.eachRow((row, rowNumber) => {
            if (rowNumber === 1) return;
            publications.push({
                faculty: row.getCell(3).value,
                department: row.getCell(5).value,
                type: String(row.getCell(6).value || "").includes("Journal") ? "Journal" : "Conference",
                title: row.getCell(8).value,
                date: row.getCell(9).value,
                link: row.getCell(12).value?.hyperlink || row.getCell(12).value
            });
        });
        res.json(publications);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ✅ POST Update API (Sync Dashboard changes to Excel)
app.post("/api/update", async (req, res) => {
    try {
        const { category, metric, newValue } = req.body;
        const workbook = new ExcelJS.Workbook();
        await workbook.xlsx.readFile(DB_PATH);
        const sheet = workbook.getWorksheet('Metrics');
        
        let found = false;
        sheet.eachRow((row) => {
            if (row.getCell(1).value === category && row.getCell(2).value === metric) {
                row.getCell(3).value = Number(newValue);
                found = true;
            }
        });

        if (found) {
            await workbook.xlsx.writeFile(DB_PATH);
            res.json({ message: "Update successful" });
        } else {
            res.status(404).json({ message: "Metric not found" });
        }
    } catch (err) {
        res.status(500).json({ error: "Failed to save to database file." });
    }
});

// Start server
const PORT = 5005;
app.listen(PORT, () => {
    console.log(`Excel DB Server running on http://localhost:${PORT}`);
});