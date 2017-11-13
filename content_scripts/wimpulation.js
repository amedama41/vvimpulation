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

let gFrameInfo = null;

class NormalMode {
    constructor(frameInfo, keyMap, keyList=undefined) {
        this.count = "0";
        this.mapper = Utils.makeCommandMapper(keyMap);
        if (keyList) {
            setTimeout(() => {
                keyList.forEach((key) => this.onKeyEvent(key, frameInfo));
            }, 0);
        }
    }
    getTarget() {
        // activeElement may be null (e.g. about:blank)
        return document.activeElement || document.documentElement;
    }
    onReset() {
        this._resetState();
    }
    onKeyEvent(key, frameInfo) {
        const [consumed, optCmd, cmd] = this.mapper.get(key);
        if (optCmd) {
            if (optCmd.length !== 0) {
                this._invoke(optCmd, frameInfo);
            }
            else {
                this._resetState();
            }
        }
        if (cmd) {
            return this._invoke(cmd, frameInfo);
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

    _invoke(cmdName, frameInfo) {
        const count = parseInt(this.count, 10);
        this._resetState();
        return !invokeCommand(cmdName, count, frameInfo);
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
        return makeHints(msg.pattern, msg.type, winArea, gFrameInfo);
    }
    static forwardHintCommand(msg) {
        if (!gFrameInfo.isCurrentModeClass(HintMode)) {
            return Promise.reject('no hint mode');
        }
        return gFrameInfo.handleMessage(msg.data);
    }
    static hideConsole(msg) {
        return gFrameInfo.handleMessage(msg);
    }
    static forwardCommand(msg, sneder) {
        const data = msg.data;
        invokeCommand(data.command, data.count, gFrameInfo);
    }
    static collectFrameId(msg) {
        const frameIdList = Array.from(window.frames)
            .map((frame) => gFrameInfo.getChildFrameId(frame))
            .filter((frameId) => frameId !== undefined);
        return Promise.all(
            frameIdList.map((frameId) => gFrameInfo.sendMessage({
                command: "collectFrameId", frameId: frameId
            }))
        ).then((idListList) => idListList.reduce(
            (list, idList) => list.concat(idList),
            [ gFrameInfo.getSelfFrameId() ]));
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
            return window.find(msg.keyword, msg.caseSensitive, msg.backward);
        }
        catch (e) {
            // some window (e.g. about:blank) can throw an exception
            return false;
        }
    }
};

function init() {
    const reconnectTimeout = 500;
    connectToBackGround(reconnectTimeout);
}

function connectToBackGround(reconnectTimeout) {
    const port = new Port(browser.runtime.connect({ name: "wimpulation" }));
    const handleNotification = (msg) => {
        if (msg.command === "registerFrameId") {
            gFrameInfo = new FrameInfo(msg.frameId, port, msg.mode);
            window.addEventListener(
                "keydown", (e) => gFrameInfo.handleKeydown(e), true);
            window.addEventListener("unload", (evt) => {
                console.log(`${gFrameInfo.getSelfFrameId()}: port disconnect`);
                gFrameInfo.reset();
            }, { capture: true, once : true });
        }
        else if (msg.command === "changeMode") {
            gFrameInfo.changeModeNow(msg.mode, msg.data);
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
        console.log("Port disconnected:", error && error.toString());
        if (gFrameInfo) {
            gFrameInfo.reset();
        }
        else {
            // reconnect because background may not listen yet
            window.setTimeout(
                connectToBackGround.bind(
                    null, Math.min(2 * reconnectTimeout, 10000)),
                reconnectTimeout);
        }
        // avoid circular reference
        port.onRequest.removeListener(handleRequest);
        port.onNotification.removeListener(handleNotification);
    });
}

console.log(location.href.substr(0, 64), document.readyState);

init();

