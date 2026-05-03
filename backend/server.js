
const express = require("express");
const cors = require("cors");
const ExcelJS = require("exceljs");
const path = require("path");

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, "../frontend")));

const DB_PATH = path.join(__dirname, "..", "sheets", "collegedata.xlsx");

// --- Helper Utilities for Dynamic Mapping ---

// Extracts cell value robustly
const extractValue = (cell) => {
    if (!cell || cell.value === null) return 0;
    if (typeof cell.value === 'object' && cell.value.result !== undefined) return parseFloat(cell.value.result) || 0;
    // Extract numbers from strings like "71.5 L" or "Rs. 26,000"
    if (typeof cell.value === 'string') {
        const cleanStr = cell.value.replace(/,/g, '');
        const match = cleanStr.match(/([0-9.]+)/);
        if (match) {
            let num = parseFloat(match[1]);
            if (cleanStr.toLowerCase().includes('l') || cleanStr.toLowerCase().includes('lakh')) {
                num = num * 100000;
            }
            return num;
        }
        return 0;
    }
    return parseFloat(cell.value) || 0;
};

// Extracts text robustly
const extractText = (cell) => {
    if (!cell || cell.value === null || cell.value === undefined) return "";
    
    // Handle Hyperlinks
    if (typeof cell.value === 'object' && cell.value.hyperlink) {
        return cell.value.hyperlink;
    }
    
    // Handle Rich Text
    if (cell.value.richText) {
        return cell.value.richText.map(t => t.text).join("").trim();
    }
    
    // Handle Formula Results
    if (typeof cell.value === 'object' && cell.value.result !== undefined) {
        return String(cell.value.result).trim();
    }

    // Default string conversion
    return String(cell.value).trim();
};

// Finds column indices based on header keywords
const findHeaders = (sheet, rowNum, keywordsMap) => {
    const row = sheet.getRow(rowNum);
    const indices = {};
    
    row.eachCell((cell, colNumber) => {
        const cellText = extractText(cell).toLowerCase();
        for (const [key, aliases] of Object.entries(keywordsMap)) {
            if (!indices[key]) {
                for (const alias of aliases) {
                    const lowAlias = alias.toLowerCase();
                    // Use exact match for single-character aliases to avoid partial matches (like 'p' in 'dept')
                    if (lowAlias.length === 1) {
                        if (cellText === lowAlias) {
                            indices[key] = colNumber;
                            break;
                        }
                    } else if (cellText.includes(lowAlias)) {
                        indices[key] = colNumber;
                        break;
                    }
                }
            }
        }
    });
    return indices;
};

// Finds a row number where column 1 matches a keyword
const findRowByKeyword = (sheet, keyword, startRow = 1) => {
    const rowCount = sheet.rowCount;
    if (rowCount > 5000) console.warn(`[Warning] High rowCount detected in sheet ${sheet.name}: ${rowCount}`);
    for (let i = startRow; i <= rowCount; i++) {
        const cell = sheet.getRow(i).getCell(1);
        if (extractText(cell).toLowerCase().includes(keyword.toLowerCase())) {
            return i;
        }
    }
    return -1;
};

