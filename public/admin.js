async function uploadFile() {
    const fileInput = document.getElementById("fileInput");
    if (fileInput.files.length === 0) {
        alert("❌ Bitte eine Datei auswählen!");
        return;
    }

    const formData = new FormData();
    formData.append("stockFile", fileInput.files[0]);

    console.log("📤 Datei wird hochgeladen...");

    try {
        const response = await fetch("/upload", {
            method: "POST",
            body: formData
        });

        const result = await response.text();
        console.log(result);

        if (response.ok) {
            alert("✅ Datei hochgeladen! Aktien werden jetzt aktualisiert.");
        } else {
            alert("❌ Fehler beim Hochladen: " + result);
        }
    } catch (error) {
        console.error("❌ Fehler beim Hochladen:", error);
    }
}