'use strict';

/**
 * Classes derived from this class must implements getAlter, clean, and set
 * static methods.
 */
class VisualModeBase {
    constructor(frameInfo, keyMap, data) {
        const selection = window.getSelection();
        if (selection.rangeCount === 0) {
            throw new Error("No selection");
        }
        this.selection = selection;
        this.count = "0";
        this.mapper = Utils.makeCommandMapper(keyMap);
        this.constructor.set(this.selection);
        frameInfo.showMessage(`-- ${this.constructor.getModeName()} --`, 0);
    }
    getTarget() {
        const node = this.selection.focusNode;
        return node.nodeType === Node.ELEMENT_NODE ? node : node.parentElement;
    }
    consume(key, frameInfo) {
        if (key === "0" && this.count !== "0" && // Is continuation of count?
            !this.mapper.hasPendingKeys()) {
            return [false, undefined, undefined, undefined];
        }
        return this.mapper.get(key);
    }
    onReset(frameInfo) {
        try {
            this.constructor.clean(this.selection);
        }
        catch (e) {
            // Ignore. If there is no selection, some exception can be thrown.
        }
        frameInfo.hideFixedMessage();
    }
    onInvoking(cmd, frameInfo) {
        const count = Math.max(parseInt(this.count, 10), 1);
        this.count = "0";
        if (cmd.startsWith("extendSelection|")) {
            const [prefix, direction, granularity] = cmd.split("|");
            this.constructor.clean(this.selection);
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
            this.constructor.set(this.selection);
            return;
        }
        else {
            return invokeCommand(cmd, count, frameInfo);
        }
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
        let parent =
            (elem.nodeType === Node.TEXT_NODE ? elem.parentElement : elem);
        while (parent) {
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
        const walker = document.createTreeWalker(
            document.documentElement, NodeFilter.SHOW_ELEMENT, (elem) => {
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
            });
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
    static clean(selection) {}
    static set(selection) {}
}

class CaretMode extends VisualModeBase {
    static getModeName() {
        return "CARET";
    }
    static getAlter() {
        return "move";
    }
    static clean(selection) {
        selection.collapseToStart();
    }
    static set(selection) {
        const node = selection.focusNode;
        const offset = selection.focusOffset;
        selection.setBaseAndExtent(node, offset, node, offset);
        selection.modify("extend", "forward", "character");
    }
}