// ✅ GET Consolidated Stats for Repository Hub
app.get("/api/repo-stats", async (req, res) => {
    try {
        const workbook = new ExcelJS.Workbook();
        await workbook.xlsx.readFile(DB_PATH);
        
        const getSafeCount = (name, offset = 1) => {
            const s = workbook.getWorksheet(name);
            return s ? Math.max(0, s.rowCount - offset) : 0;
        };

        const sheets = [
            { name: 'Journal_Paper_Conference', offset: 1 },
            { name: 'Granted Patent', offset: 1 },
            { name: 'Proposals', offset: 1 },
            { name: 'Consultancy', offset: 1 },
            { name: 'Students Publications', offset: 2 }
        ];

        const deptStats = {};
        sheets.forEach(s => {
            const sheet = workbook.getWorksheet(s.name);
            if (!sheet) return;
            sheet.eachRow((row, i) => {
                if (i <= s.offset) return;
                const dept = extractText(row.getCell(2)).toUpperCase().trim(); // Most sheets have dept in Col 2 or similar
                if (dept && dept !== "TOTAL" && dept !== "NA") {
                    deptStats[dept] = (deptStats[dept] || 0) + 1;
                }
            });
        });

        // Find top contributor
        let topDept = "N/A";
        let maxVal = 0;
        Object.entries(deptStats).forEach(([dept, count]) => {
            if (count > maxVal) {
                maxVal = count;
                topDept = dept;
            }
        });

        const counts = {
            journals: getSafeCount('Journal_Paper_Conference'),
            patents: getSafeCount('Granted Patent'),
            proposals: getSafeCount('Proposals'),
            consultancy: getSafeCount('Consultancy'),
            students: getSafeCount('Students Publications', 2),
            incentives: getSafeCount('Incentives', 2),
            topDept: topDept,
            topCount: maxVal,
            lastSync: new Date().toLocaleTimeString(),
            lastSyncDate: new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
        };

        counts.total = Object.values(counts).filter(v => typeof v === 'number').reduce((a, b) => a + b, 0);
        res.json(counts);
    } catch (err) { res.status(500).json({ error: err.message }); }
});

// --- API Endpoints ---


