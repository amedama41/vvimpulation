"use strict";

browser.runtime.onInstalled.addListener((details) => {
    if (details.reason === "install") {
        browser.storage.local.set({ "options": DEFAULT_OPTIONS });
    }
});

class TabInfo {
    constructor(tab) {
        this.tab = tab;
        this.mode = "NORMAL";
        this.frameInfoMap = new Map();
        this.consolePort = undefined;
        this._consoleFrameId = undefined;
        this.modeInfo = undefined;
        this._frameIdListCache = [undefined];
        this._lastSearchInfo = ["", false, false, 0];
    }
    reset() {
        this.mode = "NORMAL";
        this.frameInfoMap.clear();
        this.consolePort = undefined;
        this._consoleFrameId = undefined;
        this.modeInfo = undefined;
        this._frameIdListCache = [undefined];
    }
    get id() {
        return this.tab.id;
    }
    get windowId() {
        return this.tab.windowId;
    }
    set windowId(id) {
        this.tab.windowId = id;
    }
    get incognito() {
        return this.tab.incognito;
    }
    get consoleFrameId() {
        return this._consoleFrameId;
    }
    update(tab) {
        this.tab = tab;
    }
    getMode() {
        return this.mode;
    }
    setMode(mode, modeInfo) {
        this.mode = mode;
        this.modeInfo = modeInfo;
    }
    frameIdList(continuation) {
        if (this._frameIdListCache) {
            return Promise.resolve(this._frameIdListCache).then(continuation);
        }
        else {
            return this.sendMessage(0, { command: "collectFrameId" })
                .then((frameIdList) => {
                    this._frameIdListCache = frameIdList;
                    return continuation(frameIdList);
                });
        }
    }
    get lastSearchInfo() {
        return this._lastSearchInfo;
    }
    set lastSearchInfo(lastSearchInfo) {
        this._lastSearchInfo = lastSearchInfo;
    }
    setPort(frameId, port) {
        this._frameIdListCache = undefined;
        this.frameInfoMap.set(frameId, port);
    }
    deletePort(frameId, port) {
        this._frameIdListCache = undefined;
        const p = this.frameInfoMap.get(frameId);
        if (p !== port) {
            // This case occurs when port is overwrite by new frame's port.
            if (p) {
                console.warn(`missmatch ${this.id}-${frameId} port`);
            }
            return false;
        }
        return this.frameInfoMap.delete(frameId);
    }
    forEachPort(func) {
        this.frameInfoMap.forEach(func);
    }
    postMessage(frameId, msg) {
        const port = this.frameInfoMap.get(frameId);
        if (!port) {
            console.warn(`port ${this.id}-${frameId} is already disconnected`);
            return false;
        }
        port.postMessage(msg);
        return true;
    }
    sendMessage(frameId, msg) {
        const port = this.frameInfoMap.get(frameId);
        if (!port) {
            return Promise.reject(
                `port ${this.id}-${frameId} is already disconnected`);
        }
        return port.sendMessage(msg);
    }
    forwardModeCommand(frameId, mode, data) {
        const port = this.frameInfoMap.get(frameId);
        if (!port) {
            return Promise.reject(
                `port ${this.id}-${frameId} is already disconnected`);
        }
        return forwardModeCommand(port, mode, data);
    }
    showMessage(message, duration, saveMessage) {
        this.sendMessage(
            0, { command: "showMessage", message, duration, saveMessage });
    }
    setConsolePort(port, frameId) {
        this.consolePort = port;
        this._consoleFrameId = frameId;
    }
    sendConsoleMessage(msg) {
        if (!this.consolePort) {
            return Promise.reject(
                `console port ${this.id} is not connected yet`);
        }
        return this.consolePort.sendMessage(msg);
    }
    clearConsolePort(port) {
        if (this.consolePort === port) {
            this.consolePort = undefined;
            this._consoleFrameId = undefined;
        }
    }
}
function forwardModeCommand(port, mode, data) {
    return port.sendMessage({ command: "forwardModeCommand", mode, data });
}

const gTabInfoMap = new Map();
const gLastCommand = [undefined, 0];
const gOptions = {
    keyMapping: undefined, hintPattern: undefined, hintKeyMapping: undefined
};

