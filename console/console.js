'use strict';

function createCandidateList(candidates) {
    const template = document.getElementById("candidate_template");
    const fields = template.content.children[0].children;
    return candidates.reduce((fragment, [icon, id, data, info], index) => {
        fields[0].style = `background-image: url(${icon || ""})`;
        fields[1].textContent = (id !== null ? id : index);
        fields[2].textContent = data;
        fields[3].textContent = (info ? ":" : "");
        fields[4].textContent = info;
        fragment.appendChild(document.importNode(template.content, true));
        return fragment;
    }, document.createDocumentFragment());
}
class Completer {
    constructor(container) {
        this.container = container;
        this.candidates = [];
        this.selectIndex = undefined;
        this.candidateInfo = undefined;
    }
    setMaxHeight(maxHeight) {
        this.container.style.maxHeight = maxHeight + "px";
    }
    reset() {
        this.candidates = [];
        this.selectIndex = undefined;
        this.candidateInfo = undefined;
        this.container.innerHTML = "";
    }
    hasCandidates() {
        return this.candidates.length !== 0;
    }
    setCandidates(candidateInfo) {
        this.candidates = [];
        let [orgValue, candidateStart, index, candidates] = candidateInfo;
        this.candidateInfo = candidateInfo;
        this.update(orgValue, false);
    }
    update(value, needFilter) {
        if (!this.candidateInfo) {
            return;
        }
        if (this.candidates.length !== 0 && this.candidates[0] === value) {
            return;
        }
        if (this.candidates[this.selectIndex] === value) {
            return;
        }
        let [orgValue, candidateStart, index, candidates] = this.candidateInfo;
        this.container.innerHTML = "";
        if (value.startsWith(orgValue)) {
            const matchCandidates = (needFilter
                ? Completer._filter(candidates, value.substr(candidateStart))
                : candidates);
            this.container.appendChild(createCandidateList(matchCandidates));
            const prefix = orgValue.substr(0, candidateStart);
            this.candidates =
                [ value ].concat(matchCandidates.map((c) => prefix + c[index]));
            this.selectIndex = 0;
        }
        else {
            this.candidates = [];
            this.selectIndex = undefined;
            this.candidateInfo = undefined;
        }
    }
    selectNext(input) {
        this._selectCandidate(input, 1);
    }
    selectPrevious(input) {
        this._selectCandidate(input, -1);
    }
    _selectCandidate(input, diff) {
        if (!this.candidateInfo) {
            return;
        }
        let [orgValue, candidateStart, index, candidates] = this.candidateInfo;

        const SELECT_CLASS = "ex_select_candidate";
        if (this.selectIndex !== 0) {
            this.container.children[this.selectIndex - 1].classList.remove(
                SELECT_CLASS);
        }
        const length = this.candidates.length;
        this.selectIndex = (this.selectIndex + diff + length) % length;
        const data = this.candidates[this.selectIndex];

        const start = input.selectionStart;
        if (input.selectionEnd !== start) {
            input.selectionEnd = start;
        }
        input.setRangeText(data, 0, start, "end");
        if (this.selectIndex !== 0) {
            const li = this.container.children[this.selectIndex - 1];
            li.classList.add(SELECT_CLASS);
            Completer._scrollIntoView(li, this.container, diff);
        }
    }
    static _scrollIntoView(item, container, diff) {
        const itemRect = item.getBoundingClientRect();
        const containerRect = container.getBoundingClientRect();
        if (itemRect.top < containerRect.top) {
            container.scrollBy(0, itemRect.top - containerRect.top);
        }
        if (itemRect.bottom > containerRect.bottom) {
            container.scrollBy(0, itemRect.bottom - containerRect.bottom);
        }
    }
    static _filter(candidates, value) {
        const filter = Utils.makeFilter(value);
        return candidates.filter(
            (item) => filter.match(item[2]) || filter.match(item[3]));
    }
}

