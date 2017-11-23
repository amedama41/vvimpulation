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
                selection.removeAllRanges();
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
    static showMessage(msg) {
        if (msg.fixed) {
            gFrameInfo.showFixedMessage(msg.message);
        }
        else {
            gFrameInfo.showMessage(msg.message);
        }
    }
    static hideFixedMessage(msg) {
        gFrameInfo.hideFixedMessage();
    }
};

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