class HintMode {
    constructor(type, autoFocus, overlapHintLabels) {
        this.type = type;
        this.filter = "";
        this.filterIndexMap = []; // displayed index => global index
        this.idList = []; // global index => frame id
        this.currentIndex = 0; // current displayed index
        this.autoFocus = autoFocus;
        this.overlap = overlapHintLabels;
        this.mapper = Utils.makeCommandMapper(gOptions.hintKeyMapping);
    }
    handle(key, sender, tabInfo) {
        if (key.length === 1 && "0" <= key && key <= "9") {
            this._handleDigit(key, tabInfo);
            return;
        }
        const [consumed, optCmd, cmd, dropKeyList] = this.mapper.get(key);
        if (optCmd) {
            this._invoke(optCmd, tabInfo);
        }
        if (cmd) {
            this._invoke(cmd, tabInfo);
        }
        else if (!consumed) {
            changeNormalMode(tabInfo, sender.frameId, [key]);
        }
    }
    getOverlap() {
        return this.overlap;
    }
    setIdList(idList, index) {
        this.idList = idList;
        this.filterIndexMap = this.idList.map((id, index) => index);
        this.filter = "";
        this.currentIndex = index;
        this.mapper.reset();
    }
    applyFilter(filter, sender, tabInfo) {
        const msg = { command: "applyFilter", filter };
        tabInfo.forEachPort((port, id) => {
            forwardModeCommand(port, "HINT", msg);
        });
    }
    stopFilter(result, filter, sender, tabInfo) {
        if (!result) {
            this.applyFilter(this.filter, sender, tabInfo);
            return;
        }
        if (filter === this.filter) {
            return;
        }
        this._fixFilter(tabInfo).then((hasMatchingElements) => {
            if (hasMatchingElements) {
                this.filter = filter;
            }
            else {
                const message = "No elements matched by " + filter;
                tabInfo.showMessage(message, 3000, false);
                this.applyFilter(this.filter, sender, tabInfo);
            }
        });
    }

    nextHint(tabInfo) {
        const nextIndex = (this.currentIndex + 1) % this.filterIndexMap.length;
        this._changeHintNum(nextIndex, tabInfo);
    }
    previousHint(tabInfo) {
        const length = this.filterIndexMap.length;
        const prevIndex = (this.currentIndex - 1 + length) % length;
        this._changeHintNum(prevIndex, tabInfo);
    }
    reconstruct(tabInfo) {
        const type = this.type;
        tabInfo.sendMessage(0, {
            command: "collectHint",
            type: type,
            pattern: gOptions.hintPattern["global"][type]
        }).then((hintsInfoList) => {
            const targetId =
                this.idList[this.filterIndexMap[this.currentIndex]];
            return tabInfo.forwardModeCommand(targetId, "HINT", {
                command: "getTargetIndex"
            }).then((targetIndex) => [hintsInfoList, targetId, targetIndex]);
        }).then(([hintsInfoList, targetId, targetIndex]) => {
            changeHintMode(tabInfo, hintsInfoList, this, targetId, targetIndex);
        }).catch((e) => {
            handleError(tabInfo, "reconstruct", e);
        });
    }
    startFilter(tabInfo) {
        tabInfo.forwardModeCommand(
            0, "HINT", { command: "startFilter", filter: this.filter });
    }
    toggleOverlap(tabInfo) {
        this.overlap = !this.overlap;
        const msg = { command: (this.overlap ? "setZIndex" : "clearZIndex") };
        tabInfo.forEachPort((port, id) => {
            forwardModeCommand(port, "HINT", msg);
        });
        const message = "Overlapping " + (this.overlap ? "ON" : "OFF");
        tabInfo.showMessage(message, 3000, false);
    }
    toggleAutoFocus(tabInfo) {
        this.autoFocus = !this.autoFocus;
        const message = "Auto focus " + (this.autoFocus ? "ON" : "OFF");
        tabInfo.showMessage(message, 3000, false);
    }
    invokeCommand(tabInfo, args) {
        const match = /^(\d+)\|(.*$)/.exec(args);
        const [count, commandName] =
            (match ? [parseInt(match[1], 10), match[2]] : [0, args]);
        const currentFrameId =
            this.idList[this.filterIndexMap[this.currentIndex]];
        tabInfo.forwardModeCommand(
            currentFrameId, "HINT", { command: "invoke", commandName, count });
    }

    _fixFilter(tabInfo) {
        const promiseList = [];
        const msg = { command: "getFilterResult" };
        tabInfo.forEachPort((port, id) => {
            promiseList.push(forwardModeCommand(port, "HINT", msg));
        });
        return Promise.all(promiseList).then((resultList) => {
            const filterResult = resultList.reduce((filterResult, result) => {
                Array.prototype.push.apply(filterResult, result);
                return filterResult;
            }).sort((lhs, rhs) => lhs[0] - rhs[0]);
            const [indexMap, labelMap] =
                HintMode._createFilterMaps(filterResult, this.idList);
            if (indexMap.length === 0) {
                return false;
            }
            this.filterIndexMap = indexMap;
            this.currentIndex = 0;
            tabInfo.forEachPort((port, id) => {
                forwardModeCommand(port, "HINT", {
                    command: "setHintLabel", labelList: labelMap[id]
                });
            });
            this._changeHintNum(this.currentIndex, tabInfo);
            return true;
        });
    }
    _invoke(cmd, tabInfo) {
        const index = cmd.indexOf("|");
        const command = (index === -1 ? cmd : cmd.substr(0, index));
        const args = cmd.substr(command.length + 1);
        this[command](tabInfo, args);
    }
    _handleDigit(num, tabInfo) {
        const length = this.filterIndexMap.length;
        let index = this.currentIndex.toString() + num;
        while (index && parseInt(index, 10) >= length) {
            index = index.substring(1);
        }
        const nextIndex = (index ? parseInt(index, 10) : length - 1);

        this._changeHintNum(nextIndex, tabInfo);
    }
    _changeHintNum(nextDisplayedIndex, tabInfo) {
        const prevId = this.idList[this.filterIndexMap[this.currentIndex]];
        const nextIndex = this.filterIndexMap[nextDisplayedIndex];
        const nextId = this.idList[nextIndex];
        if (prevId !== nextId) {
            tabInfo.forwardModeCommand(
                prevId, "HINT", { command: "blurHintLink", });
        }
        tabInfo.forwardModeCommand(nextId, "HINT", {
            command: "focusHintLink",
            index: nextIndex, autoFocus: this.autoFocus
        });
        this.currentIndex = nextDisplayedIndex;
    }
    static _createFilterMaps(filterResult, idList) {
        const filterIndexMap = [];
        const labelMap = {};
        filterResult.forEach(([index, filter]) => {
            const frameId = idList[index];
            if (!labelMap[frameId]) {
                labelMap[frameId] = [];
            }
            if (filter) {
                labelMap[frameId].push(filterIndexMap.length);
                filterIndexMap.push(index);
            }
            else {
                labelMap[frameId].push("-");
            }
        });
        return [filterIndexMap, labelMap];
    }
}

