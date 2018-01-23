'use strict';

class ConsoleMode {
    constructor(frameInfo, options) {
        this.consoleFrame = frameInfo.consoleFrame;
        if (!this.consoleFrame) {
            throw new Error("Console frame is not loaded yet");
        }
        this.lastFocusedElem = document.activeElement;

        const { mode, defaultInput, frameId } = options;
        this._mode = mode;
        this._frameId = frameId;
        frameInfo.showConsole(this, mode, defaultInput).catch((e) => {
            console.error("ShowConsole error:", Utils.errorString(e));
            frameInfo.changeMode("NORMAL");
        });
    }
    static getModeName() {
        return "CONSOLE";
    }
    getTarget() {
        return this.consoleFrame;
    }
    consume(key, frameInfo) {
        return [false, undefined, undefined, undefined];
    }
    onReset(frameInfo) {
        const isConsoleFocued = (document.activeElement === this.consoleFrame);
        frameInfo.hideConsole();
        // Reset focus only when console frame is focused.
        // If search succeeds or user click elements outside of console,
        // frame is not focused.
        if (isConsoleFocued) {
            if (this.lastFocusedElem) {
                DomUtils.fixedFocus(this.lastFocusedElem);
            }
        }
    }
    onInvoking(cmd, frameInfo) {
    }
    onDropKeys(dropKeys) {
    }
    onNonConsumed(key, frameInfo) {
    }
    onMessageEvent(msg, frameInfo) {
        switch (msg.command) {
            case "hideConsole":
                this._invoke(msg.value, frameInfo).then((message) => {
                    if (message) {
                        frameInfo.showMessage(message);
                    }
                    frameInfo.changeModeNow("NORMAL");
                });
                break;
            default:
                console.warn("Unknown message command:", msg.command);
                break;
        }
    }
    _invoke(value, frameInfo) {
        if (!value || value.trim() === "") {
            return Promise.resolve();
        }
        switch (this._mode) {
            case "exec":
                return this._execute(value, frameInfo);
            case "forwardSearch":
                return this._search(value, false, frameInfo);
            case "backwardSearch":
                return this._search(value, true, frameInfo);
            default:
                return Promise.resolve("Invalid mode");
        }
    }
    _execute(cmd, frameInfo) {
        const prefix = cmd.charAt(0);
        if (prefix === "/" || prefix === "?") {
            return this._search(cmd.substr(1), prefix === '?', frameInfo);
        }
        return frameInfo.sendMessage({
            command: "execCommand", cmd
        }).then((result) => {
            if (result && !browser.extension.inIncognitoContext) { // TODO
                ConsoleMode._save("command_history", cmd);
            }
            if (typeof(result) === "boolean") {
                return null;
            }
            return result;
        }).catch((error) => {
            return error;
        });
    }
    _search(keyword, backward, frameInfo) {
        return frameInfo.sendMessage({
            command: "find", keyword, backward, frameId: this._frameId
        }).then((result) => {
            if (!browser.extension.inIncognitoContext) {
                ConsoleMode._save("search_history", keyword);
            }
            if (!result) {
                return "Pattern not found: " + keyword;
            }
        }).catch((error) => {
            return error;
        });
    }
    static _save(key, item) {
        browser.storage.local.get({ [key]: [] }).then((result) => {
            const history = result[key];
            if (history.length > 0 && history[0] === item) {
                // Not save the same command as previous.
                return;
            }
            history.length = Math.min(history.length + 1, 100);
            history.copyWithin(1, 0, history.length);
            history[0] = item;
            browser.storage.local.set(result);
        }).catch ((error) => {
            console.error("Failed to save history:", key, item);
        });
    }
}

