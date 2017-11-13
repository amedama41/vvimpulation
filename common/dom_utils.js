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
        return Array.prototype.filter.call(
            inputs, (input) => input.getClientRects().length !== 0);
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
        const index =
            indexOfAfterPreviousNewline(elem.value, elem.selectionStart);
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
    static deleteToBeggingOfLine(elem) {
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
    }
    static fixedFocus(elem) {
        const x = window.scrollX;
        const y = window.scrollY;
        try {
            elem.focus();
            // Restore position which was changed by focus
            window.scrollTo(x, y);
        }
        catch (e) {
            console.warn("elem is likely dead:", Utils.errorString(e));
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
