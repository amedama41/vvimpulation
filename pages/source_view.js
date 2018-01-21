window.addEventListener("DOMContentLoaded", (e) => {
    const source = decodeURIComponent(escape(atob(location.search.substr(8))));
    const fragment = document.createDocumentFragment();
    source.split("\n").forEach((line) => {
        const code = document.createElement("code");
        code.textContent = line + "\n";
        fragment.appendChild(code);
    });
    document.getElementById("source").appendChild(fragment);
});