class History {
    constructor(key) {
        this.key = key;
        this.history = undefined;
        this.index = 0;
        this.candidateHistory = undefined;
        History.load(key).then((result) => {
            this.history = result[key];
        });
    }
    reset(value) {
        if (this.candidateHistory === undefined) {
            return;
        }
        if (value === this.candidateHistory[this.index]) {
            return;
        }
        this.candidateHistory = undefined;
        this.index = 0;
    }
    remove(value) {
        this.history = this.history.filter((item) => item !== value);
        browser.storage.local.set({ [this.key]: this.history });
        this.index = 0;
        this.candidateHistory = undefined;
    }
    removeAll() {
        browser.storage.local.remove(this.key);
        this.history = [];
        this.index = 0;
        this.candidateHistory = undefined;
    }
    select(input, diff) {
        if (this.candidateHistory === undefined) {
            const value = input.value;
            this.candidateHistory = this.history.filter(
                (item) => item.startsWith(value));
            this.candidateHistory.unshift(value);
        }
        const index = this.index + diff;
        if (!(0 <= index && index < this.candidateHistory.length)) {
            return;
        }
        input.value = this.candidateHistory[index];
        input.selectionStart = input.selectionEnd = input.value.length;
        this.index = index;
    }
    setNext(input) {
        this.select(input, -1);
    }
    setPrevious(input) {
        this.select(input, 1);
    }
    getCandidates(value) {
        const candidates = [];
        const checkMap = {};
        this.history.forEach((item) => {
            if (item.startsWith(value) && !checkMap[item]) {
                candidates.push([null, null, item, ""]);
                checkMap[item] = true;
            }
        });
        return [value, 0, 2, candidates];
    }
    static load(key) {
        const param = { [key]: [] };
        return browser.storage.local.get(param);
    }
};

class ConsoleCommand {
    static closeConsoleMode(mode) {
        mode.stopConsole();
    }
    static execute(mode) {
        mode.execute();
    }

    static selectNextHistory(mode) {
        const history = mode.history;
        if (history) {
            history.setNext(mode.getTarget());
        }
    }
    static selectPreviousHistory(mode) {
        const history = mode.history;
        if (history) {
            history.setPrevious(mode.getTarget());
        }
    }
    static removeFromHistory(mode) {
        const history = mode.history;
        if (history) {
            history.remove(mode.getTarget().value);
        }
    }
    static removeAllHistory(mode) {
        const history = mode.history;
        if (history) {
            history.removeAll();
        }
    }

    static getCandidate(mode) {
        const completer = mode.completer;
        if (completer) {
            const target = mode.getTarget();
            mode.sendMessage({
                command: "getCandidate",
                value: target.value.substring(0, target.selectionStart)
            }).then((result) => {
                if (!result) {
                    return;
                }
                completer.setCandidates(result);
                completer.selectNext(target);
            });
        }
    }
    static showHistoryList(mode) {
        const history = mode.history;
        const completer = mode.completer;
        if (history && completer) {
            const target = mode.getTarget();
            completer.setCandidates(history.getCandidates(target.value));
        }
    }
    static selectNextHistoryOrCandidate(mode) {
        const completer = mode.completer;
        if (completer && completer.hasCandidates()) {
            completer.selectNext(mode.getTarget());
        }
        else {
            ConsoleCommand.selectNextHistory(mode);
        }
    }
    static selectPreviousHistoryOrCandidate(mode) {
        const completer = mode.completer;
        if (completer && completer.hasCandidates()) {
            completer.selectPrevious(mode.getTarget());
        }
        else {
            ConsoleCommand.selectPreviousHistory(mode);
        }
    }

    static deleteCharBackward(mode) {
        if (!DomUtils.deleteCharBackward(mode.getTarget())) {
            mode.stopConsole();
        }
    }
    static deleteWordBackward(mode) {
        DomUtils.deleteWordBackward(mode.getTarget());
    }
    static deleteToBeginningOfLine(mode) {
        DomUtils.deleteToBeginningOfLine(mode.getTarget());
    }
    static deleteToEndOfLine(mode) {
        DomUtils.deleteToEndOfLine(mode.getTarget());
    }
    static charNext(mode) {
        DomUtils.charNext(mode.getTarget());
    }
    static charPrevious(mode) {
        DomUtils.charPrevious(mode.getTarget());
    }
    static beginLine(mode) {
        DomUtils.beginLine(mode.getTarget());
    }
    static endLine(mode) {
        DomUtils.endLine(mode.getTarget());
    }
}

