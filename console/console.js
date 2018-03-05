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
        this.isFixed = false;
    }
    setMaxHeight(maxHeight) {
        this.container.style.maxHeight = maxHeight + "px";
    }
    reset() {
        this.candidates = [];
        this.selectIndex = undefined;
        this.candidateInfo = undefined;
        this.container.innerHTML = "";
        this.isFixed = true;
    }
    setCandidates(candidateInfo, isFixed=false) {
        this.candidates = [];
        let [orgValue, candidateStart, index, candidates] = candidateInfo;
        this.candidateInfo = candidateInfo;
        this.isFixed = isFixed;
        this.update(orgValue, false);
    }
    isSelected(value) {
        if (!this.candidateInfo) {
            return false;
        }
        if (this.candidates.length !== 0 && this.candidates[0] === value) {
            return true;
        }
        if (this.candidates[this.selectIndex] === value) {
            return true;
        }
        return false;
    }
    update(value, needFilter) {
        if (!this.candidateInfo || this.isSelected(value)) {
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
        return this._selectCandidate(input, 1);
    }
    selectPrevious(input) {
        return this._selectCandidate(input, -1);
    }
    _selectCandidate(input, diff) {
        if (!this.candidateInfo) {
            return false;
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
        return true;
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
        mode.getCandidate();
    }
    static showHistoryList(mode) {
        const history = mode.history;
        if (history) {
            const target = mode.getTarget();
            const completer = mode.completer;
            completer.setCandidates(history.getCandidates(target.value), true);
        }
    }
    static selectNextHistoryOrCandidate(mode) {
        if (!mode.selectNextCandidate()) {
            ConsoleCommand.selectNextHistory(mode);
        }
    }
    static selectPreviousHistoryOrCandidate(mode) {
        if (!mode.selectPreviousCandidate()) {
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
        this._completer = new Completer(container);
        this._mapper = keyMapping;

        this.onInit(options);
    }
    startConsole(options) {
        this._isOpened = true;
        this._completer.setMaxHeight(window.innerHeight - 100);
        this._input.focus();
    }
    stopConsole(value=null) {
        this._isOpened = false;
        this._completer.reset();
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
        if (!this.onKeyup(this._input)) {
            this._completer.update(this._input.value, true);
        }
    }
    getTarget() {
        return this._input;
    }
    getCandidate() {
        this.onComplete(this._input).then((result) => {
            if (result) {
                this._completer.setCandidates(result);
                this._completer.selectNext(this._input);
            }
        });
    }
    selectNextCandidate() {
        return this._completer.selectNext(this._input);
    }
    selectPreviousCandidate() {
        return this._completer.selectPrevious(this._input);
    }
    get completer() {
        return this._completer;
    }
}
class ExMode extends ConsoleMode {
    onInit(options) {
        this._history = new History("command_history");
        this._autoComplete = options.autocomplete;
        this._prevValue = null;
    }
    onKeyup(input) {
        const value = input.value;
        const prevValue = this._prevValue;
        this._prevValue = value;

        this._history.reset(value);
        const completer = super.completer;
        if (this._autoComplete &&
            !completer.isFixed && !completer.isSelected(value) &&
            value !== prevValue) {
            this.onComplete(input).then((result) => {
                if (result) {
                    completer.setCandidates(result);
                }
            });
            return true;
        }
    }
    onComplete(input) {
        return super.sendMessage({
            command: "getCandidate",
            value: input.value.substring(0, input.selectionStart)
        });
    }
    get history() {
        return this._history;
    }
}
class SearchMode extends ConsoleMode {
    onInit(options) {
        this._history = new History("search_history");
    }
    onKeyup(input) {
        this._history.reset(input.value);
    }
    onComplete(input) {
        return Promise.resolve();
    }
    get history() {
        return this._history;
    }
}
class HintFilterMode extends ConsoleMode {
    onInit(options) {
        this._prevFilter = options.defaultInput;
    }
    onKeyup(input) {
        const filter = input.value;
        if (filter !== this._prevFilter) {
            super.sendMessage({ command: 'applyFilter', filter });
            this._prevFilter = filter;
        }
    }
    onComplete(input) {
        return Promise.resolve();
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
    let autocomplete = false;

    port.onRequest.addListener((msg) => {
        switch (msg.command) {
            case "setConsoleOptions":
                keyMapping = Utils.makeCommandMapper(
                    Utils.toPreparedCmdMap(msg.options.keyMapping));
                autocomplete = msg.options.autocomplete;
                return true;
            case "setConsoleMode":
                msg.options.autocomplete = autocomplete;
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

