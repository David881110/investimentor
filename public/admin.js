async function uploadFile() {
    const fileInput = document.getElementById("fileUpload");
    const file = fileInput.files[0];

    if (!file) {
        alert("⚠️ Bitte eine Datei auswählen!");
        return;
    }

    let formData = new FormData();
    formData.append("file", file);

    try {
        console.log("📤 Datei wird hochgeladen...");
        const response = await fetch("/upload", { method: "POST", body: formData });

        if (!response.ok) {
            const errorText = await response.text();
            console.error("❌ Fehler beim Hochladen:", errorText);
            alert(`❌ Fehler beim Hochladen: ${errorText}`);
            return;
        }

        const result = await response.text();
        console.log("✅ Upload erfolgreich:", result);
        
        document.getElementById("uploadStatus").innerText = result;
        alert("✅ Datei hochgeladen! Aktien sind jetzt verfügbar.");
        
    } catch (error) {
        console.error("❌ Fehler beim Upload:", error);
        alert("❌ Fehler beim Hochladen! Siehe Konsole.");
    }
}
