'use strict';

class ConsoleMode {
    constructor(frameInfo, options) {
        this.consoleFrame = frameInfo.consoleFrame;
        if (!this.consoleFrame) {
            throw new Error("Console frame is not loaded yet");
        }
        this.lastFocusedElem = document.activeElement;

        frameInfo.showConsole(this, options.mode, options.defaultCommand)
            .catch((error) => {
                frameInfo.changeMode("NORMAL");
            });
    }
    getTarget() {
        return this.consoleFrame;
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
    onKeyEvent(key, frameInfo) {
        return true;
    }
    onMessageEvent(msg, frameInfo) {
        switch (msg.command) {
            case "hideConsole":
                if (msg.reason) {
                    frameInfo.showMessage(msg.reason);
                }
                frameInfo.changeMode("NORMAL");
                break;
            default:
                console.log("Unknown message command:", msg.command);
                break;
        }
    }
}

