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
            frameInfo.changeModeFrom(this, "NORMAL");
        });
        if (document.readyState === "loading") {
            this._observeActiveElement("DOMContentLoaded", frameInfo);
        }
        if (document.readyState !== "complete") {
            this._observeActiveElement("load", frameInfo);
        }
    }
    _observeActiveElement(type, frameInfo) {
        frameInfo.setEventListener(window, type, (e) => {
            setTimeout(() => {
                if (document.activeElement !== this.consoleFrame) {
                    document.activeElement.blur();
                    this.consoleFrame.focus();
                }
            }, 0);
        }, { capture: true, once: true });
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
        return frameInfo.sendMessage({
            command: "search", keyword, backward, frameId: this._frameId
        });
    }
}

