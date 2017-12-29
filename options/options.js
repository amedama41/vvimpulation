'use strict';

window.addEventListener("DOMContentLoaded", (e) => {
    const optionMgr = new Options();
    browser.storage.local.get("options").then(({ options }) => {
        optionMgr.setOptions(options);
    });
}, { once: true, capture: true });

class Options {
    constructor() {
        this.options = null;
        this.keyMapping = new KeyMapping();
        this.hintPattern = new HintPattern();
        this.searchEngine = new SearchEngine();
        this.miscellaneous = new Miscellaneous();
        document.getElementById("import-button")
            .addEventListener("click", (e) => { this.importOptions(); });
        document.getElementById("export-button")
            .addEventListener("click", (e) => { this.exportOptions(); });
        document.getElementById("restore-button")
            .addEventListener("click", (e) => { this.restoreOptions(); });
        document.getElementById("save-button")
            .addEventListener("click", (e) => { this.saveOptions(); });
    }
    setOptions(options) {
        this.keyMapping.setOptions(options["keyMapping"]);
        this.hintPattern.setOptions(options["hintPattern"]);
        this.searchEngine.setOptions(options["searchEngine"] || {});
        this.miscellaneous.setOptions(options["miscellaneous"] || {});
        this.options = options;
    }
    saveOptions() {
        try {
            const options = {
                "keyMapping": this.keyMapping.getOptions(),
                "hintPattern": this.hintPattern.getOptions(),
                "searchEngine": this.searchEngine.getOptions(),
                "miscellaneous": this.miscellaneous.getOptions(),
            };
            this.options = options;
            browser.storage.local.set({
                "options": this.options
            }).then(() => {
                Options.setErrorMessage("Saved options");
            }).catch((error) => {
                Options.setErrorMessage(error);
            });
        }
        catch (e) {
            Options.setErrorMessage(e.message);
        }
    }
    exportOptions() {
        const blob = new Blob(
            [JSON.stringify(this.options, null, 2)], { type: "text/json" });
        browser.downloads.download({
            url: URL.createObjectURL(blob),
            filename: "wimpulation.json",
            saveAs: true
        });
    }
    importOptions() {
        const files = document.getElementById("import-file");
        if (files.files.length === 0) {
            Options.setErrorMessage("No file is specified");
            return;
        }
        const jsonFile = files.files[0];
        const reader = new FileReader();
        reader.onloadend = () => {
            try {
                this.setOptions(JSON.parse(reader.result));
                Options.setErrorMessage(
                    "Import options (These are not saved yet)");
            }
            catch (e) {
                Options.setErrorMessage(e.message);
            }
        };
        reader.onerror = () => {
            Options.setErrorMessage(reader.error.message);
        };
        reader.readAsText(jsonFile);
    }
    restoreOptions() {
        this.setOptions(DEFAULT_OPTIONS);
        Options.setErrorMessage("Restore options (These are not saved yet)");
    }
    static setErrorMessage(message) {
        const error = document.getElementById("option-bar-error");
        error.innerText = message;
    }
}

const KEY_MAPPING_TYPES = ["normal", "insert", "visual", "hint", "console"];
class KeyMapping {
    constructor() {
        this.options = KEY_MAPPING_TYPES.reduce((options, type) => {
            options[type] = ["", ""];
            return options;
        }, {});
        this.currentMode = "normal";

        const tabs = document.querySelectorAll("#key-mapping-tabs li");
        setSelectTabListener(tabs, (tab) => {
            this.setMode(tab.getAttribute("mode"));
        });

        const textarea = document.getElementById("key-mapping-textarea");
        textarea.addEventListener("change", (e) => {
            const mapping = e.target.value;
            this.options[this.currentMode][0] = mapping;
            try {
                JSON.parse(mapping);
                this.setErrorMessage("");
            }
            catch (error) {
                this.setErrorMessage(error.message);
            }
        });
    }
    setMode(mode) {
        this.currentMode = mode;
        this._updateKeyMappingSection();
    }
    setErrorMessage(message) {
        this.options[this.currentMode][1] = message;
        const error = document.getElementById("key-mapping-error");
        error.textContent = message;
    }
    getOptions() {
        try {
            const options = {};
            for (const mode of KEY_MAPPING_TYPES) {
                options[mode] = JSON.parse(this.options[mode][0]);
            }
            return options;
        }
        catch (e) {
            throw new Error("key mapping: " + e.message);
        }
    }
    setOptions(keyMapping) {
        for (const mode of Object.keys(keyMapping)) {
            this.options[mode] = [
                JSON.stringify(keyMapping[mode], null, 2), ""
            ];
        }
        this._updateKeyMappingSection();
    }
    _updateKeyMappingSection() {
        const textarea = document.getElementById("key-mapping-textarea");
        const errorMsg = document.getElementById("key-mapping-error");
        textarea.value = this.options[this.currentMode][0];
        errorMsg.textContent = this.options[this.currentMode][1];
    }
}

