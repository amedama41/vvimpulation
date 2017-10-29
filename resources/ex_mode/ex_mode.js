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

const gHistory = new (class {
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
})();

class ExCommand {
    static closeExMode() {
        browser.runtime.sendMessage({ command: "toNormalMode" });
    }

    static execCommand(input, output) {
        const value = input.value;
        if (value === "") {
            ExCommand.closeExMode();
            return;
        }
        if (value.startsWith("/") && value.length > 1) {
            browser.runtime.sendMessage({
                command: "find", keyword: value.substr(1), backward: false
            }).then((result) => {
                ExCommand.closeExMode();
            });
            return;
        }

        browser.runtime.sendMessage(
            { command: "execCommand", cmd: input.value })
            .then((result) => {
                if (result) {
                    if (Array.isArray(result)) {
                        result = result.join("\n");
                    }
                    if (result === true) {
                        ExCommand.closeExMode();
                        return;
                    }
                    const output = document.querySelector("#ex_output");
                    output.value = result;
                }
            });
    }

    static selectNextHistory(input, completer) {
        gHistory.setNext(input);
    }

    static selectPreviousHistory(input, completer) {
        gHistory.setPrevious(input);
    }

    static getCandidate(input, completer) {
        browser.runtime.sendMessage({
            command: "getCandidate",
            value: input.value.substring(0, input.selectionStart)
        }).then((result) => {
            if (!result) {
                return;
            }
            completer.setCandidates(result);
        });
    }
    static selectNextHistoryOrCandidate(input, completer) {
        if (completer.hasCandidates()) {
            completer.selectNext(input);
        }
        else {
            ExCommand.selectNextHistory(input, completer);
        }
    }
    static selectPreviousHistoryOrCandidate(input, completer) {
        if (completer.hasCandidates()) {
            completer.selectPrev(input);
        }
        else {
            ExCommand.selectPreviousHistory(input, completer);
        }
    }
    static clearAllHistory() {
        browser.storage.local.remove("command_history");
    }

    static deleteCharBackward(input) {
        if (!DomUtils.deleteCharBackward(input)) {
            ExCommand.closeExMode();
        }
    }
    static deleteWordBackward(input) {
        DomUtils.deleteWordBackward(input);
    }
    static deleteToBeggingOfLine(input) {
        DomUtils.deleteToBeggingOfLine(input);
    }
    static deleteToEndOfLine(input) {
        DomUtils.deleteToEndOfLine(input);
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
    "<C-C>": "closeExMode",
});
window.addEventListener("DOMContentLoaded", () => {
    const input = document.querySelector("#ex_input");
    const container = document.querySelector("#ex_candidates");
    container.style.maxHeight = (window.innerHeight - 100) + "px";
    const completer = new Completer(container);

    const invokeCommand = (cmd) => !ExCommand[cmd](input);
    const mapper = Utils.makeCommandMapper(EX_CMD_MAP);
    input.addEventListener("keydown", (e) => {
        const key = Utils.getRegulatedKey(e);
        if (!key) {
            return;
        }

        // console.debug(e.type, key, e.defaultPrevented);
        if (key.endsWith("Esc>") || key === "<C-[>") {
            ExCommand.closeExMode();
        };
        const [consumed, optCmd, cmd] = mapper.get(key);
        const previousValue = input.value;
        const result = cmd ? !ExCommand[cmd](input, completer) : consumed;
        if (result) {
            e.stopPropagation();
            e.preventDefault();
        }
        else {
            gHistory.reset();
        }
        if (previousValue !== input.value && !cmd.includes("Candidate")) {
            completer.changeCandidates(input.value);
        }
        else if (!result && key.length === 1) {
            completer.changeCandidates(input.value + key);
        }
    });
    // input.addEventListener("blur", (e) => closeExMode());

    browser.storage.local.get("ex_mode_options").then((cmd) => {
        const defaultValue = cmd["ex_mode_options"];
        if (defaultValue) {
            input.value = defaultValue;
        }
        browser.storage.local.remove("ex_mode_options");
    });

    window.focus();
    input.focus();
}, { capture: true, once: true });

