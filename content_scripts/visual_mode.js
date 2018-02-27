'use strict';

/**
 * Classes derived from this class must implements getAlter, and reset
 * static methods.
 */
class VisualModeBase {
    constructor(frameInfo, keyMap, data) {
        const selection = window.getSelection();
        if (selection.rangeCount === 0) {
            const point = document.caretPositionFromPoint(0, 0);
            if (!point) {
                throw new Error("No selection");
            }
            selection.collapse(point.offsetNode, point.offset);
        }

        this.selection = selection;
        this.count = "0";
        this.mapper = Utils.makeCommandMapper(keyMap);
        this.caret = VisualModeBase._createCaret();
        this.cancelBlink = false;
        this.blinkTimerId = setInterval(() => {
            if (this.cancelBlink) {
                this.cancelBlink = false;
                return;
            }
            if (this.selection.type !== "Caret") {
                return;
            }
            const isHidden = (this.caret.style.visibility === "hidden");
            this.caret.style.setProperty(
                "visibility",  (isHidden ? "visible" : "hidden"), "important");
        }, 500);

        this._updateCaret();
        document.documentElement.appendChild(this.caret);
        frameInfo.showMessage(`-- ${this.constructor.getModeName()} --`, 0);
        frameInfo.focusThisFrame();
        frameInfo.setEventListener(document, "blur", (e, frameInfo) => {
            if (e.target !== document) {
                return;
            }
            frameInfo.forwardMessage(0, {
                command: "hasFocus"
            }).then((hasTopFrameFocus) => {
                if (hasTopFrameFocus || document.activeElement.contentWindow) {
                    // This means other frame has focus.
                    frameInfo.changeModeFrom(this, "NORMAL");
                }
            });
        }, true);
    }
    getTarget() {
        return DomUtils.getElementFromNode(this.selection.focusNode);
    }
    consume(key, frameInfo) {
        if (key === "0" && this.count !== "0" && // Is continuation of count?
            !this.mapper.hasPendingKeys()) {
            return [false, undefined, undefined, undefined];
        }
        return this.mapper.get(key);
    }
    onReset(frameInfo) {
        clearInterval(this.blinkTimerId);
        document.documentElement.removeChild(this.caret);
        frameInfo.hideFixedMessage();
    }
    onInvoking(cmd, frameInfo) {
        let count = parseInt(this.count, 10);
        this.count = "0";
        let result = undefined;
        if (cmd.startsWith("extendSelection|")) {
            count = Math.max(count, 1);
            const [prefix, direction, granularity] = cmd.split("|");
            if (granularity === "block") {
                VisualModeBase._extendToBlock(this.selection, count, direction);
            }
            else {
                const alter = this.constructor.getAlter();
                try {
                    for (let i = 0; i < count; ++i) {
                        this.selection.modify(alter, direction, granularity);
                    }
                }
                catch (e) {
                    console.warn(Utils.errorString(e));
                }
            }
        }
        else {
            result = invokeCommand(cmd, count, frameInfo);
        }
        this._updateCaret();
        return result;
    }
    onDropKeys(dropKeys) {
        this.count = "0";
    }
    onNonConsumed(key, frameInfo) {
        if (key.length === 1 && "0" <= key && key <= "9") {
            this.count += key;
        }
        else {
            this.count = "0";
        }
    }
    _updateCaret() {
        this.constructor.reset(this.selection);

        if (this.selection.type !== "Caret") {
            this.caret.style.setProperty("visibility", "hidden", "important");
            return;
        }

        const style = this.caret.style;
        const range = this.selection.getRangeAt(0);
        const elem = DomUtils.getElementFromNode(range.commonAncestorContainer);
        const win = window;

        const rect = (() => {
            const rects = range.getClientRects();
            return (rects.length > 0 ? rects[0] : elem.getBoundingClientRect());
        })();
        style.setProperty("left", rect.left + win.scrollX + "px", "important");
        style.setProperty("top", rect.top + win.scrollY + "px", "important");
        style.setProperty("height", (rect.height || 12) + "px", "important");

        const elemStyle = win.getComputedStyle(elem, null);
        style.setProperty("background-color", elemStyle.color, "important");

        style.setProperty("visibility", "visible", "important");
        this.cancelBlink = true;
    }
    static _createCaret() {
        const caret = document.createElement("div");
        caret.style = `
        display: block !important;
        position: absolute !important;
        width: 1.5px !important;
        z-index: 2147483646 !important;
        `;
        return caret;
    }
    static _extendToBlock(selection, count, direction) {
        const positionBit = Node.DOCUMENT_POSITION_CONTAINED_BY;
        const isForward = (direction === "forward");
        const currentBlock = VisualModeBase._getTextBlock(selection.focusNode);
        if (!isForward) {
            const [text, index] = VisualModeBase._getFirstText(currentBlock);
            const result = selection.focusNode.compareDocumentPosition(text);
            if ((result === 0 && selection.focusOffset !== index) ||
                (result & Node.DOCUMENT_POSITION_PRECEDING) !== 0) {
                selection.extend(text, index);
                VisualModeBase._scrollIntoViewIfNeed(currentBlock);
                return;
            }
        }
        const walker = VisualModeBase._createTreeWalker(currentBlock);
        let node = null;
        for (let i = 0; i < count; ++i) {
            const next =
                (isForward ? walker.nextNode() : walker.previousNode());
            if (!next) {
                break;
            }
            node = next;
        }
        if (node) {
            const [text, index] = VisualModeBase._getFirstText(node);
            selection.extend(text, index);
            VisualModeBase._scrollIntoViewIfNeed(node);
        }
    }
    static _getFirstText(elem) {
        const walker = document.createTreeWalker(elem, NodeFilter.SHOW_TEXT);
        let text = null;
        while (text = walker.nextNode()) {
            const index = text.data.search(/[^\s\u200B]/);
            if (index === -1) {
                continue;
            }
            return [text, index];
        }
        return [elem, 0];
    }
    static _scrollIntoViewIfNeed(node) {
        const rect = node.getBoundingClientRect();
        if (rect.top < 0) {
            node.scrollIntoView(true);
        }
        else if (rect.bottom > window.innerHeight) {
            node.scrollIntoView(false);
        }
    }
    static _hasNonEmptyTextNode(elem) {
        for (let child = elem.firstChild; child; child = child.nextSibling) {
            if (child.nodeType !== Node.TEXT_NODE) {
                continue;
            }
            if (child.data.search(/[^\s\u200B]/) === -1) {
                continue;
            }
            return true;
        }
        return false;
    }
    static _isSelectable(elem) {
        do {
            const style = window.getComputedStyle(elem, null);
            const userSelect = style.MozUserSelect;
            if (userSelect === "none") {
                return false;
            }
            if (userSelect !== "auto") {
                return true;
            }
        } while (elem = elem.parentElement);
        return true;
    }
    static _getTextBlock(elem) {
        const root = document.body || document.documentElement;
        if (elem === root || !root.contains(elem)) {
            return root.firstChild;
        }
        let parent =
            (elem.nodeType === Node.TEXT_NODE ? elem.parentElement : elem);
        while (parent && parent !== root) {
            if (!VisualModeBase._hasNonEmptyTextNode(parent) &&
                parent.childElementCount !== 1) {
                return elem;
            }
            elem = parent;
            parent = elem.parentElement;
        }
        return elem;
    }
    static _createTreeWalker(currentBlock) {
        const positionBit =
            Node.DOCUMENT_POSITION_CONTAINED_BY |
            Node.DOCUMENT_POSITION_CONTAINS;
        const filter = {
            acceptNode: (elem) => {
                if (elem.getClientRects().length === 0) {
                    return NodeFilter.FILTER_REJECT;
                }
                const style = window.getComputedStyle(elem, null);
                if (style.visibility === "hidden") {
                    return NodeFilter.FILTER_SKIP;
                }
                if (!VisualModeBase._hasNonEmptyTextNode(elem)) {
                    return NodeFilter.FILTER_SKIP;
                }
                if (!VisualModeBase._isSelectable(elem)) {
                    return NodeFilter.FILTER_SKIP;
                }
                const result = currentBlock.compareDocumentPosition(elem);
                if (result === 0 || (result & positionBit) !== 0) {
                    return NodeFilter.FILTER_REJECT;
                }
                return NodeFilter.FILTER_ACCEPT;
            }
        };
        const walker = document.createTreeWalker(
            document.documentElement, NodeFilter.SHOW_ELEMENT, filter);
        walker.currentNode = currentBlock;
        return class {
            static nextNode() {
                const n = walker.nextNode();
                if (n) {
                    currentBlock = n;
                }
                return n;
            }
            static previousNode() {
                let n = walker.previousNode();
                if (n) {
                    n = VisualModeBase._getTextBlock(n);
                    currentBlock = n;
                }
                return n;
            }
        };
    }
}

class VisualMode extends VisualModeBase {
    static getModeName() {
        return "VISUAL";
    }
    static getAlter() {
        return "extend";
    }
    static reset(selection) {}
}

class CaretMode extends VisualModeBase {
    static getModeName() {
        return "CARET";
    }
    static getAlter() {
        return "move";
    }
    static reset(selection) {
        selection.collapse(selection.focusNode, selection.focusOffset);
    }
}

