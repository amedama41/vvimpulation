'use strict';

var gHintElementList = [];

class HintMode {
    constructor(frameInfo, labelList) {
        this.hints = gHintElementList;
        gHintElementList = [];
        this.focusIndex = undefined;

        const container = document.createElement("div");
        const indexMap = {};
        container.id = "wimpulation-hint-container";
        this.hints.forEach(([span, elem], index) => {
            span.textContent = labelList[index];
            container.appendChild(span);
            indexMap[labelList[index]] = index;
        });
        const target = document.documentElement;
        target.appendChild(container);
        this.indexMap = indexMap;
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
    onReset() {
        const container = document.querySelector("#wimpulation-hint-container");
        if (container) {
            container.parentNode.removeChild(container);
        }
    }
    onInvoking(cmd, frameInfo) {
        return true;
    }
    onDropKeys(dropKeys) {
    }
    onNonConsumed(key) {
        return true;
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
            console.error(`unknown index (${msg.index})`);
            return;
        }
        const [span, elem] = this.hints[localIndex];
        span.id = "wimpulation-hint-active";
        this.focusIndex = localIndex;
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
    }
    _startFilter(msg, frameInfo) {
        frameInfo.showConsole(this, "hintFilter", msg.filter);
    }
    _stopFilter(msg, frameInfo) {
        frameInfo.sendMessage(
            { command: "stopFilter", result: msg.result, filter: msg.reason });
        frameInfo.hideConsole();
    }
    _applyFilter(msg) {
        const className = "wimpulation-filtered-hint";
        const filter = Utils.makeFilter(msg.filter);
        this.hints.forEach(([span, elem]) => {
            // SVGElement does not have innerText
            if (filter.match(elem.innerText || elem.textContent)) {
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
}

function getRectsInArea(rectList, area) {
    return rectList.filter((rect) => !isOutOfArea(rect, area));
}
function isOutOfArea(rect, winArea) {
    if (rect.width === 0 && rect.height === 0) return true;
    return (rect.top > winArea.bottom
        || rect.bottom < winArea.top
        || rect.left > winArea.right
        || rect.right < winArea.left);
}
function getRectsInAncestorVisibleArea(elem, rectList, style) {
    const root = document.documentElement;
    const body = document.body;
    // If an html element has height 100%, the size of documentElement and body
    // are different from the visual size. So, ignore them.
    if (elem === root || elem === body) {
        return rectList;
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
        rectList = getRectsInArea(rectList, ancestor.getBoundingClientRect());
        if (rectList.length === 0) {
            return [];
        }
    }
    return rectList;
}
function getRectsOfAreaElement(area) {
    const rect = area.getBoundingClientRect();
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
                bottom: rect.top + coords[3]
            }];
        }
        case "circle": {
            const [x, y, r] =
                area.coords.split(",").map((c) => parseInt(c, 10));
            return [{
                left: rect.left + x - r,
                top: rect.top + y - r,
                right: rect.left + x + r,
                bottom: rect.top + y + r
            }];
        }
        case "poly": {
            let [minX, minY, maxX, maxY, ...coords] =
                area.coords.split(",").map((c) => parseInt(c, 10));
            for (let i = 0; i < coords.length; i += 4) {
                minX = Math.min(minX, coords[i + 0]);
                minY = Math.min(minY, coords[i + 1]);
                maxX = Math.max(maxX, coords[i + 2]);
                maxY = Math.max(maxY, coords[i + 3]);
            }
            return [{
                left: rect.left + minX,
                top: rect.top + minY,
                right: rect.left + maxX,
                bottom: rect.top + maxY
            }];
        }
        default:
            return [rect];
    }
}
function makeHints(pattern, type, winArea, frameInfo) {
    const win = window;
    const doc = win.document;

    const idOrPromiseList = [];
    const hints = [];

    const selfFrameId = frameInfo.getSelfFrameId();

    const scrX = win.scrollX, scrY = win.scrollY;
    const elems = win.document.querySelectorAll(
        "frame, iframe, object[type='text/html'], " + pattern);
    const isFocusType = (type === 'focus');
    for (let i = 0, length = elems.length; i < length; i++) {
        const elem = elems[i];

        const isAreaElem = (elem instanceof HTMLAreaElement);
        // use getClientRects instead of getBoundingClientRect in order to
        // acquire the collect position for text wrapped elements.
        let rectList =
            (isAreaElem ? getRectsOfAreaElement(elem) : elem.getClientRects());
        rectList = getRectsInArea(rectList, winArea);
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
        if (!isAreaElem) {
            // if some of ancestors are scrollable, elem may not be displayed.
            rectList = getRectsInAncestorVisibleArea(elem, rectList, style)
            if (rectList.length === 0) {
                continue;
            }
        }

        const rect = rectList[0];
        if (!isFrame || isFocusType) {
            const span = doc.createElement("span");
            span.style.left =
                (Math.max(rect.left - 8, winArea.left) + scrX) + "px";
            span.style.top  =
                (Math.max(rect.top - 8, winArea.top) + scrY) + "px";
            span.className = tagName;
            hints.push([span, elem]);
            idOrPromiseList.push(selfFrameId);
        }
        if (isFrame) {
            const frameId = frameInfo.getChildFrameId(elem.contentWindow);
            if (frameId === undefined) {
                continue;
            }
            const frameArea = {
                top: Math.max(winArea.top - rect.top, 0),
                left: Math.max(winArea.left - rect.left, 0),
                bottom: Math.min(winArea.bottom - rect.top, rect.height),
                right: Math.min(winArea.right - rect.left, rect.width)
            };
            idOrPromiseList.push(frameInfo.sendMessage({
                command: "collectHint",
                type: type, area: frameArea, frameId: frameId,
                url: elem.src || elem.data || ""
            }));
        }
    }

    gHintElementList = hints;

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