const HINT_PATTERN_TYPES = ["link", "focus", "media", "code"];
class HintPattern {
    constructor() {
        this.options = { "global": {}, "local": {} };
        HINT_PATTERN_TYPES.forEach((type) => this.options["global"][type] = "");
        this.currentHost = null;
        this.currentKind = "link";

        const globalSelectors = Array.from(
            document.querySelectorAll(".hint-pattern-global-selector"));
        globalSelectors.forEach((textarea) => {
            textarea.addEventListener("change", (e) => {
                const id = e.target.id;
                const kind = id.substr(id.lastIndexOf("-") + 1);
                this.setGlobalPattern(kind, e.target.value);
            });
        });

        const hostList = document.getElementById("hint-pattern-host-list");
        hostList.addEventListener("change", (e) => {
            this.selectHost(e.target.value);
        });
        const addHostButton = document.getElementById("hint-pattern-add-host");
        addHostButton.addEventListener("click", (e) => {
            const input = document.getElementById("hint-pattern-host-input");
            this.addHost(input.value);
            input.value = "";
        });
        const removeHostButton =
            document.getElementById("hint-pattern-remove-host");
        removeHostButton.addEventListener("click", (e) => this.removeHost());

        const tabs =
            Array.from(document.querySelectorAll("#hint-pattern-tabs li"));
        setSelectTabListener(tabs, (tab) => {
            this.setKind(tab.getAttribute("kind"));
        });
        const addSelectorButton =
            document.getElementById("add-selector-button");
        addSelectorButton.addEventListener("click", (e) => this.addSelector());
    }
    setGlobalPattern(kind, pattern) {
        this.options["global"][kind] = pattern;
        const errorMessageList = [];
        for (const kind of HINT_PATTERN_TYPES) {
            try {
                if (this.options["global"][kind] !== "") {
                    document.querySelector(this.options["global"][kind]);
                }
            }
            catch (error) {
                errorMessageList.push(kind + ": " + error.message);
            }
        }
        document.getElementById("hint-pattern-global-error").innerText =
            errorMessageList.join("\n");
    }
    addHost(host) {
        if (host === "") {
            return;
        }
        host = host.split(/\s*,\s*/).join(",");
        if (this.options["local"][host]) {
            alert("Duplicated host: " + host);
            return;
        }
        this.options["local"][host] = {};
        this._updateHostList(2);
    }
    removeHost() {
        delete this.options["local"][this.currentHost];
        this._updateHostList(0);
    }
    selectHost(host) {
        this.currentHost = host;
        this._updateHostPatternList();
    }
    setKind(kind) {
        this.currentKind = kind;
        this._updateHostPatternList();
    }
    addSelector() {
        if (!this.currentHost) {
            return;
        }
        const pattern = this.options["local"][this.currentHost];
        if (!pattern[this.currentKind]) {
            pattern[this.currentKind] = [];
        }
        pattern[this.currentKind].push(["", ""]);
        this._updateHostPatternList();
    }
    setSelector(index, selector) {
        const pattern = this.options["local"][this.currentHost];
        pattern[this.currentKind][index][0] = selector;
        this._checkLocalSelectorError();
    }
    setDescription(index, description) {
        const pattern = this.options["local"][this.currentHost];
        pattern[this.currentKind][index][1] = description;
        this._checkLocalSelectorError();
    }
    removeSelector(index) {
        const pattern = this.options["local"][this.currentHost];
        pattern[this.currentKind].splice(index, 1);
        this._updateHostPatternList();
    }
    getOptions() {
        try {
            const options = { "global": {}, "local": {} };

            const global = this.options["global"];
            for (const kind of HINT_PATTERN_TYPES) {
                if (global[kind] !== "") {
                    document.querySelector(global[kind]);
                }
                options["global"][kind] = global[kind];
            }

            const local = this.options["local"];
            Object.keys(local).forEach((host) => {
                const hostPattern = {};
                for (const kind of HINT_PATTERN_TYPES) {
                    const patternList = (local[host][kind] || [])
                        .map(([sel, desc]) => [sel.trim(), desc.trim()])
                        .filter(([selector, desc]) => selector !== "");
                    if (patternList.length === 0) {
                        continue;
                    }
                    patternList.forEach(([selector, desc]) => {
                        document.querySelector(selector);
                    });
                    hostPattern[kind] = patternList;
                }
                if (Object.keys(hostPattern).length !== 0) {
                    options["local"][host] = hostPattern;
                }
            });
            return options;
        }
        catch (e) {
            throw new Error("hint pattern: " + e.message);
        }
    }
    setOptions(hintPattern) {
        this.options = hintPattern;

        for (const kind of HINT_PATTERN_TYPES) {
            const textarea = document.getElementById("hint-pattern-" + kind);
            textarea.value = hintPattern["global"][kind];
        }
        this._updateHostList(1);
    }
    _updateHostList(selectPolicy) {
        const hostList = document.getElementById("hint-pattern-host-list");
        const prevIndex = hostList.selectedIndex;
        hostList.innerHTML = "";
        Object.keys(this.options["local"]).forEach((host) => {
            hostList.add(new Option(host, host));
        });
        if (selectPolicy === 0) {
            hostList.selectedIndex =
                Math.max(Math.min(0, prevIndex), hostList.length - 1);
        }
        else if (selectPolicy === 1) {
            hostList.selectedIndex = 0;
        }
        else if (selectPolicy === 2) {
            hostList.selectedIndex = hostList.length - 1;
        }
        this.selectHost(hostList.value);
    }
    _updateHostPatternList() {
        const list = document.getElementById("hint-pattern-list");
        if (!this.currentHost) {
            list.innerHTML = "";
            document.getElementById("hint-pattern-local-error").innerText = "";
            return;
        }
        const pattern = this.options["local"][this.currentHost];
        const fragment = document.createDocumentFragment();
        (pattern[this.currentKind] || []).forEach(([selector, desc], index) => {
            fragment.appendChild(this._createSelector(index, selector, desc));
        });
        list.innerHTML = "";
        list.appendChild(fragment);
        this._checkLocalSelectorError();
    }
    _createSelector(index, selector, description) {
        const row = document.createElement("div");

        const selectorInput = document.createElement("input");
        selectorInput.value = selector;
        selectorInput.className = "hint-pattern-local-selector";
        selectorInput.addEventListener("change", (e) => {
            this.setSelector(index, e.target.value);
        });

        const descriptionInput = document.createElement("input");
        descriptionInput.value = description;
        descriptionInput.className = "hint-pattern-local-description";
        descriptionInput.addEventListener("change", (e) => {
            this.setDescription(index, e.target.value);
        });

        const removeButton = document.createElement("input");
        removeButton.type = "button";
        removeButton.value = "Remove";
        removeButton.addEventListener("click", (e) => {
            const selector = e.target.parentNode.children[0].value;
            const description = e.target.parentNode.children[1].value;
            this.removeSelector(index);
        });

        row.appendChild(selectorInput);
        row.appendChild(descriptionInput);
        row.appendChild(removeButton);
        return row;
    }
    _checkLocalSelectorError() {
        const error = document.getElementById("hint-pattern-local-error");
        if (!this.currentHost) {
            error.innerText = "";
            return;
        }
        const pattern = this.options["local"][this.currentHost];
        const errorMessageList = [];
        (pattern[this.currentKind] || []).forEach(([selector, desc]) => {
            if (selector.trim() === "") {
                return;
            }
            try {
                document.querySelector(selector);
            }
            catch (e) {
                errorMessageList.push(selector + ": " + e.message);
            }
        });
        error.innerText = errorMessageList.join("\n");
    }
}