function handleError(tabInfo, func, error) {
    console.error(`${func}: ${Utils.errorString(error)}`);
    tabInfo.showMessage(
        `${func} error (${(error || "some error occured").toString()})`,
        3000, true);
}

function selectTab(tabInfo, getIndex) {
    return browser.tabs.query({ windowId: tabInfo.windowId }).then((tabs) => {
        const currentTab = tabs.find((tab) => tab.id === tabInfo.id);
        const index = getIndex(currentTab.index, tabs.length);
        return browser.tabs.update(tabs[index].id, { active: true });
    });
}

function moveTab(tabId, distance, toLeft) {
    return browser.tabs.get(tabId).then((tab) => {
        return browser.tabs.query({
            pinned: tab.pinned, windowId: tab.windowId
        }).then((tabs) => {
            const cmpFunc = (toLeft
                ? (lhs, rhs) => rhs.index - lhs.index
                : (lhs, rhs) => lhs.index - rhs.index);
            tabs.sort(cmpFunc);
            const currIndex = tabs.findIndex((elem) => elem.id === tabId);
            if (currIndex === -1) {
                console.warn("not found tab", tabId);
                return;
            }
            const newIdx = tabs[(currIndex + distance) % tabs.length].index;
            return browser.tabs.move(
                tabId, { windowId: tab.windowId, index: newIdx });
        });
    });
}
function moveTabToWindow(tabInfo, distance) {
    return browser.windows.getAll({ windowTypes: ["normal"] }).then((wins) => {
        wins = wins.filter((win) => win.incognito === tabInfo.incognito);
        const index = wins.findIndex((win) => win.id === tabInfo.windowId);
        const nextWin = Utils.nextElement(wins, index, distance);
        if (nextWin === wins[index]) {
            return;
        }
        const tabId = tabInfo.id;
        const windowId = nextWin.id;
        return browser.tabs.move(tabId, { windowId, index: -1 }).then((tab) => {
            return Promise.all([
                browser.tabs.update(tabId, { active: true }),
                browser.windows.update(windowId, { focused: true }),
            ]);
        });
    }).catch((e) => {
        handleError(tabInfo, "moveTabToNextWindow", e);
    });
}

function findAllFrame(
    tabInfo, keyword, frameId, frameIdList, caseSensitive, backward) {
    const msg = { command: "find", keyword, caseSensitive, backward };
    const diff = (backward ? -1 : 1);
    const length = frameIdList.length;
    const startIndex = Math.max(frameIdList.indexOf(frameId), 0);
    const findFrame = (i) => {
        const index = (startIndex + i * diff + length) % length;
        msg.reset = (i !== 0);
        return tabInfo.sendMessage(frameIdList[index], msg)
            .then((result) => {
                if (result) {
                    return true;
                }
                if (i === length) {
                    return false;
                }
                else {
                    return findFrame(i + 1);
                }
            });
    };
    return findFrame(0);
}

function startFind(keyword, backward, frameId, tabInfo) {
    return tabInfo.frameIdList((frameIdList) => {
        const caseSensitive = /[A-Z]/.test(keyword);
        return findAllFrame(
            tabInfo, keyword, frameId, frameIdList, caseSensitive, backward)
            .then((result) => {
                tabInfo.lastSearchInfo = [keyword, caseSensitive, backward];
                return result;
            });
    });
}

function continueFind(tabInfo, frameId, isNext) {
    const [keyword, caseSensitive, backward] = tabInfo.lastSearchInfo;
    if (keyword === "") {
        return Promise.resolve();
    }
    return tabInfo.frameIdList((frameIdList) => {
        return findAllFrame(
            tabInfo, keyword, frameId, frameIdList,
            caseSensitive, (isNext ? backward : !backward))
            .then((result) => {
                if (!result) {
                    const message = "Pattern not found: " + keyword;
                    tabInfo.showMessage(message, 3000, false);
                }
            });
    });
}

