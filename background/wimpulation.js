"use strict";

class TabInfo {
    constructor() {
        var gFrameMap = new Map();
        this.mode = "NORMAL";
        this.frameInfoMap = new Map();
        this.modeInfo = undefined;
    }
    getMode() {
        return this.mode;
    }
    setMode(mode, modeInfo) {
        this.mode = mode;
        this.modeInfo = modeInfo;
    }
    setPort(frameId, port) {
        this.frameInfoMap.set(frameId, port);
    }
    deletePort(frameId, port) {
        if (this.frameInfoMap.get(frameId) !== port) {
            console.warn(`missmatch ${frameId} port`);
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
            console.warn(`port ${tabId}-${frameId} is already disconnected`);
            return;
        }
        port.postMessage(msg);
    }
    sendMessage(frameId, msg) {
        const port = this.frameInfoMap.get(frameId);
        if (!port) {
            return Promise.reject(
                `port ${tabId}-${frameId} is already disconnected`);
        }
        return port.sendMessage(msg);
    }
}
function sendTabMessage(tabId, frameId, msg) {
    const tabInfo = gTabInfoMap.get(tabId);
    if (!tabInfo) {
        return Promise.reject('no tab info: ' + tabId);
    }
    return tabInfo.sendMessage(frameId, msg);
}
function forwardHintCommand(tabId, frameId, msg) {
    return sendTabMessage(
        tabId, frameId, { command: "forwardHintCommand", data: msg });
}
const gTabInfoMap = new Map();

