'use strict';

class HintModeBase {
    constructor() {
        this._hintList = [];
        this._targetIndex = null;
        this._indexMap = {}; // global index => local index
        this._oldTarget = null;
    }
    static getModeName() {
        return "HINT";
    }
    getTarget() {
        const [highlight, elem] = this._hintList[this._targetIndex];
        return elem;
    }
    consume(key, frameInfo) {
        return [true, undefined, key, undefined];
    }
    onReset(frameInfo, allFrame) {
        if (!allFrame) {
            frameInfo.postMessage({ command: "resetHintMode" });
        }
        const container = document.getElementById("wimpulation-hint-container");
        if (container) {
            container.remove();
        }
    }
    onDropKeys(dropKeys) {
    }
    onNonConsumed(key, frameInfo) {
    }

    makeHints(pattern, type, area, frameInfo) {
        const container = document.getElementById("wimpulation-hint-container");
        if (container) {
            container.remove();
        }
        this._oldTarget =
            (this._targetIndex !== null ? this.getTarget() : null);
        this._hintList = [];
        this._targetIndex = null;
        this._indexMap = {};
        return makeHints(this._hintList, pattern, type, area, frameInfo);
    }
    showHintLabel(data) {
        const labelList = data.labelList;
        const indexMap = {};
        const container = document.createElement("div");
        container.id = "wimpulation-hint-container";
        this._hintList.forEach(([highlight, elem], index) => {
            highlight.firstElementChild.textContent = labelList[index];
            container.insertBefore(highlight, container.firstElementChild);
            indexMap[labelList[index]] = index;
        });
        HintModeBase._setContainerPosition(container);
        document.documentElement.appendChild(container);
        this._indexMap = indexMap;
        if (data.setZIndex) {
            this.setZIndex();
        }
        if (Number.isInteger(data.initIndex)) {
            this._setActive(data.initIndex);
        }
    }

    invoke(data, frameInfo) {
        return invokeCommand(data.commandName, data.count, frameInfo);
    }
    focusHintLink(data, frameInfo) {
        const globalIndex = data.index;
        this._blurImpl();
        const localIndex = this._indexMap[globalIndex];
        if (localIndex === undefined) {
            console.error("Unknown index", globalIndex);
            return;
        }
        this._setActive(localIndex);
        if (data.autoFocus) {
            invokeCommand("fixedFocusin", 0, frameInfo);
        }
    }
    blurHintLink() {
        this._blurImpl();
        this._targetIndex = null;
    }
    applyFilter(filter) {
        const FILTER_CLASS_NAME = "wimpulation-filtered-hint";
        filter = Utils.makeFilter(filter);
        const getText = (elem) => {
            const innerText = elem.innerText;
            if (innerText === undefined) { // SVGElement does not have innerText
                return elem.textContent;
            }
            const text = (innerText.trim() || elem.value || elem.alt);
            if (text) {
                return text;
            }
            const child = elem.firstElementChild;
            if (child instanceof HTMLImageElement) {
                return child.alt;
            }
            return "";
        };
        this._hintList.forEach(([highlight, elem]) => {
            if (filter.match(getText(elem))) {
                highlight.classList.remove(FILTER_CLASS_NAME);
            }
            else {
                highlight.classList.add(FILTER_CLASS_NAME);
            }
        });
    }
    getFilterResult() {
        const FILTER_CLASS_NAME = "wimpulation-filtered-hint";
        const result = Object.keys(this._indexMap).map((index) => {
            // Object.keys returns an array of string
            index = parseInt(index, 10);
            const [highlight, elem] = this._hintList[this._indexMap[index]];
            return [index, !highlight.classList.contains(FILTER_CLASS_NAME)];
        });
        return result;
    }
    setHintLabel(labelList) {
        this._hintList.forEach(([highlight, elem], index) => {
            highlight.firstElementChild.textContent = labelList[index];
        });
        this._blurImpl();
        this._targetIndex = null;
    }
    setZIndex() {
        const getZIndex = (elem, zIndex, childZIndex) => {
            if (!elem) {
                return zIndex;
            }
            const style = window.getComputedStyle(elem, null);
            if (style.zIndex !== "auto" && style.position !== "static") {
                return getZIndex(elem.parentElement, style.zIndex, "auto");
            }
            if (style.opacity !== "1" ||
                style.mixBlendMode !== "normal" ||
                style.transform !== "none" ||
                style.filter !== "none" ||
                style.perspective !== "none" ||
                style.mask !== "none" || style.maskImage !== "none" ||
                style.isolation === "isolate") { // TODO: will-change
                return getZIndex(elem.parentElement, "auto", style.zIndex);
            }
            if (childZIndex !== "auto" && style.display.includes("flex")) {
                return getZIndex(elem.parentElement, childZIndex, style.zIndex);
            }
            return getZIndex(elem.parentElement, zIndex, style.zIndex);
        };
        this._hintList.forEach(([highlight, elem], index) => {
            highlight.style.setProperty(
                "z-index", getZIndex(elem, "auto", "auto"), "important");
        });
    }
    clearZIndex() {
        this._hintList.forEach(([highlight, elem], index) => {
            highlight.style.removeProperty("z-index");
        });
    }
    setOpacity() {
        const container = document.getElementById("wimpulation-hint-container");
        if (container) {
            container.classList.add("wimpulation-hint-is-transparent");
        }
    }
    clearOpacity() {
        const container = document.getElementById("wimpulation-hint-container");
        if (container) {
            container.classList.remove("wimpulation-hint-is-transparent");
        }
    }
    getTargetIndex() {
        if (!this._oldTarget) {
            return null;
        }
        const index = this._hintList.findIndex((e) => e[1] === this._oldTarget);
        if (index === -1) {
            return null;
        }
        return index;
    }
    static forward(frameInfo, frameId, data) {
        return frameInfo.forwardMessage(
            frameId, { command: "forwardModeCommand", mode: "HINT", data });
    }

