document.addEventListener("DOMContentLoaded", () => {
    loadStocks();
    document.getElementById("analyzeButton").addEventListener("click", analyzeStock);
});

async function loadStocks() {
    try {
        console.log("📡 Lade Aktien aus /stocks...");
        const response = await fetch("/stocks");

        if (!response.ok) {
            throw new Error(`Server-Fehler: ${await response.text()}`);
        }

        const stocks = await response.json();
        console.log("🔍 Geladene Aktien:", stocks); // Debugging-Ausgabe

        if (!Array.isArray(stocks) || stocks.length === 0) {
            console.error("⚠️ Keine Aktien gefunden!");
            document.getElementById("stockDropdown").innerHTML = "<option>⚠️ Keine Aktien gefunden</option>";
            return;
        }

        const dropdown = document.getElementById("stockDropdown");
        dropdown.innerHTML = '<option value="">Bitte wählen...</option>';

        stocks.forEach(stock => {
            if (!stock.name || !stock.ticker) {
                console.warn("⚠️ Ungültiger Eintrag:", stock);
                return;
            }
            console.log(`📌 Hinzufügen: ${stock.name} (${stock.ticker})`);
            const option = document.createElement("option");
            option.value = stock.ticker;
            option.textContent = `${stock.name} (${stock.ticker})`;
            dropdown.appendChild(option);
        });

        console.log("✅ Aktien ins Dropdown eingefügt!");
    } catch (error) {
        console.error("❌ Fehler beim Laden der Aktien:", error);
    }
}

async function analyzeStock() {
    const stockTicker = document.getElementById("stockDropdown").value;
    if (!stockTicker) {
        alert("Bitte eine Aktie auswählen!");
        return;
    }

    try {
        console.log(`📡 Lade Daten für ${stockTicker}...`);
        const response = await fetch(`/stock-data?ticker=${stockTicker}`); // ✅ Jetzt wird "ticker" verwendet!
        const data = await response.json();

        if (data.error) {
            alert(data.error);
            return;
        }

        console.log("📊 Daten für Diagramm erhalten:", data);
        renderChart(data, stockTicker);
    } catch (error) {
        console.error("❌ Fehler beim Laden der Aktien-Daten:", error);
    }
}


function renderChart(data, stockTicker) {
    const chartContainer = document.getElementById("chartContainer");

    // ✅ Vorheriges Canvas-Element entfernen und neu erstellen
    chartContainer.innerHTML = '<canvas id="stockChart"></canvas>';
    const ctx = document.getElementById("stockChart").getContext("2d");

    // 🔹 Werte & Labels für den Chart
    const labels = ["Bewertung", "Wachstum", "Qualität", "Trendstärke", "Kursstabilität"];
    const values = [data.finalValue, data.finalGrowth, data.finalQuality, data.finalMomentum, data.finalMinVol];

    // 🔹 Dynamische Farben basierend auf Wertbereichen (0-30 rot, 30-70 gelb, 70-100 grün)
    const barColors = values.map(value => {
        if (value < 30) return "#ff4d4d"; // 🔴 Schwach
        if (value < 70) return "#ffcc00"; // 🟡 Neutral
        return "#33cc33"; // 🟢 Stark
    });

    // ✅ Neues Diagramm mit visuellen Markierungen
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
                        color: "#333"
                    },
                    grid: {
                        drawBorder: false,
                        color: function(context) {
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
                        label: function(tooltipItem) {
                            const value = tooltipItem.raw;
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

