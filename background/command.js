'use strict';

class CommandMap {
    constructor() {
        this.map = new Map();
        this.defaultCommand = "";
    }
    clear() {
        this.map.clear();
    }
    set(name, cmd) {
        this.map.set(name, cmd);
    }
    setDefault(cmdName) {
        this.defaultCommand = cmdName;
    }
    getCommand(name) {
        const cmd = this.map.get(name);
        if (cmd) {
            return [cmd, ""];
        }
        const cmdList = CommandMap._filter(name, this.map);
        if (cmdList.length === 1) {
            return [cmdList[0], ""];
        }
        if (cmdList.length > 1) {
            const nameList = cmdList.map((cmd) => cmd.name);
            return [null, `${name} is ambiguous (${nameList.join(",")})`];
        }
        if (this.defaultCommand) {
            return [this.map.get(this.defaultCommand), "use default command"];
        }
        return [null, `${name} is unknown`];
    }
    getCandidate(value) {
        const match = /^(\s*)(\S*)(\s*)/.exec(value);
        if (match[3].length === 0) { // no arguments
            const namePrefix = match[2];
            const cmdList = CommandMap._filter(namePrefix, this.map);
            if (cmdList.length === 0 && this.defaultCommand) {
                return [this.map.get(this.defaultCommand), 0];
            }
            return [cmdList, match[1].length];
        }
        else {
            const cmdName = match[2];
            const [cmd, reason] = this.getCommand(cmdName);
            if (cmd === null) {
                return [[], 0];
            }
            return [cmd, (reason === "" ? match[0].length : 0)];
        }
    }
    static _filter(prefix, cmdMap) {
        const cmdList = [];
        for (let [name, cmd] of cmdMap) {
            if (name.startsWith(prefix)) {
                cmdList.push(cmd);
            }
        }
        return cmdList;
    }
}

class ExCommand {
    constructor(name, description, proc, completion = undefined) {
        this.name = name;
        this.description = description;
        this.proc = proc;
        this.completion = completion;
    }
    invoke(args, tabInfo, options) {
        return this.proc(args, tabInfo, options);
    }
    complete(value, tabInfo) {
        if (!this.completion) {
            return undefined;
        }
        return this.completion(value, tabInfo);
    }
}

class ExCommandMap {
    constructor() {
        this.cmdMap = new CommandMap();
    }
    addCommand(cmd) {
        this.cmdMap.set(cmd.name, cmd);
    }
    makeCommand(name, description, proc, completion) {
        this.addCommand(new ExCommand(name, description, proc, completion));
    }
    execCommand(inputCmd, tabInfo, options) {
        const args = inputCmd.trim().split(/\s+/);
        const cmdName = args.shift();
        const [cmd, reason] = this.cmdMap.getCommand(cmdName);
        if (!cmd) {
            return Promise.resolve([false, reason]);
        }
        try {
            return Promise.resolve(cmd.invoke(args, tabInfo, options))
                .then((result) => [true, result])
                .catch((error) => [false, (error && error.toString())]);
        }
        catch (e) {
            return Promise.reject(e);
        }
    }
    getCandidate(value, tabInfo) {
        const [cmdList, fixedLen] = this.cmdMap.getCandidate(value);
        if (Array.isArray(cmdList)) {
            return Promise.resolve([
                value, fixedLen, [2],
                cmdList.map((cmd) => [null, null, cmd.name, cmd.description])
            ]);
        }
        else {
            const cmd = cmdList;
            const result = cmd.complete(value.substr(fixedLen), tabInfo);
            if (!result) {
                return Promise.resolve();
            }
            return Promise.resolve(result).then(([start, index, candidates]) => {
                return [value, fixedLen + start, index, candidates];
            });
        }
    }
}
const gExCommandMap = new ExCommandMap();
const gEngineMap = new CommandMap();

function setEngine(engineMap, searchEngine) {
    const engines = searchEngine.engines;
    engineMap.clear();
    Object.keys(engines).forEach((keyword) => {
        engineMap.set(
            keyword, Object.assign({ name: keyword }, engines[keyword]));
    });
    engineMap.setDefault(searchEngine.defaultEngine);
}