class SearchEngine {
    constructor() {
        this.defaultEngine = null;
        this.options = [];
        const addButton = document.getElementById("search-engine-add-button");
        addButton.addEventListener("click", (e) => {
            this.addEngine();
        });
    }
    getOptions() {
        const options = { defaultEngine: null, engines: {} };
        this.options
            .map((opt) => opt.map(
                (v) => (typeof(v) === "boolean" ? v : v.trim())))
            .forEach(([keyword, url, suggestUrl, type, path, decode], index) => {
                if (keyword === "" || url === "") {
                    return;
                }
                if (suggestUrl === "" || type === "" || path === "") {
                    options.engines[keyword] = { searchUrl: url };
                }
                else {
                    options.engines[keyword] = {
                        searchUrl: url,
                        suggest: { url: suggestUrl, type, path, decode }
                    };
                }
                if (index === this.defaultEngine) {
                    options.defaultEngine = keyword;
                }
            });
        return options;
    }
    setOptions(searchEngine) {
        const options = [];
        Object.keys(searchEngine.engines).forEach((keyword, index) => {
            const opt = ["", "", "", "", "", false];
            opt[0] = keyword;
            const { searchUrl, suggest } = searchEngine.engines[keyword];
            opt[1] = searchUrl;
            if (suggest) {
                opt[2] = suggest.url;
                opt[3] = suggest.type;
                opt[4] = suggest.path;
                opt[5] = suggest.decode;
            }
            options.push(opt);
            if (keyword === searchEngine.defaultEngine) {
                this.defaultEngine = index;
            }
        });
        this.options = options;
        this._updateSearchEngineList();
    }
    setDefaultEngine(rowIndex) {
        this.defaultEngine = rowIndex;
    }
    setEngineValue(rowIndex, index, value) {
        this.options[rowIndex][index] = value;
    }
    addEngine() {
        this.options.push(["", "", "", "", "", false]);
        this._updateSearchEngineList();
    }
    removeEngine(rowIndex) {
        this.options.splice(rowIndex, 1);
        this._updateSearchEngineList();
    }
    _updateSearchEngineList() {
        const body = document.getElementById("search-engine-list-body");
        const fragment = document.createDocumentFragment();
        this.options.forEach((opt, index) => {
            fragment.appendChild(this._createRow(index, opt));
        });
        body.innerHTML = "";
        body.appendChild(fragment);
    }
    _createRow(rowIndex, option) {
        const classNameList = [
            "search-engine-keyword", "search-engine-url",
            "search-engine-suggest-url", "search-engine-suggest-type",
            "search-engine-suggest-path", "search-engine-suggest-decode",
        ];
        const row = document.createElement("div");
        const defaultButton = document.createElement("input");
        defaultButton.className = "search-engine-default";
        defaultButton.type = "radio";
        defaultButton.name = "defaultSearchEngine";
        defaultButton.checked = (rowIndex === this.defaultEngine);
        defaultButton.addEventListener("change", (e) => {
            this.setDefaultEngine(rowIndex);
        });
        row.appendChild(defaultButton);

        option.forEach((v, index) => {
            const elem = (() => {
                if (index === 3) {
                    const select = document.createElement("select");
                    select.add(new Option("json", "json"));
                    select.add(new Option("xml", "xml"));
                    select.value = v;
                    return select;
                }
                else {
                    const input = document.createElement("input");
                    if (index === 5) {
                        input.type = "checkbox";
                        input.checked = v;
                    }
                    else {
                        input.type = "text";
                        input.value = v;
                    }
                    return input;
                }
            })();
            elem.className = classNameList[index];
            elem.addEventListener("change", (e) => {
                this.setEngineValue(
                    rowIndex, index,
                    (index === 5 ? e.target.checked : e.target.value));
            });
            row.appendChild(elem);
        });

        const removeButton = document.createElement("input");
        removeButton.type = "button";
        removeButton.value = "remove";
        removeButton.addEventListener(
            "click", (e) => this.removeEngine(rowIndex));
        row.appendChild(removeButton);
        return row;
    }
}

