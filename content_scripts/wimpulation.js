'use strict';

const NORMAL_KEY_MAP = Utils.toPreparedCmdMap({
    ".": "repeatLastCommand",
    "f": "toHintMode",
    "F": "toHintFocusMode",
    "gF": "toHintMediaMode",
    "I": "toInsertModeOnFirstElement",
    "i": "toInsertMode",
    "A": "toInsertModeOnLastElement",
    "v": "toVisualMode",
    ":": "toExMode",
    "o": "toExModeOpen",
    "O": "toExModeOpenCurrentURL",
    "t": "toExModeTabOpen",
    "T": "toExModeTabOpenCurrentURL",
    "/": "toSearchMode",
    "?": "toBackwardSearchMode",
    "e": "pressEnter",
    "gg": "scrollTop",
    "M": "scrollMiddle",
    "G": "scrollBottom",
    "^": "scrollHome",
    "$": "scrollEnd",
    "j": "scrollDown",
    "k": "scrollUp",
    "h": "scrollLeft",
    "l": "scrollRight",
    "<C-E>": "scrollLineDown",
    "<C-Y>": "scrollLineUp",
    "<C-D>": "moveHalfPageDown",
    "<C-U>": "moveHalfPageUp",
    "<C-F>": "movePageDown",
    "<C-B>": "movePageUp",
    "%": "scrollPercent",
    "n": "findNext",
    "N": "findPrevious",
    "}": "findNextPage",
    "{": "findPreviousPage",
    "gt": "nextTab",
    "gT": "previousTab",
    "<C-N>": "nextTab",
    "<C-P>": "previousTab",
    "g0": "firstTab",
    "g$": "lastTab",
    "<": "moveTabToLeft",
    ">": "moveTabToRight",
    "dd": "removeCurrentTab",
    "dw": "removeCurrentWindow",
    "u": "undoCloseTab",
    "<C-C>": "stopLoad",
    "<C-L>": "reload",
    "g<C-L>": "reloadSkipCache",
    "<C-O>": "back",
    "<C-I>": "forward",
    "<C-A>": "incrementURL",
    "<C-X>": "decrementURL",
    "gu": "goToParent",
    "gU": "goToRoot",
    "zz": "focusTopFrame",
    "zf": "reloadHintPattern",
    "zi": "zoomIn",
    "zo": "zoomOut",
    "zr": "zoomReset",
    "yy": "yankCurrentURL",
    "<Space><Space>": "playOrPause",
    "<Space>j": "volumeDown",
    "<Space>k": "volumeUp",
    "<Space>h": "seekBack",
    "<Space>l": "seekForward",
    "<Space>r": "switchLoop",
    "<Space><C-L>": "reloadVideo",
    "<Space><C-G>": "showVideInfo",
    "<C-W><C-W>": "focusNextFrame",
    "<C-W>w": "focusNextFrame",
    "<C-W><C-C>": "stopLoadFrame",
    "<C-W>c": "stopLoadFrame",
    "<C-W><C-L>": "reloadFrame",
    "<C-W>l": "reloadFrame",
    "<C-W><C-A>": "incrementFrameURL",
    "<C-W>a": "incrementFrameURL",
    "<C-W><C-X>": "decrementFrameURL",
    "<C-W>x": "decrementFrameURL",
    "<C-W>y": "yankFrameURL",
    "<C-W><C-G>": "showFrameURL",
    "<C-,>": "test",
});
const INSERT_KEY_MAP = Utils.toPreparedCmdMap({
    "<C-H>": "deleteCharBackward",
    "<C-W>": "deleteWordBackward",
    "<C-K>": "deleteToEndOfLine",
    "<C-U>": "deleteToBeggingOfLine",
    "<C-F>": "charNext",
    "<C-B>": "charPrevious",
    "<C-A>": "beginLine",
    "<C-E>": "endLine",
    "<C-N>": "nextLine",
    "<C-P>": "previousLine",
    "<C-O><C-U>": "undo",
    "<C-O>u": "undo",
    "<C-O>y": "yankValue",
    "<C-C>": "toNormalMode",
    "<C-[>": "toNormalMode",
    "<Tab>": "goToNextInput",
    "<S-Tab>": "goToPreviousInput",
    "<M-A>": "ignore",
    "<M-V>": "ignore",
    "<M-X>": "ignore",
});
const VISUAL_KEY_MAP = Utils.toPreparedCmdMap({
    "h": "move backward character",
    "l": "move forward character",
    "b": "move backward word",
    "w": "move forward word",
    "j": "move forward line",
    "k": "move backward line",
    ")": "move forward sentence",
    "(": "move backward sentence",
    "}": "move forward paragraph",
    "{": "move backward paragraph",
    "0": "move backward lineboundary",
    "$": "move forward lineboundary",
    "G": "move forward documentboundary",
    "gg": "move backward documentboundary",
    "y": "yankSelection",
    "o": "reverseCursor",
    "c": "toCaretMode",
    "v": "toVisualMode",
    "<C-[>": "toNormalMode",
});