class ConsoleMode {
    constructor(options, port, input, container, keyMapping) {
        this._isOpened = false;
        this._port = port;
        this._input = input;
        this._input.parentNode.setAttribute("mode", options.mode);
        this._input.value = options.defaultInput;
        this._mapper = keyMapping;

        this.onInit(container, options);
    }
    startConsole(options) {
        this._isOpened = true;
        this.onStart();
        this._input.focus();
    }
    stopConsole(value=null) {
        this._isOpened = false;
        this.onStop();
        this._input.value = "";
        this.sendMessage({ command: "hideConsole", value });
    }
    execute() {
        this.stopConsole(this._input.value);
    }
    sendMessage(msg) {
        return this._port.sendMessage(msg);
    }
    get isOpened() {
        return this._isOpened;
    }
    handleKeydown(key) {
        const [consumed, optCmd, cmd, dropKeyList] = this._mapper.get(key);
        return (cmd ? !ConsoleCommand[cmd](this) : consumed);
    }
    handleKeyup() {
        return this.onKeyup(this._input);
    }
    getTarget() {
        return this._input;
    }
}
class ExMode extends ConsoleMode {
    onInit(container, options) {
        this._completer = new Completer(container);
        this._history = new History("command_history");
    }
    onStart() {
        this._completer.setMaxHeight(window.innerHeight - 100);
    }
    onStop() {
        this._completer.reset();
    }
    onKeyup(input) {
        this._history.reset(input.value);
        this._completer.update(input.value, true);
    }

    get history() {
        return this._history;
    }
    get completer() {
        return this._completer;
    }
}
class SearchMode extends ConsoleMode {
    onInit(container, options) {
        this._history = new History("search_history");
    }
    onStart() {
    }
    onStop() {
    }
    onKeyup(input) {
        this._history.reset(input.value);
    }
    get history() {
        return this._history;
    }
}
class HintFilterMode extends ConsoleMode {
    onInit(container, options) {
        this._prevFilter = options.defaultInput;
    }
    onStart() {
    }
    onStop() {
    }
    onKeyup(input) {
        const filter = input.value;
        if (filter !== this._prevFilter) {
            super.sendMessage({ command: 'applyFilter', filter });
            this._prevFilter = filter;
        }
    }
}

function createConsoleMode(options, port, input, container, keyMapping) {
    switch (options.mode) {
        case "exec":
            return new ExMode(options, port, input, container, keyMapping);
        case "forwardSearch":
        case "backwardSearch":
            return new SearchMode(options, port, input, container, keyMapping);
        case "hintFilter":
            return new HintFilterMode(
                options, port, input, container, keyMapping);
        default:
            throw new Error("Unknown mode: " + options.mode);
    }
}

function setMessage(output, message) {
    if (!Array.isArray(message)) {
        output.innerText = message;
        return;
    }
    const table = document.createElement("table");
    table.style.setProperty("border-spacing", "8px 2px");
    message.forEach((row) => {
        const tr = document.createElement("tr");
        row.forEach((column) => {
            const td = document.createElement("td");
            td.innerText = column;
            tr.appendChild(td);
        });
        table.appendChild(tr);
    });
    output.innerHTML = ""
    output.appendChild(table);
}

window.addEventListener("DOMContentLoaded", (e) => {
    const port = new Port(browser.runtime.connect({ name: "console" }));
    const input = document.getElementById("ex_input");
    const output = document.getElementById("ex_message");
    const container = document.getElementById("ex_candidates");
    let mode = undefined;
    let keyMapping = undefined;

    port.onRequest.addListener((msg) => {
        switch (msg.command) {
            case "setKeyMapping":
                keyMapping = Utils.makeCommandMapper(
                    Utils.toPreparedCmdMap(msg.keyMapping));
                return true;
            case "setConsoleMode":
                mode = createConsoleMode(
                    msg.options, port, input, container, keyMapping);
                return true;
            case "setMessage":
                setMessage(output, msg.message);
                output.parentNode.setAttribute("mode", "showMessage");
                return true;
            default:
                console.warn("Unknown command: ", msg.command);
                return false;
        }
    });
    input.addEventListener("keydown", (e) => {
        const key = Utils.getRegulatedKey(e);
        if (!key) {
            return;
        }

        if (mode.handleKeydown(key)) {
            e.stopPropagation();
            e.preventDefault();
        }
    });
    input.addEventListener("keyup", (e) => {
        mode.handleKeyup();
    }, true);

    window.addEventListener("focus", (e) => {
        if (mode.isOpened) {
            return;
        }
        mode.startConsole();
    });
    input.addEventListener("blur", (e) => {
        if (document.activeElement === input) { // If other window is focused
            return;
        }
        if (mode.isOpened) {
            mode.stopConsole()
        }
    });
}, { capture: true, once: true });

