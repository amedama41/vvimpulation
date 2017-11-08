"use strict";

class TabInfo {
    constructor(tab) {
        this.tab = tab;
        this.mode = "NORMAL";
        this.frameInfoMap = new Map();
        this.modeInfo = undefined;
        this._frameIdListCache = [undefined];
        this._lastSearchInfo = ["", false, 0];
    }
    reset() {
        this.mode = "NORMAL";
        this.frameInfoMap.clear();
        this.modeInfo = undefined;
        this._frameIdListCache = [undefined];
    }
    get id() {
        return this.tab.id;
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
        if (this.frameInfoMap.get(frameId) !== port) {
            // This case occurs when port is overwrite by new frame's port.
            console.warn(`missmatch ${this.id}-${frameId} port`);
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
            return;
        }
        port.postMessage(msg);
    }
    sendMessage(frameId, msg) {
        const port = this.frameInfoMap.get(frameId);
        if (!port) {
            return Promise.reject(
                `port ${this.id}-${frameId} is already disconnected`);
        }
        return port.sendMessage(msg);
    }
}

const gTabInfoMap = new Map();

const HINT_KEY_MAP = Utils.toPreparedCmdMap({
    "<C-C>": { name: "toNormalMode" },
    "<C-[>": { name: "toNormalMode" },
    "<Esc>": { name: "toNormalMode" },
    "<C-L>": { name: "refreshHint" },
    "<Tab>": { name: "incrementHintNum" },
    "<S-Tab>": { name: "decrementHintNum" },
    ";": { name: "incrementHintNum" },
    ",": { name: "decrementHintNum" },
    "ff": { name: "toggleDefaultFocus" },
    "fi": { name: "focusin", frontend: true },
    "fo": { name: "focusout", frontend: true },
    "c": { name: "mouseclick", frontend: true },
    "mc": { name: "mouseclick", frontend: true },
    "mC": { name: "mouseclick", frontend: true, modifiers : { shift: true } },
    "m<C-C>": { name: "mouseclick", frontend: true, modifiers: { ctrl: true } },
    "m<M-C>": { name: "mouseclick", frontend: true, modifiers: { meta: true } },
    "md": { name: "mousedown", frontend: true },
    "mD": { name: "mousedown", frontend: true, modifiers: { shift: true } },
    "m<C-D>": { name: "mousedown", frontend: true, modifiers: { ctrl: true } },
    "mi": { name: "mousein", frontend: true },
    "mo": { name: "mouseout", frontend: true },
    "e": { name: "pressEnter", frontend: true },
    "E": { name: "pressEnter", frontend: true, modifiers: { shift: true } },
    "<C-E>": { name: "pressEnter", frontend: true, modifiers: { ctrl: true } },
    "<M-E>": { name: "pressEnter", frontend: true, modifiers: { meta: true } },
    "o": { name: "smartOpen", frontend: true },
    "O": { name: "smartOpenInTab", frontend: true },
    "y": { name: "yankLink", frontend: true },
    "s": { name: "downloadLink", frontend: true },
    "v": { name: "selectElement", frontend: true },
    "de": { name: "deleteElement", frontend: true },
});
class HintCommand {
    static toNormalMode(tabInfo, mode) {
        changeNormalMode(tabInfo);
    }
    static incrementHintNum(tabInfo, mode) {
        mode.changeHintNum(mode.getNextIndex(), tabInfo);
    }
    static decrementHintNum(tabInfo, mode) {
        mode.changeHintNum(mode.getPreviousIndex(), tabInfo);
    }
    static refreshHint(tabInfo, mode) {
        const type = mode.getType();
        tabInfo.sendMessage(0, {
            command: "collectHint",
            type: type,
            pattern: HintMode._makePattern(type, tabInfo.tab.url),
        }).then(
            (hintsInfoList) => changeHintMode(tabInfo, hintsInfoList, mode),
            handleError);
    }
    static toggleDefaultFocus(tabInfo, mode) {
        mode.toggleDefaultFocus();
    }
}
class HintMode {
    constructor(type) {
        this.type = type;
        this.idList = [];
        this.currentIndex = 0;
        this.defaultFocus = true;
        this.mapper = Utils.makeCommandMapper(HINT_KEY_MAP);
    }
    handle(key, sender, tabInfo) {
        if (key.length === 1 && "0" <= key && key <= "9") {
            this._handleDigit(key, tabInfo);
            return;
        }
        const [consumed, optCmd, cmd] = this.mapper.get(key);
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
    _invoke(cmd, tabInfo) {
        if (cmd.frontend) {
            const currentFrameId = this.idList[this.currentIndex];
            const modifiers = cmd.modifiers || {};
            const count = Utils.modifiersToCount(
                modifiers.ctrl, modifiers.shift, modifiers.alt, modifiers.meta);
            HintMode._forwardHintCommand(
                tabInfo, currentFrameId, { command: cmd.name, count: count });
        }
        else {
            HintCommand[cmd.name](tabInfo, this);
        }
    }
    _handleDigit(num, tabInfo) {
        const length = this.idList.length;
        let index = this.currentIndex.toString() + num;
        while (index && parseInt(index, 10) >= length) {
            index = index.substring(1);
        }
        const nextIndex = (index ? parseInt(index, 10) : length - 1);

        this.changeHintNum(nextIndex, tabInfo);
    }

    getType() {
        return this.type;
    }
    getPreviousIndex() {
        const length = this.idList.length;
        return (this.currentIndex - 1 + length) % length;
    }
    getNextIndex() {
        return (this.currentIndex + 1) % this.idList.length;
    }
    toggleDefaultFocus() {
        this.defaultFocus = !this.defaultFocus;
    }
    setIdList(idList) {
        this.idList = idList;
        this.currentIndex = 0;
        this.mapper.reset();
    }
    changeHintNum(nextIndex, tabInfo) {
        const prevId = this.idList[this.currentIndex];
        const nextId = this.idList[nextIndex];
        if (prevId !== nextId) {
            HintMode._forwardHintCommand(
                tabInfo, prevId, { command: "blurHintLink" });
        }
        HintMode._forwardHintCommand(tabInfo, nextId, {
            command: "focusHintLink",
            index: nextIndex, defaultFocus: this.defaultFocus
        });
        this.currentIndex = nextIndex;
    }
    static _forwardHintCommand(tabInfo, frameId, msg) {
        return tabInfo.sendMessage(
            frameId, { command: "forwardHintCommand", data: msg });
    }
    static _makePattern(type, url) {
        const globalPattern = gHintPatternMap["global"][type];
        if (url === "") {
            return globalPattern;
        }
        url = new URL(url);
        const localPatternMap = gHintPatternMap["local"][url.host];
        if (localPatternMap && localPatternMap[type]) {
            return globalPattern + ", " + localPatternMap[type];
        }
        else {
            return globalPattern;
        }
    }
}

function handleError(error) {
    if (error === undefined) {
        error = 'some error occured';
    }
    console.error(Utils.errorString(error));
    browser.notifications.create("wimpulation-error-notification", {
        type: "basic",
        message: error.toString(),
        title: "wimpulation error",
    });
}

function selectTab(tabId, getIndex) {
    browser.tabs.get(tabId).then((tab) => {
        return browser.tabs.query({ windowId: tab.windowId }).then((tabs) => {
            const index = getIndex(tab.index, tabs.length);
            browser.tabs.update(tabs[index].id, { active: true });
        });
    }, handleError);
}

function moveTab(tabId, distance, toLeft) {
    browser.tabs.get(tabId).then((tab) => {
        return browser.tabs.query({ pinned: tab.pinned, windowId: tab.windowId })
            .then((tabs) => {
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
                browser.tabs.move(
                    tabId, { windowId: tab.windowId, index: newIdx });
        });
    }, handleError);
}

function findAllFrame(tabInfo, keyword, startIndex, frameIdList, backward) {
    const msg = { command: "find", keyword: keyword, backward: backward };
    const diff = (backward ? -1 : 1);
    const length = frameIdList.length;
    const findFrame = (i) => {
        const index = (startIndex + i * diff + length) % length;
        msg.reset = (i !== 0);
        return tabInfo.sendMessage(frameIdList[index], msg)
            .then((result) => {
                if (result) {
                    return [true, index];
                }
                if (i === length) {
                    return [false, 0];
                }
                else {
                    return findFrame(i + 1);
                }
            });
    };
    return findFrame(0);
}

const IS_TAB_DEFAULT_INACTIVE = true;

class Command {
    static focusNextFrame(msg, sender, tabInfo) {
        const count = Math.max(msg.count, 1);
        tabInfo.frameIdList((frameIdList) => {
            const index = frameIdList.indexOf(sender.frameId);
            tabInfo.sendMessage(
                frameIdList[(index + count) % frameIdList.length],
                { command: "focusFrame" });
        });
    }
    static find(msg, sender, tabInfo) {
        return tabInfo.frameIdList((frameIdList) => {
            const [keyword, backward, index] = tabInfo.lastSearchInfo;
            const startIndex = (keyword === msg.keyword ? index : 0);
            findAllFrame(
                tabInfo, msg.keyword, startIndex, frameIdList, msg.backward)
                .then(([result, lastIndex]) => {
                    tabInfo.lastSearchInfo =
                        [msg.keyword, msg.backward, lastIndex];
                    return result;
                });
        });
    }
    static findNext(msg, sender, tabInfo) {
        const [keyword, backward, index] = tabInfo.lastSearchInfo;
        if (keyword === "") {
            return;
        }
        tabInfo.frameIdList((frameIdList) => {
            findAllFrame(tabInfo, keyword, index, frameIdList, backward);
        });
    }
    static findPrevious(msg, sender, tabInfo) {
        const [keyword, backward, index] = tabInfo.lastSearchInfo;
        if (keyword === "") {
            return;
        }
        tabInfo.frameIdList((frameIdList) => {
            findAllFrame(tabInfo, keyword, index, frameIdList, !backward);
        });
    }