class FrameInfo {
    constructor(selfFrameId, port) {
        this.suspend = false;
        this.selfFrameId = selfFrameId;
        this.port = port;
        this.childFrameIdMap = new Map();
        this.registerIntervalId = 0;
        window.addEventListener("message", (msgEvent) => {
            this._handleFrameMessage(msgEvent);
        }, true);
        window.addEventListener("unload", (event) => {
            this._unregisterToParent();
        }, { capture: true, once: true });
        this._startRegisterToParent();
    }
    isSuspend() {
        return this.suspend;
    }
    toggleSuspend() {
        this.suspend = !this.suspend;
    }
    getSelfFrameId() {
        return this.selfFrameId;
    }
    isTopFrame() {
        return this.selfFrameId === 0;
    }
    isRegistered(childWindow) {
        return this.childFrameIdMap.has(childWindow);
    }
    getChildFrameId(childWindow) {
        return this.childFrameIdMap.get(childWindow);
    }
    postMessage(msg) {
        this.port.postMessage(msg);
    }
    sendMessage(msg) {
        return this.port.sendMessage(msg);
    }

    _startRegisterToParent() {
        const parentWin = window.parent;
        if (parentWin === window) {
            return;
        }
        this.registerIntervalId = window.setInterval(() => {
            parentWin.postMessage(
                { type: "registerChild", frameId: this.selfFrameId }, "*");
        }, 100);
    }
    _unregisterToParent() {
        const parentWin = window.parent;
        if (parentWin === window) {
            return;
        }
        parentWin.postMessage({ type: "unregisterChild" }, "*");
    }
    _handleFrameMessage(msgEvent) {
        const source = msgEvent.source;
        const data = msgEvent.data;
        if (!data.type) {
            return;
        }
        switch (data.type) {
            case "registerChild":
                this._registerChild(source, data);
                break;
            case "completeRegisterChild":
                this._stopRegisterToParent(source);
                break;
            case "unregisterChild":
                this._unregisterChild(source);
                break;
            default:
                break;
        }
    }
    _registerChild(sourceWindow, data) {
        if (!FrameInfo._isChildFrame(sourceWindow)
            || !data.frameId || !Number.isInteger(data.frameId)) {
            return;
        }
        const frameId = data.frameId;
        this.childFrameIdMap.set(sourceWindow, frameId);
        sourceWindow.postMessage({ type: "completeRegisterChild" }, "*");
    }
    _unregisterChild(sourceWindow) {
        this.childFrameIdMap.delete(sourceWindow);
    }
    _stopRegisterToParent(sourceWindow) {
        if (sourceWindow !== window.parent) {
            return;
        }
        if (this.registerIntervalId !== 0) {
            window.clearInterval(this.registerIntervalId);
            this.registerIntervalId = 0;
        }
    }
    static _isChildFrame(targetWindow) {
        const frames = window.frames;
        const frameLen = frames.length;
        for (let i = 0; i < frameLen; ++i) {
            if (frames[i] === targetWindow) {
                return true;
            }
        }
        return false;
    }
}

