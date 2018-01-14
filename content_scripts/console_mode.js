'use strict';

class ConsoleMode {
    constructor(frameInfo, options) {
        this.consoleFrame = frameInfo.consoleFrame;
        if (!this.consoleFrame) {
            throw new Error("Console frame is not loaded yet");
        }
        this.lastFocusedElem = document.activeElement;

        const { mode, defaultInput, frameId } = options;
        frameInfo.showConsole(this, mode, defaultInput, frameId).catch((e) => {
            console.error("showConsole error: " + Utils.errorString(e));
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

