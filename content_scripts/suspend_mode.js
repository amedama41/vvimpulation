'use strict';

class SuspendMode {
    constructor(frameInfo, leaveKey) {
        this._leaveKey = leaveKey;
        frameInfo.showMessage(`-- ${this.constructor.getModeName()} --`, 0);
    }
    static getModeName() {
        return "SUSPEND";
    }
    getTarget() {
        return null;
    }
    consume(key, frameInfo) {
        if (key === this._leaveKey) {
            return [true, undefined, "toNormalMode", undefined];
        }
        else {
            return [false, undefined, undefined, undefined];
        }
    }
    onReset(frameInfo) {
        frameInfo.hideFixedMessage();
    }
    onInvoking(cmdName, frameInfo) {
        frameInfo.postMessage({ command: "toNormalMode" });
    }
    onDropKeys(dropKeys) {
    }
    onNonConsumed(key, frameInfo) {
        return frameInfo.ignore();
    }
}

