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
        const param = {};
        param[key] = [];
        return browser.storage.local.get(param);
    }
    static save(key, cmd) {
        History.load(key).then((result) => {
            const history = result[key];
            history.length = Math.min(history.length + 1, 100);
            history.copyWithin(1, 0, history.length);
            history[0] = cmd;
            browser.storage.local.set(result);
        }).catch ((error) => {
            console.error("failed to save history:", key, cmd);
        });
    }
};

function search(keyword, backward) {
    browser.runtime.sendMessage({
        command: "find", keyword: keyword, backward: backward
    }).then((result) => {
        if (result) {
            History.save("search_history", keyword);
        }
        ConsoleCommand.closeConsoleMode();
    }).catch((error) => {
        console.error(error.toString());
        ConsoleCommand.closeConsoleMode();
    });
}

class ConsoleCommand {
    static closeConsoleMode() {
        browser.runtime.sendMessage({ command: "toNormalMode" });
    }

    static execSearch(mode) {
        const value = mode.getTarget().value;
        if (value === "") {
            ConsoleCommand.closeConsoleMode();
            return;
        }
        search(value, mode.isBackward());
    }

    static execCommand(mode) {
        const value = mode.getTarget().value;
        if (value === "") {
            ConsoleCommand.closeConsoleMode();
            return;
        }
        const prefix = value.charAt(0);
        if (prefix === "/" || prefix === "?") {
            search(value.substr(1), prefix === '?');
            return;
        }

        browser.runtime.sendMessage({ command: "execCommand", cmd: value })
            .then(([result, incognito]) => {
                if (result === false) {
                    ConsoleCommand.closeConsoleMode();
                    return;
                }
                if (!incognito) { // TODO
                    History.save("command_history", value);
                }
                if (result === true) {
                    ConsoleCommand.closeConsoleMode();
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
            ConsoleCommand.closeConsoleMode();
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
    constructor(options) {
        const prompt = document.getElementById("ex_prompt");
        prompt.textContent = options.prompt;
        this.prompt = options.prompt;

        this.input = document.getElementById("ex_input");
        this.input.value = options.defaultCommand;
        this.previousValue = this.input.value;

        const container = document.getElementById("ex_candidates");
        container.style.maxHeight = (window.innerHeight - 100) + "px";
        this.completer = new Completer(container);

        const isSearch = this.isSearch();
        this.history =
            new History(isSearch ? "search_history" : "command_history");
        this.mapper =
            Utils.makeCommandMapper(isSearch ? SEARCH_CMD_MAP : EX_CMD_MAP);
    }
    handle(key) {
        const [consumed, optCmd, cmd] = this.mapper.get(key);
        this.previousValue = this.input.value;
        const result = (cmd ? !ConsoleCommand[cmd](this) : consumed);
        if (!result) {
            this.history.reset();
        }
        return result;
    }
    getTarget() {
        return this.input;
    }
    isSearch() {
        return this.prompt !== ':';
    }
    isBackward() {
        return this.prompt === '?';
    }
    hasCandidates() {
        return this.completer.hasCandidates();
    }
    getCandidate() {
        const target = this.getTarget();
        browser.runtime.sendMessage({
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
        if (this.previousValue !== this.input.value) {
            this.completer.update(this.input.value);
        }
    }
    selectNextCandidate() {
        this.completer.selectNext(this.getTarget());
        this.previousValue = this.input.value;
    }
    selectPreviousCandidate() {
        this.completer.selectPrev(this.getTarget());
        this.previousValue = this.input.value;
    }
    selectNextHistory() {
        this.history.setNext(this.getTarget());
        this.previousValue = this.input.value;
    }
    selectPreviousHistory() {
        this.history.setPrevious(this.getTarget());
        this.previousValue = this.input.value;
    }
}
window.addEventListener("DOMContentLoaded", () => {
    browser.runtime.sendMessage({ command: 'showConsole' }).then((options) => {
        const mode = new ConsoleMode(options);
        const input = mode.getTarget();
        input.addEventListener("keydown", (e) => {
            const key = Utils.getRegulatedKey(e);
            if (!key) {
                return;
            }

            // console.debug(e.type, key, e.defaultPrevented);
            if (key.endsWith("Esc>") || key === "<C-[>") {
                ConsoleCommand.closeConsoleMode();
            };
            if (mode.handle(key)) {
                e.stopPropagation();
                e.preventDefault();
            }
        });
        if (!mode.isSearch()) {
            input.addEventListener("keyup", (e) => {
                mode.updateCandidateList();
            }, true);
        }

        input.focus();
    }).catch((error) => {
        console.error(error);
        ConsoleCommand.closeConsoleMode();
    });
    // input.addEventListener("blur", (e) => closeConsoleMode());
}, { capture: true, once: true });

