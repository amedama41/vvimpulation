"use strict";

browser.runtime.onInstalled.addListener((details) => {
    if (details.reason === "install") {
        browser.storage.local.set({ "options": DEFAULT_OPTIONS });
    }
});

class TabInfo {
    constructor(tab, searchHighlighting) {
        this.tab = tab;
        this.mode = "NORMAL";
        this.frameInfoMap = new Map();
        this.consolePort = undefined;
        this._frameIdListCache = [undefined];
        // [keyword, caseSensitive, backward]
        this._lastSearchInfo = ["", false, false];
        this._searchHighlighting = searchHighlighting;
    }
    reset(searchHighlighting) {
        this.mode = "NORMAL";
        this.frameInfoMap.clear();
        if (this.consolePort) {
            this.consolePort.disconnect();
            this.consolePort = undefined;
        }
        this._frameIdListCache = [undefined];
        this._searchHighlighting = searchHighlighting;
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
        if (!this.consolePort) {
            return undefined;
        }
        return this.consolePort.sender.frameId;
    }
    update(tab) {
        this.tab = tab;
    }
    getMode() {
        return this.mode;
    }
    setMode(mode) {
        this.mode = mode;
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
    focusedFrameId() {
        return this.frameIdList((idList) => {
            return Promise.all(idList.map((id) => this.sendMessage(id, {
                command: "hasFocus"
            }))).then((hasFocusList) => {
                const index = hasFocusList.lastIndexOf(true);
                if (index === -1) {
                    return Promise.reject("No focused frame");
                }
                return idList[index];
            });
        });
    }
    get lastSearchInfo() {
        return this._lastSearchInfo;
    }
    set lastSearchInfo(lastSearchInfo) {
        this._lastSearchInfo = lastSearchInfo;
    }
    get searchHighlighting() {
        return this._searchHighlighting;
    }
    set searchHighlighting(enabled) {
        this._searchHighlighting = enabled;
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
                debugLog(() => [
                    `Missmatch ${this.id}-${frameId} port.`,
                    `Expected port url is ${port.sender.url}`,
                    `but actual port url is ${p.sender.url}`
                ]);
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
            console.warn(`Port ${this.id}-${frameId} is already disconnected`);
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
    executeCommand(command, options) {
        const promise = gExCommandMap.execCommand(command, this, options);
        return promise.then(([result, message]) => {
            if (message) {
                this.showMessage(message, 3000, false);
            }
            return result;
        });
    }
    setConsolePort(port) {
        if (this.consolePort) {
            this.consolePort.disconnect();
        }
        this.consolePort = port;
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
        }
    }
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
function handleError(tabInfo, func, error) {
    console.error(`${func}: ${Utils.errorString(error)}`);
    tabInfo.showMessage(
        `${func} error (${(error || "some error occured").toString()})`,
        3000, true);
}
function forwardModeCommand(port, mode, data) {
    return port.sendMessage({ command: "forwardModeCommand", mode, data });
}

const gTabInfoMap = new Map();
const gLastCommand = [undefined, 0];
const gOptions = {
    keyMapping: undefined, hintPattern: undefined, hintKeyMapping: undefined
};
const gMacro = new MacroManager();

function discard(promise) {
    return promise.then(() => null);
}

function selectTab(tabInfo, getIndex) {
    const windowId = tabInfo.windowId;
    return discard(browser.tabs.query({ windowId }).then((tabs) => {
        const currentTab = tabs.find((tab) => tab.id === tabInfo.id);
        const index = getIndex(currentTab.index, tabs.length);
        return browser.tabs.update(tabs[index].id, { active: true });
    }));
}

function moveTab(tabId, distance, toLeft) {
    return discard(browser.tabs.get(tabId).then((tab) => {
        return browser.tabs.query({
            pinned: tab.pinned, windowId: tab.windowId
        }).then((tabs) => {
            const cmpFunc = (toLeft
                ? (lhs, rhs) => rhs.index - lhs.index
                : (lhs, rhs) => lhs.index - rhs.index);
            tabs.sort(cmpFunc);
            const currIndex = tabs.findIndex((elem) => elem.id === tabId);
            if (currIndex === -1) {
                console.warn("Not found tab", tabId);
                return;
            }
            const newIdx = tabs[(currIndex + distance) % tabs.length].index;
            return browser.tabs.move(
                tabId, { windowId: tab.windowId, index: newIdx });
        });
    }));
}
function moveTabToWindow(tabInfo, distance) {
    const windowTypes = ["normal"];
    return discard(browser.windows.getAll({ windowTypes }).then((wins) => {
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
    }));
}

function findAllFrame(
    tabInfo, frameId, frameIdList, keyword, caseSensitive, backward) {
    const msg = { command: "find", keyword, caseSensitive, backward };
    const diff = (backward ? -1 : 1);
    const length = frameIdList.length;
    const startIndex = Math.max(frameIdList.indexOf(frameId), 0);
    const findFrame = (i) => {
        const index = (startIndex + i * diff + length) % length;
        msg.reset = (i !== 0);
        return tabInfo.sendMessage(frameIdList[index], msg).then((result) => {
            if (result) {
                if (tabInfo.searchHighlighting) {
                    browser.find.find(keyword, {
                        tabId: tabInfo.id, caseSensitive
                    }).then((result) => {
                        browser.find.highlightResults();
                    });
                    tabInfo.searchHighlighting = false;
                }
                return true;
            }
            if (i === length) {
                if (tabInfo.searchHighlighting) {
                    browser.find.removeHighlighting();
                }
                tabInfo.showMessage(
                    "Pattern not found: " + keyword, 3000, false);
                return false;
            }
            else {
                return findFrame(i + 1);
            }
        });
    };
    return findFrame(0);
}

function continueSearch(tabInfo, frameId, isNext) {
    const [keyword, caseSensitive, backward] = tabInfo.lastSearchInfo;
    if (keyword === "") {
        return Promise.resolve();
    }
    return tabInfo.frameIdList((frameIdList) => {
        return findAllFrame(
            tabInfo, frameId, frameIdList,
            keyword, caseSensitive, (isNext ? backward : !backward));
    });
}

function saveHistory(key, item) {
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

function focusFrame(tabInfo, frameId, count) {
    return tabInfo.frameIdList((frameIdList) => {
        const index = frameIdList.indexOf(frameId);
        return tabInfo.sendMessage(
            Utils.nextElement(frameIdList, index, count),
            { command: "focusFrame" });
    });
}

function makeNewPosition(position) {
    const screen = window.screen;
    if (position === "left" || position === "right") {
        const width = Math.floor(screen.availWidth / 2);
        return {
            left: screen.availLeft + (position === "left" ? 0 : width),
            top: screen.availTop,
            width: width,
            height: screen.availHeight,
        };
    }
    if (position === "top" || position === "bottom") {
        const height = Math.floor(screen.availHeight / 2);
        return {
            left: screen.availLeft,
            top: screen.availTop + (position === "top" ? 0 : height),
            width: screen.availWidth,
            height: height,
        };
    }
}

function snapWindow(windowId, position) {
    const key = "positionInfo";
    return browser.sessions.getWindowValue(windowId, key).then((posInfo) => {
        if (posInfo === undefined || posInfo.position === "") {
            return browser.windows.get(windowId).then((win) => {
                const posInfo = {
                    position, orgPos: {
                        left: win.left, top: win.top,
                        width: win.width, height: win.height
                    }
                };
                return [posInfo, makeNewPosition(position)];
            });
        }
        if (posInfo.position === position) {
            posInfo.position = "";
            return [posInfo, posInfo.orgPos];
        }
        if (posInfo.position !== position) {
            posInfo.position = position;
            return [posInfo, makeNewPosition(position)];
        }
    }).then(([posInfo, newPos]) => {
        return browser.sessions.setWindowValue(windowId, key, posInfo)
            .then(() => newPos);
    }).then((newPos) => {
        return browser.windows.update(windowId, newPos);
    });
}

class Command {
    /**
     * Commands for console command execution
     */
    static execCommand(msg, sender, tabInfo) {
        return tabInfo.executeCommand(msg.cmd, gOptions).then((result) => {
            gMacro.lastConsoleCommand = msg.cmd;
            if (result && !tabInfo.incognito) { // TODO
                saveHistory("command_history", msg.cmd);
            }
        }).catch((e) => {
            handleError(tabInfo, "execCommand", e);
        });
    }

    /**
     * Commands for search
     */
    static search(msg, sender, tabInfo) {
        const { keyword, backward, frameId } = msg;
        const caseSensitive = /[A-Z]/.test(keyword);
        return tabInfo.frameIdList((frameIdList) => {
            tabInfo.searchHighlighting = gOptions.highlightSearch;
            return findAllFrame(
                tabInfo, frameId, frameIdList,
                keyword, caseSensitive, backward);
        }).then((result) => {
            tabInfo.lastSearchInfo = [keyword, caseSensitive, backward];
            if (!tabInfo.incognito) {
                saveHistory("search_history", keyword);
            }
        }).catch((e) => {
            handleError(tabInfo, "search", e);
        });
    }
    static searchNext(msg, sender, tabInfo) {
        return continueSearch(tabInfo, sender.frameId, true).catch((e) => {
            handleError(tabInfo, "searchNext", e);
        });
    }
    static searchPrevious(msg, sender, tabInfo) {
        return continueSearch(tabInfo, sender.frameId, false).catch((e) => {
            handleError(tabInfo, "searchPrevious", e);
        });
    }
    static findNext(...args) {
        return Command.searchNext(...args);
    }
    static findPrevious(...args) {
        return Command.searchPrevious(...args);
    }

    /**
     * Commands for focus manipulation
     */
    static focusNextFrame(msg, sender, tabInfo) {
        return focusFrame(tabInfo, sender.frameId, Math.max(msg.count, 1));
    }
    static focusPreviousFrame(msg, sender, tabInfo) {
        return focusFrame(tabInfo, sender.frameId, -Math.max(msg.count, 1));
    }

    /**
     * Commands for tab manipulation
     */
    static nextTab(msg, sender, tabInfo) {
        const count = msg.count;
        return selectTab(
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
        return selectTab(
            tabInfo,
            (index, tabLen) => (index + tabLen - (count % tabLen)) % tabLen
        ).catch((e) => {
            handleError(tabInfo, "previousTab", e);
        });
    }
    static firstTab(msg, sender, tabInfo) {
        return selectTab(tabInfo, (index, tabLen) => 0).catch((e) => {
            handleError(tabInfo, "firstTab", e);
        });
    }
    static lastTab(msg, sender, tabInfo) {
        return selectTab(tabInfo, (index, tabLen) => tabLen - 1).catch((e) => {
            handleError(tabInfo, "lastTab", e);
        });
    }
    static lastActivatedTab(msg, sender, tabInfo) {
        const windowId = tabInfo.windowId;
        return discard(browser.tabs.query({ windowId }).then((tabs) => {
            tabs = tabs.filter((tab) => tab.id !== tabInfo.id);
            if (tabs.length === 0) {
                return;
            }
            const lastActivated = tabs.reduce((lhs, rhs) => {
                return (lhs.lastAccessed > rhs.lastAccessed ? lhs : rhs);
            });
            return browser.tabs.update(lastActivated.id, { active: true });
        })).catch((e) => {
            handleError(tabInfo, "lastActivatedTab", e);
        });
    }
    static moveTabToLeft(msg, sender, tabInfo) {
        return moveTab(tabInfo.id, Math.max(msg.count, 1), true).catch((e) => {
            handleError(tabInfo, "moveTabToLeft", e);
        });
    }
    static moveTabToRight(msg, sender, tabInfo) {
        return moveTab(tabInfo.id, Math.max(msg.count, 1), false).catch((e) => {
            handleError(tabInfo, "moveTabToRight", e);
        });
    }
    static moveTabToNewWindow(msg, sender, tabInfo) {
        const windowId = tabInfo.windowId;
        return discard(browser.tabs.query({ windowId }).then((tabs) => {
            if (tabs.length > 1) {
                return browser.windows.create({ tabId: tabInfo.id });
            }
        })).catch((e) => {
            handleError(tabInfo, "moveTabToNewWindow", e);
        });
    }
    static moveTabToNextWindow(msg, sender, tabInfo) {
        return moveTabToWindow(tabInfo, Math.max(msg.count, 1)).catch((e) => {
            handleError(tabInfo, "moveTabToNextWindow", e);
        });
    }
    static moveTabToPreviousWindow(msg, sender, tabInfo) {
        return moveTabToWindow(tabInfo, -Math.max(msg.count, 1)).catch((e) => {
            handleError(tabInfo, "moveTabToPreviousWindow", e);
        });
    }
    static removeCurrentTab(msg, sender, tabInfo) {
        return browser.tabs.remove(tabInfo.id).catch((e) => {
            handleError(tabInfo, "removeCurrentTab", e);
        });
    }
    static undoCloseTab(msg, sender, tabInfo) {
        const windowId = tabInfo.windowId;
        return discard(browser.sessions.getRecentlyClosed().then((sessions) => {
            const tabSessions = sessions.filter((s) => {
                return s.tab !== undefined && s.tab.windowId === windowId;
            });
            if (tabSessions.length === 0) {
                return;
            }
            const count = Math.max(msg.count, 1)
            const tab = tabSessions[Math.min(count, tabSessions.length) - 1];
            return browser.sessions.restore(tab.tab.sessionId);
        })).catch((e) => {
            handleError(tabInfo, "undoCloseTab", e);
        });
    }
    static duplicateTab(msg, sender, tabInfo) {
        return discard(browser.tabs.duplicate(tabInfo.id)).catch((e) => {
            handleError(tabInfo, "duplicateTab", e);
        });
    }
    static openTab(msg, sender, tabInfo) {
        return discard(browser.tabs.get(tabInfo.id).then((tab) => {
            return browser.tabs.create(
                { index: tab.index + 1, windowId: tab.windowId });
        })).catch((e) => {
            handleError(tabInfo, "openTab", e);
        });
    }
    static toggleTabPinning(msg, sender, tabInfo) {
        return discard(browser.tabs.get(tabInfo.id).then((tab) => {
            return browser.tabs.update(tabInfo.id, { pinned: !tab.pinned });
        })).catch((e) => {
            handleError(tabInfo, "toggleTabPinning", e);
        });
    }
    static toggleTabMute(msg, sender, tabInfo) {
        return discard(browser.tabs.get(tabInfo.id).then((tab) => {
            const info = tab.mutedInfo;
            return browser.tabs.update(tabInfo.id, { muted: !info.muted });
        })).catch((e) => {
            handleError(tabInfo, "toggleTabMute", e);
        });
    }

    /**
     * Commands for window manipulation
     */
    static snapWindowToLeft(msg, sender, tabInfo) {
        return discard(snapWindow(tabInfo.windowId, "left")).catch((e) => {
            handleError(tabInfo, "snapWindowToLeft", e);
        });
    }
    static snapWindowToRight(msg, sender, tabInfo) {
        return discard(snapWindow(tabInfo.windowId, "right")).catch((e) => {
            handleError(tabInfo, "snapWindowToRight", e);
        });
    }
    static snapWindowToTop(msg, sender, tabInfo) {
        return discard(snapWindow(tabInfo.windowId, "top")).catch((e) => {
            handleError(tabInfo, "snapWindowToTop", e);
        });
    }
    static snapWindowToBottom(msg, sender, tabInfo) {
        return discard(snapWindow(tabInfo.windowId, "bottom")).catch((e) => {
            handleError(tabInfo, "snapWindowToBottom", e);
        });
    }
    static removeCurrentWindow(msg, sender, tabInfo) {
        return browser.windows.remove(tabInfo.windowId).catch((e) => {
            handleError(tabInfo, "removeCurrentWindow", e);
        });
    }

    /**
     * Commands for page load manipulation
     */
    static reload(msg, sender, tabInfo) {
        return browser.tabs.reload(tabInfo.id).catch((e) => {
            handleError(tabInfo, "reload", e);
        });
    }
    static reloadSkipCache(msg, sender, tabInfo) {
        const tabId = tabInfo.id;
        return browser.tabs.reload(tabId, { bypassCache: true }).catch((e) => {
            handleError(tabInfo, "reloadSkipCache", e);
        });
    }

    /**
     * Commands for page zoom manipulation
     */
    static zoomIn(msg, sender, tabInfo) {
        const tabId = tabInfo.id;
        const count = Math.max(msg.count, 1);
        return browser.tabs.getZoom(tabId).then((factor) => {
            return browser.tabs.setZoom(
                tabId, Math.min(factor + count / 10, 3));
        }).catch((e) => {
            handleError(tabInfo, "zoomIn", e);
        });
    }
    static zoomOut(msg, sender, tabInfo) {
        const tabId = tabInfo.id;
        const count = Math.max(msg.count, 1);
        return browser.tabs.getZoom(tabId).then((factor) => {
            return browser.tabs.setZoom(
                tabId, Math.max(factor - count / 10, 0.3));
        }).catch((e) => {
            handleError(tabInfo, "zoomOut", e);
        });
    }
    static zoomReset(msg, sender, tabInfo) {
        return browser.tabs.setZoom(tabInfo.id, 0).catch((e) => {
            handleError(tabInfo, "zoomReset", e);
        });
    }

    /**
     * Commands for link manipulation
     */
    static openLink(msg, sender, tabInfo) {
        return discard(browser.tabs.update(tabInfo.id, {
            url: msg.url, loadReplace: msg.replace
        })).catch((e) => {
            handleError(tabInfo, "openLink", e);
        });
    }
    static openLinkInTab(msg, sender, tabInfo) {
        return discard(browser.tabs.get(tabInfo.id).then((tab) => {
            const active = gOptions.activateNewTab;
            return browser.tabs.create({
                url: msg.url, openerTabId: tab.id,
                index: tab.index + 1, active: active
            });
        })).catch((e) => {
            handleError(tabInfo, "openLinkInTab", e);
        });
    }
    static downloadLink(msg, sender, tabInfo) {
        return discard(browser.tabs.get(tabInfo.id).then((tab) => {
            return browser.downloads.download({
                url: msg.url, incognito: tab.incognito, saveAs: true
            });
        })).catch((e) => {
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
        changeNormalMode(tabInfo, msg.frameId, msg.data);
    }
    static toHintMode(msg, sender, tabInfo) {
        tabInfo.forEachPort((port, frameId) => {
            if (frameId === 0) {
                const data = {
                    type: msg.type,
                    pattern: gOptions.hintPattern["global"][msg.type],
                    autoFocus: gOptions.autoFocus,
                    overlap: gOptions.overlapHintLabels,
                    keyMapping: gOptions.hintKeyMapping,
                };
                port.postMessage({ command: "changeMode", mode: "HINT", data });
            }
            else {
                port.postMessage({ command: "changeMode", mode: "HINT" });
            }
        });
        tabInfo.setMode("HINT");
    }

    /**
     * Commands for repeatLastCommand
     */
    static setLastCommand(msg, sender, tabInfo) {
        if (msg.cmdName !== "repeatLastCommand") {
            gLastCommand[0] = msg.cmdName;
            gLastCommand[1] = msg.count;
        }
        else if (msg.count !== 0) {
            gLastCommand[0] = msg.count;
        }
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
        gMacro.play(msg.key, sender.frameId, tabInfo, gOptions);
    }

    /**
     * Commands for hint mode
     */
    static resetHintMode(msg, sender, tabInfo) {
        if (tabInfo.getMode() !== "HINT") {
            return;
        }
        const changeModeMsg = { command: "changeMode", mode: "NORMAL" };
        tabInfo.forEachPort((port, frameId) => {
            if (frameId !== sender.frameId) {
                port.postMessage(changeModeMsg);
            }
        });
        tabInfo.setMode("NORMAL");
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
        }).catch((e) => {
            // This can be occurred when the child frame is already removed.
            debugLog(() => [Utils.errorString(e)]);
            return false;
        });
    }
}

class ConsoleCommand {
    static getCandidate(msg, sender, tabInfo) {
        return gExCommandMap.getCandidate(msg.value, tabInfo);
    }
    static hideConsole(msg, sender, tabInfo) {
        return tabInfo.sendMessage(0, msg);
    }
    static applyFilter(msg, sender, tabInfo) {
        if (tabInfo.getMode() !== "HINT") {
            return;
        }
        tabInfo.sendMessage(
            0, { command: "forwardModeCommand", mode: "HINT", data: msg });
    }
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
        const errorURL = encodeURIComponent(details.url);
        browser.tabs.update(tabId, {
            url: `${url}?errorURL=${errorURL}&errorCode=${details.error}`,
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
    gOptions.consoleKeyMapping = gOptions.keyMapping["console"];
    delete gOptions.keyMapping["console"];
    gOptions.hintPattern = normalizeHintPattern(options["hintPattern"]);
    gOptions.hintKeyMapping =
        Utils.toPreparedCmdMap(options.keyMapping["hint"]);
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
    gOptions.onlyVisibility = options["miscellaneous"].onlyVisibility;
    gOptions.highlightSearch = options["miscellaneous"].highlightSearch;
    gOptions.activateNewTab = options["miscellaneous"].activateNewTab;
    gOptions.debug = options["debug"];
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
                pagePattern: gOptions.pagePattern,
                onlyVisibility: gOptions.onlyVisibility,
            }));

            tabInfo.searchHighlighting = gOptions.highlightSearch;

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
            console.warn("No tab exist", sender.url);
            return;
        }
        const tabId = tab.id;
        if (tabId === browser.tabs.TAB_ID_NONE) {
            debugLog(() => ["TAB_ID_NONE:", tab.url]);
            return;
        }
        const frameId = sender.frameId;

        debugLog(() => ["Connected", tabId, frameId, sender.url]);

        if (port.name === "console") {
            setConsolePort(
                port, tabId, frameId,
                gOptions.consoleDesign, gOptions.consoleKeyMapping);
            return;
        }

        port.onNotification.addListener(invokeCommand);
        port.onRequest.addListener(invokeCommand);
        port.onDisconnect.addListener(cleanupFrameInfo);

        if (!gTabInfoMap.has(tabId)) {
            gTabInfoMap.set(tabId, new TabInfo(tab, gOptions.highlightSearch));
        }
        const tabInfo = gTabInfoMap.get(tabId);
        tabInfo.update(tab);
        tabInfo.setPort(frameId, port);
        port.postMessage({
            command: "initFrame",
            frameId: frameId,
            options: {
                keyMapping: gOptions.keyMapping,
                hintPattern: getLocalHintPattern(
                    sender.url, gOptions.hintPattern),
                pagePattern: gOptions.pagePattern,
                onlyVisibility: gOptions.onlyVisibility,
            },
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
        console.warn(`TabInfo for ${sender.tab.id} is not found`);
        return;
    }
    return Command[msg.command](msg, sender, tabInfo);
}
function cleanupFrameInfo(port, error) {
    const tabId = port.sender.tab.id;
    const frameId = port.sender.frameId;
    debugLog(() => ["Disconnected:", error, tabId, frameId, port.sender.url]);
    if (gMacro.isRecord(tabId)) {
        gMacro.stop(false);
    }
    const tabInfo = gTabInfoMap.get(tabId);
    if (!tabInfo) {
        if (frameId === 0) {
            debugLog(() => [`TabInfo for ${tabId} is already deleted`]);
        }
        return;
    }
    const deleted = tabInfo.deletePort(frameId, port);
    if (deleted && frameId === 0) {
        tabInfo.reset(gOptions.highlightSearch);
    }
}
function setConsolePort(port, tabId, frameId, consoleDesign, keyMapping) {
    const tabInfo = gTabInfoMap.get(tabId);
    if (!tabInfo) {
        console.warn(`TabInfo for ${tabId} is not found`);
        return;
    }
    browser.tabs.insertCSS(tabId, { frameId, code: consoleDesign });
    port.onRequest.addListener(invokeConsoleCommand);
    port.onDisconnect.addListener(cleanupConsolePort);
    tabInfo.setConsolePort(port);
    tabInfo.sendConsoleMessage({ command: "setKeyMapping", keyMapping });
}
function invokeConsoleCommand(msg, sender) {
    const tabInfo = gTabInfoMap.get(sender.tab.id);
    if (!tabInfo) {
        console.warn(`TabInfo for ${sender.tab.id} is not found`);
        return;
    }
    return ConsoleCommand[msg.command](msg, sender, tabInfo);
}
function cleanupConsolePort(port, error) {
    const tabId = port.sender.tab.id;
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

function debugLog(getArgs) {
    if (gOptions.debug) {
        console.debug(...getArgs());
    }
}

