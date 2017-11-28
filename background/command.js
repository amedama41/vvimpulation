'use strict';

class ExCommand {
    constructor(name, description, proc, completion = undefined) {
        this.name = name;
        this.description = description;
        this.proc = proc;
        this.completion = completion;
    }
    invoke(args, tab) {
        return this.proc(args, tab);
    }
    complete(value, tab) {
        if (!this.completion) {
            return undefined;
        }
        return this.completion(value, tab);
    }
}

class ExCommandMap {
    constructor() {
        this.cmdMap = new Map();
    }
    addCommand(cmd) {
        this.cmdMap.set(cmd.name, cmd);
    }
    makeCommand(name, description, proc, completion) {
        this.addCommand(new ExCommand(name, description, proc, completion));
    }
    execCommand(inputCmd, tab) {
        const args = inputCmd.trim().split(/\s/);
        const cmdName = args.shift();
        const [cmd, reason] = ExCommandMap.getCommand(cmdName, this.cmdMap);
        if (!cmd) {
            return Promise.reject(reason);
        }
        return cmd.invoke(args, tab);
    }
    getCandidate(value, tab) {
        const match = /^(\s*)(\S*)(\s*)/.exec(value);
        if (match[3].length === 0) {
            const cmds = ExCommandMap.getCandidateCommands(
                match[2], this.cmdMap);
            const cmdStart = match[1].length;
            return Promise.resolve([
                value, cmdStart, "string",
                cmds.map((cmd) => [cmd.name, cmd.description])
            ]);
        }
        else {
            const cmdName = match[2];
            const [cmd, reason] = ExCommandMap.getCommand(cmdName, this.cmdMap);
            if (!cmd) {
                return;
            }
            const argStart = match[0].length;
            const result = cmd.complete(value.substr(argStart), tab);
            if (!result) {
                return;
            }
            return Promise.resolve(result).then(([start, type, candidates]) => {
                return [value, argStart + start, type, candidates];
            });
        }
    }
    static getCandidateCommands(word, cmdMap) {
        const result = [];
        for (let [name, cmd] of cmdMap) {
            if (name.startsWith(word)) {
                result.push(cmd);
            }
        }
        return result;
    }
    static getCommand(cmdName, cmdMap) {
        const cmd = cmdMap.get(cmdName);
        if (cmd) {
            return [cmd, null];
        }
        const candidates = ExCommandMap.getCandidateCommands(cmdName, cmdMap);
        if (candidates.length === 0) {
            return [null, `${cmdName} is unknown`];
        }
        if (candidates.length !== 1) {
            return [null, `${cmdName} is ambiguous (${candidates.join(",")})`];
        }
        return [candidates[0], null];
    }
}
const gExCommandMap = new ExCommandMap();

