class FrameIdInfo {
    constructor(selfFrameId) {
        this._selfFrameId = selfFrameId;
        this._childFrameIdMap = new Map();
        this._registerIntervalId = 0;

        window.addEventListener("message", (msgEvent) => {
            this._handleFrameMessage(msgEvent);
        }, true);
        window.addEventListener("unload", (event) => {
            this._unregisterToParent();
        }, { capture: true, once: true });
        this._startRegisterToParent();
    }
    getSelfFrameId() {
        return this._selfFrameId;
    }
    getChildFrameId(childWindow) {
        return this._childFrameIdMap.get(childWindow);
    }

    _startRegisterToParent() {
        const parentWin = window.parent;
        if (parentWin === window) {
            return;
        }
        this._registerIntervalId = window.setInterval(() => {
            parentWin.postMessage(
                { type: "registerChild", frameId: this._selfFrameId }, "*");
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
        if (!FrameIdInfo._isChildFrame(sourceWindow)
            || !data.frameId || !Number.isInteger(data.frameId)) {
            return;
        }
        const frameId = data.frameId;
        this._childFrameIdMap.set(sourceWindow, frameId);
        sourceWindow.postMessage({ type: "completeRegisterChild" }, "*");
    }
    _unregisterChild(sourceWindow) {
        this._childFrameIdMap.delete(sourceWindow);
    }
    _stopRegisterToParent(sourceWindow) {
        if (sourceWindow !== window.parent) {
            return;
        }
        if (this._registerIntervalId !== 0) {
            window.clearInterval(this._registerIntervalId);
            this._registerIntervalId = 0;
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

class FrameInfo {
    constructor(selfFrameId, port, modeName) {
        this._suspend = false;
        this._frameIdInfo = new FrameIdInfo(selfFrameId);
        this._port = port;
        this._lastCommand = [undefined, undefined];
        this._modeEventListenerList = [];
        this._mode = this._createMode(modeName);
        this._consoleFrame = undefined;
        this._consoleTimerId = 0;
        this._lastMessage = "";
        if (this.isTopFrame()) {
            this._createConsoleFrame();
        }
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

        if (key === '<C-Z>') {
            this._suspend = !this._suspend;
            return;
        }
        if (this._suspend) {
            return;
        }

        if (this._mode.onKeyEvent(key, this)) {
            keyEvent.preventDefault();
            keyEvent.stopPropagation();
        }
    }
    handleMessage(msg) {
        return this._mode.onMessageEvent(msg, this);
    }
    isCurrentModeClass(modeClass) {
        return this._mode instanceof modeClass;
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
    get lastCommand() {
        return this._lastCommand;
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
        const options = { mode, defaultCommand };
        return this._sendConsoleMessage({ command: "setConsoleMode", options })
            .then((result) => {
                if (this._mode !== requestMode) { // Maybe mode is changed.
                    return false;
                }
                if (this._consoleTimerId !== 0) {
                    clearTimeout(this._consoleTimerId);
                    this._consoleTimerId = 0;
                }
                this._consoleFrame.classList.add("wimpulation-show-console");
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
    showMessage(message) {
        if (!this.isTopFrame()) {
            this._port.postMessage({ command: "showMessage", message });
            return;
        }
        if (!this._consoleFrame) {
            return;
        }
        const CLASS_NAME = "wimpulation-show-console";
        this._lastMessage = message;
        this._sendConsoleMessage({ command: "setMessage", message })
            .then((result) => {
                if (this._consoleTimerId !== 0) {
                    clearTimeout(this._consoleTimerId);
                }
                this._consoleFrame.classList.add(CLASS_NAME);
                this._consoleTimerId = setTimeout(() => {
                    if (this._consoleTimerId !== 0) {
                        this._consoleFrame.classList.remove(CLASS_NAME);
                        this._consoleTimerId = 0;
                    }
                }, 3000);
            });
    }
    showLastMessage() {
        if (this._lastMessage !== "") {
            this.showMessage(this._lastMessage);
        }
    }
    hideConsole() {
        this._consoleFrame.blur();
        // If showing message, showMessage has a responsibility to close.
        if (this._consoleTimerId !== 0) {
            return;
        }
        this._consoleFrame.classList.remove("wimpulation-show-console");
    }

    _createMode(mode, data=undefined) {
        try {
            switch (mode) {
                case "NORMAL":
                    return new NormalMode(this, NORMAL_KEY_MAP, data);
                case "INSERT":
                    return new InsertMode(this, INSERT_KEY_MAP, data);
                case "HINT":
                    return new HintMode(this, data);
                case "VISUAL":
                    return new VisualMode(this, VISUAL_KEY_MAP, data);
                case "CARET":
                    return new CaretMode(this, VISUAL_KEY_MAP, data);
                case "CONSOLE":
                    return new ConsoleMode(this, data);
                default:
                    console.assert(false, "never reach here");
                    return new NormalMode(this, NORMAL_KEY_MAP);
            }
        }
        catch (e) {
            console.warn("change mode error:", Utils.errorString(e));
            return new NormalMode(this, NORMAL_KEY_MAP);
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
            consoleFrame.src =
                browser.runtime.getURL("resources/ex_mode/ex_mode.html");
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

