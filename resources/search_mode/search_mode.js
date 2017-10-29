class SearchCommand {
    static closeSearchMode() {
        browser.runtime.sendMessage({ command: "toNormalMode" });
    }

    static execSearch(input, isBackward) {
        const value = input.value;
        if (value === "") {
            SearchCommand.closeSearchMode();
            return;
        }
        browser.runtime.sendMessage({
            command: "find", keyword: value, backward: isBackward
        }).then((result) => {
            console.log("search result", result);
            SearchCommand.closeSearchMode();
        });
    }

    static selectNextHistory(input) {
        // gHistory.setNext(input);
    }

    static selectPreviousHistory(input) {
        // gHistory.setPrevious(input);
    }

    static clearAllHistory() {
        browser.storage.local.remove("command_history");
    }

    static deleteCharBackward(input) {
        if (!DomUtils.deleteCharBackward(input)) {
            SearchCommand.closeSearchMode();
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
    "<C-C>": "closeSearchMode",
});
window.addEventListener("DOMContentLoaded", () => {
    const input = document.querySelector("#wimpulation_input");
    const isBackward = (location.search === '?isBackward=true');
    if (isBackward) {
        document.getElementById("wimpulation_prompt").textContent = "?";
    }

    const invokeCommand = (cmd) => !SearchCommand[cmd](input);
    const mapper = Utils.makeCommandMapper(SEARCH_CMD_MAP);
    input.addEventListener("keydown", (e) => {
        const key = Utils.getRegulatedKey(e);
        if (!key) {
            return;
        }

        if (key.endsWith("Esc>") || key === "<C-[>") {
            SearchCommand.closeSearchMode();
        };
        const [consumed, optCmd, cmd] = mapper.get(key);
        const previousValue = input.value;
        const result = cmd ? !SearchCommand[cmd](input, isBackward) : consumed;
        if (result) {
            e.stopPropagation();
            e.preventDefault();
        }
        else {
            // gHistory.reset();
        }
    });
    // input.addEventListener("blur", (e) => closeSearchMode());

    input.focus();
}, { capture: true, once: true });