function getHistory(value, tab) {
    return browser.history.search({
        text: value, maxResults: 40,
        startTime: Date.now() - 31 * 24 * 60 * 60 * 1000
    }).then((historyItems) => {
        return [
            0, "string", historyItems.map((item) => [item.url, item.title])
        ];
    });
}
gExCommandMap.makeCommand("open", "Open link in current tab", (args, tab) => {
    if (args.length === 0) {
        return Promise.reject("no argument");
    }
    let url = args.join(' ');
    if (!/^(https?|file|ftp|app|about):/.test(url)) {
        url = "http://" + url;
    }
    browser.tabs.update(tab.id, { url: url });
    return Promise.resolve(true);
}, getHistory);
gExCommandMap.makeCommand("tabopen", "Open link in new tab", (args, tab) => {
    if (args.length === 0) {
        return Promise.reject("no argument");
    }
    let url = args.join(' ');
    if (!/^(https?|file|ftp|app|about):/.test(url)) {
        url = "http://" + url;
    }
    browser.tabs.create({ url: url, index: tab.index + 1, active: true });
    return Promise.resolve(true);
}, getHistory);
gExCommandMap.makeCommand("private", "Open link in private window", (args, tab) => {
    if (args.length === 0) {
        args.push("about:blank");
    }
    let url = args.join(' ');
    if (!/^(https?|file|ftp|app|about):/.test(url)) {
        url = "http://" + url;
    }
    browser.windows.create({ url: url, incognito: true });
    return Promise.resolve(false); // always reject to avoid adding to history
}, getHistory);
class SearchCommand {
    constructor(name, description, useNewTab) {
        this.name = name;
        this.description = description;
        this.useNewTab = useNewTab;
        this.cmdMap = new Map();
        this.defaultCmd = null;
    }
    setEngine(searchEngine) {
        const engines = searchEngine.engines;
        this.cmdMap.clear();
        Object.keys(engines).forEach((keyword) => {
            this.cmdMap.set(keyword, engines[keyword]);
        });
        this.defaultCmd = searchEngine.defaultEngine;
    }
    invoke(args, tab) {
        if (args.length === 0) {
            return Promise.reject("no subcommand");
        }
        const [result, reason] = this.getSubCmd(args[0]);
        if (!result) {
            return Promise.reject(reason);
        }
        if (!reason) { // if reason is null, head of args is command
            args.shift();
        }
        const url = result[1].searchUrl.replace(
            "%s", encodeURIComponent(args.join(" ")));
        if (this.useNewTab) {
            browser.tabs.create(
                { url: url, index: tab.index + 1, active: true });
        }
        else {
            browser.tabs.update(tab.id, { url: url });
        }
        return Promise.resolve(true);
    }
    complete(value, tab) {
        const match = /^(\S*)(\s*)/.exec(value);
        let suggest = undefined;
        let argStart = 0;
        if (match[2].length === 0) {
            const cmds =
                SearchCommand.getCandidateSubcmds(match[1], this.cmdMap);
            if (cmds.length !== 0) {
                return [
                    0, "string",
                    cmds.map(([name, urls]) => [name, urls.searchUrl])
                ];
            }
            if (this.defaultCmd) {
                const [result, reason] = this.getSubCmd(this.defaultCmd);
                suggest = result[1].suggest;
                argStart = 0;
            }
        }
        else {
            const [result, reason] = this.getSubCmd(match[1]);
            if (!result) { // ambiguous
                return [0, "string", []];
            }
            suggest = result[1].suggest;
            // if reason is not null (use default), head of value is not command
            argStart = (reason ? 0 : match[0].length);
        }

        if (!suggest) {
            return [0, "string", []];
        }

        const url = suggest.url.replace(
            "%s", encodeURIComponent(value.substr(argStart)));
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
                            return SearchCommand._getJSONSuggests(
                                json, suggest.path, suggest.decode);
                        });
                    case "xml":
                        return response.text().then((text) => {
                            return SearchCommand._getXMLSuggests(
                                text, suggest.path, suggest.decode);
                        });
                }
            })
            .then((result) => [argStart, "noinfo", result.map((e) => [e, ""])]);
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
    static getCandidateSubcmds(word, cmdMap) {
        const result = [];
        for (let [name, engine] of cmdMap) {
            if (name.startsWith(word)) {
                result.push([name, engine]);
            }
        }
        return result;
    }
    getSubCmd(cmdName) {
        const urls = this.cmdMap.get(cmdName);
        if (urls) {
            return [[cmdName, urls], null];
        }
        const candidates =
            SearchCommand.getCandidateSubcmds(cmdName, this.cmdMap);
        if (candidates.length === 0 && this.defaultCmd) {
            return [
                [this.defaultCmd, this.cmdMap.get(this.defaultCmd)],
                "use default command"
            ];
        }
        if (candidates.length !== 1) {
            const cmdList = candidates.map(([name, urls]) => name).join(",");
            return [null, `${cmdName} is ambiguous (${cmdList})`];
        }
        return [candidates[0], null];
    }
}
const gSearchCommand =
    new SearchCommand("search", "Search keyword in current tab", false);
const gTabSearchCommand =
    new SearchCommand("tabsearch", "Search keyword in new tab", true);
