window.addEventListener("DOMContentLoaded", (e) => {
    const params = new URLSearchParams(location.search.substr(1));
    const errorURL = decodeURI(params.get("errorURL"));
    document.title = `Error: ${errorURL}`;
    const iframe = document.getElementById("errorURL");
    iframe.src = errorURL;
    const div = document.getElementById("errorCode");
    div.innerText = decodeURI(params.get("errorCode"));
});