    _setActive(index) {
        const [highlight, elem] = this._hintList[index];
        highlight.id = "wimpulation-hint-active";
        if (highlight.style.zIndex) {
            highlight.style.setProperty("z-index", highlight.style.zIndex);
        }
        this._targetIndex = index;
    }
    _blurImpl() {
        if (this._targetIndex === null) {
            return;
        }
        const [highlight, elem] = this._hintList[this._targetIndex];
        highlight.id = "";
        if (highlight.style.zIndex) {
            highlight.style.setProperty(
                "z-index", highlight.style.zIndex, "important");
        }
    }
    static _setContainerPosition(container) {
        const style = window.getComputedStyle(document.documentElement, null);
        // In about:blank, style can be null.
        if (style === null || style.position === "static") {
            return;
        }
        const rect = document.documentElement.getBoundingClientRect();
        const offsetX = -(rect.x + window.scrollX);
        const offsetY = -(rect.y + window.scrollY);
        container.style.setProperty("position", "absolute", "important");
        container.style.setProperty("left", offsetX + "px", "important");
        container.style.setProperty("top", offsetY + "px", "important");
    }
}

class HintMode extends HintModeBase {
    constructor(frameInfo, data) {
        super();
        this.typeInfo = { type: data.type, pattern: data.pattern };
        this.filter = "";
        this.filterIndexMap = []; // displayed index => global index
        this.frameIdList = []; // global index => frame id
        this.visibleFrameIdList = [];
        this.currentIndex = 0; // current displayed index
        this.autoFocus = data.autoFocus;
        this.overlap = data.overlap;
        this.opacity = false;
        this.mapper = Utils.makeCommandMapper(data.keyMapping);
        super.makeHints(data.pattern, data.type, {
            left: 0, right: window.innerWidth, width: window.innerWidth,
            top: 0, bottom: window.innerHeight, height: window.innerHeight,
        }, frameInfo).then((frameIdList) => {
            if (frameIdList.length === 0) {
                return Promise.reject(HintMode._NO_HINTS_MESSAGE);
            }
            this._showHintLabel(frameInfo, frameIdList);
        }).catch((error) => {
            frameInfo.postMessage({ command: "toNormalMode" });
            HintMode._handleError(frameInfo, "toHintMode", error);
        });
    }
    onInvoking(key, frameInfo) {
        this._handleKey(key, 0, frameInfo);
    }
    onMessageEvent(msg, frameInfo) {
        switch (msg.command) {
            case "handleKey":
                return this._handleKey(msg.key, msg.frameId, frameInfo);
            case "applyFilter":
                return this._applyFilter(msg.filter, frameInfo);
            case "hideConsole":
                return this._stopFilter(msg, frameInfo);
            default:
                console.warn("Unknown command:", msg.command);
                break;
        }
    }

