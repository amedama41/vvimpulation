'use strict';

let gFrameInfo = null;

const NORMAL_MODE_START_MACRO = 0;
const NORMAL_MODE_RECORD_MACRO = 1;

class NormalMode {
    constructor(frameInfo, keyMap, keyList=undefined) {
        this.count = "0";
        this.macroState = undefined;
        this.isPlayMacro = false;
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
        if (this.macroState === NORMAL_MODE_START_MACRO) {
            if (/^[0-9a-zA-Z]$/.test(key)) {
                this.macroState = NORMAL_MODE_RECORD_MACRO;
                frameInfo.postMessage({ command: "startMacro", key });
                frameInfo.showFixedMessage("recording @" + key.toLowerCase());
            }
            else {
                this.macroState = undefined;
            }
            return [true, undefined, undefined, undefined];
        }
        if (this.isPlayMacro) {
            this.isPlayMacro = false;
            if (/^[0-9a-zA-Z@]$/.test(key)) {
                frameInfo.postMessage({ command: "playMacro", key });
            }
            return [true, undefined, undefined, undefined];
        }
        const [consumed, optCmd, cmd, dropKeys] = this.mapper.get(key);
        if (!consumed) {
            if (key === "q") {
                if (this.macroState === undefined) {
                    this.macroState = NORMAL_MODE_START_MACRO;
                }
                if (this.macroState === NORMAL_MODE_RECORD_MACRO) {
                    this.macroState = undefined;
                    frameInfo.postMessage({ command: "stopMacro" });
                    frameInfo.hideFixedMessage();
                }
                return [true, optCmd, cmd, dropKeys];
            }
            if (key === "@") {
                this.isPlayMacro = true;
                return [true, optCmd, cmd, dropKeys];
            }
        }
        if (this.macroState === NORMAL_MODE_RECORD_MACRO) {
            frameInfo.postMessage({ command: "recordMacro", key });
        }
        return [consumed, optCmd, cmd, dropKeys];
    }
    onReset(frameInfo) {
        if (this.macroState === NORMAL_MODE_RECORD_MACRO) {
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
                this.macroState = NORMAL_MODE_RECORD_MACRO;
                break;
            case "stopMacro":
                this.macroState = undefined;
                break;
            case "playMacro":
                frameInfo.handleKey(msg.key);
                break;
            default:
                console.warn("Unknown command:", msg.command);
                break;
        }
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
        let activeElement = null;
        // reset selection in order to search from head or end of page.
        if (reset) {
            selection.removeAllRanges();
            activeElement = document.activeElement;
            if (activeElement) {
                // If an editable element is already focused, window.find
                // starts from the element.
                activeElement.blur();
            }
        }

        const current = (backward ? selection.focusNode : selection.anchorNode);

        try {
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
    return elemList.find((elem) => {
        if (elem.getClientRects().length === 0 ||
            !(boundary.compareDocumentPosition(elem) & positionBit)) {
            return false;
        }
        if (caseSensitive) {
            return elem.value.includes(key);
        }
        else {
            return elem.value.toLowerCase().includes(key.toLowerCase());
        }
    });
}

function insertFocusRule(sheet) {
    const cssRules = sheet.cssRules;
    for (let i = 0; i < cssRules.length; ++i) {
        const rule = cssRules[i];
        const selector = rule.selectorText;
        if (!selector || !selector.includes(":hover")) {
            continue;
        }
        const newSelector = selector.replace(/:hover\b/g, ":focus-within");
        i = sheet.insertRule(`${newSelector} {${rule.style.cssText}}`, i + 1);
    }
}
function killHover() {
    const promiseList = Array.from(document.styleSheets).map((sheet) => {
        try {
            sheet.cssRules; // check CORS.
            return Promise.resolve(sheet);
        }
        catch (e) {
            const originalLink = sheet.ownerNode;
            if (originalLink.href.startsWith("resource://")) {
                return Promise.resolve(null);
            }
            return new Promise((resolve, reject) => {
                const link = originalLink.cloneNode(true);
                link.crossOrigin = "anonymous";
                link.addEventListener("load", (e) => {
                    resolve(e.target.sheet);
                    originalLink.parentNode.removeChild(originalLink);
                }, { once: true });
                link.addEventListener("error", (e) => {
                    console.warn("can't load ", e.target.href, location.href);
                    link.parentNode.removeChild(link);
                    resolve(null);
                }, { once: true });
                originalLink.parentNode.insertBefore(link, originalLink);
            });
        }
    });
    Promise.all(promiseList).then((sheetList) => {
        sheetList.forEach((sheet) => {
            if (!sheet) {
                return;
            }
            try {
                insertFocusRule(sheet);
            }
            catch (e) {
                console.error(Utils.errorString(e), sheet.href);
            }
        });
    });
}

window.addEventListener("load", (e) => killHover(), { once: true });

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

