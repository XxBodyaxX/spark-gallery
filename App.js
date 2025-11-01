console.log("Spark Gallery Loaded ✅");

function showTab(tab) {
    const tabs = ["gallery", "favorites", "profile"];

    tabs.forEach(t => {
        document.getElementById(`${t}-section`).classList.add("hidden");
        document.getElementById(`tab-${t}`).classList.remove("active-tab");
    });

    document.getElementById(`${tab}-section`).classList.remove("hidden");
    document.getElementById(`tab-${tab}`).classList.add("active-tab");

    localStorage.setItem("activeTab", tab);
}

// Восстановление вкладки
window.onload = () => {
    let saved = localStorage.getItem("activeTab") || "gallery";
    showTab(saved);
};
