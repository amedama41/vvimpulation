'use strict';

const DomUtils = (function() {

return (class Edit {
    static getInputList(target) {
        const inputs = target.querySelectorAll(
            "input[type='text']:not([readonly]):not([disabled]), " +
            "input:not([type]):not([readonly]):not([disabled]), " +
            "input[type='password']:not([readonly]):not([disabled]), " +
            "input[type='search']:not([readonly]):not([disabled]), " +
            "input[type='tel']:not([readonly]):not([disabled]), " +
            "input[type='url']:not([readonly]):not([disabled]), " +
            "input[type='email']:not([readonly]):not([disabled])"
        );
        if (inputs.length == 0) {
            return [];
        }
        return Array.prototype.filter.call(inputs, (input) => {
            return (input.getClientRects().length !== 0 &&
                window.getComputedStyle(input).visibility !== "hidden");
        });
    }
    static isEditableInputType(type) {
        switch (type) {
            case "text": case "password": case "search": case "tel": case "url":
            case "email": case "number": case "month": case "date": case "time":
            case "week":
                return true;
            default:
                return false;
        }
    }
    static isEditable(elem) {
        if (elem.readOnly || elem.disabled) {
            return false;
        }
        switch (elem.localName.toUpperCase()) {
            case "INPUT":
                return Edit.isEditableInputType(elem.type);
            case "TEXTAREA":
                return true;
            default:
                const editable = elem.getAttribute("contenteditable")
                return editable && (editable === "" || editable === "true");
        }
    }

    /**
     * functions for cursor movement
     **/
    static charNext(elem) {
        elem.selectionStart = elem.selectionEnd =
            Math.min(elem.selectionEnd + 1, elem.value.length);
    }
    static charPrevious(elem) {
        elem.selectionStart = elem.selectionEnd =
            Math.max(elem.selectionStart - 1, 0);
    }
    static beginLine(elem) {
        const start = elem.selectionStart;
        if (start === 0) {
            return;
        }
        const index = elem.value.lastIndexOf('\n', start - 1);
        if (index === -1) {
            elem.selectionStart = elem.selectionEnd = 0;
        }
        else {
            elem.selectionStart = elem.selectionEnd = index + 1;
        }
    }
    static endLine(elem) {
        const end = elem.selectionEnd;
        const index = elem.value.indexOf('\n', end);
        if (index === -1) {
            elem.selectionStart = elem.selectionEnd = elem.value.length;
        }
        else {
            elem.selectionStart = elem.selectionEnd = index;
        }
    }
    static nextLine(elem) {
        const index = indexOfNextNewline(elem.value, elem.selectionStart);
        elem.selectionStart = elem.selectionEnd =
            Math.min(index + 1, elem.value.length);
    }
    static previousLine(elem) {
        const start = elem.selectionStart;
        if (start === 0) {
            return;
        }
        const index = indexOfAfterPreviousNewline(elem.value, start - 1);
        elem.selectionStart = elem.selectionEnd = Math.max(index - 1, 0);
    }

    /**
     * functions for edit
     **/
    static deleteCharBackward(elem) {
        const start = elem.selectionStart;
        const end = elem.selectionEnd;
        if (start !== end) {
            elem.setRangeText("", start, end, "start");
            return true;
        }
        if (start === 0) {
            return false;
        }
        elem.setRangeText("", start - 1, end, "start");
        return true;
    }
    static deleteWordBackward(elem) {
        const start = elem.selectionStart;
        const end = elem.selectionEnd;
        if (start !== end) {
            elem.setRangeText("", start, end, "start");
            return true;
        }
        if (start === 0) {
            return false;
        }

        const value = elem.value;
        if (value.charAt(start - 1) === '\n') {
            elem.setRangeText("", start - 1, start, "end");
        }
        else {
            const index = indexOfAfterPreviousNewline(value, start - 1);
            const match = /^.*\b(?!$)/.exec(value.substring(index, start));
            elem.setRangeText((match ? match[0] : ""), index, start, "end");
        }
        return true;
    }
    static deleteToBeginningOfLine(elem) {
        const start = elem.selectionStart;
        const end = elem.selectionEnd;
        if (start !== end) {
            elem.setRangeText("", start, end, "start");
            return true;
        }
        if (start === 0) {
            return false;
        }

        const value = elem.value;
        if (value.charAt(start - 1) === '\n') {
            elem.setRangeText("", start - 1, start, "end");
        }
        else {
            const index = indexOfAfterPreviousNewline(value, start - 1);
            elem.setRangeText("", index, start, "end");
        }
        return true;
    }
    static deleteToEndOfLine(elem) {
        const start = elem.selectionStart;
        const end = elem.selectionEnd;
        if (start !== end) {
            elem.setRangeText("", start, end, "start");
            return true;
        }
        const value = elem.value;
        const length = value.length
        if (end === length) {
            return false;
        }

        if (value.charAt(end) === '\n') {
            elem.setRangeText("", end, end + 1, "start");
        }
        else {
            const index = indexOfNextNewline(value, end);
            elem.setRangeText("", end, index, "start");
        }
        return true;
    }

    /**
     * functions to manipulation clipboard
     **/
    static getFromClipboard() {
        const x = window.scrollX;
        const y = window.scrollY;
        const textarea = document.createElement("textarea");
        textarea.style.position = "absolute";
        textarea.style.top = y + "px";
        textarea.style.left = x + "px";
        textarea.contentEditable = true;
        const root = document.documentElement;
        root.appendChild(textarea);
        const activeElement = document.activeElement;
        textarea.focus();
        document.execCommand("paste");
        const value = textarea.value;
        root.removeChild(textarea);
        if (activeElement) { // activeElement may be null (e.g. about:blank)
            activeElement.focus();
            window.scrollTo(x, y);
        }
        return value;
    }
    static setToClipboard(value) {
        if (value === "") {
            return false; // execCommand is unable to copy zero length string
        }
        const x = window.scrollX;
        const y = window.scrollY;
        const textarea = document.createElement("textarea");
        textarea.style.position = "absolute";
        textarea.style.top = y + "px";
        textarea.style.left = x + "px";
        textarea.value = value;
        const root = document.documentElement;
        root.appendChild(textarea);
        const activeElement = document.activeElement;
        textarea.select();
        document.execCommand("copy");
        root.removeChild(textarea);
        if (activeElement) { // activeElement may be null (e.g. about:blank)
            activeElement.focus();
            window.scrollTo(x, y);
        }
        return true;
    }

    static fixedFocus(elem) {
        const x = window.scrollX;
        const y = window.scrollY;
        try {
            elem.focus();
            // Restore position which was changed by focus
            window.scrollTo(Math.round(x), Math.round(y));
        }
        catch (e) {
            console.warn("Element is likely dead:", Utils.errorString(e));
        }
    }
    static isFocusable(elem, style=window.getComputedStyle(elem, null)) {
        if (elem.disabled) {
            return false;
        }
        // If elem is not an HTMLElement, tabIndex is undefined.
        if ((!(elem.tabIndex > -1) || Edit.isNonFocusableAnchor(elem)) &&
            !Scroll.isScrollable(elem, style) &&
            elem !== document.documentElement) {
            return false;
        }
        return true;
    }
    static hasFocusableChild(elem) {
        const walker = Edit.createFocusNodeWalker(elem);
        return walker.firstChild() !== null;
    }
    static isValidURL(href) {
        try {
            new URL(href);
            return true;
        }
        catch (e) {
            return false;
        }
    }
    static isNonFocusableAnchor(elem) {
        // Anchor elements with invalid URL can not be focused.
        return (elem instanceof HTMLAnchorElement &&
            !Edit.isValidURL(elem.href) &&
            !elem.hasAttribute("tabindex"));
    }
    static isDisplay(elem) {
        if (elem instanceof HTMLAreaElement) {
            const rect = elem.getBoundingClientRect();
            return rect.width !== 0 || rect.height !== 0;
        }
        return elem.getClientRects().length !== 0;
    }
    static acceptFocusable(node) {
        if (!Edit.isDisplay(node)) {
            return NodeFilter.FILTER_REJECT;
        }
        const style = window.getComputedStyle(node, null);
        if (style.visibility === "hidden") {
            return NodeFilter.FILTER_SKIP;
        }
        if (Edit.isFocusable(node, style)) {
            return NodeFilter.FILTER_ACCEPT;
        }
        else {
            return NodeFilter.FILTER_SKIP;
        }
    };
    static createFocusNodeWalker(root) {
        return document.createTreeWalker(root, NodeFilter.SHOW_ELEMENT, {
            acceptNode: Edit.acceptFocusable
        });
    }
    static getLastNode() {
        const walker = Edit.createFocusNodeWalker(document.documentElement);
        let lastNode = document.documentElement;
        while (true) {
            const node = walker.lastChild();
            if (!node) {
                break;
            }
            lastNode = node;
        }
        return lastNode;
    }

    static getElementFromNode(node) {
        switch (node.nodeType) {
            case Node.ELEMENT_NODE:
                return node;
            case Node.DOCUMENT_NODE:
                return node.documentElement;
            default:
                return node.parentElement;
        }
    }
});

function indexOfAfterPreviousNewline(value, from) {
    const index = value.lastIndexOf('\n', from);
    return index !== -1 ? index + 1 : 0;
}
function indexOfNextNewline(value, from) {
    const index = value.indexOf('\n', from);
    return index !== -1 ? index : value.length;
}
})();
