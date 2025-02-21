document.getElementById("payButton").addEventListener("click", async function() {
    const response = await fetch("/create-checkout-session", { method: "POST" });
    const session = await response.json();
    window.location.href = session.url;
});