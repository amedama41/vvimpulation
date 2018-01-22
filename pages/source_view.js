window.addEventListener("DOMContentLoaded", (e) => {
    const params = new URLSearchParams(location.search.substr(1));
    const source = params.get("source");
    const fragment = document.createDocumentFragment();
    source.split("\n").forEach((line) => {
        const code = document.createElement("code");
        code.textContent = line + "\n";
        fragment.appendChild(code);
    });
    document.getElementById("source").appendChild(fragment);
});