class NormalMode extends Mode {
    constructor(frameInfo, keyMap, keyList=undefined) {
        super(frameInfo);
        this.count = "0";
        this.lastCmd = [undefined, undefined];
        this.mapper = Utils.makeCommandMapper(keyMap);
        if (keyList) {
            setTimeout(() => {
                keyList.forEach((key) => this.handle(key));
            }, 0);
        }
    }
    getTarget() {
        return document.activeElement;
    }
    handle(key) {
        const [consumed, optCmd, cmd] = this.mapper.get(key);
        if (optCmd) {
            if (optCmd.length !== 0) {
                this._invokeCommand(optCmd);
            }
            else {
                this._resetState();
            }
        }
        if (cmd) {
            return this._invokeCommand(cmd);
        }
        if (consumed) {
            return true;
        }

        if (key.length === 1 && "0" <= key && key <= "9") {
            this.count += key;
            return true;
        }

        this._resetState();
        return false;
    }
    reset() {
        this._resetState();
    }

    _invokeCommand(cmdName) {
        const count = parseInt(this.count, 10);
        this._resetState();
        const cmdDesc = COMMAND_DESCRIPTIONS[cmdName];
        if (cmdDesc.background) {
            super.postMessage({ command: cmdName, count: count });
        }
        else if (cmdDesc.topFrame && !super.frameInfo.isTopFrame()) {
            super.postMessage({
                command: 'forwardCommand', frameId: 0,
                data: { command: cmdName, count: count }
            });
        }
        else {
            FrontendCommand[cmdName](count, this);
        }
        if (cmdName !== "repeatLastCommand") {
            this.lastCmd = [FrontendCommand[cmdName], count];
        }
        if (count !== 0) {
            this.lastCmd[1] = count;
        }
        return true;
    }

    _resetState() {
        this.count = "0";
    }
}

