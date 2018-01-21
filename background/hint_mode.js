'use strict';

let gHintModeUniqueId = 0;

class HintMode {
    static getUniqueId() {
        const id = gHintModeUniqueId;
        gHintModeUniqueId = (gHintModeUniqueId + 1) % Number.MAX_SAFE_INTEGER;
        return id;
    }
    constructor(tabInfo, id, idList, typeInfo, autoFocus, overlap, keyMapping) {
        this.typeInfo = typeInfo;
        this.filter = "";
        this.filterIndexMap = []; // displayed index => global index
        this.idList = []; // global index => frame id
        this.currentIndex = 0; // current displayed index
        this.autoFocus = autoFocus;
        this.overlap = overlap;
        this.mapper = Utils.makeCommandMapper(keyMapping);
        this._changeMode(tabInfo, id, idList);
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
        const { type, pattern } = this.typeInfo;
        const id = HintMode.getUniqueId();
        tabInfo.sendMessage(0, {
            command: "collectHint", id, type, pattern
        }).then((hintsInfoList) => {
            const targetId =
                this.idList[this.filterIndexMap[this.currentIndex]];
            return tabInfo.forwardModeCommand(targetId, "HINT", {
                command: "getTargetIndex", id
            }).then((targetIndex) => [hintsInfoList, targetId, targetIndex]);
        }).then(([hintsInfoList, targetId, targetIndex]) => {
            if (hintsInfoList.length === 0) {
                changeNormalMode(tabInfo);
                return;
            }
            this._changeMode(tabInfo, id, hintsInfoList, targetId, targetIndex);
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
    _changeMode(tabInfo, id, idList, targetId, targetIndex=null) {
        if (targetIndex === null) {
            targetId = idList[0];
            targetIndex = 0;
        }
        const labelMap = {};
        let globalTargetIndex = 0;
        let counter = 0;
        idList.forEach((frameId, index) => {
            if (!labelMap[frameId]) {
                labelMap[frameId] = [];
            }
            labelMap[frameId].push(index);
            if (frameId === targetId && counter++ === targetIndex) {
                globalTargetIndex = index;
            }
        });
        this._setIdList(idList, globalTargetIndex);
        const setZIndex = this.overlap;
        tabInfo.forEachPort((port, frameId) => {
            const data = {
                labelList: (labelMap[frameId] || []), setZIndex, id
            };
            if (frameId === targetId) {
                data.initIndex = targetIndex;
            }
            port.postMessage({ command: "changeMode", mode: "HINT", data });
        });
    }
    _setIdList(idList, index) {
        this.idList = idList;
        this.filterIndexMap = this.idList.map((id, index) => index);
        this.filter = "";
        this.currentIndex = index;
        this.mapper.reset();
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

