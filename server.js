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

// ✅ Middleware für JSON-Anfragen
app.use(express.json());
app.use(express.static("public", { maxAge: "1y", etag: false }));

// ✅ Datei-Upload für Aktien-Daten
const storage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, uploadDir),
    filename: (req, file, cb) => cb(null, "stocks.txt")
});
const upload = multer({ storage });

app.post("/upload", upload.single("stockFile"), (req, res) => {
    if (!req.file) return res.status(400).send("❌ Keine Datei hochgeladen!");
    console.log(`✅ Datei gespeichert: ${path.join(uploadDir, "stocks.txt")}`);
    res.send("✅ Datei erfolgreich hochgeladen!");
});

// ✅ Aktienliste aus `stocks.txt` abrufen
app.get("/stocks", (req, res) => {
    const filePath = path.join(__dirname, "uploads", "stocks.txt");

    if (!fs.existsSync(filePath)) {
        return res.status(404).json({ error: "❌ Keine Aktien gefunden!" });
    }

    fs.readFile(filePath, "utf8", (err, data) => {
        if (err) return res.status(500).json({ error: "❌ Fehler beim Lesen der Datei!" });

        const rows = data.trim().split("\n").slice(1); // Erste Zeile ignorieren (Header)
        const stocks = rows.map(line => {
            const parts = line.split(",");
            return { ticker: parts[1].trim(), name: parts[2].trim() };
        });

        res.json(stocks);
    });
});
// ✅ Portfolio-Analyse: Gewichtete Berechnung aus `stocks.txt`
app.get("/portfolio-data", (req, res) => {
    try {
        console.log("📡 Portfolio-Analyse gestartet...");
        console.log("📩 Eingehende Portfolio-Daten:", req.query.portfolio);

        const portfolio = JSON.parse(req.query.portfolio);
        if (!portfolio || portfolio.length === 0) {
            console.error("❌ Portfolio ist leer!");
            return res.status(400).json({ error: "❌ Portfolio ist leer!" });
        }

        const filePath = path.join(__dirname, "uploads", "stocks.txt");

        if (!fs.existsSync(filePath)) {
            console.error("❌ stocks.txt nicht gefunden!");
            return res.status(404).json({ error: "❌ Keine Aktien vorhanden!" });
        }

        fs.readFile(filePath, "utf8", (err, data) => {
            if (err) {
                console.error("❌ Fehler beim Lesen der Datei:", err);
                return res.status(500).json({ error: "❌ Fehler beim Lesen der Datei!" });
            }

            console.log("📂 Datei erfolgreich geladen!");

            const rows = data.split("\n").slice(1);
            const stockData = {};

            rows.forEach(line => {
                const parts = line.split(",");
                if (parts.length > 22) { // Sicherheitsprüfung
                    stockData[parts[1].trim()] = {
                        finalValue: parseFloat(parts[20]) || 0,
                        finalGrowth: parseFloat(parts[7]) || 0,
                        finalQuality: parseFloat(parts[16]) || 0,
                        finalMomentum: parseFloat(parts[11]) || 0,
                        finalMinVol: parseFloat(parts[22]) || 0
                    };
                }
            });

            console.log("📊 Verfügbare Aktien-Daten:", stockData);

            let weightedPortfolio = {
                finalValue: 0,
                finalGrowth: 0,
                finalQuality: 0,
                finalMomentum: 0,
                finalMinVol: 0
            };

            let totalWeight = portfolio.reduce((sum, stock) => sum + stock.weight, 0);
            if (totalWeight > 100) {
                console.error("❌ Gewichtung überschreitet 100%!");
                return res.status(400).json({ error: "❌ Gewichtung darf 100% nicht überschreiten!" });
            }

            portfolio.forEach(stock => {
                let data = stockData[stock.ticker];
                if (data) {
                    weightedPortfolio.finalValue += data.finalValue * (stock.weight / 100);
                    weightedPortfolio.finalGrowth += data.finalGrowth * (stock.weight / 100);
                    weightedPortfolio.finalQuality += data.finalQuality * (stock.weight / 100);
                    weightedPortfolio.finalMomentum += data.finalMomentum * (stock.weight / 100);
                    weightedPortfolio.finalMinVol += data.finalMinVol * (stock.weight / 100);
                } else {
                    console.error(`⚠️ Aktie ${stock.ticker} nicht in stocks.txt gefunden!`);
                }
            });

            console.log("✅ Berechnetes Portfolio:", weightedPortfolio);
            res.json(weightedPortfolio);
        });

    } catch (error) {
        console.error("❌ Fehler bei der Portfolio-Berechnung:", error);
        res.status(500).json({ error: "❌ Fehler bei der Portfolio-Berechnung!" });
    }
});

// ✅ Server starten
const PORT = 3000;
app.listen(PORT, () => console.log(`🚀 Server läuft auf http://localhost:${PORT}`));