class InsertCommand {
    static deleteCharBackward(count, mode) {
        const elem = mode.getTarget();
        const prevValue = elem.value;
        if (DomUtils.deleteCharBackward(elem)) {
            mode.undoStack.push(prevValue);
        }
    }
    static deleteWordBackward(count, mode) {
        const elem = mode.getTarget();
        const prevValue = elem.value;
        if (DomUtils.deleteWordBackward(elem)) {
            mode.undoStack.push(prevValue);
        }
    }
    static deleteToBeggingOfLine(count, mode) {
        const elem = mode.getTarget();
        const prevValue = elem.value;
        if (DomUtils.deleteToBeggingOfLine(elem)) {
            mode.undoStack.push(prevValue);
        }
    }
    static deleteToEndOfLine(count, mode) {
        const elem = mode.getTarget();
        const prevValue = elem.value;
        if (DomUtils.deleteToEndOfLine(elem)) {
            mode.undoStack.push(prevValue);
        }
    }
    static charNext(count, mode) {
        DomUtils.charNext(mode.getTarget());
    }
    static charPrevious(count, mode) {
        DomUtils.charPrevious(mode.getTarget());
    }
    static beginLine(count, mode) {
        DomUtils.beginLine(mode.getTarget());
    }
    static endLine(count, mode) {
        DomUtils.endLine(mode.getTarget());
    }
    static nextLine(count, mode) {
        DomUtils.nextLine(mode.getTarget());
    }
    static previousLine(count, mode) {
        DomUtils.previousLine(mode.getTarget());
    }
    static undo(count, mode) {
        const elem = mode.getTarget();
        if (mode.undoStack.length !== 0) {
            elem.setRangeText(
                mode.undoStack.pop(), 0, elem.value.length, "end");
        }
    }
    static yankValue(count, mode) {
        const elem = mode.getTarget();
        mode.freeze = true;
        DomUtils.setToClipboard(elem.value);
        mode.freeze = false;
    }
    static ignore() {
        return true;
    }
    static goToPreviousInput(count, mode) {
        const inputs = DomUtils.getInputList(document);
        const index = inputs.indexOf(mode.getTarget());
        if (index === -1) return;
        mode.changeMode("INSERT", {
            editableElement: inputs[(index - 1 + inputs.length) % inputs.length]
        });
    }
    static goToNextInput(count, mode) {
        const inputs = DomUtils.getInputList(document);
        const index = inputs.indexOf(mode.getTarget());
        if (index === -1) return;
        mode.changeMode("INSERT", {
            editableElement: inputs[(index + 1) % inputs.length]
        });
    }
    static toNormalMode(count, mode) {
        mode.changeMode("NORMAL");
    }
}
class InsertMode extends Mode {
    constructor(frameInfo, keyMap, data) {
        super(frameInfo);
        this.mapper = Utils.makeCommandMapper(keyMap);
        this.lastFocusedElem = data.lastFocusedElem;
        this.editableElement = data.editableElement;
        this.undoStack = [];
        this.editableElement.focus();
        this.editableElement.classList.add("wimpulation-input");
        this.freeze = false;
        if (document.activeElement !== this.editableElement) {
            setTimeout(() => InsertCommand.toNormalMode(0, this), 0);
            return;
        }
        this.blurHandler = (e) => {
            if (this.freeze) {
                return;
            }
            InsertCommand.toNormalMode(0, this);
        };
        this.editableElement.addEventListener("blur", this.blurHandler, true);
    }
    getTarget() {
        return this.editableElement;
    }
    handle(key) {
        const [consumed, optCmd, cmd] = this.mapper.get(key);
        if (optCmd) {
            InsertCommand[optCmd](0, this);
        }
        if (cmd) {
            return !InsertCommand[cmd](0, this);
        }
        if (consumed) {
            return true;
        }
        if (key.length === 1
            || key === "<Space>" || key === "<S-Space>"
            || key === "<Backspace>" || key === "<Delete>"
            || key === "<Enter>") {
            this.undoStack.push(this.editableElement.value);
            return false;
        }
        return true;
    }
    reset() {
        try {
            this.editableElement.removeEventListener(
                "blur", this.blurHandler, true);
            this.editableElement.classList.remove("wimpulation-input");
            if (document.activeElement === this.editableElement) {
                if (document.hasFocus && this.lastFocusedElem) {
                    this.lastFocusedElem.focus();
                }
            }
        }
        catch (e) {
            console.warn(e);
        }
    }
}

class ConsoleMode extends Mode {
    constructor(frameInfo, options) {
        super(frameInfo);
        this.options = options;
        this.lastFocusedElem = document.activeElement;
        this.lastFocusedElem.blur();
        const div = document.createElement("div");
        div.id = "wimpulation-console-container";
        div.style.display = 'none';
        const iframe = document.createElement("iframe");
        iframe.id = "wimpulation-console";
        iframe.src = browser.runtime.getURL("resources/ex_mode/ex_mode.html");
        div.appendChild(iframe);
        this.container = div;
        document.documentElement.appendChild(this.container);
    }
    reset() {
        document.documentElement.removeChild(this.container);
        try {
            this.lastFocusedElem.focus();
        }
        catch (e) {
            console.warn("lastFocusedElem is likely dead:", e);
        }
    }
    handle() {
    }
    showConsole() {
        this.container.style.display = 'inline';
        return this.options;
    }
}