    static nextTab(msg, sender, tabInfo) {
        const tab = sender.tab;
        const count = msg.count;
        if (count === 0) {
            selectTab(tab.id, (index, tabLen) => (index + 1) % tabLen);
        }
        else {
            selectTab(
                tab.id, (index, tabLen) => (count < tabLen) ?  count : index);
        }
    }
    static previousTab(msg, sender, tabInfo) {
        const count = Math.max(msg.count, 1);
        selectTab(
            sender.tab.id,
            (index, tabLen) => (index + tabLen - (count % tabLen)) % tabLen);
    }
    static firstTab(msg, sender, tabInfo) {
        selectTab(sender.tab.id, (index, tabLen) => 0);
    }
    static lastTab(msg, sender, tabInfo) {
        selectTab(sender.tab.id, (index, tabLen) => tabLen - 1);
    }
    static moveTabToLeft(msg, sender, tabInfo) {
        moveTab(sender.tab.id, Math.max(msg.count, 1), true);
    }
    static moveTabToRight(msg, sender, tabInfo) {
        moveTab(sender.tab.id, Math.max(msg.count, 1), false);
    }
    static removeCurrentTab(msg, sender, tabInfo) {
        browser.tabs.remove(sender.tab.id);
    }
    static undoCloseTab(msg, sender, tabInfo) {
        browser.sessions.getRecentlyClosed().then((sessions) => {
            const tabSessions = sessions.filter((s) => s.tab !== undefined);
            if (tabSessions.length === 0) {
                return;
            }
            const tab = tabSessions[Math.min(msg.count, tabSessions.length - 1)];
            return browser.sessions.restore(tab.tab.sessionId);
        }, handleError);
    }
    static duplicateTab(msg, sender, tabInfo) {
        browser.tabs.duplicate(sender.tab.id);
    }
    static openTab(msg, sender, tabInfo) {
        browser.tabs.get(sender.tab.id).then((tab) => {
            return browser.tabs.create(
                { index: tab.index + 1, windowId: tab.windowId });
        }, handleError);
    }
    static removeCurrentWindow(msg, sender, tabInfo) {
        browser.tabs.get(sender.tab.id).then((tab) => {
            return browser.windows.remove(tab.windowId);
        }, handleError);
    }
    static reload(msg, sender, tabInfo) {
        browser.tabs.reload(sender.tab.id);
    }
    static reloadSkipCache(msg, sender, tabInfo) {
        browser.tabs.reload(sender.tab.id, { bypassCache: true });
    }
    static zoomIn(msg, sender, tabInfo) {
        const tabId = sender.tab.id;
        const count = Math.max(msg.count, 1);
        browser.tabs.getZoom(tabId).then((factor) => {
            browser.tabs.setZoom(tabId, Math.min(factor + count / 10, 3));
        }, handleError);
    }
    static zoomOut(msg, sender, tabInfo) {
        const tabId = sender.tab.id;
        const count = Math.max(msg.count, 1);
        browser.tabs.getZoom(tabId).then((factor) => {
            browser.tabs.setZoom(tabId, Math.max(factor - count / 10, 0.3));
        }, handleError);
    }
    static zoomReset(msg, sender, tabInfo) {
        browser.tabs.setZoom(sender.tab.id, 0);
    }
    static openLink(msg, sender, tabInfo) {
        browser.tabs.update(sender.tab.id, { url: msg.url });
    }
    static openLinkInTab(msg, sender, tabInfo) {
        browser.tabs.get(sender.tab.id).then((tab) => {
            const active = (IS_TAB_DEFAULT_INACTIVE ? !msg.active : msg.active);
            // TODO openerTabId
            browser.tabs.create(
                { url: msg.url, index: tab.index + 1, active: active });
        }, handleError);
    }
    static downloadLink(msg, sender, tabInfo) {
        browser.downloads.download({
            url: msg.url, /* TODO incognito: tab.incognito,*/ saveAs: true
        }, handleError);
    }