function focusFrame(tabInfo, frameId, count) {
    tabInfo.frameIdList((frameIdList) => {
        const index = frameIdList.indexOf(frameId);
        tabInfo.sendMessage(
            Utils.nextElement(frameIdList, index, count),
            { command: "focusFrame" });
    });
}

class Command {
    /**
     * Commands for search
     */
    static find(msg, sender, tabInfo) {
        return startFind(msg.keyword, msg.backward, msg.frameId, tabInfo);
    }
    static findNext(msg, sender, tabInfo) {
        continueFind(tabInfo, sender.frameId, true).catch((e) => {
            handleError(tabInfo, "findNext", e);
        });
    }
    static findPrevious(msg, sender, tabInfo) {
        continueFind(tabInfo, sender.frameId, false).catch((e) => {
            handleError(tabInfo, "findPrevious", e);
        });
    }

    /**
     * Commands for focus manipulation
     */
    static focusNextFrame(msg, sender, tabInfo) {
        focusFrame(tabInfo, sender.frameId, Math.max(msg.count, 1));
    }
    static focusPreviousFrame(msg, sender, tabInfo) {
        focusFrame(tabInfo, sender.frameId, -Math.max(msg.count, 1));
    }

    /**
     * Commands for tab manipulation
     */
    static nextTab(msg, sender, tabInfo) {
        const count = msg.count;
        selectTab(
            tabInfo,
            (count === 0
                ? (index, tabLen) => (index + 1) % tabLen
                : (index, tabLen) => (count < tabLen) ?  count - 1 : index)
        ).catch((e) => {
            handleError(tabInfo, "nextTab", e);
        });
    }
    static previousTab(msg, sender, tabInfo) {
        const count = Math.max(msg.count, 1);
        selectTab(
            tabInfo,
            (index, tabLen) => (index + tabLen - (count % tabLen)) % tabLen
        ).catch((e) => {
            handleError(tabInfo, "previousTab", e);
        });
    }
    static firstTab(msg, sender, tabInfo) {
        selectTab(tabInfo, (index, tabLen) => 0).catch((e) => {
            handleError(tabInfo, "firstTab", e);
        });
    }
    static lastTab(msg, sender, tabInfo) {
        selectTab(tabInfo, (index, tabLen) => tabLen - 1).catch((e) => {
            handleError(tabInfo, "lastTab", e);
        });
    }
    static lastActivatedTab(msg, sender, tabInfo) {
        browser.tabs.query({ windowId: tabInfo.windowId }).then((tabs) => {
            tabs = tabs.filter((tab) => tab.id !== tabInfo.id);
            if (tabs.length === 0) {
                return;
            }
            const lastActivated = tabs.reduce((lhs, rhs) => {
                return (lhs.lastAccessed > rhs.lastAccessed ? lhs : rhs);
            });
            return browser.tabs.update(lastActivated.id, { active: true });
        }).catch((e) => {
            handleError(tabInfo, "lastActivatedTab", e);
        });
    }
    static moveTabToLeft(msg, sender, tabInfo) {
        moveTab(tabInfo.id, Math.max(msg.count, 1), true).catch((e) => {
            handleError(tabInfo, "moveTabToLeft", e);
        });
    }
    static moveTabToRight(msg, sender, tabInfo) {
        moveTab(tabInfo.id, Math.max(msg.count, 1), false).catch((e) => {
            handleError(tabInfo, "moveTabToRight", e);
        });
    }
    static moveTabToNewWindow(msg, sender, tabInfo) {
        browser.tabs.query({ windowId: tabInfo.windowId }).then((tabs) => {
            if (tabs.length > 1) {
                return browser.windows.create({ tabId: tabInfo.id });
            }
        }).catch((e) => {
            handleError(tabInfo, "moveTabToNewWindow", e);
        });
    }
    static moveTabToNextWindow(msg, sender, tabInfo) {
        moveTabToWindow(tabInfo, Math.max(msg.count, 1)).catch((e) => {
            handleError(tabInfo, "moveTabToNextWindow", e);
        });
    }
    static moveTabToPreviousWindow(msg, sender, tabInfo) {
        moveTabToWindow(tabInfo, -Math.max(msg.count, 1)).catch((e) => {
            handleError(tabInfo, "moveTabToPreviousWindow", e);
        });
    }
    static removeCurrentTab(msg, sender, tabInfo) {
        browser.tabs.remove(tabInfo.id).catch((e) => {
            handleError(tabInfo, "removeCurrentTab", e);
        });
    }
    static undoCloseTab(msg, sender, tabInfo) {
        const windowId = tabInfo.windowId;
        browser.sessions.getRecentlyClosed().then((sessions) => {
            const tabSessions = sessions.filter((s) => {
                return s.tab !== undefined && s.tab.windowId === windowId;
            });
            if (tabSessions.length === 0) {
                return;
            }
            const tab = tabSessions[Math.min(msg.count, tabSessions.length - 1)];
            return browser.sessions.restore(tab.tab.sessionId);
        }).catch((e) => {
            handleError(tabInfo, "undoCloseTab", e);
        });
    }
    static duplicateTab(msg, sender, tabInfo) {
        browser.tabs.duplicate(tabInfo.id).catch((e) => {
            handleError(tabInfo, "duplicateTab", e);
        });
    }
    static openTab(msg, sender, tabInfo) {
        browser.tabs.get(tabInfo.id).then((tab) => {
            return browser.tabs.create(
                { index: tab.index + 1, windowId: tab.windowId });
        }).catch((e) => {
            handleError(tabInfo, "openTab", e);
        });
    }