function discardResult(promise) {
    return promise.then(() => null);
}
function getElementByIndexOrText(elemList, args, getText) {
    if (args.length === 1 && /\d+/.test(args[0])) {
        const index = parseInt(args[0], 10);
        if (index >= elemList.length) {
            throw new Error("too larget index");
        }
        return elemList[index];
    }
    const filter = Utils.makeFilter(args.join(" "));
    const filteredList = elemList.filter((elem) => filter.match(getText(elem)));
    if (filteredList.length === 0) {
        throw new Error("no matching");
    }
    if (filteredList.length !== 1) {
        throw new Error("multiple matching");
    }
    return filteredList[0];
}
function filterCandidates(candidates, indexList, filterValue) {
    const filter = Utils.makeFilter(filterValue);
    return candidates.filter(
        (items) => indexList.some((index) => filter.match(items[index])));
}

class OpenCommand {
    constructor(name, description, kind, engineMap) {
        this.name = name;
        this.description = description;
        this.kind = kind;
        this.engineMap = engineMap;
    }
    invoke(args, tabInfo, options) {
        if (args.length === 0) {
            return OpenCommand._open(
                "about:blank", this.kind, tabInfo, options);
        }
        const [engine, reason] = this.engineMap.getCommand(args[0]);
        if (!engine) {
            return Promise.reject(reason);
        }
        if (reason) { // Select the default engine, but args may be URL.
            const url = OpenCommand._createURL(args.join(" "));
            if (url) {
                return OpenCommand._open(url, this.kind, tabInfo, options);
            }
        }
        else { // If reason is null, the head of args is a search engigne name.
            args.shift();
        }
        const url = engine.searchUrl.replace(
            "%s", encodeURIComponent(args.join(" ")));
        return OpenCommand._open(url, this.kind, tabInfo, options);
    }
    complete(value, tabInfo) {
        const [engineList, fixedLen] = this.engineMap.getCandidate(value);
        if (Array.isArray(engineList)) {
            return OpenCommand._getHistoryAndBookmark(value).then((result) => {
                const engines = engineList.map(
                    (engine) => [
                        "chrome://browser/skin/search-glass.svg",
                        null, engine.name, engine.searchUrl
                    ]);
                return [0, [2, 3], engines.concat(result)];
            });
        }
        if (fixedLen === 0) { // Select the default engine
            return OpenCommand._getHistoryAndBookmark(value).then((result) => {
                return [0, [2, 3], result];
            });
        }

        // Suggest only if the user specify a engine name.
        const suggest = engineList.suggest;
        if (!suggest) {
            return [0, [2, 3], []];
        }

        const url = suggest.url.replace(
            "%s", encodeURIComponent(value.substr(fixedLen)));
        const headers = new Headers();
        switch (suggest.type) {
            case "json":
                headers.append(
                    "Content-Type", "application/x-suggestions+json");
                break;
            case "xml":
                headers.append("Content-Type", "text/xml");
                break;
            default:
                throw new Error("Unknown suggest type: " + suggest.type);
        }
        return fetch(url, { method: "GET", header: headers })
            .then((response) => {
                switch (suggest.type) {
                    case "json":
                        return response.json().then((json) => {
                            return OpenCommand._getJSONSuggests(
                                json, suggest.path, suggest.decode);
                        });
                    case "xml":
                        return response.text().then((text) => {
                            return OpenCommand._getXMLSuggests(
                                text, suggest.path, suggest.decode);
                        });
                }
            })
            .then((result) => [
                fixedLen, [2], result.map((e) => [null, null, e, ""])
            ]);
    }
    static _getJSONSuggests(json, path, decode) {
        // TODO
        return json[1];
    }
    static _getXMLSuggests(text, path, decode) {
        const parser = new DOMParser();
        const doc = parser.parseFromString(text, "text/xml");
        const suggests = Array.from(doc.querySelectorAll(path));
        return suggests.map(
            (e) => decode ? decodeURIComponent(e.textContent) : e.textContent);
    }
    static _createURL(maybeURL) {
        if (!/^([a-z][a-z0-9-]+):/i.test(maybeURL)) {
            maybeURL = "http://" + maybeURL;
        }
        try {
            const url = new URL(maybeURL);
            if (!/^https?:/.test(url.protocol)) {
                return url.href;
            }
            const hostname = url.hostname;
            if ((hostname.includes(".") && !hostname.startsWith("."))
                || hostname.startsWith("[") // IPv6
                || hostname === "localhost") {
                return url.href;
            }
            else {
                return null;
            }
        }
        catch (e) {
            return null;
        }
    }
    static _open(url, kind, tabInfo, options) {
        return discardResult((() => {
            switch (kind) {
                case "tab":
                    return browser.tabs.get(tabInfo.id).then((tab) => {
                        return browser.tabs.create({
                            url,
                            index: tab.index + 1,
                            active: options.activateNewTab
                        });
                    });
                case "window":
                    return browser.windows.create({ url });
                case "private":
                    return browser.windows.create({ url, incognito: true })
                        .then(() => Promise.reject());
                default:
                    return browser.tabs.update(tabInfo.id, { url });
            }
        })());
    }
    static _getHistoryAndBookmark(value) {
        return Promise.all([
            browser.history.search({
                text: value, maxResults: 40,
                startTime: Date.now() - 31 * 24 * 60 * 60 * 1000
            }).then((historyItems) => {
                return historyItems.map(
                    (item) => [
                        "chrome://browser/skin/history.svg",
                        null, item.url, item.title
                    ])
            }),
            browser.bookmarks.search({ query: value }).then((treeNodeList) => {
                return treeNodeList
                    .filter((node) => (node.type === "bookmark" &&
                        !node.url.startsWith("place:")))
                    .map((node) => [
                        "chrome://browser/skin/bookmark.svg",
                        null, node.url, node.title
                    ]);
            })
        ]).then(([history, bookmark]) => history.concat(bookmark));
    }
}
gExCommandMap.addCommand(
    new OpenCommand(
        "open", "Open or search in current tab", "", gEngineMap));