    static reloadHintPattern(msg, sender, tabInfo) {
        loadHintPattern();
    }

    static toHintMode(msg, sender, tabInfo) {
        const type = msg.type;
        tabInfo.sendMessage(0, {
            command: "collectHint",
            type: type,
            pattern: HintMode._makePattern(type, sender.tab.url),
        }).then((hintsInfoList) => {
            changeHintMode(tabInfo, hintsInfoList, new HintMode(type))
        }, handleError);
    }
    static collectHint(msg, sender, tabInfo) {
        return tabInfo.sendMessage(msg.frameId, {
            command: "collectHint",
            type: msg.type,
            pattern: HintMode._makePattern(msg.type, msg.url),
            area: msg.area,
        });
    }
    static forwardHintKeyEvent(msg, sender, tabInfo) {
        if (tabInfo.getMode() !== "HINT") {
            return;
        }
        return tabInfo.modeInfo.handle(msg.key, sender, tabInfo);
    }

    static collectFrameId(msg, sender, tabInfo) {
        return tabInfo.sendMessage(msg.frameId, msg);
    }

    static forwardCommand(msg, sender, tabInfo) {
        tabInfo.sendMessage(msg.frameId, msg);
    }

    static execCommand(msg, sender, tabInfo) {
        return browser.tabs.get(sender.tab.id).then((tab) => {
            return gExCommandMap.execCommand(msg.cmd, tab)
        });
    }
    static getCandidate(msg, sender, tabInfo) {
        return browser.tabs.get(sender.tab.id).then((tab) => {
            return gExCommandMap.getCandidate(msg.value, sender.tab);
        });
    }

