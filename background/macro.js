'use strict';

class MacroManager {
    constructor() {
        this.registerMap = {};
        this.recordConsoleCommand = undefined;
        this.recordRegister = undefined;
        this.recordKeyList = undefined;
        this.recordTabInfo = undefined;
        this.playKeyList = undefined;
        this.previousPlayRegister = undefined;
        browser.storage.local.get({ registers: {} }).then(({ registers }) => {
            this.registerMap = registers;
        });
    }
    set lastConsoleCommand(cmd) {
        this.recordConsoleCommand = cmd;
    }
    start(register, tabInfo) {
        if (this.recordRegister) {
            this.stop(true);
        }
        if (/[A-Z]/.test(register)) {
            register = register.toLowerCase();
            this.recordKeyList = this.registerMap[register] || [];
        }
        else {
            this.recordKeyList = [];
        }
        this.recordRegister = register;
        this.recordTabInfo = tabInfo;
        this.recordTabInfo.forEachPort((port, id) => {
            forwardModeCommand(port, "NORMAL", { command: "startMacro" });
        });
    }
    stop(sendStopMessage) {
        if (!this.recordRegister) {
            return;
        }
        this.registerMap[this.recordRegister] = this.recordKeyList;
        browser.storage.local.set({ registers: this.registerMap });
        if (sendStopMessage) {
            this.recordTabInfo.forEachPort((port, id) => {
                forwardModeCommand(port, "NORMAL", { command: "stopMacro" });
            });
        }
        this.recordRegister = undefined;
        this.recordKeyList = undefined;
        this.recordTabInfo = undefined;
    }
    record(key) {
        if (this.recordKeyList) {
            this.recordKeyList.push(key);
        }
        else {
            console.warn("Not start macro");
        }
    }
    play(register, frameId, tabInfo, options) {
        if (this.playKeyList) {
            return; // Prevent recursive macro playing.
        }
        if (register === "@") {
            if (!this.previousPlayRegister) {
                return;
            }
            register = this.previousPlayRegister;
        }
        else {
            if (/[A-Z]/.test(register)) {
                register = register.toLowerCase();
            }
            this.previousPlayRegister = register;
        }

        if (register === ":") {
            if (this.recordConsoleCommand) {
                return tabInfo.executeCommand(
                    this.recordConsoleCommand, frameId, options);
            }
            return;
        }

        this.playKeyList = this.registerMap[register];
        if (!this.playKeyList) {
            return;
        }
        const sendKey = (index, frameId) => {
            if (index == this.playKeyList.length) {
                this.playKeyList = undefined;
                return;
            }
            return tabInfo.forwardModeCommand(frameId, "NORMAL", {
                command: "playMacro", key: this.playKeyList[index]
            }).then(() => tabInfo.focusedFrameId()).then((frameId) => {
                return sendKey(index + 1, frameId)
            }).catch(() => {
                this.playKeyList = undefined;
            });
        };
        return sendKey(0, frameId);
    }
    isRecord(tabId) {
        return (this.recordTabInfo && this.recordTabInfo.id === tabId);
    }
    getRegisters() {
        return Object.keys(this.registerMap)
            .sort()
            .map((register) => [register, this.registerMap[register]]);
    }
}

