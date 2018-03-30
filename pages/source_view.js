window.addEventListener("DOMContentLoaded", (e) => {
    const params = new URLSearchParams(location.search.substr(1));
    const source = params.get("source");
    const fragment = document.createDocumentFragment();
    source.split("\n").forEach((line) => {
        const code = document.createElement("code");
        code.textContent = line + "\n";
        fragment.appendChild(code);
    });
    const sourceElem = document.getElementById("source");
    sourceElem.appendChild(fragment);

    const switchWrap = (isWrap) => {
        const CLASS_NAME = "wrap-lines";
        if (isWrap.checked) {
            sourceElem.classList.add(CLASS_NAME);
        }
        else {
            sourceElem.classList.remove(CLASS_NAME);
        }
    };
    const isWrap = document.getElementById("is-wrap");
    switchWrap(isWrap);
    isWrap.addEventListener("change", (e) => switchWrap(e.target), true);
});