const MISCELLANEOUS_ID_MAP = {
    "miscellaneous-auto-focus": "autoFocus",
    "miscellaneous-auto-kill-hover": "autoKillHover",
    "miscellaneous-overwrite-error-page": "overwriteErrorPage",
};
class Miscellaneous {
    constructor() {
        this.options = {};
        Object.keys(MISCELLANEOUS_ID_MAP).forEach((id) => {
            document.getElementById(id).addEventListener("change", (e) => {
                const target = e.target;
                this.options[MISCELLANEOUS_ID_MAP[target.id]] = target.checked;
            });
        });
    }
    getOptions() {
        return Object.assign({}, this.options);
    }
    setOptions(miscellaneous) {
        this.options = Object.assign({}, miscellaneous);
        this._updateMiscellaneousSection();
    }
    _updateMiscellaneousSection() {
        Object.keys(MISCELLANEOUS_ID_MAP).forEach((id) => {
            const checkbox = document.getElementById(id);
            checkbox.checked = this.options[MISCELLANEOUS_ID_MAP[id]];
        });
    }
}

function setSelectTabListener(tabs, func) {
    tabs = Array.from(tabs);
    tabs.forEach((tab) => {
        tab.children[0].addEventListener("click", (e) => {
            tabs.forEach((tab) => tab.classList.remove("selectTab"));
            const tab = e.target.parentNode;
            tab.classList.add("selectTab");
            func(tab);
            e.preventDefault();
        });
    });
}

