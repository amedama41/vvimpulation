'use strict';

const gHintElementListMap = {};

class HintMode {
    constructor(frameInfo, data={ labelList: [], setZIndex: false, id: null }) {
        this.hints = gHintElementListMap[data.id] || [];
        delete gHintElementListMap[data.id];
        this.focusIndex = undefined;
        const labelList = data.labelList;

        const container = document.createElement("div");
        const indexMap = {};
        container.id = "wimpulation-hint-container";
        this.hints.forEach(([span, elem], index) => {
            span.textContent = labelList[index];
            container.insertBefore(span, container.firstElementChild);
            indexMap[labelList[index]] = index;
        });
        HintMode._setContainerPosition(container);
        const target = document.documentElement;
        target.appendChild(container);
        this.indexMap = indexMap;
        if (data.setZIndex) {
            this._setZIndex();
        }
        if (Number.isInteger(data.initIndex)) {
            this._setActive(data.initIndex);
        }
    }
    static getModeName() {
        return "HINT";
    }
    getTarget() {
        const [span, elem] = this.hints[this.focusIndex];
        return elem;
    }
    consume(key, frameInfo) {
        frameInfo.postMessage({ command: "forwardHintKeyEvent", key });
        return [true, undefined, undefined, undefined];
    }
    onReset(frameInfo, allFrame) {
        if (!allFrame) {
            frameInfo.postMessage({ command: "resetHintMode" });
        }
        if (this.focusIndex !== undefined) {
            const [span, elem] = this.hints[this.focusIndex];
            elem.removeAttribute("wimpulation-hint-active-element");
        }
        const container = document.querySelector("#wimpulation-hint-container");
        if (container) {
            container.parentNode.removeChild(container);
        }
    }
    onInvoking(cmd, frameInfo) {
    }
    onDropKeys(dropKeys) {
    }
    onNonConsumed(key, frameInfo) {
    }
    onMessageEvent(msg, frameInfo) {
        switch (msg.command) {
            case 'focusHintLink':
                return this.focusHintLink(msg, frameInfo);
            case 'blurHintLink':
                return this.blurHintLink(msg);
            case 'startFilter':
                return this._startFilter(msg, frameInfo);
            case 'applyFilter':
                return this._applyFilter(msg);
            case 'hideConsole':
                return this._stopFilter(msg, frameInfo);
            case 'getFilterResult':
                return this._getFilterResult(msg, frameInfo);
            case "setHintLabel":
                return this._setHintLabel(msg, frameInfo);
            case "setZIndex":
                return this._setZIndex(msg, frameInfo);
            case "clearZIndex":
                return this._clearZIndex(msg, frameInfo);
            case "setOpacity":
                return this._setOpacity(msg, frameInfo);
            case "clearOpacity":
                return this._clearOpacity(msg, frameInfo);
            case "getTargetIndex":
                return this._getTargetIndex(msg, frameInfo);
            case "invoke":
                return invokeCommand(msg.commandName, msg.count, frameInfo);
            default:
                console.warn("Unknown command:", msg.command);
                break;
        }
    }