    /**
     * Commands for window manipulation
     */
    static removeCurrentWindow(msg, sender, tabInfo) {
        browser.windows.remove(tabInfo.windowId).catch((e) => {
            handleError(tabInfo, "removeCurrentWindow", e);
        });
    }

    /**
     * Commands for page load manipulation
     */
    static reload(msg, sender, tabInfo) {
        browser.tabs.reload(tabInfo.id).catch((e) => {
            handleError(tabInfo, "reload", e);
        });
    }
    static reloadSkipCache(msg, sender, tabInfo) {
        browser.tabs.reload(tabInfo.id, { bypassCache: true }).catch((e) => {
            handleError(tabInfo, "reloadSkipCache", e);
        });
    }

    /**
     * Commands for page zoom manipulation
     */
    static zoomIn(msg, sender, tabInfo) {
        const tabId = tabInfo.id;
        const count = Math.max(msg.count, 1);
        browser.tabs.getZoom(tabId).then((factor) => {
            return browser.tabs.setZoom(
                tabId, Math.min(factor + count / 10, 3));
        }).catch((e) => {
            handleError(tabInfo, "zoomIn", e);
        });
    }
    static zoomOut(msg, sender, tabInfo) {
        const tabId = tabInfo.id;
        const count = Math.max(msg.count, 1);
        browser.tabs.getZoom(tabId).then((factor) => {
            return browser.tabs.setZoom(
                tabId, Math.max(factor - count / 10, 0.3));
        }).catch((e) => {
            handleError(tabInfo, "zoomOut", e);
        });
    }
    static zoomReset(msg, sender, tabInfo) {
        browser.tabs.setZoom(tabInfo.id, 0).catch((e) => {
            handleError(tabInfo, "zoomReset", e);
        });
    }

    /**
     * Commands for link manipulation
     */
    static openLink(msg, sender, tabInfo) {
        browser.tabs.update(tabInfo.id, { url: msg.url }).catch((e) => {
            handleError(tabInfo, "openLink", e);
        });
    }
    static openLinkInTab(msg, sender, tabInfo) {
        browser.tabs.get(tabInfo.id).then((tab) => {
            const active = gOptions.activateNewTab;
            return browser.tabs.create({
                url: msg.url, openerTabId: tab.id,
                index: tab.index + 1, active: active
            });
        }).catch((e) => {
            handleError(tabInfo, "openLinkInTab", e);
        });
    }
    static downloadLink(msg, sender, tabInfo) {
        browser.tabs.get(tabInfo.id).then((tab) => {
            return browser.downloads.download({
                url: msg.url, incognito: tab.incognito, saveAs: true
            });
        }).catch((e) => {
            handleError(tabInfo, "downloadLink", e);
        });
    }

    /**
     * Commands for various applications
     */
    static killHover(msg, sender, tabInfo) {
        tabInfo.forEachPort((port, frameId) => port.sendMessage(msg));
    }

    /**
     * Commands for mode changing
     */
    static toSuspendMode(msg, sender, tabInfo) {
        const changeModeMsg = { command: "changeMode", mode: "SUSPEND" };
        tabInfo.forEachPort((port, frameId) => port.postMessage(changeModeMsg));
    }
    static toNormalMode(msg, sender, tabInfo) {
        changeNormalMode(tabInfo);
    }
    static toHintMode(msg, sender, tabInfo) {
        const type = msg.type;
        tabInfo.sendMessage(0, {
            command: "collectHint",
            type: type,
            pattern: gOptions.hintPattern["global"][type]
        }).then((hintsInfoList) => {
            changeHintMode(
                tabInfo, hintsInfoList,
                new HintMode(
                    type, gOptions.autoFocus, gOptions.overlapHintLabels))
        }).catch((e) => {
            handleError(tabInfo, "toHintMode", e);
        });
    }

    /**
     * Commands for repeatLastCommand
     */
    static setLastCommand(msg, sender, tabInfo) {
        if (msg.cmdName !== "repeatLastCommand") {
            gLastCommand[0] = msg.cmdName;
        }
        gLastCommand[1] = msg.count;
    }
    static getLastCommand(msg, sender, tabInfo) {
        return gLastCommand;
    }

