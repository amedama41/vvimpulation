'use strict';

class FrameIdInfo {
    constructor(selfFrameId) {
        this._selfFrameId = selfFrameId;
        this._childFrameIdMap = new Map();
        this._registerIntervalId = 0;

        this._startRegistration();
        setTimeout(() => {
            // Don't use unload event because removing iframes can not occur
            // the unload event.
            setInterval(() => this._checkClosedFrame(), 60000);
        }, Math.floor(Math.random() * 30000));
    }
    getSelfFrameId() {
        return this._selfFrameId;
    }
    getChildFrameId(childWindow) {
        return this._childFrameIdMap.get(childWindow);
    }
    handleFrameMessage(msgEvent, port) {
        const sourceWindow = msgEvent.source;
        const data = msgEvent.data;
        if (sourceWindow.parent !== window
            || !data.command || data.command !== "registerChild"
            || !data.frameId || !Number.isInteger(data.frameId)) {
            return;
        }
        const frameId = data.frameId;
        port.sendMessage({ command: "registerChild", frameId })
            .then((result) => {
                if (result) {
                    this._childFrameIdMap.set(sourceWindow, frameId);
                }
            });
    }
    stopRegistration() {
        if (this._registerIntervalId !== 0) {
            window.clearInterval(this._registerIntervalId);
            this._registerIntervalId = 0;
        }
    }

    _startRegistration() {
        const parentWin = window.parent;
        if (parentWin === window) {
            return;
        }
        this._registerIntervalId = window.setInterval(() => {
            parentWin.postMessage(
                { command: "registerChild", frameId: this._selfFrameId }, "*");
        }, 300);
    }
    _checkClosedFrame() {
        this._childFrameIdMap.forEach((id, frame) => {
            if (FrameIdInfo._isClosed(frame)) {
                this._childFrameIdMap.delete(frame);
            }
        });
    }
    static _isClosed(frame) {
        try {
            return frame.closed;
        }
        catch (e) { // Removed frame's window may be dead object.
            return true;
        }
    }
}

class FrameInfo {
    constructor(selfFrameId, port, modeName, keyMapping) {
        this._frameIdInfo = new FrameIdInfo(selfFrameId);
        this._port = port;
        this._modeEventListenerList = [];
        this._normalKeyMap = Utils.toPreparedCmdMap(keyMapping["normal"]);
        this._insertKeyMap = Utils.toPreparedCmdMap(keyMapping["insert"]);
        this._visualKeyMap = Utils.toPreparedCmdMap(keyMapping["visual"]);
        this._consoleKeyMap = keyMapping["console"];
        this._mode = this._createMode(modeName);
        this._consoleFrame = undefined;
        this._consoleTimerId = 0;
        this._lastMessage = "";
        this._fixedMessage = undefined;
        this._markPositionMap = {};
        if (this.isTopFrame()) {
            this._createConsoleFrame();
        }
        window.addEventListener("message", (msgEvent) => {
            this._frameIdInfo.handleFrameMessage(msgEvent, this._port);
        }, true);
    }
    reset() {
        this._resetMode();
        this._port.disconnect();
    }
    handleKeydown(keyEvent) {
        const key = Utils.getRegulatedKey(keyEvent);
        if (!key) {
            return;
        }

        if (this.handleKey(key)) {
            keyEvent.preventDefault();
            keyEvent.stopPropagation();
        }
    }
    handleKey(key) {
        const [consumed, optCmd, cmd, dropKeys] = this._mode.consume(key, this);
        if (optCmd) {
            this._mode.onInvoking(optCmd, this);
        }
        else if (dropKeys) {
            this._mode.onDropKeys(dropKeys);
        }
        if (cmd) {
            return this._mode.onInvoking(cmd, this);
        }
        if (consumed) {
            return true;
        }
        return this._mode.onNonConsumed(key);
    }
    handleMessage(msg) {
        return this._mode.onMessageEvent(msg, this);
    }
    currentMode() {
        return this._mode.constructor.getModeName();
    }
    setKeyMapping(keyMapping) {
        this._normalKeyMap = Utils.toPreparedCmdMap(keyMapping["normal"]);
        this._insertKeyMap = Utils.toPreparedCmdMap(keyMapping["insert"]);
        this._visualKeyMap = Utils.toPreparedCmdMap(keyMapping["visual"]);
        this._consoleKeyMap = keyMapping["console"];
    }
    completeChildRegistration() {
        this._frameIdInfo.stopRegistration();
    }

    // Method related to frame id.
    getSelfFrameId() {
        return this._frameIdInfo.getSelfFrameId();
    }
    isTopFrame() {
        return this._frameIdInfo.getSelfFrameId() === 0;
    }
    getChildFrameId(childWindow) {
        return this._frameIdInfo.getChildFrameId(childWindow);
    }

    // Method related to port.
    postMessage(msg) {
        this._port.postMessage(msg);
    }
    sendMessage(msg) {
        return this._port.sendMessage(msg);
    }

    // Method for frontend commands.
    changeMode(mode, data=undefined) {
        setTimeout(() => { this.changeModeNow(mode, data); }, 0);
    }
    changeModeNow(mode, data=undefined) {
        this._resetMode();
        this._mode = this._createMode(mode, data);
    }
    getTarget() {
        return this._mode.getTarget();
    }

