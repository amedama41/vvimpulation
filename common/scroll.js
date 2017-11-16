'use strict';

const Scroll = (function() {
return (class Scroll {
    static isScrollableType(elem) {
        switch (elem.tagName.toUpperCase()) {
            case "BODY": case "HTML": case "BUTTON":
                return false;
            default:
                return true;
        }
    }
    static isVerticalScrollable(elem) {
        return ((elem.clientHeight !== 0)
            && (elem.clientHeight !== elem.scrollHeight));
    }
    static isHorizontalScrollable(elem) {
        return ((elem.clientWidth !== 0)
            && (elem.clientWidth !== elem.scrollWidth));
    }
    static isVerticalScrollableStyle(style) {
        return (style.overflowY !== "visible" && style.overflowY !== "hidden");
    }
    static isHorizontalScrollableStyle(style) {
        return (style.overflowX !== "visible" && style.overflowX !== "hidden");
    }
    static isScrollableStyle(style) {
        return Scroll.isVerticalScrollableStyle(style) ||
            Scroll.isHorizontalScrollableStyle(style);
    }
    static isScrollable(elem, style) {
        if (!Scroll.isScrollableType(elem)) {
            return false;
        }
        if (!Scroll.isVerticalScrollable(elem) &&
            !Scroll.isHorizontalScrollable(elem)) {
            return false;
        }
        return Scroll.isScrollableStyle(style);
    }
    static getVerticalScrollableElem(elem) {
        const doc = elem.ownerDocument;
        const win = doc.defaultView;
        const root = doc.documentElement;
        while (elem !== root) {
            if (Scroll.isScrollableType(elem)
                && Scroll.isVerticalScrollable(elem)
                && Scroll.isVerticalScrollableStyle(
                    win.getComputedStyle(elem, null))) {
                return elem;
            }
            elem = elem.parentNode;
        }
        return undefined;
    }
    static getHorizontalScrollableElem(elem) {
        const doc = elem.ownerDocument;
        const win = doc.defaultView;
        const root = doc.documentElement;
        while (elem !== root) {
            if (Scroll.isScrollableType(elem)
                && Scroll.isHorizontalScrollable(elem)
                && Scroll.isHorizontalScrollableStyle(
                    win.getComputedStyle(elem, null))) {
                return elem;
            }
            elem = elem.parentNode;
        }
        return undefined;
    }
});
})();
