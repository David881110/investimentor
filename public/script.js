document.addEventListener("DOMContentLoaded", () => {
    loadComponent("components/header.html", "header-container");
    loadComponent("components/footer.html", "footer-container");
});

function loadComponent(file, targetId) {
    fetch(file)
        .then(response => response.text())
        .then(data => {
            document.getElementById(targetId).innerHTML = data;
        })
        .catch(error => console.error(`Fehler beim Laden von ${file}:`, error));
}

document.addEventListener("DOMContentLoaded", async () => {
    console.log("🔄 Starte Skript...");
    await loadStocks();

    // Event-Listener für das Aktien-Suchfeld
    const stockSearch = document.getElementById("portfolioStockSearch");
    if (stockSearch) {
        stockSearch.addEventListener("change", addPortfolioStock);
    }

    // Event-Listener für Portfolio-Analyse
    const analyzePortfolio = document.getElementById("analyzePortfolio");
    if (analyzePortfolio) {
        analyzePortfolio.addEventListener("click", analyzePortfolioData);
    }
});

let allStocks = [];
let portfolio = [];

// 🔹 Aktien aus `/stocks` laden
async function loadStocks() {
    try {
        console.log("📡 Lade Aktien aus /stocks...");
        const response = await fetch("/stocks");
        if (!response.ok) {
            throw new Error(`Server-Fehler: ${response.status} - ${await response.text()}`);
        }
        allStocks = await response.json();
        console.log("✅ Aktien erfolgreich geladen:", allStocks);
        updateStockList(allStocks);
    } catch (error) {
        console.error("❌ Fehler beim Laden der Aktien:", error);
    }
}

// 🔹 Aktien in die Suchliste einfügen
function updateStockList(stocks) {
    const stockList = document.getElementById("stockList");
    if (!stockList) return;
    stockList.innerHTML = "";

    stocks.forEach(stock => {
        if (stock.name && stock.ticker) {
            const option = document.createElement("option");
            option.value = `${stock.name} (${stock.ticker})`;
            stockList.appendChild(option);
        }
    });
}

// 🔹 Aktie zum Portfolio hinzufügen (durch Auswahl im Suchfeld)
function addPortfolioStock() {
    const stockInput = document.getElementById("portfolioStockSearch");
    const selectedStock = allStocks.find(stock =>
        `${stock.name} (${stock.ticker})` === stockInput.value
    );

    if (!selectedStock) {
        return;
    }

    // Prüfen, ob Aktie bereits im Portfolio ist
    if (portfolio.find(stock => stock.ticker === selectedStock.ticker)) {
        alert("❌ Diese Aktie ist bereits im Portfolio!");
        stockInput.value = "";
        return;
    }

    // Aktie hinzufügen
    portfolio.push({ ticker: selectedStock.ticker, weight: 0 });
    adjustWeights();
    renderPortfolioList();

    // Suchfeld zurücksetzen
    stockInput.value = "";
}

// 🔹 Gewichtungen anpassen, damit die Summe immer exakt 100% ist
function adjustWeights() {
    if (portfolio.length === 0) return;

    const baseWeight = (100 / portfolio.length).toFixed(2);
    portfolio.forEach(stock => stock.weight = parseFloat(baseWeight));

    // Sonderfall: Wenn 3 Aktien => 33.34 für die letzte Aktie
    if (portfolio.length === 3) {
        portfolio[2].weight = parseFloat((100 - 2 * baseWeight).toFixed(2));
    }
}

// 🔹 Portfolio-Liste aktualisieren
function renderPortfolioList() {
    const portfolioList = document.getElementById("portfolioList");
    if (!portfolioList) return;
    portfolioList.innerHTML = "";

    portfolio.forEach((stock, index) => {
        const listItem = document.createElement("li");
        listItem.classList.add("portfolio-item");
        listItem.innerHTML = `
            <div class="portfolio-content">
                <strong>${stock.ticker}</strong>
                <input type="number" min="0" max="100" step="0.01" value="${stock.weight}" onchange="updateWeight('${stock.ticker}', this.value)">
                <button onclick="removeStock('${stock.ticker}')">❌</button>
            </div>
        `;

        portfolioList.appendChild(listItem);
    });

    validateWeights();
}

// 🔹 Gewicht aktualisieren
function updateWeight(ticker, newWeight) {
    let stock = portfolio.find(stock => stock.ticker === ticker);
    if (!stock) return;
    stock.weight = parseFloat(newWeight) || 0;

    validateWeights();
}

