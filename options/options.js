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
        this.pagePattern = new PagePattern();
        this.consoleDesign = new ConsoleDesign();
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
        const getOption = (name) => options[name] || DEFAULT_OPTIONS[name];
        this.keyMapping.setOptions(options["keyMapping"]);
        this.hintPattern.setOptions(options["hintPattern"]);
        this.searchEngine.setOptions(options["searchEngine"] || {});
        this.consoleDesign.setOptions(getOption("consoleDesign"));
        this.pagePattern.setOptions(getOption("pagePattern"));
        this.miscellaneous.setOptions(
            Object.assign(
                DEFAULT_OPTIONS["miscellaneous"], options["miscellaneous"]));
        this.options = options;
    }
    saveOptions() {
        try {
            const options = {
                "keyMapping": this.keyMapping.getOptions(),
                "hintPattern": this.hintPattern.getOptions(),
                "searchEngine": this.searchEngine.getOptions(),
                "pagePattern": this.pagePattern.getOptions(),
                "consoleDesign": this.consoleDesign.getOptions(),
                "miscellaneous": this.miscellaneous.getOptions(),
            };
            if (this.options.hasOwnProperty("debug")) {
                options.debug = this.options.debug;
            }
            this.options = options;
            browser.storage.local.set({
                "options": this.options
            }).then(() => {
                Options.setErrorMessage("Saved options", 3000);
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
            Options.setErrorMessage("No file is specified", 3000);
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
    static setErrorMessage(message, timeout=0) {
        const timerId = Options.timerId || 0;
        if (timerId !== 0) {
            clearTimeout(timerId);
        }
        const error = document.getElementById("option-bar-error");
        error.innerText = message;
        if (timeout !== 0) {
            Options.timerId =
                setTimeout(() => { error.innerText = "" }, timeout);
        }
    }
}

const KEY_MAPPING_TYPES = ["normal", "insert", "visual", "hint", "console"];
class KeyMapping {
    constructor() {
        this.options = KEY_MAPPING_TYPES.reduce((options, mode) => {
            options[mode] = [];
            return options;
        }, {});
        this.currentMode = "normal";

        const tabs = document.querySelectorAll("#key-mapping-tabs li");
        setSelectTabListener(tabs, (tab) => {
            this._setMode(tab.getAttribute("mode"));
        });

        const button = document.getElementById("key-mapping-table-add-button");
        button.addEventListener("click", (e) => {
            this.options[this.currentMode].push(["", ""]);
            this._updateKeyMappingSection(true);
        });

        const input = document.getElementById("key-mapping-suspend-input");
        input.addEventListener("change", (e) => {
            this.options["suspend"] = e.target.value;
        });
    }
    getOptions() {
        const errorList = KeyMapping._getErrorList(this.options);
        if (errorList.length !== 0) {
            throw new Error("key mapping: " + errorList[0]);
        }
        return KEY_MAPPING_TYPES.reduce((options, mode) => {
            options[mode] = this.options[mode].reduce((mapping, [key, cmd]) => {
                key = key.trim();
                if (key) {
                    mapping[key] = cmd.trim();
                }
                return mapping;
            }, {});
            return options;
        }, { "suspend": this.options["suspend"] });
    }
    setOptions(keyMapping) {
        KEY_MAPPING_TYPES.forEach((mode) => {
            const mapping = keyMapping[mode] || {};
            this.options[mode] =
                Object.keys(mapping).map((key) => [key, mapping[key]]);
        });
        this.options["suspend"] =
            keyMapping["suspend"] || DEFAULT_OPTIONS["keyMapping"]["suspend"];
        this._setMode(this.currentMode);
        const input = document.getElementById("key-mapping-suspend-input");
        input.value = this.options["suspend"];
    }
    _setMode(mode) {
        this.currentMode = mode;
        this._updateDataList();
        this._updateKeyMappingSection();
    }
    _updateDataList() {
        const datalist =
            document.getElementById("key-mapping-table-command-list");
        const descriptions = KeyMapping._getDescriptions(this.currentMode);
        const fragment = document.createDocumentFragment();
        Object.keys(descriptions).forEach((cmd) => {
            const desc = descriptions[cmd];
            if (desc.mode && desc.mode !== this.currentMode) {
                return;
            }
            fragment.appendChild(
                new Option(`${cmd} -- ${desc.description}`, cmd));
        });
        datalist.innerHTML = "";
        datalist.appendChild(fragment);
    }
    _updateKeyMappingSection(scrollToBottom=false) {
        const modeKeyMapping = this.options[this.currentMode];
        const fragment = document.createDocumentFragment();
        const template = document.getElementById("key-mapping-table-template");
        modeKeyMapping.forEach(([key, command], index) => {
            const row = document.importNode(template.content, true);
            const inputs = row.firstElementChild.children;
            inputs[0].value = key;
            inputs[1].value = command;
            KeyMapping._setTitle(inputs[1], this.currentMode);
            this._setEventListener(inputs, index);
            fragment.appendChild(row);
        });
        const table = document.getElementById("key-mapping-table-contents");
        table.innerHTML = "";
        table.appendChild(fragment);
        if (scrollToBottom) {
            table.scrollTop = table.scrollTopMax;
        }
    }
    _setEventListener(inputs, index) {
        inputs[0].addEventListener("change", (e) => {
            this.options[this.currentMode][index][0] = e.target.value;
            this._checkMapping();
        });
        inputs[1].addEventListener("change", (e) => {
            this.options[this.currentMode][index][1] = e.target.value;
            KeyMapping._setTitle(e.target, this.currentMode);
            this._checkMapping();
        });
        inputs[2].addEventListener("click", (e) => {
            this.options[this.currentMode].splice(index, 1);
            this._updateKeyMappingSection();
            this._checkMapping();
        });
    }
    _checkMapping() {
        const error = document.getElementById("key-mapping-error");
        error.innerText = KeyMapping._getErrorList(this.options).join("\n");
    }
    static _getErrorList(options) {
        const KEY_PATTERN = /^(?:<(?:[ACMS]-)+\S[^>]*>|<\w+>|\\\S|[^\\\s])+$/;
        return KEY_MAPPING_TYPES.reduce((errorList, mode) => {
            try {
                const mapping = {};
                const descriptions = KeyMapping._getDescriptions(mode);
                options[mode].forEach(([key, cmd]) => {
                    key = key.trim();
                    cmd = cmd.trim();
                    if (key === "") {
                        if (cmd === "") {
                            return
                        }
                        throw new Error(`Key is not found for ${cmd}`);
                    }
                    if (!KEY_PATTERN.test(key)) {
                        throw new Error(`${key} is invalid key sequence`);
                    }
                    if (cmd === "") {
                        throw new Error(`Command is not found for ${key}`);
                    }
                    if (mapping[key]) {
                        throw new Error(
                            `${key} is already mapped to ${mapping[key]}`);
                    }
                    const desc = descriptions[cmd.split("|", 1)[0]];
                    if (!desc) {
                        throw new Error(`${cmd} is unknown`);
                    }
                    if (desc.mode && desc.mode !== mode) {
                        throw new Error(`${cmd} is used for only ${desc.mode} mode`);
                    }
                    mapping[key] = cmd;
                });
            }
            catch (e) {
                errorList.push(mode + ": " + e.message);
            }
            return errorList;
        }, []);
    }
    static _getDescriptions(mode) {
        switch (mode) {
            case "normal": case "insert": case "visual":
                return COMMAND_DESCRIPTIONS;
            case "hint":
                return HINT_COMMAND_DESCRIPTIONS;
            case "console":
                return CONSOLE_COMMAND_DESCRIPTIONS;
        }
    }
    static _setTitle(input, mode) {
        const descriptions = KeyMapping._getDescriptions(mode);
        const cmdDesc = descriptions[input.value.trim().split("|", 1)[0]];
        if (cmdDesc) {
            input.setAttribute("title", cmdDesc.description);
        }
        else {
            input.removeAttribute("title");
        }
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

class PagePattern {
    constructor() {
        this.options = { next: "", previous: "" };

        const inputList =
            Array.from(document.querySelectorAll(".page-pattern-regex"));
        inputList.forEach((input) => {
            input.addEventListener("change", (e) => {
                const id = e.target.id;
                const kind = id.substr(id.lastIndexOf("-") + 1);
                this._setPattern(kind, e.target.value);
            });
        });
    }
    getOptions() {
        const options = {};
        Object.keys(this.options).forEach((kind) => {
            try {
                new RegExp(this.options[kind]);
                options[kind] = this.options[kind];
            }
            catch (e) {
                throw new Error("page pattern: " + e.message);
            }
        });
        return options;
    }
    setOptions(pagePattern) {
        this.options = Object.assign({}, pagePattern);
        Object.keys(this.options).forEach((kind) => {
            const input = document.getElementById("page-pattern-" + kind);
            input.value = this.options[kind];
        });
        this._checkPattern();
    }
    _setPattern(kind, pattern) {
        this.options[kind] = pattern;
        this._checkPattern();
    }
    _checkPattern() {
        const errorMessageList = [];
        for (const kind of ["next", "previous"]) {
            try {
                if (this.options[kind] !== "") {
                    new RegExp(this.options[kind]);
                }
            }
            catch (error) {
                errorMessageList.push(kind + ": " + error.message);
            }
        }
        document.getElementById("page-pattern-error").innerText =
            errorMessageList.join("\n");
    }
}

const CONSOLE_DESIGN_ID_MAP = new Map([
    ["console-design-background-color", "backgroundColor"],
    ["console-design-background-opacity", "backgroundOpacity"],
    ["console-design-font-color", "fontColor"],
    ["console-design-font-size", "fontSize"],
    ["console-design-information-color", "informationColor"],
    ["console-design-selected-background-color", "selectedBackgroundColor"],
    ["console-design-selected-font-color", "selectedFontColor"],
    ["console-design-selected-information-color", "selectedInformationColor"],
    ["console-design-border-color", "borderColor"],
]);
class ConsoleDesign {
    constructor() {
        this.options = {};
        CONSOLE_DESIGN_ID_MAP.forEach((key, id) => {
            const elem = document.getElementById(id);
            const type = (key === "fontSize" ? "change" : "input");
            elem.addEventListener(type, (e) => {
                if (key === "fontColor" && !e.target.checkValidity()) {
                    return;
                }
                this.options[key] = e.target.value;
                this._updateDesign();
            });
        });
    }
    getOptions() {
        const options = Object.assign({}, this.options);
        options["backgroundColor"] = this._getRGBABackgroundColor();
        delete options["backgroundOpacity"];
        return options;
    }
    setOptions(consoleDesign) {
        this.options = Object.assign({}, consoleDesign);
        const [bgColor, bgOpacity] =
            ConsoleDesign._fromRGBA(consoleDesign["backgroundColor"]);
        this.options["backgroundColor"] = bgColor;
        this.options["backgroundOpacity"] = bgOpacity;
        CONSOLE_DESIGN_ID_MAP.forEach((key, id) => {
            const elem = document.getElementById(id);
            elem.value = this.options[key];
        });
        this._updateDesign();
    }
    _updateDesign() {
        const div = document.getElementById("console-design");
        div.style = String.raw`
        background-color: ${this._getRGBABackgroundColor()};
        color: ${this.options["fontColor"]};
        font-size: ${this.options["fontSize"]};
        border-top: 1px solid ${this.options["borderColor"]};
        `;

        const info = document.getElementById("console-design-information");
        info.style = `color: ${this.options["informationColor"]};`;

        const selected = document.getElementById("console-design-selected");
        selected.style = String.raw`
        background-color: ${this.options["selectedBackgroundColor"]};
        color: ${this.options["selectedFontColor"]};
        `;
        const selectedInfo =
            document.getElementById("console-design-selected-information");
        selectedInfo.style =
            `color: ${this.options["selectedInformationColor"]};`;
    }
    _getRGBABackgroundColor() {
        const color = this.options["backgroundColor"];
        const opacity = this.options["backgroundOpacity"];
        const r = parseInt(color.substring(1, 3), 16);
        const g = parseInt(color.substring(3, 5), 16);
        const b = parseInt(color.substring(5, 7), 16);
        return `rgba(${r}, ${g}, ${b}, ${opacity})`;
    }
    static _fromRGBA(rgbaColor) {
        const pattern = /^rgba\((\d+),\s*(\d+),\s*(\d+),\s(\d+(?:.\d+)?)\)$/;
        const match = pattern.exec(rgbaColor);
        const rgbList = [];
        for (let i = 1; i < 4; ++i) {
            rgbList.push(parseInt(match[i], 10).toString(16).padStart(2, 0));
        }
        return ["#" + rgbList.join(""), parseFloat(match[4])];
    }
}

const MISCELLANEOUS_ID_MAP = {
    "miscellaneous-auto-focus": "autoFocus",
    "miscellaneous-overlap-hint-labels": "overlapHintLabels",
    "miscellaneous-auto-kill-hover": "autoKillHover",
    "miscellaneous-kill-only-visibility-hover": "onlyVisibility",
    "miscellaneous-highlight-search": "highlightSearch",
    "miscellaneous-overwrite-error-page": "overwriteErrorPage",
    "miscellaneous-activate-new-tab": "activateNewTab",
    "miscellaneous-console-autocomplete": "consoleAutocomplete",
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