const HINT_KEY_MAP = Utils.toPreparedCmdMap({
    "<C-C>": "toNormalMode",
    "<C-[>": "toNormalMode",
    "<C-L>": "refreshHint",
    "<Tab>": "incrementHintNum",
    "<S-Tab>": "decrementHintNum",
    ";": "incrementHintNum",
    ",": "decrementHintNum",
    "ff": "toggleDefaultFocus",
    "fi": "focusin",
    "fo": "focusout",
    "c": "clickHintLink",
    "mc": "clickHintLink",
    "mC": "shiftClickHintLink",
    "m<C-C>": "controlClickHintLink",
    "m<M-C>": "metaClickHintLink",
    "md": "mousedownHintLink",
    "mD": "shiftMousedownHintLink",
    "m<C-D>": "controlMousedownHintLink",
    "mi": "mouseinHintLink",
    "mo": "mouseoutHintLink",
    "e": "enterHintLink",
    "E": "shiftEnterHintLink",
    "<C-E>": "controlEnterHintLink",
    "<M-E>": "metaEnterHintLink",
    "o": "openLink",
    "t": "openLinkInTab",
    "T": "openLinkInBackgroundTab",
    "y": "yankHintLink",
    "s": "downloadHintLink",
});
class HintCommand {
    static toNormalMode(tabId, mode) {
        changeMode(tabId, "NORMAL");
    }
    static incrementHintNum(tabId, mode) {
        mode.changeHintNum(mode.getNextIndex(), tabId);
    }
    static decrementHintNum(tabId, mode) {
        mode.changeHintNum(mode.getPreviousIndex(), tabId);
    }
    static refreshHint(tabId, mode) {
        const type = mode.getType();
        const tabInfo = gTabInfoMap.get(tabId);
        if (!tabInfo) {
            return;
        }
        tabInfo.sendMessage(0, {
            command: "collectHint",
            pattern: gHintPatternMap[type],
            isFocusType: (type === "focus")
        }).then(
            (hintsInfoList) => changeHintMode(tabId, hintsInfoList, mode),
            handleError);
    }
    static toggleDefaultFocus(tabId, mode) {
        mode.setDefaultFocus(!mode.getDefaultFocus());
    }
    static focusin(tabId, mode) {
        mode.setDefaultFocus(true);
        forwardHintCommand(
            tabId, mode.getFocusedFrameId(), { command: "focusin" });
    }
    static focusout(tabId, mode) {
        mode.setDefaultFocus(false);
        forwardHintCommand(
            tabId, mode.getFocusedFrameId(), { command: "focusout" });
    }
    static clickHintLink(tabId, mode, shift=false, ctrl=false, meta=false) {
        const count = (ctrl ? 1 : shift ? 3 : meta ? 4 : 0);
        forwardHintCommand(
            tabId, mode.getFocusedFrameId(),
            { command: "mouseclick", count: count });
    }
    static shiftClickHintLink(tabId, mode) {
        return HintCommand.clickHintLink(tabId, mode, true);
    }
    static controlClickHintLink(tabId, mode) {
        return HintCommand.clickHintLink(tabId, mode, false, true);
    }
    static metaClickHintLink(tabId, mode) {
        return HintCommand.clickHintLink(tabId, mode, false, false, true);
    }
    static mousedownHintLink(tabId, mode, shift=false, ctrl=false) {
        const count = (ctrl ? 1 : shift ? 3 : 0);
        forwardHintCommand(
            tabId, mode.getFocusedFrameId(),
            { command: "mousedown", count: count });
    }
    static shiftMousedownHintLink(tabId, mode) {
        return HintCommand.mousedownHintLink(tabId, mode, true);
    }
    static controlMousedownHintLink(tabId, mode) {
        return HintCommand.mousedownHintLink(tabId, mode, false, true);
    }
    static mouseinHintLink(tabId, mode) {
        forwardHintCommand(
            tabId, mode.getFocusedFrameId(), { command: "mousein" });
    }
    static mouseoutHintLink(tabId, mode) {
        forwardHintCommand(
            tabId, mode.getFocusedFrameId(), { command: "mouseout" });
    }
    static enterHintLink(tabId, mode, shift=false, ctrl=false, meta=false) {
        const count = (ctrl ? 1 : shift ? 3 : meta ? 4 : 0);
        forwardHintCommand(
            tabId, mode.getFocusedFrameId(),
            { command: "pressEnter", count: count});
    }
    static shiftEnterHintLink(tabId, mode) {
        return HintCommand.enterHintLink(tabId, mode, true);
    }
    static controlEnterHintLink(tabId, mode) {
        return HintCommand.enterHintLink(tabId, mode, false, true);
    }
    static metaEnterHintLink(tabId, mode) {
        return HintCommand.enterHintLink(tabId, mode, false, false, true);
    }
    static openLink(tabId, mode) {
        forwardHintCommand(
            tabId, mode.getFocusedFrameId(), { command: "openLink" });
    }
    static openLinkInTab(tabId, mode, active=true) {
        const count = (active ? 0 : 1);
        forwardHintCommand(
            tabId, mode.getFocusedFrameId(),
            { command: "openLinkInTab", count: count });
    }
    static openLinkInBackgroundTab(tabId, mode) {
        HintCommand.openLinkInTab(tabId, mode, false);
    }
    static yankHintLink(tabId, mode) {
        forwardHintCommand(
            tabId, mode.getFocusedFrameId(), { command: "yankLink" });
    }
    static downloadHintLink(tabId, mode) {
        forwardHintCommand(
            tabId, mode.getFocusedFrameId(), { command: "downloadLink" });
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
    handle(key, sender) {
        const tab = sender.tab;
        if (key.length === 1 && "0" <= key && key <= "9") {
            this.handleDigit(key, tab);
            return;
        }
        const [consumed, optCmd, cmd] = this.mapper.get(key);
        if (optCmd) {
            HintCommand[optCmd](tab.id, this);
        }
        if (cmd) {
            HintCommand[cmd](tab.id, this);
        }
        else if (!consumed) {
            changeMode(tab.id, "NORMAL", sender.frameId, [key]);
        }
    }
    handleDigit(num, tab) {
        const length = this.idList.length;
        let index = this.currentIndex.toString() + num;
        while (index && parseInt(index, 10) >= length) {
            index = index.substring(1);
        }
        const nextIndex = (index ? parseInt(index, 10) : length - 1);

        this.changeHintNum(nextIndex, tab.id);
    }

    getType() {
        return this.type;
    }
    getFocusedFrameId() {
        return this.idList[this.currentIndex];
    }
    getPreviousIndex() {
        const length = this.idList.length;
        return (this.currentIndex - 1 + length) % length;
    }
    getNextIndex() {
        return (this.currentIndex + 1) % this.idList.length;
    }
    getDefaultFocus() {
        return this.defaultFocus;
    }
    setDefaultFocus(defaultFocus) {
        this.defaultFocus = defaultFocus;
    }
    setIdList(idList) {
        this.idList = idList;
        this.currentIndex = 0;
        this.mapper.reset();
    }

    changeHintNum(nextIndex, tabId) {
        const prevId = this.idList[this.currentIndex];
        const nextId = this.idList[nextIndex];
        if (prevId !== nextId) {
            forwardHintCommand(tabId, prevId, { command: "blurHintLink" });
        }
        forwardHintCommand(tabId, nextId, {
            command: "focusHintLink",
            index: nextIndex, defaultFocus: this.defaultFocus
        });
        this.currentIndex = nextIndex;
    }
}

function handleError(error) {
    if (error === undefined) {
        error = 'some error occured';
    }
    if (error instanceof Error) {
        console.error(error.message, error.lineNumber, error.fileName);
    }
    else {
        console.error(error);
    }
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

let gFindCache = new Map();
function findAllFrame(tabId, keyword, startIndex, frameIdList, backward) {
    const msg = { command: "find", keyword: keyword, backward: backward };
    const diff = (backward ? -1 : 1);
    const length = frameIdList.length;
    const findFrame = (i) => {
        const index = (startIndex + i * diff + length) % length;
        msg.reset = (i !== 0);
        return sendTabMessage(tabId, frameIdList[index], msg).then((result) => {
            if (result) {
                gFindCache.set(tabId, [keyword, index, frameIdList]);
                return true;
            }
            if (i === length) {
                gFindCache.set(tabId, [keyword, 0, frameIdList]);
                return false;
            }
            else {
                return findFrame(i + 1);
            }
        })
    };
    return findFrame(0);
}
class Command {
    static focusNextFrame(msg, sender) {
        const tabId = sender.tab.id;
        const cache = gFindCache.get(tabId);
        const count = Math.max(msg.count, 1);
        if (!cache) {
            sendTabMessage(tabId, 0, { command: "collectFrameId" })
                .then((frameIdList) => {
                    const index = frameIdList.indexOf(sender.frameId);
                    sendTabMessage(
                        tabId, frameIdList[(index + count) % frameIdList.length],
                        { command: "focusFrame" });
                }, handleError);
        }
        else {
            const [keyword, i, frameIdList] = cache;
            const index = frameIdList.indexOf(sender.frameId);
            sendTabMessage(
                tabId, frameIdList[(index + count) % frameIdList.length],
                { command: "focusFrame" });
        }
    }
    static find(msg, sender) {
        const tabId = sender.tab.id;
        const cache = gFindCache.get(tabId);
        if (!cache) {
            return sendTabMessage(tabId, 0, { command: "collectFrameId" })
                .then((frameIdList) => {
                    gFindCache.set(tabId, [msg.keyword, 0, frameIdList]);
                    return findAllFrame(
                        tabId, msg.keyword, 0, frameIdList, msg.backward);
                });
        }
        else {
            const [keyword, index, frameIdList] = cache;
            const startIndex = (keyword === msg.keyword ? index : 0);
            return findAllFrame(
                tabId, msg.keyword, startIndex, frameIdList, msg.backward)
        }
    }
    static findNext(msg, sender) {
        const tabId = sender.tab.id;
        const cache = gFindCache.get(tabId);
        if (!cache) {
            return;
        }
        const [keyword, index, frameIdList] = cache;
        findAllFrame(tabId, keyword, index, frameIdList, false);
    }
    static findPrevious(msg, sender) {
        const tabId = sender.tab.id;
        const cache = gFindCache.get(tabId);
        if (!cache) {
            return;
        }
        const [keyword, index, frameIdList] = cache;
        findAllFrame(tabId, keyword, index, frameIdList, true);
    }

    static nextTab(msg, sender) {
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
    static previousTab(msg, sender) {
        const count = Math.max(msg.count, 1);
        selectTab(
            sender.tab.id,
            (index, tabLen) => (index + tabLen - (count % tabLen)) % tabLen);
    }
    static firstTab(msg, sender) {
        selectTab(sender.tab.id, (index, tabLen) => 0);
    }
    static lastTab(msg, sender) {
        selectTab(sender.tab.id, (index, tabLen) => tabLen - 1);
    }
    static moveTabToLeft(msg, sender) {
        moveTab(sender.tab.id, Math.max(msg.count, 1), true);
    }
    static moveTabToRight(msg, sender) {
        moveTab(sender.tab.id, Math.max(msg.count, 1), false);
    }
    static removeCurrentTab(msg, sender) {
        browser.tabs.remove(sender.tab.id);
    }
    static undoCloseTab(msg, sender) {
        browser.sessions.getRecentlyClosed().then((sessions) => {
            const tabSessions = sessions.filter((s) => s.tab !== undefined);
            if (tabSessions.length === 0) {
                return;
            }
            const tab = tabSessions[Math.min(msg.count, tabSessions.length - 1)];
            return browser.sessions.restore(tab.tab.sessionId);
        }, handleError);
    }
    static duplicateTab(msg, sender) {
        browser.tabs.duplicate(sender.tab.id);
    }
    static openTab(msg, sender) {
        browser.tabs.get(sender.tab.id).then((tab) => {
            return browser.tabs.create(
                { index: tab.index + 1, windowId: tab.windowId });
        }, handleError);
    }
    static removeCurrentWindow(msg, sender) {
        browser.tabs.get(sender.tab.id).then((tab) => {
            return browser.windows.remove(tab.windowId);
        }, handleError);
    }
    static reload(msg, sender) {
        browser.tabs.reload(sender.tab.id);
    }
    static reloadSkipCache(msg, sender) {
        browser.tabs.reload(sender.tab.id, { bypassCache: true });
    }
    static zoomIn(msg, sender) {
        const tabId = sender.tab.id;
        const count = Math.max(msg.count, 1);
        browser.tabs.getZoom(tabId).then((factor) => {
            browser.tabs.setZoom(tabId, Math.min(factor + count / 10, 3));
        }, handleError);
    }
    static zoomOut(msg, sender) {
        const tabId = sender.tab.id;
        const count = Math.max(msg.count, 1);
        browser.tabs.getZoom(tabId).then((factor) => {
            browser.tabs.setZoom(tabId, Math.max(factor - count / 10, 0.3));
        }, handleError);
    }
    static zoomReset(msg, sender) {
        browser.tabs.setZoom(sender.tab.id, 0);
    }
    static openLink(msg, sender) {
        browser.tabs.update(sender.tab.id, { url: msg.url });
    }
    static openLinkInTab(msg, sender) {
        browser.tabs.get(sender.tab.id).then((tab) => {
            // TODO openerTabId
            browser.tabs.create(
                { url: msg.url, index: tab.index + 1, active: msg.active });
        }, handleError);
    }
    static downloadLink(msg, sender) {
        browser.downloads.download({
            url: msg.url, /* TODO incognito: tab.incognito,*/ saveAs: true
        }, handleError);
    }

    static reloadHintPattern(msg, sender) {
        loadHintPattern();
    }

    static toHintMode(msg, sender) {
        const type = msg.type;
        const tabId = sender.tab.id;
        sendTabMessage(tabId, 0, {
            command: "collectHint",
            pattern: gHintPatternMap[type],
            isFocusType: (type === "focus")
        }).then((hintsInfoList) => {
            changeHintMode(tabId, hintsInfoList, new HintMode(type))
        }, handleError);
    }
    static collectHint(msg, sender) {
        return sendTabMessage(sender.tab.id, msg.frameId, msg);
    }
    static forwardHintKeyEvent(msg, sender) {
        const tabInfo = gTabInfoMap.get(sender.tab.id);
        if (!tabInfo || tabInfo.getMode() !== "HINT") {
            return;
        }
        return tabInfo.modeInfo.handle(msg.key, sender);
    }

    static collectFrameId(msg, sender) {
        return sendTabMessage(sender.tab.id, msg.frameId, msg);
    }

    static forwardCommand(msg, sender) {
        sendTabMessage(sender.tab.id, msg.frameId, msg);
    }

    static execCommand(msg, sender) {
        return browser.tabs.get(sender.tab.id).then((tab) => {
            return gExCommandMap.execCommand(msg.cmd, tab)
                .then((result) => [result, tab.incognito]);
        });
    }
    static getCandidate(msg, sender, sendResponse) {
        browser.tabs.get(sender.tab.id).then((tab) => {
            const result = gExCommandMap.getCandidate(msg.value, sender.tab);
            result.then(sendResponse);
        });
        return true;
    }

    static toNormalMode(msg, sender) {
        changeMode(sender.tab.id, "NORMAL");
    }
    static toConsoleMode(msg, sender) {
        const tabInfo = gTabInfoMap.get(sender.tab.id);
        if (!tabInfo) {
            return;
        }
        const mode = "CONSOLE";
        tabInfo.setMode(mode);
        tabInfo.postMessage(
            0, { command: "changeMode", mode: mode, data: msg.data });
    }
    static showConsole(msg, sender) {
        return sendTabMessage(sender.tab.id, 0, msg);
    }
}

function changeHintMode(tabId, idList, hintMode) {
    if (idList.length === 0) {
        return;
    }
    const tabInfo = gTabInfoMap.get(tabId);
    if (!tabInfo) {
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
        port.postMessage({ command: "changeMode", mode: mode, data: labelList });
    });
}

function changeMode(tabId, mode, frameId = undefined, data = undefined) {
    const tabInfo = gTabInfoMap.get(tabId);
    if (!tabInfo) {
        return;
    }
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
    const url = browser.runtime.getURL("resources/hint_pattern.json");
    const headers = new Headers(
        { "Content-Type": "application/x-suggestions+json" });
    fetch(url, { header: headers })
        .then((response) => response.json())
        .then((json) => gHintPatternMap = json, handleError);
}
loadHintPattern();

browser.tabs.onActivated.addListener((activeInfo) => {
    changeMode(activeInfo.tabId, "NORMAL");
});

browser.runtime.onMessage.addListener((msg, sender, sendResponse) => {
    return Command[msg.command](msg, sender, sendResponse);
});

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
        console.info("TAB_ID_NONE:", tab);
        return;
    }

    const frameId = sender.frameId;

    port.onNotification.addListener(invokeCommand);
    port.onRequest.addListener(invokeCommand);
    port.onDisconnect.addListener(clearnupFrameInfo.bind(null, tabId, frameId));

    if (!gTabInfoMap.has(tabId)) {
        gTabInfoMap.set(tabId, new TabInfo());
    }
    const tabInfo = gTabInfoMap.get(tabId);
    tabInfo.setPort(frameId, port);
    port.postMessage({
        command: "registerFrameId", frameId: frameId, mode: tabInfo.getMode()
    });
});
function invokeCommand(msg, sender) {
    return Command[msg.command](msg, sender);
}
function clearnupFrameInfo(tabId, frameId, port, error) {
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
        gTabInfoMap.delete(tabId);
    }
}