    /**
     * Commands for macro
     */
    static startMacro(msg, sender, tabInfo) {
        gMacro.start(msg.key, tabInfo);
    }
    static recordMacro(msg, sender, tabInfo) {
        gMacro.record(msg.key);
    }
    static stopMacro(msg, sender, tabInfo) {
        gMacro.stop(true);
    }
    static playMacro(msg, sender, tabInfo) {
        gMacro.play(msg.key, sender.frameId, tabInfo);
    }

    /**
     * Commands for hint mode
     */
    static forwardHintKeyEvent(msg, sender, tabInfo) {
        if (tabInfo.getMode() !== "HINT") {
            return;
        }
        return tabInfo.modeInfo.handle(msg.key, sender, tabInfo);
    }
    static stopFilter(msg, sender, tabInfo) {
        if (tabInfo.getMode() !== "HINT") {
            return;
        }
        tabInfo.modeInfo.stopFilter(msg.result, msg.filter, sender, tabInfo);
    }

    /**
     * Commands for FrameInfo
     */
    static forwardFrameMessage(msg, sender, tabInfo) {
        return tabInfo.sendMessage(msg.frameId, msg.data);
    }
    static showMessage(msg, sender, tabInfo) {
        tabInfo.sendMessage(0, msg);
    }
    static hideFixedMessage(msg, sender, tabInfo) {
        tabInfo.sendMessage(0, msg);
    }
    static sendConsoleMessage(msg, sender, tabInfo) {
        return tabInfo.sendConsoleMessage(msg.data);
    }
    static registerChild(msg, sender, tabInfo) {
        const childFrameId = msg.frameId;
        return browser.webNavigation.getFrame({
            tabId: tabInfo.id, frameId: childFrameId
        }).then((result) => {
            if (result.parentFrameId !== sender.frameId) {
                return false;
            }
            return tabInfo.postMessage(childFrameId, {
                command: "completeChildRegistration", frameId: sender.frameId
            });
        });
    }
}