gExCommandMap.addCommand(gSearchCommand);
gExCommandMap.addCommand(gTabSearchCommand);
gExCommandMap.makeCommand("buffer", "Switch tab", (args, tab) => {
    if (args.length === 0) {
        return Promise.reject("no argument");
    }
    const index = parseInt(args[0], 10);
    if (Number.isNaN(index)) {
        return Promise.reject("argument must be number");
    }
    return browser.tabs.query({ windowId: tab.windowId }).then((tabs) => {
        browser.tabs.update(tabs[index].id, { active: true });
        return true;
    });
}, (value, tab) => {
    return browser.tabs.query({ windowId: tab.windowId }).then((tabs) => [
        0, "number", tabs.map((tab, index) => [index, tab.title]).filter(
            ([index, title]) => title.includes(value))
    ]);
});
gExCommandMap.makeCommand("download", "Show download items", (args, tab) => {
    return browser.downloads.search({}).then((dlItems) => {
        if (!tab.incognito) {
            dlItems = dlItems.filter((item) => !item.incognito);
        }
        return dlItems.map((item) => {
            let str = item.filename;
            switch (item.state) {
                case browser.downloads.State.IN_PROGRESS:
                case browser.downloads.State.INTERRUPTED:
                    str += ` ${item.estimatedEndTime || "--"}`;
                    str += ` ${item.bytesReceived}`;
                    str += `/${item.totalBytes || "--"}`;
                    break;
                case browser.downloads.State.COMPLETE:
                    str += " complete";
                    break;
            }
            return str;
        });
    });
}, (value, tab) => {
    return browser.downloads.search({}).then((dlItems) => {
        if (!tab.incognito) {
            dlItems = dlItems.filter((item) => !item.incognito);
        }
        return [0, "string", dlItems.map((item) => {
            let info = "";
            switch (item.state) {
                case browser.downloads.State.IN_PROGRESS:
                case browser.downloads.State.INTERRUPTED:
                    info += `${item.estimatedEndTime || "--"}`;
                    info += ` ${item.bytesReceived}`;
                    info += `/${item.totalBytes || "--"}`;
                    break;
                case browser.downloads.State.COMPLETE:
                    info += "complete";
                    break;
            }
            return [item.filename, info];
        })];
    });
});
gExCommandMap.makeCommand("history", "Show history items", (args, tab) => {
    return Promise.resolve(true);
}, (value, tab) => {
    return browser.history.search({
        text: value, maxResults: 1000, startTime: 0
    }).then((historyItems) => {
        return [
            0, "string", historyItems.map((item) => [item.url, item.title])
        ];
    });
});
gExCommandMap.makeCommand("undoTab", "Reopen closed tab",
    (args, tab) => {
        const index = parseInt(args[0], 10);
        if (Number.isNaN(index)) {
            return Promise.reject("argument must be number");
        }
        return browser.sessions.getRecentlyClosed().then((sessions) => {
            const tabSessions = sessions.filter(
                (s) => s.tab && s.tab.windowId === tab.windowId);
            if (tabSessions.length === 0) {
                return Promise.reject("no closed tab");
            }
            if (!(index < tabSessions.length)) {
                return Promise.reject("invalid index");
            }
            browser.sessions.restore(tabSessions[index].tab.sessionId);
            return Promise.resolve(true);
        });
    },
    (value, tab) => {
        return browser.sessions.getRecentlyClosed().then((sessions) => {
            const tabSessions = sessions.filter(
                (s) => s.tab && s.tab.windowId === tab.windowId);
            return [
                0, "number",
                tabSessions.map((s, index) => [index, s.tab.title])
            ];
        });
    });

gExCommandMap.makeCommand("undoWindow", "Reopen closed window",
    (args, tab) => {
        const index = parseInt(args[0], 10);
        if (Number.isNaN(index)) {
            return Promise.reject("argument must be number");
        }
        return browser.sessions.getRecentlyClosed().then((sessions) => {
            const winSessions = sessions.filter((s) => s.window);
            if (winSessions.length === 0) {
                return Promise.reject("no closed window");
            }
            if (!(index < winSessions.length)) {
                return Promise.reject("invalid index");
            }
            browser.sessions.restore(winSessions[index].window.sessionId);
            return Promise.resolve(true);
        });
    },
    (value, tab) => {
        return browser.sessions.getRecentlyClosed().then((sessions) => {
            const winSessions = sessions.filter((s) => s.window);
            return [
                0, "number", winSessions.map((s, index) => [
                    index, s.window.title || s.window.tabs[0].title
                ])
            ];
        });
    });
gExCommandMap.makeCommand("options", "Open option page", (args, tab) => {
    browser.runtime.openOptionsPage();
    return Promise.resolve(true);
});
gExCommandMap.makeCommand(
    "registers", "Show the contents of all registers",
    (args, tab) => {
        return Promise.resolve(
            gMacro.getRegisters().map(
                ([register, keyList]) => `"${register}: ${keyList.join("")}`));
    });