// ✅ GET Consolidated Stats (Dynamic Schema for Dashboard)
app.get("/api/consolidated-stats", async (req, res) => {
    try {
        const workbook = new ExcelJS.Workbook();
        await workbook.xlsx.readFile(DB_PATH);
        const sheet = workbook.getWorksheet('Consolidated Sheet ');

        if (!sheet) return res.status(404).json({ error: "Consolidated Sheet not found" });

        const getVal = (kw, def, start = 1) => {
            const idx = findRowByKeyword(sheet, kw, start);
            return extractValue(sheet.getRow(idx > 0 ? idx : def).getCell(2));
        };

        const stats = {
            papers: {
                journal: getVal("Journal", 3),
                conference: getVal("Conference", 4),
                total: getVal("Total Papers", 5)
            },
            patents: {
                filed: getVal("Patents Filed", 6),
                granted: getVal("Patents Granted", 7),
                total: getVal("Total Patents", 8)
            },
            financials: {
                sanctioned: getVal("Proposal Amount", 9),
                consultancy: getVal("Consultancy Amount", 10)
            },
            vault: {
                msme: getVal("MSME", 17),
                kapila: getVal("Kapila", 18),
                college: getVal("College", 19),
                total: getVal("Total", 20, 15) // Start search from row 15 to find Vault Total
            },
            quarterly: {
                q1: getVal("Q1", 23),
                q2: getVal("Q2", 24),
                q3: getVal("Q3", 25),
                q4: getVal("Q4", 26)
            }
        };

        res.json(stats);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ✅ GET Target vs Achieved (Dynamic Mapping)
app.get("/api/target-achieved", async (req, res) => {
    try {
        const workbook = new ExcelJS.Workbook();
        await workbook.xlsx.readFile(DB_PATH);
        const sheet = workbook.getWorksheet('targ vs ach');
        if (!sheet) return res.status(404).json({ error: "Sheet not found" });

        const targetRow = findRowByKeyword(sheet, "Total Target");
        const achievedRow = findRowByKeyword(sheet, "Target Achieved");
        const percentRow = findRowByKeyword(sheet, "Achieved in %");

        let totalTarget = 0;
        let totalAchieved = 0;
        const deptScores = {};
        const achievementPercentages = {};

        // Parse Targets
        if (targetRow > 0) {
            const headers = findHeaders(sheet, targetRow + 1, { dept: ["dept"] });
            for (let i = targetRow + 2; i < targetRow + 20; i++) {
                const row = sheet.getRow(i);
                const dept = headers.dept ? extractText(row.getCell(headers.dept)) : extractText(row.getCell(1));
                if (!dept || dept === "" || dept.toLowerCase() === "total" || dept.toLowerCase().includes("achieved")) break;

                let deptTarget = 0;
                for (let col = 2; col <= 8; col++) deptTarget += extractValue(row.getCell(col));
                totalTarget += deptTarget;
                deptScores[dept] = { target: deptTarget, achieved: 0 };
            }
        }

        // Parse Achieved
        if (achievedRow > 0) {
            const headers = findHeaders(sheet, achievedRow + 1, { dept: ["dept"] });
            for (let i = achievedRow + 2; i < achievedRow + 20; i++) {
                const row = sheet.getRow(i);
                const dept = headers.dept ? extractText(row.getCell(headers.dept)) : extractText(row.getCell(1));
                if (!dept || dept === "" || dept.toLowerCase() === "total" || dept.toLowerCase().includes("achieved in %")) break;

                let deptAchieved = 0;
                for (let col = 2; col <= 8; col++) deptAchieved += extractValue(row.getCell(col));
                totalAchieved += deptAchieved;
                if (deptScores[dept]) deptScores[dept].achieved = deptAchieved;
            }
        }

        // Parse Percentages
        if (percentRow > 0) {
            const headers = findHeaders(sheet, percentRow + 1, { 
                dept: ["dept"], r: ["r"], c: ["c"], p: ["p"], i: ["i"], e: ["e"], mpaper: ["paper"], mpatent: ["patent"]
            });
            for (let i = percentRow + 2; i < percentRow + 20; i++) {
                const row = sheet.getRow(i);
                const dept = headers.dept ? extractText(row.getCell(headers.dept)) : extractText(row.getCell(1));
                if (!dept || dept === "" || dept.toLowerCase() === "total" || dept.toLowerCase() === "pending details") break;

                achievementPercentages[dept] = {
                    R: headers.r ? extractValue(row.getCell(headers.r)) : extractValue(row.getCell(2)),
                    C: headers.c ? extractValue(row.getCell(headers.c)) : extractValue(row.getCell(3)),
                    P: headers.p ? extractValue(row.getCell(headers.p)) : extractValue(row.getCell(4)),
                    I: headers.i ? extractValue(row.getCell(headers.i)) : extractValue(row.getCell(5)),
                    E: headers.e ? extractValue(row.getCell(headers.e)) : extractValue(row.getCell(6)),
                    MPaper: headers.mpaper ? extractValue(row.getCell(headers.mpaper)) : extractValue(row.getCell(7)),
                    MPatent: headers.mpatent ? extractValue(row.getCell(headers.mpatent)) : extractValue(row.getCell(8))
                };
            }
        }

        let topDepartment = "N/A";
        let maxAchieved = -1;
        for (const [dept, scores] of Object.entries(deptScores)) {
            if (scores.achieved > maxAchieved) {
                maxAchieved = scores.achieved;
                topDepartment = dept;
            }
        }

        const achievementRate = totalTarget > 0 ? ((totalAchieved / totalTarget) * 100).toFixed(1) : 0;

        res.json({
            totalTarget: Math.round(totalTarget),
            totalAchieved: Math.round(totalAchieved),
            achievementRate: achievementRate,
            topDepartment: topDepartment,
            deptScores: deptScores,
            achievementPercentages: achievementPercentages
        });

    } catch (err) { res.status(500).json({ error: err.message }); }
});

// ✅ GET Recent Milestones (Pulse Feed)
app.get("/api/recent-milestones", async (req, res) => {
    try {
        const workbook = new ExcelJS.Workbook();
        await workbook.xlsx.readFile(DB_PATH);
        const milestones = [];

        // 1. Get from Journal/Papers
        const paperSheet = workbook.getWorksheet('Journal_Paper_Conference');
        if (paperSheet) {
            const h = findHeaders(paperSheet, 1, { 
                dept: ["department"], 
                faculty: ["faculty involved"], 
                title: ["title of the paper"] 
            });
            const rowCount = paperSheet.rowCount;
            for (let i = rowCount; i > Math.max(1, rowCount - 10); i--) {
                const row = paperSheet.getRow(i);
                const faculty = extractText(row.getCell(h.faculty || 2));
                const title = extractText(row.getCell(h.title || 8));
                if (faculty && title) {
                    milestones.push({
                        type: 'paper',
                        icon: 'fa-book-open',
                        color: '#6366f1',
                        text: `Published: ${faculty.split(',')[0]}`,
                        dept: extractText(row.getCell(h.dept || 4))
                    });
                    if (milestones.filter(m => m.type === 'paper').length >= 2) break;
                }
            }
        }

        // 2. Get from Patents
        const patentSheet = workbook.getWorksheet('Patents');
        if (patentSheet) {
            const h = findHeaders(patentSheet, 1, { 
                dept: ["department"], 
                inventor: ["inventor's name"], 
                status: ["status of patent"],
                title: ["title of the patent"]
            });
            const rowCount = patentSheet.rowCount;
            for (let i = rowCount; i > Math.max(1, rowCount - 10); i--) {
                const row = patentSheet.getRow(i);
                const inventor = extractText(row.getCell(h.inventor || 4));
                const status = extractText(row.getCell(h.status || 3));
                if (inventor && status) {
                    milestones.push({
                        type: 'patent',
                        icon: 'fa-lightbulb',
                        color: '#f59e0b',
                        text: `${status}: ${inventor.split(',')[0]}`,
                        dept: extractText(row.getCell(h.dept || 5))
                    });
                    if (milestones.filter(m => m.type === 'patent').length >= 2) break;
                }
            }
        }

        res.json(milestones.sort(() => 0.5 - Math.random()).slice(0, 4));
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ✅ GET Achievement Stats (Directly from Raw Sheets using Header Mapping)
app.get("/api/achievement-stats", async (req, res) => {
    try {
        const workbook = new ExcelJS.Workbook();
        await workbook.xlsx.readFile(DB_PATH);
        
        const getSheetCount = (sheetName, headerKeywords = {}) => {
            const sheet = workbook.getWorksheet(sheetName);
            if (!sheet) return 0;
            
            // If no keywords, just return row count minus 1
            if (Object.keys(headerKeywords).length === 0) return Math.max(0, sheet.rowCount - 1);
            
            const h = findHeaders(sheet, 1, headerKeywords);
            let count = 0;
            sheet.eachRow((row, rowNumber) => {
                if (rowNumber === 1) return;
                // Check if the primary column (e.g. title or faculty) has content
                const primaryKey = Object.keys(headerKeywords)[0];
                if (extractText(row.getCell(h[primaryKey] || 1)) !== "") {
                    count++;
                }
            });
            return count;
        };

        const stats = {
            journals: getSheetCount('Journal_Paper_Conference', { title: ["title", "paper", "journal"] }),
            patents: getSheetCount('Patents', { title: ["title", "patent"] }),
            granted: 0, // Will calculate below
            proposals: getSheetCount('Proposals', { title: ["title", "proposal"] }),
            consultancy: getSheetCount('Consultancy', { title: ["title", "work", "consultancy"] }),
            entrepreneurship: getSheetCount('Entrepreneurships', { name: ["name", "company", "startup"] }),
            students: getSheetCount('Students Publications', { title: ["title", "paper"] }),
            incentives: getSheetCount('Incentives', { name: ["name", "faculty"] })
        };

        // Special check for Granted Patents (filter Status column)
        const patentSheet = workbook.getWorksheet('Patents');
        if (patentSheet) {
            const h = findHeaders(patentSheet, 1, { status: ["status"] });
            let grantedCount = 0;
            patentSheet.eachRow((row, rowNumber) => {
                if (rowNumber === 1) return;
                const status = extractText(row.getCell(h.status || 3)).toLowerCase();
                if (status.includes("grant") || status.includes("verify")) grantedCount++;
            });
            stats.granted = grantedCount;
        }

        // Special check for Proposal Sanctioned
        const proposalSheet = workbook.getWorksheet('Proposals');
        if (proposalSheet) {
            const h = findHeaders(proposalSheet, 1, { status: ["status"] });
            let sanctionedCount = 0;
            proposalSheet.eachRow((row, rowNumber) => {
                if (rowNumber === 1) return;
                const status = extractText(row.getCell(h.status || 10)).toLowerCase();
                if (status.includes("sanctioned") || status.includes("approved")) sanctionedCount++;
            });
            stats.proposalsSanctioned = sanctionedCount;
        }

        res.json(stats);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ✅ GET Proposals (Full list for Repository)
app.get("/api/proposals", async (req, res) => {
    try {
        const workbook = new ExcelJS.Workbook();
        await workbook.xlsx.readFile(DB_PATH);
        const sheet = workbook.getWorksheet('Proposals');
        if (!sheet) return res.json([]);
        
        const h = findHeaders(sheet, 1, { 
            dept: ["dept"], 
            faculty: ["faculty"], 
            title: ["title"], 
            status: ["status", "current"], 
            submitted: ["submitted"],
            sanctioned: ["sanctioned"],
            received: ["received"],
            date: ["date", "submission"],
            agency: ["agency name", "agency"],
            agencyType: ["agency type"],
            appId: ["application id", "id"],
            link: ["letter", "link"]
        });

        const data = [];
        sheet.eachRow((row, rowNumber) => {
            if (rowNumber === 1) return;
            const title = extractText(row.getCell(h.title || 4));
            if (title) {
                data.push({
                    department: extractText(row.getCell(h.dept || 2)),
                    faculty: extractText(row.getCell(h.faculty || 3)),
                    title: title,
                    submittedAmount: extractValue(row.getCell(h.submitted || 5)),
                    sanctionedAmount: extractValue(row.getCell(h.sanctioned || 11)),
                    receivedAmount: extractValue(row.getCell(h.received || 12)),
                    status: extractText(row.getCell(h.status || 10)),
                    date: extractText(row.getCell(h.date || 6)),
                    agency: extractText(row.getCell(h.agency || 8)),
                    agencyType: extractText(row.getCell(h.agencyType || 9)),
                    appId: extractText(row.getCell(h.appId || 7)),
                    link: extractText(row.getCell(h.link || 14))
                });
            }
        });
        res.json(data);
    } catch (err) { res.status(500).json({ error: err.message }); }
});

// ✅ GET Consultancy (Full list for Repository)
app.get("/api/consultancy", async (req, res) => {
    try {
        const workbook = new ExcelJS.Workbook();
        await workbook.xlsx.readFile(DB_PATH);
        const sheet = workbook.getWorksheet('Consultancy');
        if (!sheet) return res.json([]);

        const h = findHeaders(sheet, 1, { 
            dept: ["dept", "department"], 
            faculty: ["faculty", "involved"], 
            title: ["title", "work", "name"], 
            amount: ["amount generated", "amount", "revenue"],
            regAmount: ["registration amount", "registration"],
            participants: ["participants"],
            expenses: ["expenses"],
            agency: ["agency", "funding"],
            date: ["month", "year", "date"],
            link: ["receipt", "link"]
        });

        const data = [];
        sheet.eachRow((row, rowNumber) => {
            if (rowNumber === 1) return;
            const title = extractText(row.getCell(h.title || 4));
            if (title) {
                data.push({
                    department: extractText(row.getCell(h.dept || 3)),
                    faculty: extractText(row.getCell(h.faculty || 2)),
                    title: title,
                    agency: extractText(row.getCell(h.agency || 5)),
                    amount: extractValue(row.getCell(h.amount || 8)),
                    regAmount: extractText(row.getCell(h.regAmount || 6)),
                    participants: extractText(row.getCell(h.participants || 7)),
                    expenses: extractText(row.getCell(h.expenses || 9)),
                    date: extractText(row.getCell(h.date || 10)),
                    link: extractText(row.getCell(h.link || 11))
                });
            }
        });
        res.json(data);
    } catch (err) { res.status(500).json({ error: err.message }); }
});

// ✅ GET Student Publications (Full list for Repository)
app.get("/api/student-pubs", async (req, res) => {
    try {
        const workbook = new ExcelJS.Workbook();
        await workbook.xlsx.readFile(DB_PATH);
        const sheet = workbook.getWorksheet('Students Publications');
        if (!sheet) return res.json([]);

        const h = findHeaders(sheet, 2, { 
            dept: ["department"], 
            intake: ["intake"],
            target: ["target"], 
            achieved: ["achieved"]
        });

        const data = [];
        sheet.eachRow((row, rowNumber) => {
            if (rowNumber <= 2) return;
            const dept = extractText(row.getCell(h.dept || 1));
            if (dept && !dept.toLowerCase().includes("total")) {
                data.push({
                    department: dept,
                    intake: extractText(row.getCell(h.intake || 2)),
                    target: extractText(row.getCell(h.target || 3)),
                    achieved: extractText(row.getCell(h.achieved || 4))
                });
            }
        });
        res.json(data);
    } catch (err) { res.status(500).json({ error: err.message }); }
});

// ✅ GET Entrepreneurship (Full list for Repository)
app.get("/api/entrepreneurship", async (req, res) => {
    try {
        const workbook = new ExcelJS.Workbook();
        await workbook.xlsx.readFile(DB_PATH);
        const sheet = workbook.getWorksheet('Entrepreneurships');
        if (!sheet) return res.json([]);

        const h = findHeaders(sheet, 1, { 
            dept: ["dept", "department"], 
            faculty: ["faculty", "involved"], 
            startup: ["startup initiated", "startup"],
            revenue: ["revenue generation", "revenue", "amount"],
            regAmount: ["registration amount", "registration"],
            participants: ["participants"],
            expenses: ["expenses"],
            training: ["training program", "training"],
            date: ["month", "year", "date"],
            link: ["receipt", "link"]
        });

        const data = [];
        sheet.eachRow((row, rowNumber) => {
            if (rowNumber === 1) return;
            const startup = extractText(row.getCell(h.startup || 4));
            const training = extractText(row.getCell(h.training || 9));
            if (startup || training) {
                data.push({
                    department: extractText(row.getCell(h.dept || 3)),
                    faculty: extractText(row.getCell(h.faculty || 2)),
                    startup: startup,
                    training: training,
                    revenue: extractValue(row.getCell(h.revenue || 7)),
                    regAmount: extractText(row.getCell(h.regAmount || 5)),
                    participants: extractText(row.getCell(h.participants || 6)),
                    expenses: extractText(row.getCell(h.expenses || 8)),
                    date: extractText(row.getCell(h.date || 10)),
                    link: extractText(row.getCell(h.link || 11))
                });
            }
        });
        res.json(data);
    } catch (err) { res.status(500).json({ error: err.message }); }
});

// ✅ GET Granted Patent Targets (Specific Sheet Mapping)
app.get("/api/granted-patent-targets", async (req, res) => {
    try {
        const workbook = new ExcelJS.Workbook();
        await workbook.xlsx.readFile(DB_PATH);
        const sheet = workbook.getWorksheet('Granted Patent');
        if (!sheet) return res.json([]);

        let data = [];
        // Extract data from Rows 3 to 15 (Departments)
        for (let i = 3; i <= 15; i++) {
            const row = sheet.getRow(i);
            const dept = extractText(row.getCell(1));
            if (!dept || dept === "" || dept.toLowerCase().includes("total")) break;

            data.push({
                department: dept,
                intake: extractText(row.getCell(2)),
                target: extractText(row.getCell(3)),
                achieved: extractText(row.getCell(4))
            });
        }
        res.json(data);
    } catch (err) { res.status(500).json({ error: err.message }); }
});

// ✅ GET Detailed Departmental Achievements (Bottom Table of 'Granted Patent' Sheet)
app.get("/api/department-achievements", async (req, res) => {
    try {
        const workbook = new ExcelJS.Workbook();
        await workbook.xlsx.readFile(DB_PATH);
        const sheet = workbook.getWorksheet('Granted Patent');
        if (!sheet) return res.json([]);

        let data = [];
        // Extract data from Rows 18 to 30
        for (let i = 18; i <= 30; i++) {
            const row = sheet.getRow(i);
            const dept = extractText(row.getCell(1));
            if (!dept || dept === "") break;

            data.push({
                department: dept,
                facultyCount: extractValue(row.getCell(2)),
                presented: extractValue(row.getCell(3)),
                papers: extractValue(row.getCell(4)),
                mandatoryLoad: extractValue(row.getCell(5)),
                innovationLoad: extractValue(row.getCell(6)),
                proposals: extractValue(row.getCell(7)),
                consultancy: extractValue(row.getCell(8)),
                eLoad: extractValue(row.getCell(9))
            });
        }
        res.json(data);
    } catch (err) { res.status(500).json({ error: err.message }); }
});

// ✅ GET Granted Patents & Departmental Targets
app.get("/api/granted-targets", async (req, res) => {
    try {
        const workbook = new ExcelJS.Workbook();
        await workbook.xlsx.readFile(DB_PATH);
        const sheet = workbook.getWorksheet('targ vs ach');
        if (!sheet) return res.json([]);

        // Find the "Target Achieved" row (Absolute values)
        const achStartRow = findRowByKeyword(sheet, "Target Achieved");
        if (achStartRow === -1) return res.json([]);

        const data = [];
        // Loop through departments (usually 12 depts)
        for (let i = achStartRow + 2; i < achStartRow + 20; i++) {
            const row = sheet.getRow(i);
            const dept = extractText(row.getCell(1));
            if (!dept || dept === "" || dept.toLowerCase() === "total" || dept.toLowerCase().includes("achieved")) break;

            data.push({
                department: dept,
                faculty: 0, 
                rLoad: extractValue(row.getCell(2)),
                consultancy: extractValue(row.getCell(3)),
                iLoad: extractValue(row.getCell(5)),
                eLoad: extractValue(row.getCell(6)),
                mandatoryPapers: extractValue(row.getCell(7)),
                mandatoryPatents: extractValue(row.getCell(8)),
                proposals: 0 
            });
        }
        res.json(data);
    } catch (err) { res.status(500).json({ error: err.message }); }
});

// ✅ GET Publications (Full list for Repository)
app.get("/api/publications", async (req, res) => {
    try {
        const workbook = new ExcelJS.Workbook();
        await workbook.xlsx.readFile(DB_PATH);
        const sheet = workbook.getWorksheet('Journal_Paper_Conference');
        if (!sheet) return res.json([]);

        const h = findHeaders(sheet, 1, {
            faculty: ["faculty", "involved"],
            students: ["students", "involved"],
            dept: ["dept", "department"],
            journal: ["journal", "conference"],
            q: ["q1", "q2", "q3", "q4", "sci"],
            indexed: ["indexed", "wos"],
            title: ["title"],
            date: ["month", "year"],
            issn: ["issn", "isbn"],
            link: ["link", "doi"]
        });

        const data = [];
        sheet.eachRow((row, rowNumber) => {
            if (rowNumber === 1) return;
            const title = extractText(row.getCell(h.title || 8));
            if (title) {
                data.push({
                    faculty: extractText(row.getCell(h.faculty || 2)),
                    students: extractText(row.getCell(h.students || 3)),
                    department: extractText(row.getCell(h.dept || 4)),
                    type: extractText(row.getCell(h.journal || 5)).toLowerCase().includes("journal") ? "Journal" : "Conference",
                    journalName: extractText(row.getCell(h.journal || 5)),
                    ranking: extractText(row.getCell(h.q || 6)),
                    indexing: extractText(row.getCell(h.indexed || 7)),
                    title: title,
                    date: extractText(row.getCell(h.date || 9)),
                    issn: extractText(row.getCell(h.issn || 10)),
                    link: extractText(row.getCell(h.link || 11))
                });
            }
        });
        res.json(data);
    } catch (err) { res.status(500).json({ error: err.message }); }
});

// ✅ GET Patents (Full list for Repository)
app.get("/api/patents", async (req, res) => {
    try {
        const workbook = new ExcelJS.Workbook();
        await workbook.xlsx.readFile(DB_PATH);
        const sheet = workbook.getWorksheet('Patents');
        if (!sheet) return res.json([]);

        const h = findHeaders(sheet, 1, {
            appNo: ["application number", "application no", "application", "app no", "patent no"],
            status: ["status"],
            inventor: ["inventor"],
            dept: ["dept", "department"],
            title: ["title"],
            applicant: ["applicant"],
            filedDate: ["filed date"],
            pubDate: ["published date", "granted date"],
            link: ["link"]
        });

        const data = [];
        sheet.eachRow((row, rowNumber) => {
            if (rowNumber === 1) return;
            const title = extractText(row.getCell(h.title || 6));
            if (title) {
                data.push({
                    appNo: extractText(row.getCell(h.appNo || 2)),
                    status: extractText(row.getCell(h.status || 3)),
                    inventor: extractText(row.getCell(h.inventor || 4)),
                    department: extractText(row.getCell(h.dept || 5)),
                    title: title,
                    applicant: extractText(row.getCell(h.applicant || 7)),
                    filedDate: extractText(row.getCell(h.filedDate || 8)),
                    pubDate: extractText(row.getCell(h.pubDate || 9)),
                    link: extractText(row.getCell(h.link || 10))
                });
            }
        });
        res.json(data);
    } catch (err) { res.status(500).json({ error: err.message }); }
});

// ✅ GET Incentives (Full list)
app.get("/api/incentives", async (req, res) => {
    try {
        const workbook = new ExcelJS.Workbook();
        await workbook.xlsx.readFile(DB_PATH);
        const sheet = workbook.getWorksheet('Incentives');
        if (!sheet) return res.json([]);

        const h = findHeaders(sheet, 2, { 
            dept: ["department", "dept"], 
            year: ["year"],
            faculty: ["faculty", "teacher", "name of the faculty"], 
            conference: ["conference", "workshop", "attended"],
            body: ["professional body", "membership"],
            amount: ["amount of support", "incentive amount", "support (rs)"]
        });

        const data = [];
        sheet.eachRow((row, rowNumber) => {
            if (rowNumber <= 2) return;
            const faculty = extractText(row.getCell(h.faculty || 4));
            if (faculty) {
                data.push({
                    department: extractText(row.getCell(h.dept || 2)),
                    year: extractText(row.getCell(h.year || 3)),
                    faculty: faculty,
                    conference: extractText(row.getCell(h.conference || 5)),
                    professionalBody: extractText(row.getCell(h.body || 6)),
                    amount: extractValue(row.getCell(h.amount || 7))
                });
            }
        });
        res.json(data);
    } catch (err) { res.status(500).json({ error: err.message }); }
});

// ✅ GET Department Pulse (Full list)
app.get("/api/dept-pulse", async (req, res) => {
    try {
        const workbook = new ExcelJS.Workbook();
        await workbook.xlsx.readFile(DB_PATH);
        const paperSheet = workbook.getWorksheet('Journal_Paper_Conference');
        if (!paperSheet) return res.json([]);

        const h = findHeaders(paperSheet, 1, { 
            dept: ["dept"], 
            faculty: ["faculty"], 
            title: ["title"], 
            journal: ["journal", "conference"] 
        });

        const pulse = [];
        paperSheet.eachRow((row, rowNumber) => {
            if (rowNumber === 1) return;
            const title = extractText(row.getCell(h.title || 8));
            if (title) {
                pulse.push({
                    title: title,
                    authors: extractText(row.getCell(h.faculty || 2)),
                    journal: extractText(row.getCell(h.journal || 5)),
                    dept: extractText(row.getCell(h.dept || 4))
                });
            }
        });
        res.json(pulse);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ✅ POST Update API (Sync Dashboard changes to Excel)
app.post("/api/update", async (req, res) => {
    try {
        res.status(501).json({ message: "Update feature disabled due to strict data structure" });
    } catch (err) {
        res.status(500).json({ error: "Failed to save to database file." });
    }
});

// Serve frontend layout (Catch-all for SPA)
app.use((req, res) => {
    res.sendFile(path.join(__dirname, "../frontend", "index.html"));
});

// Start server
const PORT = 5005;
app.listen(PORT, () => {
    console.log(`Excel DB Server running on http://localhost:${PORT}`);
});
