'use strict';

class SuspendMode {
    constructor(frameInfo) {
        frameInfo.showFixedMessage(`-- ${this.constructor.getModeName()} --`);
    }
    static getModeName() {
        return "SUSPEND";
    }
    getTarget() {
        return null;
    }
    consume(key, frameInfo) {
        if (key === "<C-[>") { // TODO: to configure options
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
        return !invokeCommand(cmdName, 0, frameInfo);
    }
    onDropKeys(dropKeys) {
    }
    onNonConsumed(key) {
        return false;
    }
}

