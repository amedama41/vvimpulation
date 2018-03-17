'use strict';

class ConsoleMode {
    constructor(frameInfo, options) {
        const { mode, defaultInput, passURL } = options;
        this._mode = mode;
        frameInfo.showConsole(this, mode, defaultInput, passURL).catch((e) => {
            console.error("ShowConsole error:", Utils.errorString(e));
            frameInfo.changeModeFrom(this, "NORMAL");
        });
    }
    static getModeName() {
        return "CONSOLE";
    }
    getTarget() {
        return null;
    }
    consume(key, frameInfo) {
        return [false, undefined, undefined, undefined];
    }
    onReset(frameInfo) {
        frameInfo.hideConsole();
    }
    onInvoking(cmd, frameInfo) {
    }
    onDropKeys(dropKeys) {
    }
    onNonConsumed(key, frameInfo) {
    }
    onMessageEvent(msg, frameInfo) {
        switch (msg.command) {
            case "finishConsole":
                this._execute(msg.value, frameInfo).catch((error) => {
                    frameInfo.showMessage(error);
                }).then((message) => {
                    frameInfo.changeModeFrom(this, "NORMAL");
                });
                break;
            default:
                console.warn("Unknown message command:", msg.command);
                break;
        }
    }
    _execute(value, frameInfo) {
        if (!value || value.trim() === "") {
            return Promise.resolve();
        }
        switch (this._mode) {
            case "exec":
                return this._executeConsoleCommand(value, frameInfo);
            case "forwardSearch":
                return this._search(value, false, frameInfo);
            case "backwardSearch":
                return this._search(value, true, frameInfo);
            default:
                return Promise.resolve("Invalid mode");
        }
    }
    _executeConsoleCommand(cmd, frameInfo) {
        const prefix = cmd.charAt(0);
        if (prefix === "/" || prefix === "?") {
            return this._search(cmd.substr(1), prefix === '?', frameInfo);
        }
        return frameInfo.sendMessage({ command: "execCommand", cmd });
    }
    _search(keyword, backward, frameInfo) {
        return frameInfo.sendMessage({ command: "search", keyword, backward });
    }
}