class MacroManager {
    constructor() {
        this.registerMap = {};
        this.recordRegister = undefined;
        this.recordKeyList = undefined;
        this.recordTabInfo = undefined;
        this.playKeyList = undefined;
        this.previousPlayRegister = undefined;
        browser.storage.local.get({ registers: {} }).then(({ registers }) => {
            this.registerMap = registers;
        });
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
    play(register, frameId, tabInfo) {
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
        this.playKeyList = this.registerMap[register];
        if (!this.playKeyList) {
            return;
        }
        const sendKey = (index) => {
            if (index == this.playKeyList.length) {
                this.playKeyList = undefined;
                return;
            }
            tabInfo.forwardModeCommand(frameId, "NORMAL", {
                command: "playMacro", key: this.playKeyList[index]
            }).then(() => {
                sendKey(index + 1);
            }).catch(() => {
                this.playKeyList = undefined;
            });
        };
        sendKey(0);
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
const gMacro = new MacroManager();

class ConsoleCommand {
    static find(msg, sender, tabInfo) {
        return startFind(msg.keyword, msg.backward, msg.frameId, tabInfo);
    }
    static execCommand(msg, sender, tabInfo) {
        return browser.tabs.get(tabInfo.id).then((tab) => {
            return gExCommandMap.execCommand(msg.cmd, tab, gOptions)
        });
    }
    static getCandidate(msg, sender, tabInfo) {
        return browser.tabs.get(tabInfo.id).then((tab) => {
            return gExCommandMap.getCandidate(msg.value, tab);
        });
    }
    static hideConsole(msg, sender, tabInfo) {
        return tabInfo.sendMessage(0, msg);
    }
    static applyFilter(msg, sender, tabInfo) {
        if (tabInfo.getMode() !== "HINT") {
            return;
        }
        tabInfo.modeInfo.applyFilter(msg.filter, sender, tabInfo);
    }
}

function changeHintMode(tabInfo, idList, hintMode, targetId, targetIndex=null) {
    if (idList.length === 0) {
        changeNormalMode(tabInfo);
        return;
    }
    if (targetIndex === null) {
        targetId = idList[0];
        targetIndex = 0;
    }
    const mode = "HINT";
    let labelMap = {};
    let globalTargetIndex = 0;
    let counter = 0;
    idList.forEach((id, index) => {
        if (!labelMap[id]) {
            labelMap[id] = [];
        }
        labelMap[id].push(index);
        if (id === targetId && counter++ === targetIndex) {
            globalTargetIndex = index;
        }
    });
    hintMode.setIdList(idList, globalTargetIndex);
    tabInfo.setMode(mode, hintMode);
    const setZIndex = hintMode.getOverlap();
    tabInfo.forEachPort((port, id) => {
        const data = { labelList: (labelMap[id] || []), setZIndex };
        if (id === targetId) {
            data.initIndex = targetIndex;
        }
        port.postMessage({ command: "changeMode", mode: mode, data });
    });
}

function changeNormalMode(tabInfo, frameId=undefined, data=undefined) {
    const mode = "NORMAL";
    tabInfo.setMode(mode);
    const msg = { command: "changeMode", mode: mode };
    tabInfo.forEachPort((port, id) => {
        if (id === frameId) {
            port.postMessage(Object.assign({ data: data }, msg));
        }
        else {
            port.postMessage(msg)
        }
    });
}

function normalizeHintPattern(hintPattern) {
    function normalizePatternMap(patternMap) {
        Object.keys(patternMap).forEach((type) => {
            patternMap[type] =
                patternMap[type].map(([pat, desc]) => pat).join(",");
        });
    }
    const local = hintPattern.local;
    Object.keys(local).forEach((host) => normalizePatternMap(local[host]));
    return hintPattern;
}

function getLocalHintPattern(url, hintPattern) {
    if (!url) {
        return null;
    }
    url = new URL(url);
    return hintPattern["local"][url.host] || null;
}

browser.tabs.onActivated.addListener((activeInfo) => {
    const tabInfo = gTabInfoMap.get(activeInfo.tabId);
    if (!tabInfo) {
        return;
    }
    changeNormalMode(tabInfo);
});
browser.tabs.onRemoved.addListener((tabId, removeInfo) => {
    gTabInfoMap.delete(tabId);
    if (gMacro.isRecord(tabId)) {
        gMacro.stop(false);
    }
});
browser.tabs.onAttached.addListener((tabId, attachInfo) => {
    const tabInfo = gTabInfoMap.get(tabId);
    if (!tabInfo) {
        return;
    }
    tabInfo.windowId = attachInfo.newWindowId;
});
function overwriteErrorPage(details) {
    if (details.frameId !== 0) {
        return;
    }
    const tabId = details.tabId;
    browser.tabs.get(tabId).then((tab) => {
        if (tab.status !== "complete" || tab.url !== details.url) {
            return;
        }
        if (details.error.endsWith("2152398850") || // Cancel loading
            details.error.endsWith("2153578529")) { // Show image
            return;
        }
        const url = browser.runtime.getURL("pages/error.html");
        browser.tabs.update(tabId, {
            url: `${url}?errorURL=${details.url}&errorCode=${details.error}`,
            loadReplace: true
        });
    });
}
function setOverwriteErrorPageListener() {
    const onErrorOccurred = browser.webNavigation.onErrorOccurred;
    if (!onErrorOccurred.hasListener(overwriteErrorPage)) {
        onErrorOccurred.addListener(
            overwriteErrorPage, { url: [{ schemes: ["http", "https"] }] });
    }
}
function removeOverwriteErrorPageListener() {
    const onErrorOccurred = browser.webNavigation.onErrorOccurred;
    if (onErrorOccurred.hasListener(overwriteErrorPage)) {
        onErrorOccurred.removeListener(overwriteErrorPage);
    }
}

function setOptions(options) {
    const getOption = (name) => options[name] || DEFAULT_OPTIONS[name];
    gOptions.keyMapping = options["keyMapping"];
    convertVisualKeyMapping(gOptions.keyMapping["visual"]);
    gOptions.consoleKeyMapping =
        convertConsoleKeyMapping(gOptions.keyMapping["console"]);
    delete gOptions.keyMapping["console"];
    gOptions.hintPattern = normalizeHintPattern(options["hintPattern"]);
    gOptions.hintKeyMapping = Utils.toPreparedCmdMap(
        convertHintKeyMapping(options.keyMapping["hint"]));
    delete gOptions.keyMapping["hint"];
    if (gOptions.keyMapping["suspend"] === undefined) {
        gOptions.keyMapping["suspend"] =
            DEFAULT_OPTIONS["keyMapping"]["suspend"];
    }
    setEngine(gEngineMap, options["searchEngine"]);
    gOptions.pagePattern = getOption("pagePattern");
    gOptions.consoleDesign = makeConsoleCSS(getOption("consoleDesign"));
    if (options["miscellaneous"].overwriteErrorPage) {
        setOverwriteErrorPageListener();
    }
    else {
        removeOverwriteErrorPageListener();
    }
    gOptions.autoFocus = options["miscellaneous"].autoFocus;
    gOptions.overlapHintLabels = options["miscellaneous"].overlapHintLabels;
    gOptions.autoKillHover = options["miscellaneous"].autoKillHover;
    gOptions.activateNewTab = options["miscellaneous"].activateNewTab;
}

browser.storage.local.get({ options: DEFAULT_OPTIONS }).then(({ options }) => {
    setOptions(options);

    browser.storage.onChanged.addListener((changes, areaName) => {
        if (!changes["options"]) {
            return;
        }
        const oldConsoleDesign = gOptions.consoleDesign;
        setOptions(changes["options"].newValue);
        const newConsoleDesign = gOptions.consoleDesign;
        const setKeyMappingMsg = {
            command: "setKeyMapping", keyMapping: gOptions.consoleKeyMapping
        };
        gTabInfoMap.forEach((tabInfo, tabId) => {
            tabInfo.forEachPort((port, frameId) => port.postMessage({
                command: "updateOptions",
                keyMapping: gOptions.keyMapping,
                hintPattern: getLocalHintPattern(
                    port.sender.url, gOptions.hintPattern),
                pagePattern: gOptions.pagePattern
            }));

            const frameId = tabInfo.consoleFrameId;
            if (frameId === undefined) {
                return;
            }
            browser.tabs.removeCSS(tabId, { frameId, code: oldConsoleDesign });
            browser.tabs.insertCSS(tabId, { frameId, code: newConsoleDesign });
            tabInfo.sendConsoleMessage(setKeyMappingMsg);
        });
    });

    browser.runtime.onConnect.addListener((port) => {
        port = new Port(port);
        const sender = port.sender;
        const tab = sender.tab;
        if (!tab) {
            console.warn("no tab exist");
            return;
        }
        const tabId = tab.id;
        if (tabId === browser.tabs.TAB_ID_NONE) {
            console.warn("TAB_ID_NONE:", tab.url);
            return;
        }
        const frameId = sender.frameId;

        if (port.name === "console") {
            setConsolePort(
                port, tabId, frameId,
                gOptions.consoleDesign, gOptions.consoleKeyMapping);
            return;
        }

        port.onNotification.addListener(invokeCommand);
        port.onRequest.addListener(invokeCommand);
        port.onDisconnect.addListener(
            cleanupFrameInfo.bind(null, tabId, frameId));

        if (!gTabInfoMap.has(tabId)) {
            gTabInfoMap.set(tabId, new TabInfo(tab));
        }
        const tabInfo = gTabInfoMap.get(tabId);
        tabInfo.update(tab);
        tabInfo.setPort(frameId, port);
        port.postMessage({
            command: "initFrame",
            frameId: frameId,
            keyMapping: gOptions.keyMapping,
            hintPattern: getLocalHintPattern(sender.url, gOptions.hintPattern),
            pagePattern: gOptions.pagePattern,
            autoKillHover: gOptions.autoKillHover,
            mode: tabInfo.getMode(),
        });
    });
}).catch((error) => {
    console.error(Utils.errorString(error || 'some error occured'));
});
function invokeCommand(msg, sender) {
    const tabInfo = gTabInfoMap.get(sender.tab.id);
    if (!tabInfo) {
        console.warn(`tabInfo for ${sender.tab.id} is not found`);
        return;
    }
    return Command[msg.command](msg, sender, tabInfo);
}
function cleanupFrameInfo(tabId, frameId, port, error) {
    console.debug(`Port(${tabId}-${frameId}) is disconnected: ${error}`);
    if (gMacro.isRecord(tabId)) {
        gMacro.stop(false);
    }
    const tabInfo = gTabInfoMap.get(tabId);
    if (!tabInfo) {
        if (frameId === 0) {
            console.warn(`tabInfo for ${tabId} is already deleted`);
        }
        return;
    }
    tabInfo.deletePort(frameId, port);
    if (frameId === 0) {
        tabInfo.reset();
    }
}
function setConsolePort(port, tabId, frameId, consoleDesign, keyMapping) {
    const tabInfo = gTabInfoMap.get(tabId);
    if (!tabInfo) {
        console.warn(`tabInfo for ${tabId} is not found`);
        return;
    }
    browser.tabs.insertCSS(tabId, { frameId, code: consoleDesign });
    port.onRequest.addListener(invokeConsoleCommand);
    port.onDisconnect.addListener(cleanupConsolePort.bind(null, tabId));
    tabInfo.setConsolePort(port, frameId);
    tabInfo.sendConsoleMessage({ command: "setKeyMapping", keyMapping });
}
function invokeConsoleCommand(msg, sender) {
    const tabInfo = gTabInfoMap.get(sender.tab.id);
    if (!tabInfo) {
        console.warn(`tabInfo for ${sender.tab.id} is not found`);
        return;
    }
    return ConsoleCommand[msg.command](msg, sender, tabInfo);
}
function cleanupConsolePort(tabId, port, error) {
    const tabInfo = gTabInfoMap.get(tabId);
    if (!tabInfo) {
        return;
    }
    tabInfo.clearConsolePort(port);
}
function makeConsoleCSS(consoleDesign) {
    return String.raw`
    body {
        border-top: 1px solid ${consoleDesign.borderColor};
    }
    body * {
        color: ${consoleDesign.fontColor};
        font-size: ${consoleDesign.fontSize};
    }
    body > * {
        background-color: ${consoleDesign.backgroundColor};
    }
    span.candidate_info {
        color: ${consoleDesign.informationColor};
    }
    #ex_candidates > li.ex_select_candidate,
    #ex_candidates > li.ex_select_candidate > span {
        background-color: ${consoleDesign.selectedBackgroundColor};
        color: ${consoleDesign.selectedFontColor};
    }
    #ex_candidates > li.ex_select_candidate > span.candidate_info {
        color: ${consoleDesign.selectedInformationColor};
    }
    `;
}