    focusHintLink(msg, frameInfo) {
        this._blurImpl();
        const localIndex = this.indexMap[msg.index];
        if (localIndex === undefined) {
            console.error("Unknown index", msg.index);
            return;
        }
        this._setActive(localIndex);
        if (msg.autoFocus) {
            invokeCommand("fixedFocusin", 0, frameInfo);
        }
    }
    blurHintLink(msg) {
        this._blurImpl();
        this.focusIndex = undefined;
    }
    _blurImpl() {
        if (this.focusIndex === undefined) {
            return;
        }
        const [span, elem] = this.hints[this.focusIndex];
        span.id = "";
        if (span.style.zIndex) {
            span.style.setProperty("z-index", span.style.zIndex, "important");
        }
        elem.removeAttribute("wimpulation-hint-active-element");
    }
    _startFilter(msg, frameInfo) {
        frameInfo.showConsole(this, "hintFilter", msg.filter, 0);
    }
    _stopFilter(msg, frameInfo) {
        frameInfo.sendMessage({ command: "stopFilter", filter: msg.value });
        frameInfo.hideConsole();
    }
    _applyFilter(msg) {
        const className = "wimpulation-filtered-hint";
        const filter = Utils.makeFilter(msg.filter);
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
        this.hints.forEach(([span, elem]) => {
            if (filter.match(getText(elem))) {
                span.classList.remove(className);
            }
            else {
                span.classList.add(className);
            }
        });
    }
    _getFilterResult(msg, frameInfo) {
        const className = "wimpulation-filtered-hint";
        const result = Object.keys(this.indexMap).map((index) => {
            // Object.keys returns an array of string
            index = parseInt(index, 10);
            const [span, elem] = this.hints[this.indexMap[index]];
            return [index, !span.classList.contains(className)];
        });
        return result;
    }
    _setHintLabel(msg, frameInfo) {
        const labelList = msg.labelList;
        this.hints.forEach(([span, elem], index) => {
            span.textContent = labelList[index];
        });
        this._blurImpl();
        this.focusIndex = undefined;
    }
    _setZIndex() {
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
        this.hints.forEach(([span, elem], index) => {
            span.style.setProperty(
                "z-index", getZIndex(elem, "auto", "auto"), "important");
        });
    }
    _clearZIndex() {
        this.hints.forEach(([span, elem], index) => {
            span.style.removeProperty("z-index");
        });
    }
    _setOpacity() {
        const container = document.getElementById("wimpulation-hint-container");
        if (container) {
            container.classList.add("wimpulation-hint-is-transparent");
        }
    }
    _clearOpacity() {
        const container = document.getElementById("wimpulation-hint-container");
        if (container) {
            container.classList.remove("wimpulation-hint-is-transparent");
        }
    }
    _getTargetIndex(msg) {
        if (this.focusIndex === undefined) {
            return null;
        }
        const [span, elem] = this.hints[this.focusIndex];
        const hintList = gHintElementListMap[msg.id] || [];
        const index = hintList.findIndex((e) => e[1] === elem);
        if (index === -1) {
            return null;
        }
        return index;
    }
    _setActive(index) {
        const [span, elem] = this.hints[index];
        span.id = "wimpulation-hint-active";
        if (span.style.zIndex) {
            span.style.setProperty("z-index", span.style.zIndex);
        }
        elem.setAttribute("wimpulation-hint-active-element", "");
        this.focusIndex = index;
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
        const rect = ancestor.getBoundingClientRect();
        posInfo.rectList = getRectsInArea(posInfo.rectList, rect);
        if (posInfo.rectList.length === 0) {
            return [];
        }
        posInfo.minX = Math.max(posInfo.minX, rect.left - 8);
        posInfo.minY = Math.max(posInfo.minY, rect.top - 8);
    }
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
    const paddingBottom =
        parseInt(style.paddingBottom, 10) +
        parseInt(style.borderBottomWidth, 10);
    const paddingRight =
        parseInt(style.paddingRight, 10) + parseInt(style.borderRightWidth, 10);
    const frameTop = frameRect.top + paddingTop;
    const frameLeft = frameRect.left + paddingLeft;
    const frameHeight = frameRect.height - (paddingTop + paddingBottom);
    const frameWidth = frameRect.width - (paddingLeft + paddingRight);
    return {
        top: Math.max(winArea.top - frameTop, 0),
        left: Math.max(winArea.left - frameLeft, 0),
        bottom: Math.min(winArea.bottom - frameTop, frameHeight),
        right: Math.min(winArea.right - frameLeft, frameWidth),
        width: frameWidth,
        height: frameHeight,
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

function makeHints(id, pattern, type, winArea, frameInfo) {
    const win = window;
    const doc = win.document;

    const idOrPromiseList = [];
    const hints = [];

    const selfFrameId = frameInfo.getSelfFrameId();

    const scrX = win.scrollX, scrY = win.scrollY;
    const elems = win.document.querySelectorAll(
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
        if (isFocusType && !isFrame && !Scroll.isScrollable(elem, style)) {
            continue;
        }
        const posInfo = { rectList, minX: winArea.left, minY: winArea.top };
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
            const span = doc.createElement("span");
            span.style.left = (Math.max(rect.left, posInfo.minX) + scrX) + "px";
            span.style.top  = (Math.max(rect.top, posInfo.minY) + scrY) + "px";
            span.className = tagName;
            if (isFrame) {
                span.classList.add("wimpulation-is-frame");
            }
            else {
                addClassList(elem, span);
            }
            hints.push([span, elem]);
            idOrPromiseList.push(selfFrameId);
        }
        if (isFrame) {
            const frameId = frameInfo.getChildFrameId(elem.contentWindow);
            if (frameId === undefined) {
                continue;
            }
            const frameArea = calcFrameArea(rect, style, winArea);
            idOrPromiseList.push(frameInfo.forwardMessage(frameId, {
                command: "collectHint", id, type, pattern, area: frameArea
            }));
        }
    }

    if (hints.length > 0) { // Avoid memory leak due to no mode change.
        gHintElementListMap[id] = hints;
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

