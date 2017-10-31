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
        let [orgValue, candidateStart, type, candidates] = candidateInfo;
        this.candidateInfo = candidateInfo;
        this.changeCandidates(orgValue);
    }
    changeCandidates(value) {
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
        }
    }
    resetCandidates() {
        this.candidates = [];
        this.selectIndex = undefined;
        this.candidateStart = undefined;
        this.container.innerHTML = "";
    }
    selectNext(input) {
        this.selectCandidate(input, 1);
    }
    selectPrev(input) {
        this.selectCandidate(input, -1);
    }
    selectCandidate(input, diff) {
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
    constructor() {
        this.history = undefined;
        this.index = 0;
        this.candidateHistory = undefined;
        browser.storage.local.get({ "command_history" : [] }).then(
            (command_history) => {
                this.history = command_history["command_history"];
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
};

function search(keyword, backward) {
    browser.runtime.sendMessage({
        command: "find", keyword: keyword, backward: backward
    }).then((result) => {
        ConsoleCommand.closeConsoleMode();
    }).catch((error) => {
        console.error(error);
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
        if (value.startsWith("/") || value.startsWith("?")) {
            search(value.substr(1), value.charAt(0) === "?");
            return;
        }

        browser.runtime.sendMessage(
            { command: "execCommand", cmd: value })
            .then((result) => {
                if (result) {
                    if (Array.isArray(result)) {
                        result = result.join("\n");
                    }
                    if (result === true) {
                        ConsoleCommand.closeConsoleMode();
                        return;
                    }
                    const output = document.querySelector("#ex_output");
                    output.value = result;
                }
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
    // "<C-N>": "selectNextHistory",
    // "<C-P>": "selectPreviousHistory",
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

        const container = document.getElementById("ex_candidates");
        container.style.maxHeight = (window.innerHeight - 100) + "px";
        this.completer = new Completer(container);
        this.history = new History();

        this.mapper = Utils.makeCommandMapper(
            this.isSearch() ? SEARCH_CMD_MAP : EX_CMD_MAP);
    }
    handle(key) {
        const [consumed, optCmd, cmd] = this.mapper.get(key);
        const previousValue = this.input.value;
        const result = (cmd ? !ConsoleCommand[cmd](this) : consumed);
        if (!result) {
            this.history.reset();
        }
        if (!this.isSearch()) {
            if (previousValue !== this.input.value
                && !cmd.includes("Candidate")) {
                this.completer.changeCandidates(this.input.value);
            }
            else if (!result && key.length === 1) {
                this.completer.changeCandidates(this.input.value + key);
            }
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
        });
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

        input.focus();
    }).catch((error) => {
        console.error(error);
        ConsoleCommand.closeConsoleMode();
    });
    // input.addEventListener("blur", (e) => closeConsoleMode());
}, { capture: true, once: true });