    nextHint(frameInfo) {
        const nextIndex = (this.currentIndex + 1) % this.filterIndexMap.length;
        this._changeHintNum(nextIndex, frameInfo);
    }
    previousHint(frameInfo) {
        const length = this.filterIndexMap.length;
        const prevIndex = (this.currentIndex - 1 + length) % length;
        this._changeHintNum(prevIndex, frameInfo);
    }
    reconstruct(frameInfo) {
        const { type, pattern } = this.typeInfo;
        const targetFrameId =
            this.frameIdList[this.filterIndexMap[this.currentIndex]];
        this.filterIndexMap = [];
        this.frameIdList = [];
        super.makeHints(pattern, type, {
            left: 0, right: window.innerWidth,
            top: 0, bottom: window.innerHeight,
        }, frameInfo).then((frameIdList) => {
            if (frameIdList.length === 0) {
                return Promise.reject(HintMode._NO_HINTS_MESSAGE);
            }
            return Promise.resolve(this._forward(frameInfo, targetFrameId, {
                command: "getTargetIndex"
            })).then((targetIndex) => [frameIdList, targetIndex]);
        }).then(([frameIdList, targetIndex]) => {
            this._showHintLabel(
                frameInfo, frameIdList, targetFrameId, targetIndex);
        }).catch((error) => {
            frameInfo.postMessage({ command: "toNormalMode" });
            HintMode._handleError(frameInfo, "reconstruct", error);
        });
    }
    startFilter(frameInfo) {
        frameInfo.showConsole(this, "hintFilter", this.filter, 0);
    }
    toggleAutoFocus(frameInfo) {
        this.autoFocus = !this.autoFocus;
        const message = "Auto focus " + (this.autoFocus ? "ON" : "OFF");
        frameInfo.showMessage(message, 3000, false);
    }
    toggleOverlap(frameInfo) {
        this.overlap = !this.overlap;
        this._forwardToAllFrame(frameInfo, {
            command: (this.overlap ? "setZIndex" : "clearZIndex")
        });
        const message = "Overlapping " + (this.overlap ? "ON" : "OFF");
        frameInfo.showMessage(message, 3000, false);
    }
    toggleTransparency(frameInfo) {
        this.opacity = !this.opacity;
        this._forwardToAllFrame(frameInfo, {
            command: (this.opacity ? "setOpacity" : "clearOpacity")
        });
    }
    invokeCommand(frameInfo, args) {
        const match = /^(\d+)\|(.*$)/.exec(args);
        const [count, commandName] =
            (match ? [parseInt(match[1], 10), match[2]] : [0, args]);
        const targetFrameId =
            this.frameIdList[this.filterIndexMap[this.currentIndex]];
        return this._forward(frameInfo, targetFrameId, {
            command: "invoke", data: { commandName, count }
        });
    }

