'use strict';

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
        const [consumed, optCmd, cmd, dropKeyList] = this.mapper.get(key);
        if (optCmd) {
            this._invoke(optCmd, frameInfo);
        }
        else if (dropKeyList) {
            this._resetState();
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
            bottom: window.innerHeight, right: window.innerWidth
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
        gFrameInfo.showMessage(msg.message);
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

