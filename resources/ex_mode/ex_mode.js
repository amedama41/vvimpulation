function createCandidateList(candidates, type) {
    const margin = document.createTextNode(" ");
    if (type === 0) {
        return candidates.reduce((fragment, data) => {
            const li = document.createElement("li");
            const span = document.createElement("span");
            span.textContent = data;
            li.appendChild(margin.cloneNode(true));
            li.appendChild(span);
            fragment.appendChild(li);
            return fragment;
        }, document.createDocumentFragment());
    }
    else {
        const sep = document.createElement("span");
        sep.textContent = ":";
        const dataNode = document.createElement("span");
        dataNode.className = (type === 1 ? "ex_string_data" : "ex_number_data");
        const infoNode = document.createElement("span");
        infoNode.className = (type === 1 ? "ex_string_info" : "ex_number_info");
        return candidates.reduce((fragment, [data, info]) => {
            const li = document.createElement("li");
            const span1 = dataNode.cloneNode(false);
            span1.textContent = data;
            const span2 = infoNode.cloneNode(false);
            span2.textContent = info;
            li.appendChild(margin.cloneNode(true));
            li.appendChild(span1);
            li.appendChild(sep.cloneNode(true));
            li.appendChild(span2);
            fragment.appendChild(li);
            return fragment;
        }, document.createDocumentFragment());
    }
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
        let [orgValue, candidateStart, type, candidates] = candidateInfo;
        this.candidateInfo = candidateInfo;
        this.update(orgValue);
    }
    update(value) {
        if (!this.candidateInfo) {
            return;
        }
        if (this.candidates.length !== 0 && this.candidates[0] === value) {
            return;
        }
        if (this.candidates[this.selectIndex] === value) {
            return;
        }
        let [orgValue, candidateStart, type, candidates] = this.candidateInfo;
        this.container.innerHTML = "";
        if (value.startsWith(orgValue)) {
            const keywords = value.substr(candidateStart).split(/\s+/);
            const filter = (type === 0 ?
                (c) => keywords.every((k) => c.includes(k)) :
                ([d, i]) => keywords.every((k) =>
                    d.toString().includes(k) || i.includes(k)));
            const matchCandidates = candidates.filter(filter);
            this.container.appendChild(
                createCandidateList(matchCandidates, type));
            const prefix = orgValue.substr(0, candidateStart);
            this.candidates =
                [ value ].concat(matchCandidates.map((c) => {
                    return type === 0 ? prefix + c : prefix + c[0];
                }));
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
    selectPrev(input) {
        this._selectCandidate(input, -1);
    }
    _selectCandidate(input, diff) {
        if (!this.candidateInfo) {
            return this.selectIndex;
        }
        let [orgValue, candidateStart, type, candidates] = this.candidateInfo;

        const SELECT_CLASS = "ex_select_candidate";
        if (this.selectIndex !== 0) {
            this.container.children[this.selectIndex - 1].classList.remove(
                SELECT_CLASS);
        }
        const length = this.candidates.length;
        this.selectIndex = (this.selectIndex + diff + length) % length;
        const selectItem = this.candidates[this.selectIndex];
        const data = (Array.isArray(selectItem) ? selectItem[0] : selectItem);

        const start = input.selectionStart;
        if (input.selectionEnd !== start) {
            input.selectionEnd = start;
        }
        input.setRangeText(data, 0, start, "end");
        if (this.selectIndex !== 0) {
            const li = this.container.children[this.selectIndex - 1];
            li.classList.add(SELECT_CLASS);
            li.scrollIntoView(diff === -1);
        }
    }
}

class History {
    constructor(key) {
        this.history = undefined;
        this.index = 0;
        this.candidateHistory = undefined;
        History.load(key).then((result) => {
            this.history = result[key];
        });
    }
    reset() {
        this.candidateHistory = undefined;
        this.index = 0;
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
    static load(key) {
        const param = { [key]: [] };
        return browser.storage.local.get(param);
    }
    static save(key, cmd) {
        History.load(key).then((result) => {
            const history = result[key];
            if (history.length > 0 && history[0] === cmd) {
                // Not save the same command as previous.
                return;
            }
            history.length = Math.min(history.length + 1, 100);
            history.copyWithin(1, 0, history.length);
            history[0] = cmd;
            browser.storage.local.set(result);
        }).catch ((error) => {
            console.error("failed to save history:", key, cmd);
        });
    }
};

function search(keyword, backward, mode) {
    mode.sendMessage({
        command: "find", keyword: keyword, backward: backward
    }).then((result) => {
        if (result && !browser.extension.inIncognitoContext) {
            History.save("search_history", keyword);
        }
        ConsoleCommand.closeConsoleMode(mode);
    }).catch((error) => {
        console.error(error.toString());
        ConsoleCommand.closeConsoleMode(mode);
    });
}

class ConsoleCommand {
    static closeConsoleMode(mode) {
        mode.stopConsole();
    }

    static execSearch(mode) {
        const value = mode.getTarget().value;
        if (value === "") {
            ConsoleCommand.closeConsoleMode(mode);
            return;
        }
        search(value, mode.isBackward(), mode);
    }

    static execCommand(mode) {
        const value = mode.getTarget().value;
        if (value === "") {
            ConsoleCommand.closeConsoleMode(mode);
            return;
        }
        const prefix = value.charAt(0);
        if (prefix === "/" || prefix === "?") {
            search(value.substr(1), prefix === '?', mode);
            return;
        }

        mode.sendMessage({ command: "execCommand", cmd: value })
            .then((result) => {
                if (result === false) {
                    ConsoleCommand.closeConsoleMode(mode);
                    return;
                }
                if (!browser.extension.inIncognitoContext) { // TODO
                    History.save("command_history", value);
                }
                if (result === true) {
                    ConsoleCommand.closeConsoleMode(mode);
                    return;
                }
                const output = document.querySelector("#ex_output");
                output.value =
                    (Array.isArray(result) ? result.join("\n") : result);
            })
            .catch((error) => {
                const output = document.querySelector("#ex_output");
                output.value = error;
            });
    }

    static selectNextHistory(mode) {
        mode.selectNextHistory();
    }

    static selectPreviousHistory(mode) {
        mode.selectPreviousHistory();
    }

    static getCandidate(mode) {
        mode.getCandidate();
    }
    static selectNextHistoryOrCandidate(mode) {
        if (mode.hasCandidates()) {
            mode.selectNextCandidate();
        }
        else {
            ConsoleCommand.selectNextHistory(mode);
        }
    }
    static selectPreviousHistoryOrCandidate(mode) {
        if (mode.hasCandidates()) {
            mode.selectPreviousCandidate();
        }
        else {
            ConsoleCommand.selectPreviousHistory(mode);
        }
    }
    static clearAllHistory() {
        browser.storage.local.remove("command_history");
    }

    static deleteCharBackward(mode) {
        if (!DomUtils.deleteCharBackward(mode.getTarget())) {
            ConsoleCommand.closeConsoleMode(mode);
        }
    }
    static deleteWordBackward(mode) {
        DomUtils.deleteWordBackward(mode.getTarget());
    }
    static deleteToBeggingOfLine(mode) {
        DomUtils.deleteToBeggingOfLine(mode.getTarget());
    }
    static deleteToEndOfLine(mode) {
        DomUtils.deleteToEndOfLine(mode.getTarget());
    }
}

const EX_CMD_MAP = Utils.toPreparedCmdMap({
    "<Enter>": "execCommand",
    "<C-M>": "execCommand",
    "<C-H>": "deleteCharBackward",
    "<C-W>": "deleteWordBackward",
    "<C-U>": "deleteToBeggingOfLine",
    "<C-K>": "deleteToEndOfLine",
    "<C-I>": "getCandidate",
    "<Tab>": "getCandidate",
    "<C-N>": "selectNextHistoryOrCandidate",
    "<C-P>": "selectPreviousHistoryOrCandidate",
    "<C-X><C-D>": "clearAllHistory",
    "<C-C>": "closeConsoleMode",
});
const SEARCH_CMD_MAP = Utils.toPreparedCmdMap({
    "<Enter>": "execSearch",
    "<C-M>": "execSearch",
    "<C-H>": "deleteCharBackward",
    "<C-W>": "deleteWordBackward",
    "<C-U>": "deleteToBeggingOfLine",
    "<C-K>": "deleteToEndOfLine",
    "<C-N>": "selectNextHistory",
    "<C-P>": "selectPreviousHistory",
    "<C-X><C-D>": "clearAllHistory",
    "<C-C>": "closeConsoleMode",
});
class ConsoleMode {
    constructor(port, input, container) {
        this._isOpened = false;
        this.port = port;
        this.input = input;
        this.prompt = document.getElementById("ex_prompt");
        this.completer = new Completer(container);
        this.history = undefined;
        this.mapper = undefined;
    }
    setOptions(options) {
        this.prompt.textContent = options.prompt;
        this.input.value = options.defaultCommand;
        const isSearch = this.isSearch();
        this.history =
            new History(isSearch ? "search_history" : "command_history");
        this.mapper =
            Utils.makeCommandMapper(isSearch ? SEARCH_CMD_MAP : EX_CMD_MAP);
    }
    startConsole(options) {
        this._isOpened = true;
        this.completer.setMaxHeight(window.innerHeight - 100);
        this.input.focus();
    }
    stopConsole() {
        this._isOpened = false;
        this.input.value = "";
        const output = document.querySelector("#ex_output");
        output.value = "";
        this.completer.reset();
        this.sendMessage({ command: "toNormalMode" });
    }
    sendMessage(msg) {
        return this.port.sendMessage(msg);
    }
    get isOpened() {
        return this._isOpened;
    }
    handle(key) {
        const [consumed, optCmd, cmd] = this.mapper.get(key);
        const result = (cmd ? !ConsoleCommand[cmd](this) : consumed);
        if (!result) {
            this.history.reset();
        }
        return result;
    }
    getTarget() {
        return this.input;
    }
    isBackward() {
        return this.prompt.textContent === '?';
    }
    isSearch() {
        return this.prompt.textContent !== ":";
    }
    hasCandidates() {
        return this.completer.hasCandidates();
    }
    getCandidate() {
        const target = this.getTarget();
        this.sendMessage({
            command: "getCandidate",
            value: target.value.substring(0, target.selectionStart)
        }).then((result) => {
            if (!result) {
                return;
            }
            this.completer.setCandidates(result);
            this.selectNextCandidate();
        });
    }
    updateCandidateList() {
        if (!this.isSearch()) {
            this.completer.update(this.input.value);
        }
    }
    selectNextCandidate() {
        this.completer.selectNext(this.getTarget());
    }
    selectPreviousCandidate() {
        this.completer.selectPrev(this.getTarget());
    }
    selectNextHistory() {
        this.history.setNext(this.getTarget());
    }
    selectPreviousHistory() {
        this.history.setPrevious(this.getTarget());
    }
}

window.addEventListener("DOMContentLoaded", (e) => {
    const port = new Port(browser.runtime.connect({ name: "console" }));
    const input = document.getElementById("ex_input");
    const container = document.getElementById("ex_candidates");
    const mode = new ConsoleMode(port, input, container);

    port.onRequest.addListener((msg) => {
        switch (msg.command) {
            case "setConsoleOptions":
                mode.setOptions(msg.options);
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

        // console.debug(e.type, key, e.defaultPrevented);
        if (key.endsWith("Esc>") || key === "<C-[>") {
            ConsoleCommand.closeConsoleMode(mode);
        };
        if (mode.handle(key)) {
            e.stopPropagation();
            e.preventDefault();
        }
    });
    input.addEventListener("keyup", (e) => {
        mode.updateCandidateList();
    }, true);

    window.addEventListener("focus", (e) => {
        if (mode.isOpened) {
            return;
        }
        mode.startConsole();
    });
    // input.addEventListener("blur", (e) => closeConsoleMode());
}, { capture: true, once: true });