gExCommandMap.addCommand(
    new OpenCommand(
        "tabopen", "Open or search in new tab", "tab", gEngineMap));
gExCommandMap.addCommand(
    new OpenCommand(
        "winopen", "Open or search in new window", "window", gEngineMap));
gExCommandMap.addCommand(
    new OpenCommand(
        "private", "Open or search in private window", "private", gEngineMap));
gExCommandMap.makeCommand(
    "buffer", "Switch tab", (args, tabInfo) => {
        if (args.length === 0) {
            return Promise.reject("no argument");
        }
        const windowId = tabInfo.windowId;
        return discardResult(browser.tabs.query({ windowId }).then((tabs) => {
            const tab = getElementByIndexOrText(tabs, args, (tab) => tab.title);
            return browser.tabs.update(tab.id, { active: true });
        }));
    },
    (value, tabInfo) => {
        const INDEX_LIST = [1, 2, 3];
        const windowId = tabInfo.windowId;
        return browser.tabs.query({ windowId }).then((tabs) => [
            0, INDEX_LIST, filterCandidates(tabs.map((tab, index) => [
                tab.favIconUrl, index, tab.title, tab.url
            ]), INDEX_LIST, value)
        ]);
    });
gExCommandMap.makeCommand(
    "winbuffer", "Switch window", (args, tabInfo) => {
        if (args.length === 0) {
            return Promise.reject("no argument");
        }
        return discardResult(browser.windows.getAll().then((windows) => {
            const win =
                getElementByIndexOrText(windows, args, (win) => win.title);
            return browser.windows.update(win.id, { focused: true });
        }));
    },
    (value, tabInfo) => {
        const INDEX_LIST = [1, 2];
        return browser.windows.getAll().then((windows) => [
            0, INDEX_LIST, filterCandidates(windows.map((win, index) => [
                (win.incognito ?
                    "chrome://browser/skin/privatebrowsing/favicon.svg" : null),
                index, win.title, win.type
            ]), INDEX_LIST, value)
        ]);
    });
