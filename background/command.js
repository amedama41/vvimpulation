class ExCommand {
    constructor(name, proc, completion = undefined) {
        this.name = name;
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
    toString() {
        return this.name;
    }
}

class ExCommandMap {
    constructor() {
        this.cmdMap = new Map();
    }
    addCommand(cmd) {
        this.cmdMap.set(cmd.name, cmd);
    }
    makeCommand(name, proc, completion) {
        this.addCommand(new ExCommand(name, proc, completion));
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
            return Promise.resolve(
                [value, cmdStart, 0, cmds.map((cmd) => cmd.toString())]);
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
        return [0, 1, historyItems.map((item) => [item.url, item.title])];
    });
}
gExCommandMap.makeCommand("open", (args, tab) => {
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
gExCommandMap.makeCommand("tabopen", (args, tab) => {
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
gExCommandMap.makeCommand("private", (args, tab) => {
    if (args.length === 0) {
        args.push("about:blank");
    }
    let url = args.join(' ');
    if (!/^(https?|file|ftp|app|about):/.test(url)) {
        url = "http://" + url;
    }
    browser.windows.create({ url: url, incognito: true });
    return Promise.reject(true); // always reject to avoid adding to history
}, getHistory);
class SearchCommand {
    constructor(name, useNewTab) {
        this.name = name;
        this.useNewTab = useNewTab;
        this.cmdMap = new Map([
            [
                "google", [
                    "https://www.google.co.jp/search?q=%s&ie=utf-8&oe=utf-8&hl=ja",
                    "https://suggestqueries.google.com/complete/search?output=firefox&client=firefox&hl=ja&qu=%s"
                ]
            ],
            [
                "alc", [ "http://eow.alc.co.jp/search?q=%s" ]
            ]
        ]);
        this.defaultCmd = "google";
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
        const url = result[1][0].replace("%s", args.join(" "));
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
        let urlPattern = undefined;
        let argStart = 0;
        if (match[2].length === 0) {
            const cmds =
                SearchCommand.getCandidateSubcmds(match[1], this.cmdMap);
            if (cmds.length !== 0) {
                return [0, 1, cmds.map(([name, urls]) => [name, urls[0]])];
            }
            const [result, reason] = this.getSubCmd(this.defaultCmd);
            urlPattern = result[1][1];
            argStart = 0;
        }
        else {
            const [result, reason] = this.getSubCmd(match[1]);
            if (!result) { // ambiguous
                return [0, []];
            }
            urlPattern = result[1][1];
            // if reason is not null (use default), head of value is not command
            argStart = (reason ? 0 : match[0].length);
        }

        if (!urlPattern) {
            return [0, []];
        }

        const url = urlPattern.replace("%s", value.substr(argStart));
        const headers = new Headers();
        headers.append("Content-Type", "application/x-suggestions+json");
        return fetch(url, { method: "GET", mode: "cors", header: headers })
            .then((response) => response.json())
            .then((json) => [argStart, 0, json[1]]);
    }
    static getCandidateSubcmds(word, cmdMap) {
        const result = [];
        for (let [name, urls] of cmdMap) {
            if (name.startsWith(word)) {
                result.push([name, urls]);
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
        if (candidates.length === 0) {
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
    toString() {
        return this.name;
    }
}
gExCommandMap.addCommand(new SearchCommand("search", false));
gExCommandMap.addCommand(new SearchCommand("tabsearch", true));
gExCommandMap.makeCommand("tab", (args, tab) => {
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
        0, 2, tabs.map((tab, index) => [index, tab.title]).filter(
            ([index, title]) => title.includes(value))
    ]);
});
gExCommandMap.makeCommand("download", (args, tab) => {
    return browser.downloads.search({}).then((dlItems) => {
        console.table(dlItems);
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
        return [0, 0, dlItems.map((item) => {
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
        })];
    });
});
gExCommandMap.makeCommand("history", (args, tab) => {
    return Promise.resolve(true);
}, (value, tab) => {
    return browser.history.search({
        text: value, maxResults: 1000, startTime: 0
    }).then((historyItems) => {
        return [0, 1, historyItems.map((item) => [item.url, item.title])];
    });
});
gExCommandMap.makeCommand("undoTab",
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
            return [0, 2, tabSessions.map((s, index) => [index, s.tab.title])];
        });
    });

gExCommandMap.makeCommand("undoWindow",
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
            console.table(winSessions);
            return [
                0, 2, winSessions.map((s, index) => [
                    index, s.window.title || s.window.tabs[0].title
                ])
            ];
        });
    });