// 🔹 Aktie aus Portfolio entfernen
function removeStock(ticker) {
    portfolio = portfolio.filter(stock => stock.ticker !== ticker);
    adjustWeights();
    renderPortfolioList();
}

// 🔹 Prüfen, ob die Gewichtung exakt 100% ergibt
function validateWeights() {
    let totalWeight = portfolio.reduce((sum, stock) => sum + stock.weight, 0);
    totalWeight = parseFloat(totalWeight.toFixed(2));

    const errorText = document.getElementById("weightError");
    if (!errorText) return;

    if (totalWeight !== 100) {
        errorText.innerText = "❌ Die Gesamtgewichtung muss genau 100% betragen!";
        errorText.style.display = "block";
    } else {
        errorText.style.display = "none";
    }
}

// 🔹 Portfolio analysieren & Chart rendern
async function analyzePortfolioData() {
    let totalWeight = portfolio.reduce((sum, stock) => sum + stock.weight, 0);
    totalWeight = parseFloat(totalWeight.toFixed(2));

    if (totalWeight !== 100) {
        alert("❌ Die Gesamtgewichtung muss genau 100% betragen!");
        return;
    }

    if (portfolio.length === 0) {
        alert("Bitte mindestens eine Aktie hinzufügen!");
        return;
    }

    console.log("📡 Sende Portfolio-Daten an Server:", portfolio);
    try {
        const response = await fetch(`/portfolio-data?portfolio=${encodeURIComponent(JSON.stringify(portfolio))}`);
        const data = await response.json();

        if (data.error) {
            alert(data.error);
            return;
        }

        console.log("📊 Portfolio-Daten erhalten:", data);
        renderPortfolioChart(data);
    } catch (error) {
        console.error("❌ Fehler bei der Portfolio-Analyse:", error);
    }
}



// 🔹 Portfolio-Chart rendern
function renderPortfolioChart(data) {
    const chartContainer = document.getElementById("portfolioChartContainer");
    chartContainer.innerHTML = '<canvas id="portfolioChart"></canvas>';
    const ctx = document.getElementById("portfolioChart").getContext("2d");

    const labels = ["Bewertung", "Wachstum", "Qualität", "Trendstärke", "Kursstabilität"];
    const values = [
        Math.round(data.finalValue),
        Math.round(data.finalGrowth),
        Math.round(data.finalQuality),
        Math.round(data.finalMomentum),
        Math.round(data.finalMinVol)
    ];

    const barColors = values.map(value => {
        if (value < 30) return "#ff4d4d";  // 🔴 Rot = Schwach
        if (value < 70) return "#ffcc00";  // 🟡 Gelb = Neutral
        return "#33cc33";  // 🟢 Grün = Stark
    });

    new Chart(ctx, {
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
                    grid: {
                        color: function (context) {
                            return context.tick.value === 30 || context.tick.value === 70 ? "#666" : "#ddd";
                        }
                    }
                }
            },
            plugins: {
                legend: { display: false }
            }
        }
    });

    updateFactorAnalysis(values, labels);

    function updateFactorAnalysis(values, labels) {
        const strongFactors = labels.filter((_, i) => values[i] > 70);
        const weakFactors = labels.filter((_, i) => values[i] < 30);
        const neutralFactors = labels.filter((_, i) => values[i] >= 30 && values[i] <= 70);
    
        let analysisText = "🔍 Basierend auf der Faktoranalyse zeigt dein Portfolio ";
        
        if (strongFactors.length > 0) {
            analysisText += `starke Ausprägungen bei ${strongFactors.join(", ")}`;
        }
        if (weakFactors.length > 0) {
            analysisText += strongFactors.length > 0 ? ", aber " : "";
            analysisText += `schwache Werte bei ${weakFactors.join(", ")}`;
        }
        if (neutralFactors.length > 0 && weakFactors.length > 0 && strongFactors.length > 0) {
            analysisText += " und ";
        } else if (neutralFactors.length > 0 && (strongFactors.length > 0 || weakFactors.length > 0)) {
            analysisText += " sowie ";
        }
        if (neutralFactors.length > 0) {
            analysisText += `neutrale Tendenzen bei ${neutralFactors.join(", ")}`;
        }
    
        analysisText += "."; // Punkt am Ende setzen
    
        document.getElementById("portfolioChartAnalysis").innerText = analysisText;
    }
        
}