    _handleKey(key, frameId, frameInfo) {
        if (this.filterIndexMap.length === 0) { // In making hints
            return;
        }
        if (key.length === 1 && "0" <= key && key <= "9") {
            this._handleDigit(key, frameInfo);
            return;
        }
        const [consumed, optCmd, cmd, dropKeyList] = this.mapper.get(key);
        if (optCmd) {
            this._invoke(optCmd, frameInfo);
        }
        else if (dropKeyList && !cmd) {
            dropKeyList.push(key);
            frameInfo.postMessage(
                { command: "toNormalMode", frameId, data: dropKeyList });
            return;
        }
        if (cmd) {
            this._invoke(cmd, frameInfo);
        }
        else if (!consumed) {
            frameInfo.postMessage(
                { command: "toNormalMode", frameId, data: [key] });
        }
    }
    _handleDigit(num, frameInfo) {
        const length = this.filterIndexMap.length;
        let index = this.currentIndex.toString() + num;
        while (index && parseInt(index, 10) >= length) {
            index = index.substring(1);
        }
        const nextIndex = (index ? parseInt(index, 10) : length - 1);

        this._changeHintNum(nextIndex, frameInfo);
    }
    _changeHintNum(nextDisplayedIndex, frameInfo) {
        const prevId = this.frameIdList[this.filterIndexMap[this.currentIndex]];
        const nextIndex = this.filterIndexMap[nextDisplayedIndex];
        const nextId = this.frameIdList[nextIndex];
        if (prevId !== nextId) {
            this._forward(frameInfo, prevId, { command: "blurHintLink", });
        }
        const data = { index: nextIndex, autoFocus: this.autoFocus };
        this._forward(frameInfo, nextId, { command: "focusHintLink", data });
        this.currentIndex = nextDisplayedIndex;
    }
    _invoke(cmd, frameInfo) {
        const index = cmd.indexOf("|");
        const command = (index === -1 ? cmd : cmd.substr(0, index));
        if (!HINT_COMMAND_DESCRIPTIONS[command]) {
            console.error("Unknown hint command:", cmd);
            return;
        }
        const args = cmd.substr(command.length + 1);
        this[command](frameInfo, args);
    }
    _applyFilter(filter, frameInfo) {
        this._forwardToAllFrame(
            frameInfo, { command: "applyFilter", data: filter });
    }
    _stopFilter(msg, frameInfo) {
        frameInfo.hideConsole();
        const filter = msg.value;
        if (filter === null) {
            this._applyFilter(this.filter, frameInfo);
            return;
        }
        if (filter === this.filter) {
            return;
        }
        this._fixFilter(frameInfo).then((hasMatchingElements) => {
            if (hasMatchingElements) {
                this.filter = filter;
            }
            else {
                const message = "No elements matched by " + filter;
                frameInfo.showMessage(message, 3000, false);
                this._applyFilter(this.filter, frameInfo);
            }
        });
    }
    _fixFilter(frameInfo) {
        return Promise.all(this._forwardToAllFrame(frameInfo, {
            command: "getFilterResult"
        })).then((resultList) => {
            const filterResult = resultList.reduce((filterResult, result) => {
                Array.prototype.push.apply(filterResult, result);
                return filterResult;
            }).sort((lhs, rhs) => lhs[0] - rhs[0]);
            const [indexMap, labelMap] =
                HintMode._createFilterMaps(filterResult, this.frameIdList);
            if (indexMap.length === 0) {
                return false;
            }
            this.filterIndexMap = indexMap;
            this.currentIndex = 0;
            this.visibleFrameIdList.forEach((frameId) => {
                this._forward(frameInfo, frameId, {
                    command: "setHintLabel", data: labelMap[frameId]
                });
            });
            this._changeHintNum(this.currentIndex, frameInfo);
            return true;
        });
    }
    _forward(frameInfo, frameId, message) {
        if (frameId === 0) {
            return super[message.command](message.data, frameInfo);
        }
        else {
            return HintModeBase.forward(frameInfo, frameId, message);
        }
    }
    _forwardToAllFrame(frameInfo, message) {
        return this.visibleFrameIdList.map((frameId) => {
            return this._forward(frameInfo, frameId, message);
        });
    }
    _showHintLabel(frameInfo, frameIdList, targetId, targetIndex=null) {
        if (targetIndex === null) {
            targetId = frameIdList[0];
            targetIndex = 0;
        }
        const labelMap = {};
        const visibleFrameIdList = [];
        let globalTargetIndex = 0;
        let counter = 0;
        frameIdList.forEach((frameId, index) => {
            if (!labelMap[frameId]) {
                labelMap[frameId] = [];
                visibleFrameIdList.push(frameId);
            }
            labelMap[frameId].push(index);
            if (frameId === targetId && counter++ === targetIndex) {
                globalTargetIndex = index;
            }
        });
        this._setIdList(frameIdList, visibleFrameIdList, globalTargetIndex);
        const setZIndex = this.overlap;
        visibleFrameIdList.forEach((frameId) => {
            const data = {
                labelList: labelMap[frameId],
                setZIndex,
                initIndex: (frameId === targetId ? targetIndex : null),
            };
            this._forward(
                frameInfo, frameId, { command: "showHintLabel", data });
        });
    }
    _setIdList(frameIdList, visibleFrameIdList, index) {
        this.frameIdList = frameIdList;
        this.visibleFrameIdList = visibleFrameIdList;
        this.filterIndexMap = this.frameIdList.map((id, index) => index);
        this.filter = "";
        this.currentIndex = index;
        this.opacity = false;
        this.mapper.reset();
    }
    static _createFilterMaps(filterResult, frameIdList) {
        const filterIndexMap = [];
        const labelMap = {};
        filterResult.forEach(([index, filter]) => {
            const frameId = frameIdList[index];
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
    static _handleError(frameInfo, name, error) {
        if (error === HintMode._NO_HINTS_MESSAGE) {
            frameInfo.showMessage(error, 3000, false);
            return;
        }
        console.error(`${name}: ${Utils.errorString(error)}`);
        frameInfo.showMessage(
            `${name} error (${(error || "some error occured").toString()})`);
    }
}
HintMode._NO_HINTS_MESSAGE = "No hints are found";

class ChildFrameHintMode extends HintModeBase {
    constructor() {
        super()
    }
    onInvoking(key, frameInfo) {
        const frameId = frameInfo.getSelfFrameId();
        HintModeBase.forward(
            frameInfo, 0, { command: "handleKey", key, frameId });
    }
    onMessageEvent(msg, frameInfo) {
        switch (msg.command) {
            case "makeHints":
                return super.makeHints(
                    msg.pattern, msg.type, msg.area, frameInfo);
            case "showHintLabel":
                return super.showHintLabel(msg.data);
            case "focusHintLink":
                return super.focusHintLink(msg.data, frameInfo);
            case "blurHintLink":
                return super.blurHintLink();
            case "applyFilter":
                return super.applyFilter(msg.data);
            case "getFilterResult":
                return super.getFilterResult();
            case "setHintLabel":
                return super.setHintLabel(msg.data);
            case "setZIndex":
                return super.setZIndex();
            case "clearZIndex":
                return super.clearZIndex();
            case "setOpacity":
                return super.setOpacity();
            case "clearOpacity":
                return super.clearOpacity();
            case "getTargetIndex":
                return super.getTargetIndex();
            case "invoke":
                return super.invoke(msg.data, frameInfo);
            default:
                console.warn("Unknown command:", msg.command);
                break;
        }
    }
}

function getRectsInArea(rectList, area) {
    const MARGIN = 16;
    return rectList.filter((rect) => {
        const xMargin = Math.min(MARGIN, rect.width / 2, area.width / 2);
        const yMargin = Math.min(MARGIN, rect.height / 2, area.height / 2);
        return !isOutOfArea(rect, {
            left: area.left + xMargin, right: area.right - xMargin,
            top: area.top + yMargin, bottom: area.bottom - yMargin,
        });
    });
}
function isOutOfArea(rect, winArea) {
    return (rect.top > winArea.bottom
        || rect.bottom < winArea.top
        || rect.left > winArea.right
        || rect.right < winArea.left);
}
function getClientRect(elem) {
    const rect = elem.getBoundingClientRect();
    const left = rect.left + elem.clientLeft;
    const top = rect.top + elem.clientTop;
    // For SVGElement, clientWidth and clientHeight are both zero.
    const width = elem.clientWidth || rect.width;
    const height = elem.clientHeight || rect.height;
    return {
        left, right: left + width, width, top,
        bottom: top + height, height,
    };
}
function updatePosInfoBasedOnAncestorCovering(elem, posInfo, style) {
    const root = document.documentElement;
    const body = document.body;
    // If an html element has height 100%, the size of documentElement and body
    // are different from the visual size. So, ignore them.
    if (elem === root || elem === body) {
        return;
    }
    let isAbsolute = false;
    for (let ancestor = elem.parentNode;
        ancestor !== root && ancestor !== body && style.position !== "fixed";
        ancestor = ancestor.parentNode) {
        if (style.position === "absolute") {
            isAbsolute = true;
        }
        style = window.getComputedStyle(ancestor, null);
        if (style.overflow === "visible") {
            continue;
        }
        if (isAbsolute && style.position !== "relative") {
            continue;
        }
        isAbsolute = false;
        const rect = getClientRect(ancestor);
        posInfo.rectList = getRectsInArea(posInfo.rectList, rect);
        if (posInfo.rectList.length === 0) {
            return;
        }
        posInfo.minX = Math.max(posInfo.minX, rect.left);
        posInfo.maxX = Math.min(posInfo.maxX, rect.right);
        posInfo.minY = Math.max(posInfo.minY, rect.top);
        posInfo.maxY = Math.min(posInfo.maxY, rect.bottom);
    }
    posInfo.isFixed = (style.position === "fixed");
}
function getRects(elem, rect) {
    // Some anchor elements can be zero size even though they includes children.
    if (rect.width === 0 && rect.height === 0 && elem.childElementCount === 0) {
        return [];
    }
    return elem.getClientRects();
}
function getRectsOfArea(area, rect) {
    if (rect.width === 0 && rect.height === 0) { // if area's display is none
        return [];
    }
    switch (area.shape) {
        case "rect": {
            const coords = area.coords.split(",").map((c) => parseInt(c, 10));
            return [{
                left: rect.left + coords[0],
                top: rect.top + coords[1],
                right: rect.left + coords[2],
                bottom: rect.top + coords[3],
                width: coords[2] - coords[0],
                height: coords[3] - coords[1],
            }];
        }
        case "circle": {
            const [x, y, r] =
                area.coords.split(",").map((c) => parseInt(c, 10));
            return [{
                left: rect.left + x - r,
                top: rect.top + y - r,
                right: rect.left + x + r,
                bottom: rect.top + y + r,
                width: 2 * r,
                height: 2 * r,
            }];
        }
        case "poly": {
            const [x, y, ...coords] =
                area.coords.split(",").map((c) => parseInt(c, 10));
            let minX = x, maxX = x, minY = y, maxY = y;
            for (let i = 0; i < coords.length; i += 2) {
                minX = Math.min(minX, coords[i + 0]);
                minY = Math.min(minY, coords[i + 1]);
                maxX = Math.max(maxX, coords[i + 0]);
                maxY = Math.max(maxY, coords[i + 1]);
            }
            return [{
                left: rect.left + minX,
                top: rect.top + minY,
                right: rect.left + maxX,
                bottom: rect.top + maxY,
                width: maxX - minX,
                height: maxY - minY,
            }];
        }
        default:
            return [rect];
    }
}
function addClassList(elem, span) {
    const classList = span.classList;
    if (elem.onclick || elem.onmousedown || elem.onmouseup) {
        classList.add("wimpulation-has-clickevent");
    }
    if (elem.onmousemove || elem.onmouseover || elem.onmouseout) {
        classList.add("wimpulation-has-mousemoveevent");
    }
    if (elem.hasAttribute("tabindex") && elem.tabIndex === 0) {
        classList.add("wimpulation-has-tabindex");
    }
}
function getIdealRect(rectList) {
    // Some anchor elements including img have a zero width rect as first rect.
    for (const rect of rectList) {
        if (rect.width !== 0 && rect.height !== 0) {
            return rect;
        }
    }
    return rectList[0];
}
function calcFrameArea(frameRect, style, winArea) {
    const paddingTop =
        parseInt(style.paddingTop, 10) + parseInt(style.borderTopWidth, 10);
    const paddingLeft =
        parseInt(style.paddingLeft, 10) + parseInt(style.borderLeftWidth, 10);
    const frameTop = frameRect.top + paddingTop;
    const frameLeft = frameRect.left + paddingLeft;
    return {
        left: winArea.left - frameLeft, right: winArea.right - frameLeft,
        top: winArea.top - frameTop, bottom: winArea.bottom - frameTop,
    };
}
function makePattern(globalPattern, localPattern) {
    const framePattern = "frame, iframe, object[type='text/html'], ";
    if (localPattern) {
        return framePattern + globalPattern + ", " + localPattern;
    }
    else {
        return framePattern + globalPattern;
    }
}

function makeHints(hintList, pattern, type, winArea, frameInfo) {
    const win = window;
    const doc = win.document;
    const scrollingElement = doc.scrollingElement;
    if (scrollingElement) {
        winArea.width = scrollingElement.clientWidth;
        winArea.height = scrollingElement.clientHeight;
    }
    else {
        winArea.width = win.innerWidth;
        winArea.height = win.innerHeight;
    }
    winArea.left = Math.max(winArea.left, 0);
    winArea.right = Math.min(winArea.right, winArea.width);
    winArea.top = Math.max(winArea.top, 0);
    winArea.bottom = Math.min(winArea.bottom, winArea.height);

    const idOrPromiseList = [];

    const selfFrameId = frameInfo.getSelfFrameId();
    const consoleFrame = frameInfo.consoleFrame;

    const scrX = win.scrollX, scrY = win.scrollY;
    const elems = doc.querySelectorAll(
        makePattern(pattern, frameInfo.getLocalHintPattern(type)));
    const isFocusType = (type === 'focus');
    for (let i = 0, length = elems.length; i < length; i++) {
        const elem = elems[i];
        // Use getBoundingClientRect for first check because
        // getBoundingClientRect is just slightly faster than getClientRects.
        const bRect = elem.getBoundingClientRect();
        if (isOutOfArea(bRect, winArea)) {
            continue;
        }

        const isAreaElem = (elem instanceof HTMLAreaElement);
        // Use list of Rect instead of the rect from getBoundingClientRect in
        // order to acquire the collect position for text wrapped elements.
        const rectList = getRectsInArea(
            (isAreaElem ? getRectsOfArea : getRects)(elem, bRect), winArea);
        if (rectList.length === 0) {
            continue;
        }
        const style = win.getComputedStyle(elem, null);
        if (style.visibility !== "visible") {
            continue;
        }
        const tagName = elem.tagName.toUpperCase();
        const isFrame = !!elem.contentWindow;
        if (isFrame && elem === consoleFrame) {
            continue;
        }
        if (isFocusType && !isFrame && !Scroll.isScrollable(elem, style)) {
            continue;
        }
        const posInfo = {
            rectList, isFixed: false,
            minX: bRect.left, maxX: bRect.right,
            minY: bRect.top, maxY: bRect.bottom,
        };
        // If some of ancestors are scrollable, the elem may not be displayed.
        if (isAreaElem) {
            const name = elem.parentNode.name;
            const img = doc.querySelector(`img[usemap='#${name}']`);
            if (img) {
                updatePosInfoBasedOnAncestorCovering(
                    img, posInfo, win.getComputedStyle(img, null));
            }
        }
        else {
            updatePosInfoBasedOnAncestorCovering(elem, posInfo, style)
        }
        if (posInfo.rectList.length === 0) {
            continue;
        }

        const rect = getIdealRect(posInfo.rectList);
        if (!isFrame || isFocusType) {
            const minX = posInfo.minX;
            const minY = posInfo.minY;
            const highlight = doc.createElement("div");
            const hStyle = highlight.style;
            if (posInfo.isFixed) {
                hStyle.setProperty("position", "fixed", "important");
                hStyle.setProperty("left", minX + "px", "important");
                hStyle.setProperty("top", minY + "px", "important");
            }
            else {
                hStyle.setProperty("left", (minX + scrX) + "px", "important");
                hStyle.setProperty("top", (minY + scrY) + "px", "important");
            }
            hStyle.setProperty(
                "width", (posInfo.maxX - minX) + "px", "important");
            hStyle.setProperty(
                "height", (posInfo.maxY - minY) + "px", "important");

            const label = doc.createElement("span");
            const left = Math.max(rect.left, minX - 8, winArea.left) - minX;
            const top = Math.max(rect.top, minY - 8, winArea.top) - minY;
            label.style.setProperty("left", left + "px", "important");
            label.style.setProperty("top", top + "px", "important");
            label.className = tagName;
            if (isFrame) {
                label.classList.add("wimpulation-is-frame");
            }
            else {
                addClassList(elem, label);
            }
            highlight.appendChild(label);

            hintList.push([highlight, elem]);
            idOrPromiseList.push(selfFrameId);
        }
        if (isFrame) {
            const frameId = frameInfo.getChildFrameId(elem.contentWindow);
            if (frameId === undefined) {
                continue;
            }
            const frameArea = calcFrameArea(rect, style, winArea);
            idOrPromiseList.push(HintModeBase.forward(frameInfo, frameId, {
                command: "makeHints", type, pattern, area: frameArea,
            }));
        }
    }

    return Promise.all(idOrPromiseList).then((list) => {
        return list.reduce((result, idOrList) => {
            if (Array.isArray(idOrList)) {
                Array.prototype.push.apply(result, idOrList);
            }
            else {
                result.push(idOrList);
            }
            return result;
        }, []);
    });
}

