'use strict';

let gFrameInfo = null;

const NORMAL_MODE_KYE_ARG_COMMAND_INFO = {
    "q": {
        acceptKey: /^[0-9a-zA-Z]$/,
        command: "startMacro",
    },
    "@": {
        acceptKey: /^[0-9a-zA-Z@]$/,
        command: "playMacro",
    },
    "m": {
        acceptKey: /^[a-z'`]$/,
        command: "markPosition",
    },
    "`": {
        acceptKey: /^[a-z'`]$/,
        command: "jumpToMark",
    },
    "'": {
        acceptKey: /^[a-z'`]$/,
        command: "jumpToMark",
    },
};

class NormalMode {
    constructor(frameInfo, keyMap, keyList=undefined) {
        this.count = "0";
        this.keyArgCmd = undefined;
        this.isRecordingMacro = false;
        this.mapper = Utils.makeCommandMapper(keyMap);
        if (keyList) {
            setTimeout(() => {
                keyList.forEach((key) => frameInfo.handleKey(key));
            }, 0);
        }
    }
    static getModeName() {
        return "NORMAL";
    }
    getTarget() {
        // activeElement may be null (e.g. about:blank)
        return document.activeElement || document.documentElement;
    }
    consume(key, frameInfo) {
        if (this.keyArgCmd) {
            const keyArgCmd = this.keyArgCmd;
            this.keyArgCmd = undefined;
            if (keyArgCmd.acceptKey.test(key)) {
                this[keyArgCmd.command](key, frameInfo);
            }
            return [true, undefined, undefined, undefined];
        }

        if (key === "0" && this.count !== "0" && // Is continuation of count?
            !this.mapper.hasPendingKeys()) {
            return [false, undefined, undefined, undefined];
        }
        const [consumed, optCmd, cmd, dropKeys] = this.mapper.get(key);

        if (!consumed) {
            if (key === "q" && this.isRecordingMacro) {
                this.isRecordingMacro = false;
                frameInfo.postMessage({ command: "stopMacro" });
                frameInfo.hideFixedMessage();
                return [true, optCmd, cmd, dropKeys];
            }
            const keyArgCmd = NORMAL_MODE_KYE_ARG_COMMAND_INFO[key];
            if (keyArgCmd) {
                this.keyArgCmd = keyArgCmd;
                return [true, optCmd, cmd, dropKeys];
            }
        }
        if (this.isRecordingMacro) {
            frameInfo.postMessage({ command: "recordMacro", key });
        }
        return [consumed, optCmd, cmd, dropKeys];
    }
    onReset(frameInfo) {
        if (this.isRecordingMacro) {
            frameInfo.postMessage({ command: "stopMacro" });
            frameInfo.hideFixedMessage();
        }
    }
    onInvoking(cmdName, frameInfo) {
        const count = parseInt(this.count, 10);
        this.count = "0";
        return !invokeCommand(cmdName, count, frameInfo);
    }
    onDropKeys(dropKeys) {
        this.count = "0";
    }
    onNonConsumed(key) {
        if (key.length === 1 && "0" <= key && key <= "9") {
            this.count += key;
        }
        else {
            this.count = "0";
        }
        return true;
    }
    onMessageEvent(msg, frameInfo) {
        switch (msg.command) {
            case "startMacro":
                this.isRecordingMacro = true;
                break;
            case "stopMacro":
                this.isRecordingMacro = false;
                break;
            case "playMacro":
                frameInfo.handleKey(msg.key);
                break;
            default:
                console.warn("Unknown command:", msg.command);
                break;
        }
    }
    startMacro(key, frameInfo) {
        this.isRecordingMacro = true;
        frameInfo.postMessage({ command: "startMacro", key });
        frameInfo.showFixedMessage("recording @" + key.toLowerCase());
    }
    playMacro(key, frameInfo) {
        frameInfo.postMessage({ command: "playMacro", key });
    }
    markPosition(key, frameInfo) {
        if (key === "`") {
            key = "'";
        }
        frameInfo.markPosition(key, [window.scrollX, window.scrollY]);
    }
    jumpToMark(key, frameInfo) {
        if (key === "`") {
            key = "'";
        }
        const position = frameInfo.getPosition(key);
        if (!position) {
            return;
        }
        frameInfo.markPosition("'", [window.scrollX, window.scrollY]);
        window.scrollTo(position[0], position[1]);
    }
}

class MessageCommand {
    static forwardModeCommand(msg) {
        const mode = gFrameInfo.currentMode();
        if (msg.mode !== mode) {
            return Promise.reject(
                `Different mode (current: ${mode}, expected: ${msg.mode})`);
        }
        return gFrameInfo.handleMessage(msg.data);
    }
    static collectHint(msg) {
        const winArea = msg.area || {
            top: 0, left: 0,
            bottom: window.innerHeight, right: window.innerWidth
        };
        return makeHints(msg.pattern, msg.type, winArea, gFrameInfo);
    }
    static hideConsole(msg) {
        return gFrameInfo.handleMessage(msg);
    }
    static forwardCommand(msg, sneder) {
        const data = msg.data;
        invokeCommand(data.command, data.count, gFrameInfo);
    }
    static collectFrameId(msg) {
        // Collect only displayed frame ids.
        const frameIdList =
            Array.from(document.querySelectorAll("frame, iframe, object"))
            .filter((frame) => frame.getClientRects().length !== 0)
            .map((frame) => gFrameInfo.getChildFrameId(frame.contentWindow))
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
        window.focus();
        // Keep focus in this frame, not in a child frame.
        const activeElement = document.activeElement;
        if (activeElement instanceof HTMLIFrameElement
            || activeElement instanceof HTMLFrameElement
            || activeElement instanceof HTMLObjectElement) {
            DomUtils.fixedFocus(document.documentElement);
        }
    }
    static find(msg) {
        const { keyword, caseSensitive, backward, reset } = msg;
        const selection = window.getSelection();
        // getSelection for a window with display none style can return null
        if (!selection) {
            return false;
        }
        // reset selection in order to search from head or end of page.
        if (reset) {
            selection.removeAllRanges();
        }

        const current = (backward ? selection.focusNode : selection.anchorNode);

        try {
            const activeElement = document.activeElement;
            if (activeElement && DomUtils.isEditable(activeElement)) {
                // If an editable element is focused, selection.anchorNode is
                // not null after a new editable is found by window.find.
                activeElement.blur();
            }
            const result = window.find(keyword, caseSensitive, backward);
            // If find match value of input or textarea, selection is clear
            if (result && selection.anchorNode === null) {
                const selectedElem = findSelectedEditableElement(
                    current, keyword, caseSensitive, backward);
                selectedElem.focus();
                // Need setBaseAndExtent when selectedElem.focus has no effect.
                selection.setBaseAndExtent(selectedElem, 0, selectedElem, 0);
            }
            if (!result && activeElement) {
                DomUtils.fixedFocus(activeElement);
            }
            return result;
        }
        catch (e) {
            // some window (e.g. about:blank) can throw an exception
            return false;
        }
    }
    static showMessage(msg) {
        if (msg.fixed) {
            gFrameInfo.showFixedMessage(msg.message);
        }
        else {
            gFrameInfo.showMessage(msg.message, msg.saveMessage);
        }
    }
    static hideFixedMessage(msg) {
        gFrameInfo.hideFixedMessage();
    }
};

function findSelectedEditableElement(current, key, caseSensitive, backward) {
    const [boundary, elemList, positionBit] = ((boundary, elemList) => {
        if (!boundary) {
            const walker = document.createTreeWalker(
                document.documentElement, NodeFilter.SHOW_TEXT);
            if (backward) {
                boundary = walker.lastChild();
            }
            else {
                boundary = walker.firstChild();
            }
        }
        if (backward) {
            elemList.reverse();
            return [boundary, elemList, Node.DOCUMENT_POSITION_PRECEDING];
        }
        else {
            return [boundary, elemList, Node.DOCUMENT_POSITION_FOLLOWING];
        }
    })(current, Array.from(document.querySelectorAll(
        "input[type='text'], input:not([type]), input[type='search'], " +
        "input[type='tel'], input[type='url'], input[type='email'], " +
        "input[type='datetime-local'], input[type='month'], " +
        "input[type='week'], textarea"
    )));
    const filter = Utils.makeFilter(key, caseSensitive, false);
    return elemList.find((elem) => {
        return (elem.getClientRects().length !== 0 &&
            (boundary.compareDocumentPosition(elem) & positionBit) &&
            filter.match(elem.value));
    });
}

window.addEventListener("load", (e) => {
    HoverKiller.insertFocusRule();
    HoverKiller.setTabIndex();
}, { once: true });

function init() {
    const reconnectTimeout = 500;
    connectToBackGround(reconnectTimeout);
}

function connectToBackGround(reconnectTimeout) {
    const port = new Port(browser.runtime.connect({ name: "wimpulation" }));
    const handleNotification = (msg) => {
        if (msg.command === "initFrame") {
            gFrameInfo = new FrameInfo(
                msg.frameId, port, msg.mode, msg.keyMapping);
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
        else if (msg.command === "updateKeyMapping") {
            gFrameInfo.setKeyMapping(msg.keyMapping);
        }
        else if (msg.command === "completeChildRegistration") {
            gFrameInfo.completeChildRegistration();
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