class DownloadManager {
    constructor() {
        this.name = "download";
        this.description = "Manage download items";
        this.cmdMap = new CommandMap();
        const State = browser.downloads.State;
        const cmdList = [
            new ExCommand(
                "show", "Show download items",
                DownloadManager._invokeShowItemList,
                DownloadManager._getItemList.bind(null, null)),
            new ExCommand(
                "pause", "Pause download",
                DownloadManager._invokeCommand.bind(
                    null, (id) => browser.downloads.pause(id)),
                DownloadManager._getItemList.bind(null, State.IN_PROGRESS)),
            new ExCommand(
                "resume", "Resume download",
                DownloadManager._invokeCommand.bind(
                    null, (id) => browser.downloads.resume(id)),
                DownloadManager._getItemList.bind(null, State.INTERRUPTED)),
            new ExCommand(
                "cancel", "Cancel download",
                DownloadManager._invokeCommand.bind(
                    null, (id) => browser.downloads.cancel(id)),
                DownloadManager._getItemList.bind(null, State.IN_PROGRESS)),
            new ExCommand(
                "erase", "Erase download items from history",
                DownloadManager._invokeCommand.bind(
                    null, (id) => browser.downloads.erase({ id })),
                DownloadManager._getItemList.bind(null, null)),
        ];
        cmdList.forEach((cmd) => this.cmdMap.set(cmd.name, cmd));
        this.cmdMap.setDefault("show");
    }
    invoke(args, tabInfo, options) {
        if (args.length === 0) {
            args.push("show");
        }
        const [subcmd, reason] = this.cmdMap.getCommand(args[0]);
        if (!subcmd) {
            return Promise.reject(reason);
        }
        if (!reason) { // if reason is null, head of args is command
            args.shift();
        }
        return subcmd.invoke(args, tabInfo, options);
    }
    complete(value, tabInfo) {
        const [subcmdList, fixedLen] = this.cmdMap.getCandidate(value);
        if (Array.isArray(subcmdList)) {
            return [
                0, [2],
                subcmdList.map((cmd) => [null, null, cmd.name, cmd.description])
            ];
        }
        const query = value.substr(fixedLen).trim().split(/\s+/);
        return subcmdList.complete(query, tabInfo)
            .then((result) => [fixedLen, [1, 2], result]);
    }
    static _invokeCommand(func, args, tabInfo) {
        const ids = args
            .map((arg) => parseInt(arg, 10))
            .filter((id) => !Number.isNaN(id));
        if (ids.length === 0) {
            return Promise.reject("No arguments");
        }
        const promiseList =
            ids.map((id) => func(id).then(() => "").catch((error) => error));
        return Promise.all(promiseList).then((errors) => {
            errors = errors.filter((error) => error);
            return (errors.length ? Promise.reject(errors.join("\n")) : null);
        });
    }
    static _invokeShowItemList(args, tabInfo, options) {
        return DownloadManager._getItemList(null, args, tabInfo, true).then(
            (items) => items.map(([icon, id, name, info]) => [id, name, info]));
    }
    static _getItemList(state, valueList, tabInfo, doesFilterById=false) {
        const [idList, query] = valueList.reduce((listTuple, value) => {
            listTuple[(/^\d+$/.test(value) ? 0 : 1)].push(value);
            return listTuple;
        }, [[], []]);
        return browser.downloads.search({ query, state }).then((dlItems) => {
            if (!tabInfo.incognito) {
                dlItems = dlItems.filter((item) => !item.incognito);
            }
            if (doesFilterById && idList.length > 0) {
                dlItems = dlItems.filter(
                    (item) => idList.some((id) => id.includes(item.id)));
            }
            return Promise.all(dlItems.map((item) => {
                const infoList = [];
                switch (item.state) {
                    case browser.downloads.State.IN_PROGRESS:
                        infoList.push(DownloadManager._elapsedTime(item));
                        infoList.push(DownloadManager._bytesReceived(item));
                        break;
                    case browser.downloads.State.INTERRUPTED:
                        infoList.push(item.error);
                        infoList.push(DownloadManager._bytesReceived(item));
                        break;
                    case browser.downloads.State.COMPLETE:
                        infoList.push(DownloadManager._fileSize(item));
                        infoList.push(DownloadManager._hostname(item.url));
                        break;
                }
                return browser.downloads.getFileIcon(item.id).then((url) => {
                    return [url, item.id, item.filename, infoList.join(" -- ")];
                });
            }));
        });
    }
    static _fileSize(item) {
        if (!item.exists) {
            return "File moved or missing";
        }
        const [fileSize, unit] = DownloadManager._adjustBytes(item.fileSize);
        return `${fileSize} ${unit}`;
    }
    static _hostname(url) {
        if (url.startsWith("blob:")) {
            return "blob resource";
        }
        if (url.startsWith("data:")) {
            return "data resource";
        }
        try {
            return new URL(url).hostname;
        }
        catch (e) {
            return url;
        }
    }
    static _adjustBytes(bytes) {
        if (bytes > 1024 * 1024 * 1024) {
            return [(bytes / (1024 * 1024 * 1024)).toFixed(1), "GB"];
        }
        else if (bytes > 1024 * 1024) {
            return [(bytes / (1024 * 1024)).toFixed(1), "MB"];
        }
        else if (bytes > 1024) {
            return [(bytes / 1024).toFixed(1), "KB"];
        }
        else {
            return [bytes, "B"];
        }
    }
    static _bytesReceived(item) {
        const [bytesReceived, rUnit] =
            DownloadManager._adjustBytes(item.bytesReceived);
        if (item.totalBytes !== -1) {
            const [totalBytes, tUnit] =
                DownloadManager._adjustBytes(item.totalBytes);
            if (rUnit === tUnit) {
                return `${bytesReceived} of ${totalBytes} ${tUnit}`;
            }
            else {
                return `${bytesReceived} ${rUnit} of ${totalBytes} ${tUnit}`;
            }
        }
        else {
            return `${bytesReceived} ${rUnit}`;
        }
    }
    static _elapsedTime(item) {
        const time = item.estimatedEndTime;
        if (!time) {
            return "-";
        }
        let elapsed = (new Date(time).getTime() - Date.now()) / 1000;
        const elapsedList = [];
        if (elapsed > 24 * 60 * 60) {
            elapsedList.push(Math.floor(elapsed / (24 * 60 * 60)) + "D");
            elapsed = elapsed % (24 * 60 * 60);
        }
        if (elapsed > 60 * 60) {
            elapsedList.push(Math.floor(elapsed / (60 * 60)) + "h");
            elapsed = elapsed % (60 * 60);
        }
        if (elapsed > 60) {
            elapsedList.push(Math.floor(elapsed / 60) + "m");
            elapsed = elapsed % 60;
        }
        if (elapsedList.length === 0) {
            elapsedList.push(elapsed + "s");
        }
        elapsedList.push("left");
        return elapsedList.join(" ");
    }
}
gExCommandMap.addCommand(new DownloadManager());
class HistoryManager {
    constructor() {
        this.name = "history";
        this.description = "Manage browser history items";
        this.cmdMap = new CommandMap();
        const cmdList = [
            new ExCommand(
                "open", "Open history",
                (args, tabInfo) => {
                    return browser.tabs.update(tabInfo.id, { url: args[0] });
                },
                HistoryManager._getItemList),
            new ExCommand(
                "delete", "Delete hitory items with the URL",
                (args, tabInfo) => browser.history.deleteUrl({ url : args[0] }),
                HistoryManager._getItemList),
            new ExCommand(
                "deleteFrom", "Delete history items created after N hour ago",
                (args, tabInfo) => {
                    const n = parseFloat(args[0]);
                    if (Number.isNaN(n)) {
                        return Promise.reject("Must be number");
                    }
                    const endTime = Date.now();
                    const startTime = endTime - Math.floor(n * 60 * 60 * 1000);
                    return browser.history.deleteRange({ startTime, endTime });
                }),
        ];
        cmdList.forEach((cmd) => this.cmdMap.set(cmd.name, cmd));
    }
    invoke(args, tabInfo, options) {
        if (args.length === 0) {
            return Promise.reject("No subcommand");
        }
        const [subcmd, reason] = this.cmdMap.getCommand(args[0]);
        if (!subcmd) {
            return Promise.reject(reason);
        }
        if (!reason) { // if reason is null, head of args is command
            args.shift();
        }
        if (args.length === 0) {
            return Promise.reject("No arguments");
        }
        return discardResult(subcmd.invoke(args, tabInfo, options));
    }
    complete(value, tabInfo) {
        const [subcmdList, fixedLen] = this.cmdMap.getCandidate(value);
        if (Array.isArray(subcmdList)) {
            return [
                0, [2],
                subcmdList.map((cmd) => [null, null, cmd.name, cmd.description])
            ];
        }
        return subcmdList.complete(value.substr(fixedLen), tabInfo)
            .then((result) => [fixedLen, [2, 3], result]);
    }
    static _getItemList(text) {
        return browser.history.search({
            text, startTime: 0, maxResults: 1000
        }).then((itemList) => itemList.map(
            (item) => [null, null, item.url, item.title]));
    }
}
gExCommandMap.addCommand(new HistoryManager());
function closeTime(time) {
    const d = new Date(time);
    return `Closed at ${d.toLocaleTimeString()} on ${d.toLocaleDateString()}`;
}
gExCommandMap.makeCommand(
    "undoTab", "Reopen closed tab", (args, tabInfo) => {
        if (args.length === 0) {
            return Promise.reject("no argument");
        }
        return browser.sessions.getRecentlyClosed().then((sessions) => {
            const tabSessions = sessions.filter(
                (s) => s.tab && s.tab.windowId === tabInfo.windowId);
            if (tabSessions.length === 0) {
                return Promise.reject("no closed tab");
            }
            const session = getElementByIndexOrText(
                tabSessions, args, (session) => session.tab.title)
            const sessionId = session.tab.sessionId;
            return discardResult(browser.sessions.restore(sessionId));
        });
    },
    (value, tabInfo) => {
        const INDEX_LIST = [1, 2];
        return browser.sessions.getRecentlyClosed().then((sessions) => {
            const tabSessions = sessions.filter(
                (s) => s.tab && s.tab.windowId === tabInfo.windowId);
            return [
                0, INDEX_LIST, filterCandidates(tabSessions.map((s, index) => [
                    s.tab.favIconUrl, index, s.tab.title,
                    closeTime(s.lastModified)
                ]), INDEX_LIST, value)
            ];
        });
    });
