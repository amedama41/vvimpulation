class ConsoleMode {
    constructor(frameInfo, options) {
        this.consoleFrame = document.getElementById("wimpulation-console");
        if (!this.consoleFrame) {
            throw new Error("Console frame is not loaded yet");
        }
        this.lastFocusedElem = document.activeElement;

        frameInfo.sendConsoleMessage(
            { command: "setConsoleMode", options: options })
            .then((result) => {
                // Maybe current mode is not already console.
                if (frameInfo.isCurrentMode(this)) {
                    // activeElement may be null (e.g. about:blank).
                    if (this.lastFocusedElem) {
                        this.lastFocusedElem.blur();
                    }
                    this.consoleFrame.classList.add("wimpulation-show-console");
                    this.consoleFrame.focus();
                }
            })
            .catch((result) => {
                // Maybe current mode is not already console.
                if (frameInfo.isCurrentMode(this)) {
                    frameInfo.changeMode("NORMAL");
                }
            });
    }
    getTarget() {
        return this.consoleFrame;
    }
    onReset() {
        // Reset focus only when console frame is focused.
        // If search succeeds or user click elements outside of console,
        // frame is not focused.
        if (document.activeElement === this.consoleFrame) {
            try {
                // Need blur because lastFocusedElem may not be focusable.
                this.consoleFrame.blur();
                if (this.lastFocusedElem) {
                    const x = window.scrollX;
                    const y = window.scrollY;
                    this.lastFocusedElem.focus();
                    // Restore position which was changed by focus
                    window.scrollTo(x, y);
                }
            }
            catch (e) {
                console.warn(
                    "lastFocusedElem is likely dead:", Utils.errorString(e));
            }
        }
        this.consoleFrame.classList.remove("wimpulation-show-console");
    }
    onKeyEvent(key, frameInfo) {
        return true;
    }
    onMessageEvent(msg, frameInfo) {
        switch (msg.command) {
            case "hideConsole":
                frameInfo.changeMode("NORMAL");
                if (msg.reason) {
                    this._showMessage(msg.reason, frameInfo);
                }
                break;
            default:
                console.log("Unknown message command:", msg.command);
                break;
        }
    }
    _showMessage(message, frameInfo) {
        const CLASS_NAME = "wimpulation-show-console";
        frameInfo.sendConsoleMessage({ command: "setMessage", message })
            .then((result) => {
                this.consoleFrame.classList.add(CLASS_NAME);
                setTimeout(() => {
                    this.consoleFrame.classList.remove(CLASS_NAME);
                }, 3000);
            });
    }
}

