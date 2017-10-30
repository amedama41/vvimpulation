var gHintElementList = [];

class HintMode extends Mode {
    constructor(frameInfo, labelList) {
        super(frameInfo);
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
        if (document.querySelectorAll(
            "#wimpulation-hint-container").length > 1) {
            const frameId = frameInfo.getSelfFrameId();
            console.warn("multiple wimpulation-hint-container", frameId);
        }
    }
    handle(key) {
        super.postMessage({ command: "forwardHintKeyEvent", key: key });
        return true;
    }
    reset() {
        const container = document.querySelector("#wimpulation-hint-container");
        if (container) {
            container.parentNode.removeChild(container);
        }
    }
    getTarget() {
        const [span, elem] = this.hints[this.focusIndex];
        return elem;
    }

    focusHintLink(msg) {
        this.blurHintLink();
        const localIndex = this.indexMap[msg.index];
        if (localIndex === undefined) {
            console.warn(`unknown index (${msg.index})`);
            return;
        }
        const [span, elem] = this.hints[localIndex];
        span.id = "wimpulation-hint-active";
        if (msg.defaultFocus) {
            try {
                elem.focus();
            }
            catch (e) {
                console.warn(`Element ${localIndex} is likely dead:`, e);
            }
        }
        this.focusIndex = localIndex;
    }
    blurHintLink() {
        if (this.focusIndex === undefined) {
            return;
        }
        const [span, elem] = this.hints[this.focusIndex];
        span.id = "";
        this.focusIndex = undefined;
    }
    dispatch(msg) {
        switch (msg.command) {
            case 'focusHintLink':
                return this.focusHintLink(msg);
            case 'blurHintLink':
                return this.blurHintLink();
            default:
                if (this.focusIndex === undefined) {
                    return;
                }
                const count = msg.count || 0;
                return FrontendCommand[msg.command](count, this);
        }
    }
}

function isOutOfArea(rect, winArea) {
    if (rect.width === 0 && rect.height === 0) return true;
    return (rect.top > winArea.bottom
        || rect.bottom < winArea.top
        || rect.left > winArea.right
        || rect.right < winArea.left);
}
function isAncestorVisible(elem, rect) {
    const root = document.documentElement;
    const body = document.body;
    for (let p = elem.parentNode; p !== root && p !== body; p = p.parentNode) {
        const style = window.getComputedStyle(p, null);
        if (style.overflow === "visible") continue;
        const pRect = p.getBoundingClientRect();
        if (isOutOfArea(rect, pRect)) return false;
    }
    return true;
}
function makeHints(pattern, isFocusType, winArea, frameInfo) {
    const win = window;
    const doc = win.document;

    const idOrPromiseList = [];
    const hints = [];

    const selfFrameId = frameInfo.getSelfFrameId();

    const scrX = win.scrollX, scrY = win.scrollY;
    const elems = win.document.querySelectorAll("frame, iframe, " + pattern);
    for (let i = 0, length = elems.length; i < length; i++) {
        const elem = elems[i];

        const rect = elem.getBoundingClientRect();
        if (isOutOfArea(rect, winArea)) {
            continue;
        }
        const style = win.getComputedStyle(elem, null);
        if (style.visibility !== "visible" || style.display === "none") {
            continue;
        }
        const tagName = elem.tagName.toUpperCase();
        const isFrame = tagName.endsWith("FRAME");
        if (isFocusType && !isFrame && !Scroll.isScrollable(elem, style)) {
            continue;
        }
        if (!isAncestorVisible(elem, rect)) {
            continue;
        }

        if (!isFrame || isFocusType) {
            const span = doc.createElement("span");
            span.style.left = (Math.max(rect.left - 8, 0) + scrX) + "px";
            span.style.top  = (Math.max(rect.top - 8, 0) + scrY) + "px";
            span.className = tagName;
            hints.push([span, elem]);
            idOrPromiseList.push(selfFrameId);
        }
        if (isFrame && frameInfo.isRegistered(elem.contentWindow)) {
            const frameId = frameInfo.getChildFrameId(elem.contentWindow);
            const frameArea = {
                top: Math.max(winArea.top - rect.top, 0),
                left: Math.max(winArea.left - rect.left, 0),
                bottom: Math.min(winArea.bottom - rect.top, rect.height),
                right: Math.min(winArea.right - rect.left, rect.width)
            };
            idOrPromiseList.push(frameInfo.sendMessage({
                command: "collectHint",
                pattern: pattern, isFocusType: isFocusType, area: frameArea,
                frameId: frameId
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