class MessageCommand {
    static collectHint(msg) {
        const winArea = msg.area || {
            top: 0, left: 0,
            bottom: window.innerHeight, rigth: window.innerWidth
        };
        return makeHints(
            msg.pattern, msg.isFocusType, winArea, gMode.frameInfo);
    }
    static forwardHintCommand(msg) {
        if (!(gMode instanceof HintMode)) {
            return Promise.reject('no hint mode');
        }
        const data = msg.data;
        return gMode.dispatch(data);
    }
    static forwardCommand(msg, sneder) {
        const data = msg.data;
        FrontendCommand[data.command](data.count, gMode);
    }
    static showConsole(msg, sender) {
        if (!(gMode instanceof ConsoleMode)) {
            throw new Error('no console mode');
        }
        return gMode.showConsole();
    }
    static collectFrameId(msg) {
        const frameIdList = Array.from(window.frames)
            .map((frame) => gMode.frameInfo.getChildFrameId(frame))
            .filter((frameId) => frameId !== undefined);
        return Promise.all(
            frameIdList.map((frameId) => gMode.sendMessage({
                command: "collectFrameId", frameId: frameId
            }))
        ).then((idListList) => idListList.reduce(
            (list, idList) => list.concat(idList),
            [ gMode.frameInfo.getSelfFrameId() ]));
    }
    static focusFrame(msg) {
        if (document.body instanceof HTMLFrameSetElement &&
            window.frames.length > 0) {
            window.frames[0].focus();
            return;
        }
        window.focus();
    }
    static find(msg) {
        // reset selection in order to search from head or end of page.
        if (msg.reset) {
            const selection = window.getSelection();
            const body = document.body || document.documentElement;
            if (msg.backward) {
                const walker =
                    document.createTreeWalker(body, NodeFilter.SHOW_TEXT);
                const text = walker.lastChild();
                if (text) {
                    const length = text.length;
                    selection.setBaseAndExtent(text, length, text, length);
                }
            }
            else {
                const body = document.body || document.documentElement;
                selection.setBaseAndExtent(body, 0, body, 0);
            }
        }
        return window.find(msg.keyword, false, msg.backward);
    }
};

function keyHandler(keyEvent) {
    const key = Utils.getRegulatedKey(keyEvent);
    if (!key) {
        return;
    }

    if (key === '<C-Z>') {
        gMode.frameInfo.toggleSuspend();
        return;
    }
    if (gMode.frameInfo.isSuspend()) {
        return;
    }

    if (key.endsWith("Esc>")) {
        gMode.postMessage({ command: "toNormalMode" });
        return;
    }

    if (gMode.handle(key)) {
        keyEvent.preventDefault();
        keyEvent.stopPropagation();
    }
}

function init() {
    const reconnectTimeout = 500;
    connectToBackGround(reconnectTimeout);
}

function connectToBackGround(reconnectTimeout) {
    const port = new Port(browser.runtime.connect({ name: "wimpulation" }));
    const handleNotification = (msg) => {
        if (msg.command === "registerFrameId") {
            gMode = Mode.createMode(msg.mode, new FrameInfo(msg.frameId, port));
            window.addEventListener("keydown", keyHandler, true);
            window.addEventListener("unload", (evt) => {
                console.debug(
                    `${gMode.frameInfo.getSelfFrameId()}: port disconnect`);
                port.disconnect();
                gMode.reset();
            }, { capture: true, once : true });
        }
        else if (msg.command === "changeMode") {
            gMode.changeMode(msg.mode, msg.data);
        }
    };
    const handleRequest = (msg, sender) => {
        const cmd = MessageCommand[msg.command];
        if (cmd) {
            return cmd(msg, sender);
        }
        else {
            throw new Error("unknown message command: " + msg.command);
        }
    };
    port.onNotification.addListener(handleNotification);
    port.onRequest.addListener(handleRequest);
    port.onDisconnect.addListener((port, error) => {
        console.debug("Port disconnected:", error.toString());
        if (gMode === undefined) {
            // reconnect because background may not listen yet
            window.setTimeout(
                connectToBackGround.bind(
                    null, Math.min(2 * reconnectTimeout, 10000)),
                reconnectTimeout);
        }
        else {
            gMode.reset();
        }
        // avoid circular reference
        port.onRequest.removeListener(handleRequest);
        port.onNotification.removeListener(handleNotification);
    });
}

console.log(location.href.substr(0, 64), document.readyState);

init();

