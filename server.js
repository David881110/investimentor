const express = require("express");
const multer = require("multer");
const fs = require("fs");
const path = require("path");

const app = express();
const uploadDir = path.join(__dirname, "uploads");

// ✅ Sicherstellen, dass `uploads/` existiert
if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir);
    console.log("📂 'uploads/' Ordner wurde erstellt!");
}

// ✅ Statische Dateien bereitstellen (HTML, CSS, JS)
app.use(express.static("public", {
    maxAge: "1y",  // Speichert CSS, JS für 1 Jahr
    etag: false
}));

// ✅ Multer für Datei-Uploads konfigurieren
const storage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, uploadDir),
    filename: (req, file, cb) => cb(null, "stocks.txt")
});
const upload = multer({ storage });

// ✅ Datei-Upload Route
app.post("/upload", upload.single("file"), (req, res) => {
    if (!req.file) return res.status(400).send("❌ Keine Datei hochgeladen!");
    console.log(`✅ Datei gespeichert: ${path.join(uploadDir, "stocks.txt")}`);
    res.send("✅ Datei erfolgreich hochgeladen!");
});

// ✅ Aktienliste aus `stocks.txt` abrufen
app.get("/stocks", (req, res) => {
    console.log("📡 API-Call: /stocks");
    const filePath = path.join(__dirname, "uploads", "stocks.txt");

    if (!fs.existsSync(filePath)) {
        console.error("❌ stocks.txt nicht gefunden!");
        return res.status(404).json({ error: "❌ Keine Aktien gefunden!" });
    }

    fs.readFile(filePath, "utf8", (err, data) => {
        if (err) {
            console.error("❌ Fehler beim Lesen der Datei:", err);
            return res.status(500).json({ error: "❌ Fehler beim Lesen der Datei!" });
        }

        const rows = data.trim().split("\n");
        const headers = rows[0].split(",");

        // Prüfen, ob die Datei die erwarteten Spalten enthält
        if (!headers.includes("Ticker") || !headers.includes("Unternehmensname")) {
            console.error("❌ Falsches Format in stocks.txt!");
            return res.status(400).json({ error: "❌ Falsches Datei-Format!" });
        }

        const stocks = rows.slice(1).map(line => {
            const parts = line.split(",");
            return {
                ticker: parts[1].trim(),  // Ticker
                name: parts[2].trim() // Unternehmensname
            };
        }).filter(stock => stock.ticker && stock.name); // Filtert ungültige Einträge raus

        console.log("📊 Aktien geladen:", stocks);
        res.json(stocks);
    });
});


// ✅ Route `/stock-data` für Einzelanalyse einer Aktie
app.get("/stock-data", (req, res) => {
    const { ticker } = req.query; // ✅ Jetzt wird "ticker" statt "symbol" verwendet!
    const filePath = path.join(__dirname, "uploads", "stocks.txt");

    if (!fs.existsSync(filePath)) {
        return res.status(404).json({ error: "❌ Keine Aktien vorhanden!" });
    }

    fs.readFile(filePath, "utf8", (err, data) => {
        if (err) {
            return res.status(500).json({ error: "❌ Fehler beim Lesen der Datei!" });
        }

        const stock = data.split("\n")
            .slice(1)
            .map(line => line.split(","))
            .find(parts => parts[1].trim() === ticker); // ✅ Suche jetzt nach dem "ticker"

        if (!stock) {
            return res.status(404).json({ error: `❌ Aktie mit Ticker '${ticker}' nicht gefunden!` });
        }

        res.json({
            finalValue: parseFloat(stock[20]), // Bewertung
            finalGrowth: parseFloat(stock[7]), // Wachstum
            finalQuality: parseFloat(stock[16]), // Qualität
            finalMomentum: parseFloat(stock[11]), // Trendstärke
            finalMinVol: parseFloat(stock[22]) // Kursstabilität
        });
    });
});


// ✅ Server starten
const PORT = 3000;
app.listen(PORT, () => console.log(`🚀 Server läuft auf http://localhost:${PORT}`));