    static toNormalMode(msg, sender, tabInfo) {
        changeNormalMode(tabInfo);
    }
    static getConsoleOptions(msg, sender, tabInfo) {
        return tabInfo.sendMessage(0, msg);
    }
}

function changeHintMode(tabInfo, idList, hintMode) {
    if (idList.length === 0) {
        changeNormalMode(tabInfo);
        return;
    }
    const mode = "HINT";
    let labelMap = {};
    idList.forEach((id, index) => {
        if (!labelMap[id]) {
            labelMap[id] = [];
        }
        labelMap[id].push(index);
    });
    hintMode.setIdList(idList);
    tabInfo.setMode(mode, hintMode);
    tabInfo.forEachPort((port, id) => {
        const labelList = labelMap[id] || [];
        port.postMessage(
            { command: "changeMode", mode: mode, data: labelList });
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

let gHintPatternMap = undefined;
function loadHintPattern() {
    function normalizePatternMap(patternMap) {
        Object.keys(patternMap).forEach((type) => {
            patternMap[type] =
                patternMap[type].map(([pat, desc]) => pat).join(",");
        });
    }
    const url = browser.runtime.getURL("resources/hint_pattern.json");
    const headers = new Headers(
        { "Content-Type": "application/x-suggestions+json" });
    fetch(url, { header: headers })
        .then((response) => response.json())
        .then((json) => {
            const local = json.local;
            Object.keys(local).forEach(
                (host) => normalizePatternMap(local[host]));
            gHintPatternMap = json;
        })
        .catch(handleError);
}
loadHintPattern();

browser.tabs.onActivated.addListener((activeInfo) => {
    const tabInfo = gTabInfoMap.get(activeInfo.tabId);
    if (!tabInfo) {
        return;
    }
    changeNormalMode(tabInfo);
});
browser.tabs.onRemoved.addListener((tabId, removeInfo) => {
    gTabInfoMap.delete(tabId);
});

browser.runtime.onMessage.addListener(invokeCommand);

browser.runtime.onConnect.addListener((port) => {
    const sender = port.sender;
    port = new Port(port);
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

    port.onNotification.addListener(invokeCommand);
    port.onRequest.addListener(invokeCommand);
    port.onDisconnect.addListener(cleanupFrameInfo.bind(null, tabId, frameId));

    if (!gTabInfoMap.has(tabId)) {
        gTabInfoMap.set(tabId, new TabInfo(tab));
    }
    const tabInfo = gTabInfoMap.get(tabId);
    tabInfo.update(tab);
    tabInfo.setPort(frameId, port);
    port.postMessage({
        command: "registerFrameId", frameId: frameId, mode: tabInfo.getMode()
    });
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