    // Method for mode classes.
    setEventListener(target, eventType, handler, options) {
        const adapterHandler = (e) => handler(e, this);
        target.addEventListener(eventType, adapterHandler, options);
        this._modeEventListenerList.push(
            [target, eventType, adapterHandler, options]);
    }
    get consoleFrame() {
        return this._consoleFrame;
    }
    showConsole(requestMode, mode, defaultCommand) {
        if (!this._consoleFrame) {
            return Promise.reject("console frame is not loaded yet");
        }
        const options = { mode, defaultCommand, keyMap: this._consoleKeyMap };
        return this._sendConsoleMessage({ command: "setConsoleMode", options })
            .then((result) => {
                if (this._mode !== requestMode) { // Maybe mode is changed.
                    return false;
                }
                if (this._consoleTimerId !== 0) {
                    clearTimeout(this._consoleTimerId);
                    this._consoleTimerId = 0;
                }
                if (this._fixedMessage) {
                    this._fixedMessage = undefined;
                }
                this._consoleFrame.classList.add("wimpulation-console-mode");
                this._consoleFrame.classList.add("wimpulation-show-console");
                const activeElement = document.activeElement;
                if (activeElement) {
                    // Can not focus a frame if an element in another frame is
                    // already focused.
                    activeElement.blur();
                }
                this._consoleFrame.focus();
                return true;
            })
            .catch((error) => {
                if (this._mode !== requestMode) { // Maybe mode is changed.
                    return false;
                }
                return Promise.reject(error);
            });
    }
    showMessage(message, saveMessage=true) {
        if (!this.isTopFrame()) {
            this._port.postMessage(
                { command: "showMessage", message, saveMessage, fixed: false });
            return;
        }
        if (!this._consoleFrame) {
            return;
        }
        const CLASS_NAME = "wimpulation-show-console";
        if (saveMessage) {
            this._lastMessage = message;
        }
        this._sendConsoleMessage({ command: "setMessage", message })
            .then((result) => {
                if (this._consoleTimerId !== 0) {
                    clearTimeout(this._consoleTimerId);
                }
                this._consoleFrame.classList.add(CLASS_NAME);
                this._consoleTimerId = setTimeout(() => {
                    if (this._consoleTimerId !== 0) {
                        this._consoleTimerId = 0;
                        if (this._fixedMessage) {
                            this.showFixedMessage(this._fixedMessage);
                        }
                        else {
                            this._consoleFrame.classList.remove(CLASS_NAME);
                        }
                    }
                }, 3000);
            });
    }
    showFixedMessage(message) {
        if (!this.isTopFrame()) {
            this._port.postMessage(
                { command: "showMessage", message, fixed: true });
            return;
        }
        if (!this._consoleFrame) {
            return;
        }
        const CLASS_NAME = "wimpulation-show-console";
        this._fixedMessage = message;
        this._sendConsoleMessage({ command: "setMessage", message })
            .then((result) => {
                if (this._consoleTimerId !== 0) {
                    clearTimeout(this._consoleTimerId);
                }
                this._consoleFrame.classList.add(CLASS_NAME);
            });
    }
    showLastMessage() {
        if (this._lastMessage !== "") {
            this.showMessage(this._lastMessage);
        }
    }
    hideConsole() {
        this._consoleFrame.blur();
        this._consoleFrame.classList.remove("wimpulation-console-mode");
        // If showing message, showMessage has a responsibility to close.
        if (this._consoleTimerId !== 0) {
            return;
        }
        this._consoleFrame.classList.remove("wimpulation-show-console");
    }
    hideFixedMessage() {
        if (!this.isTopFrame()) {
            this._port.postMessage({ command: "hideFixedMessage" });
            return;
        }
        this._fixedMessage = undefined;
        this.hideConsole();
    }
    markPosition(key, position) {
        this._markPositionMap[key] = position;
    }
    getPosition(key) {
        return this._markPositionMap[key];
    }

    _createMode(mode, data=undefined) {
        try {
            switch (mode) {
                case "NORMAL":
                    return new NormalMode(this, this._normalKeyMap, data);
                case "INSERT":
                    return new InsertMode(this, this._insertKeyMap, data);
                case "HINT":
                    return new HintMode(this, data);
                case "VISUAL":
                    return new VisualMode(this, this._visualKeyMap, data);
                case "CARET":
                    return new CaretMode(this, this._visualKeyMap, data);
                case "CONSOLE":
                    return new ConsoleMode(this, data);
                case "SUSPEND":
                    return new SuspendMode(this);
                default:
                    console.assert(false, "never reach here");
                    return new NormalMode(this, this._normalKeyMap);
            }
        }
        catch (e) {
            console.warn("change mode error:", Utils.errorString(e));
            return new NormalMode(this, this._normalKeyMap);
        }
    }
    _resetMode() {
        for (const [target, eventType, handler, options]
            of this._modeEventListenerList) {
            target.removeEventListener(eventType, handler, options);
        }
        this._modeEventListenerList = [];
        this._mode.onReset(this);
    }
    _createConsoleFrame() {
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
            consoleFrame.src = browser.runtime.getURL("console/console.html");
            consoleFrame.onload = () => {
                this._consoleFrame = consoleFrame;
            };
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
    _sendConsoleMessage(msg) {
        return this._port.sendMessage(
            { command: "sendConsoleMessage", data: msg });
    }
}