function getLastAccessedTab(tabs) {
    return tabs.reduce((lhs, rhs) => {
        return lhs.lastAccessed > rhs.lastAccessed ? lhs : rhs;
    });
}
gExCommandMap.makeCommand(
    "undoWindow", "Reopen closed window", (args, tabInfo) => {
        if (args.length === 0) {
            return Promise.reject("no argument");
        }
        return browser.sessions.getRecentlyClosed().then((sessions) => {
            const winSessions = sessions.filter((s) => s.window);
            if (winSessions.length === 0) {
                return Promise.reject("no closed window");
            }
            const session = getElementByIndexOrText(
                winSessions, args,
                (session) => getLastAccessedTab(session.window.tabs).title);
            const sessionId = session.window.sessionId;
            return discardResult(browser.sessions.restore(sessionId));
        });
    },
    (value, tabInfo) => {
        const INDEX_LIST = [1, 2];
        return browser.sessions.getRecentlyClosed().then((sessions) => {
            const winSessions = sessions.filter((s) => s.window);
            return [
                0, INDEX_LIST, filterCandidates(winSessions.map((s, index) => {
                    const tab = getLastAccessedTab(s.window.tabs);
                    return [
                        tab.favIconUrl, index, s.window.title || tab.title,
                        closeTime(s.lastModified)
                    ];
                }), INDEX_LIST, value)
            ];
        });
    });
gExCommandMap.addCommand(new (class {
    constructor() {
        this.name = "hint";
        this.description = "Start hint mode with input selector";
        this.previousSelector = "*";
    }
    invoke(args, tabInfo, options) {
        let selector = args.join(" ").trim();
        if (selector === "") {
            selector = this.previousSelector;
        }
        tabInfo.toHintMode("console", selector, options);
        this.previousSelector = selector;
        return null;
    }
    complete(value, tabInfo) {
        return undefined;
    }
})());
gExCommandMap.makeCommand(
    "registers", "Show the contents of all registers", (args, tabInfo) => {
        return gMacro.getRegisters().map(
            ([register, keyList]) => [register, keyList.join("")]);
    });
gExCommandMap.makeCommand(
    "nohlsearch", "Remove search highlighting", (args, tabInfo, options) => {
        browser.find.removeHighlighting();
        tabInfo.searchHighlighting = options.highlightSearch;
        return null;
    });
gExCommandMap.makeCommand(
    "options", "Open option page", (args, tabInfo) => {
        return browser.runtime.openOptionsPage();
    });

