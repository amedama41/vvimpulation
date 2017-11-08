'use strict';

const NORMAL_KEY_MAP = Utils.toPreparedCmdMap({
    ".": "repeatLastCommand",
    "<Esc>": "toNormalMode",
    "<C-[>": "toNormalMode",
    "f": "toHintMode",
    "F": "toHintFocusMode",
    "gF": "toHintMediaMode",
    "I": "toInsertModeOnFirstElement",
    "i": "toInsertMode",
    "A": "toInsertModeOnLastElement",
    "v": "toVisualMode",
    ":": "toExMode",
    "o": "smartOpen",
    "O": "smartOpenInTab",
    "<C-G>": "toExModeOpenCurrentURL",
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
    "gj": "selectNextOption",
    "gk": "selectPreviousOption",
    "g~": "toggleSelectOption",
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
    "yit": "yankInnerHTML",
    "yat": "yankOuterHTML",
    "ye": "yankInnerText",
    "yv": "yankSelection",
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
    "<C-W>o": "openLinkInFrame",
    "<C-W><C-I>": "forwardFrame",
    "<C-W><C-O>": "backFrame",
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
    "<C-O>u": "undo",
    "<C-O><C-U>": "undo",
    "<C-O>y": "yankValue",
    "<C-O><C-Y>": "yankValue",
    "<C-O>p": "pasteValue",
    "<C-O><C-P>": "pasteValue",
    "<C-M>": "pressEnter",
    "<C-C>": "toNormalMode",
    "<C-[>": "toNormalMode",
    "<Esc>": "toNormalMode",
    "<Tab>": "toInsertModeOnNextInput",
    "<S-Tab>": "toInsertModeOnPreviousInput",
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
    "d": "deleteSelection",
    "o": "reverseSelectionEndpoints",
    "c": "toCaretMode",
    "v": "toVisualMode",
    "<C-[>": "toNormalMode",
    "<C-C>": "toNormalMode",
    "<Esc>": "toNormalMode",
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
        this.mapper = Utils.makeCommandMapper(keyMap);
        if (keyList) {
            setTimeout(() => {
                keyList.forEach((key) => this.handle(key));
            }, 0);
        }
    }
    getTarget() {
        // activeElement may be null (e.g. about:blank)
        return document.activeElement || document.documentElement;
    }
    handle(key) {
        const [consumed, optCmd, cmd] = this.mapper.get(key);
        if (optCmd) {
            if (optCmd.length !== 0) {
                this._invoke(optCmd);
            }
            else {
                this._resetState();
            }
        }
        if (cmd) {
            return this._invoke(cmd);
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

    _invoke(cmdName) {
        const count = parseInt(this.count, 10);
        this._resetState();
        return !invokeCommand(cmdName, count, this);
    }
    _resetState() {
        this.count = "0";
    }
}

class MessageCommand {
    static collectHint(msg) {
        const winArea = msg.area || {
            top: 0, left: 0,
            bottom: window.innerHeight, rigth: window.innerWidth
        };
        return makeHints(msg.pattern, msg.type, winArea, gMode.frameInfo);
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
        invokeCommand(data.command, data.count, gMode);
    }
    static getConsoleOptions(msg, sender) {
        if (!(gMode instanceof ConsoleMode)) {
            throw new Error('no console mode');
        }
        return gMode.getConsoleOptions();
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
            // getSelection for a window with display none style can return null
            if (selection) {
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
                    selection.setBaseAndExtent(body, 0, body, 0);
                }
            }
        }
        try {
            return window.find(msg.keyword, false, msg.backward);
        }
        catch (e) {
            // some window (e.g. about:blank) can throw an exception
            return false;
        }
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

            if (msg.frameId === 0) {
                createConsoleFrame();
            }
        }
        else if (msg.command === "changeMode") {
            gMode.changeModeNow(msg.mode, msg.data);
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
        console.debug("Port disconnected:", error && error.toString());
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

function createConsoleFrame() {
    const create = () => {
        // for reinstall
        const oldContainer =
            document.getElementById("wimpulation-console-container");
        if (oldContainer) {
            document.documentElement.removeChild(oldContainer);
        }

        const container = document.createElement("div");
        container.id = "wimpulation-console-container";
        const consoleFrame = document.createElement("iframe");
        consoleFrame.id = "wimpulation-console";
        consoleFrame.src =
            browser.runtime.getURL("resources/ex_mode/ex_mode.html");
        container.appendChild(consoleFrame);
        document.documentElement.appendChild(container);
    };

    if (document.readyState === "loading") {
        window.addEventListener(
            "DOMContentLoaded", create, { capture: true, once: true });
    }
    else {
        create();
    }
}

console.log(location.href.substr(0, 64), document.readyState);

init();

