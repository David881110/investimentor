document.addEventListener("DOMContentLoaded", () => {
    loadStocks();
    document.getElementById("analyzeButton").addEventListener("click", analyzeStock);
});

let allStocks = []; // Speichert alle Aktien für das Dropdown

// 🔹 Aktien aus /stocks laden (nur einmal)
async function loadStocks() {
    try {
        console.log("📡 Lade Aktien aus /stocks...");
        const response = await fetch("/stocks");

        if (!response.ok) {
            throw new Error(`Server-Fehler: ${await response.text()}`);
        }

        allStocks = await response.json();
        console.log("🔍 Geladene Aktien:", allStocks);

        updateDropdown(allStocks);
    } catch (error) {
        console.error("❌ Fehler beim Laden der Aktien:", error);
    }
}

// 🔹 Aktien ins Dropdown einfügen (Dropdown wird nicht überschrieben!)
function updateDropdown(stocks) {
    const dropdown = document.getElementById("stockDropdown");

    // ❌ Falls Dropdown bereits befüllt wurde, nicht erneut überschreiben!
    if (dropdown.options.length > 1) {
        console.log("⚠️ Aktien bereits geladen, kein erneutes Einfügen!");
        return;
    }

    dropdown.innerHTML = '<option value="">🔍 Aktie auswählen...</option>';

    stocks.forEach(stock => {
        if (!stock.name || !stock.ticker) return;
        const option = document.createElement("option");
        option.value = stock.ticker;
        option.textContent = `${stock.name} (${stock.ticker})`;
        dropdown.appendChild(option);
    });

    console.log("✅ Aktien ins Dropdown eingefügt!");
}

// 🔹 Funktion zum Analysieren der gewählten Aktie
async function analyzeStock() {
    const stockDropdown = document.getElementById("stockDropdown");
    const stockTicker = stockDropdown.value;

    if (!stockTicker) {
        document.getElementById("chartAnalysis").innerText = "Bitte eine Aktie auswählen!";
        return;
    }

    console.log(`📡 Lade Daten für ${stockTicker}...`);
    try {
        const response = await fetch(`/stock-data?ticker=${stockTicker}`);
        const data = await response.json();

        if (data.error) {
            document.getElementById("chartAnalysis").innerText = data.error;
            return;
        }

        console.log("📊 Daten für Diagramm erhalten:", data);
        document.getElementById("chartAnalysis").innerText = `✅ Analyse für ${stockTicker}`;
        renderChart(data, stockTicker);
    } catch (error) {
        console.error("❌ Fehler beim Laden der Aktien-Daten:", error);
    }
}

// 🔹 Funktion zur Darstellung des Charts
function renderChart(data, stockTicker) {
    const chartContainer = document.getElementById("chartContainer");

    // ✅ Vorheriges Canvas-Element entfernen und neu erstellen
    chartContainer.innerHTML = '<canvas id="stockChart"></canvas>';
    const ctx = document.getElementById("stockChart").getContext("2d");

    // 🔹 Werte & Labels für den Chart
    const labels = ["Bewertung", "Wachstum", "Qualität", "Trendstärke", "Kursstabilität"];
    const values = [
        Math.round(data.finalValue), 
        Math.round(data.finalGrowth), 
        Math.round(data.finalQuality), 
        Math.round(data.finalMomentum), 
        Math.round(data.finalMinVol)
    ]; // Werte runden

    // 🔹 Dynamische Farben basierend auf Wertbereichen (0-30 rot, 30-70 gelb, 70-100 grün)
    const barColors = values.map(value => {
        if (value < 30) return "#ff4d4d"; // 🔴 Schwach
        if (value < 70) return "#ffcc00"; // 🟡 Neutral
        return "#33cc33"; // 🟢 Stark
    });

    // ✅ Neues Diagramm mit gerundeten Werten & visuellen Markierungen
    window.stockChartInstance = new Chart(ctx, {
        type: "bar",
        data: {
            labels: labels,
            datasets: [{
                data: values,
                backgroundColor: barColors,
                borderColor: "#333",
                borderWidth: 1
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                y: {
                    beginAtZero: true,
                    max: 100,
                    ticks: {
                        font: {
                            family: "Roboto, sans-serif",
                            size: 14
                        },
                        color: "#333",
                        callback: function(value) {
                            return Math.round(value); // ✅ Achsenbeschriftung runden
                        }
                    },
                    grid: {
                        drawBorder: false,
                        color: function (context) {
                            if (context.tick.value === 30 || context.tick.value === 70) {
                                return "#666"; // 🔹 Markierungslinien für die Zonen
                            }
                            return "#ddd";
                        }
                    }
                },
                x: {
                    ticks: {
                        font: {
                            family: "Roboto, sans-serif",
                            size: 14
                        },
                        color: "#333"
                    }
                }
            },
            plugins: {
                legend: { display: false }, // 🔹 Keine Legende für sauberes UI
                tooltip: {
                    callbacks: {
                        label: function (tooltipItem) {
                            const value = Math.round(tooltipItem.raw); // ✅ Tooltip-Wert runden
                            let category = "🔴 Schwach";
                            if (value >= 70) category = "🟢 Stark";
                            else if (value >= 30) category = "🟡 Neutral";
                            return `${tooltipItem.label}: ${value} (${category})`;
                        }
                    }
                },
                annotation: {
                    annotations: [
                        {
                            type: "box",
                            yMin: 0,
                            yMax: 30,
                            backgroundColor: "rgba(255, 77, 77, 0.1)", // 🔴 Roter Hintergrund für schwach
                        },
                        {
                            type: "box",
                            yMin: 30,
                            yMax: 70,
                            backgroundColor: "rgba(255, 204, 0, 0.1)", // 🟡 Gelber Hintergrund für neutral
                        },
                        {
                            type: "box",
                            yMin: 70,
                            yMax: 100,
                            backgroundColor: "rgba(51, 204, 51, 0.1)", // 🟢 Grüner Hintergrund für stark
                        }
                    ]
                }
            }
        }
    });

    // ✅ Analyse: Die zwei höchsten Werte anzeigen
    const sorted = values.map((val, index) => ({ factor: labels[index], value: val }))
        .sort((a, b) => b.value - a.value)
        .slice(0, 2);

    const analysisText = `Die Faktoren ${sorted[0].factor} und ${sorted[1].factor} sind bei der Aktie ${stockTicker} am stärksten ausgeprägt.`;
    document.getElementById("chartAnalysis").innerText = analysisText;
}
