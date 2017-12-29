"use strict";

const HoverKiller = (function() {

const querySelectorAll = (elem, combinator, selector) => {
    switch (combinator) {
        case " ":
        case ">":
            selector = `:scope ${combinator} ${selector}`;
            break;
        case "~":
        case "+":
            if (!elem.nextElementSibling || !elem.parentElement) {
                return [];
            }
            const parentElem = elem.parentElement;
            const index = Array.from(parentElem.children).indexOf(elem);
            elem = parentElem;
            selector =
                `:scope > :nth-child(${index + 1}) ${combinator} ${selector}`;
            break;
        default:
            break;
    }
    try {
        return elem.querySelectorAll(selector);
    }
    catch (e) {
        console.error(Utils.errorString(e));
        return [];
    }
}

const setTabIndex = (element, index, selectorInfo) => {
    if (index === selectorInfo.length) {
        return [true, false];
    }
    const info = selectorInfo[index];
    let selector = info.selector;
    const pseudoInfoList = info.pseudoInfoList;
    for (let i = pseudoInfoList.length; i > 0; --i) {
        const [index, convertFunc] = pseudoInfoList[i -  1];
        selector = selector.substring(0, index) + convertFunc(selector, index);
    }
    const elems = querySelectorAll(element, info.combinator, selector);
    if (elems.length === 0) {
        return [false, false];
    }
    return Array.from(elems).reduce(([hasChildren, hasFocusable], elem) => {
        const [child, focus] = setTabIndex(elem, index + 1, selectorInfo);
        if (!child) {
            return [hasChildren, hasFocusable];
        }
        if (focus || DomUtils.hasFocusableChild(elem)) {
            return [true, true];
        }
        if (info.isTarget) {
            elem.tabIndex = Math.max(elem.tabIndex, 0);
            return [true, true];
        }
        return [true, hasFocusable];
    }, [false, false]);
}

const applyAllHoverRules = (sheet, func) => {
    const cssRules = sheet.cssRules;
    for (let i = 0; i < cssRules.length; ++i) {
        const rule = cssRules[i];
        switch (rule.type) {
            case CSSRule.STYLE_RULE:
                const selector = rule.selectorText;
                if (!selector.includes(":hover")) {
                    continue;
                }
                const style = rule.style;
                if (style.length === 0 ||
                    (style.length === 1 && style[0] === "cursor")) {
                    continue;
                }
                i = func(i, rule, sheet);
                break;
            case CSSRule.IMPORT_RULE:
                if (accessible(rule.styleSheet)) { // TODO
                    applyAllHoverRules(rule.styleSheet, func);
                }
                break;
            case CSSRule.MEDIA_RULE:
            case CSSRule.SUPPORTS_RULE:
            case CSSRule.DOCUMENT_RULE || 13:
                applyAllHoverRules(rule, func);
                break;
            default:
                break;
        }
    }
}

const collectHoverSelectors = (sheet, hoverSelectorList) => {
    applyAllHoverRules(sheet, (i, rule, sheet) => {
        hoverSelectorList.push(rule.selectorText);
        return i;
    });
}

const insertFocusRule = (sheet) => {
    applyAllHoverRules(sheet, (i, rule, sheet) => {
        const orgSelector = rule.selectorText;
        const newSelector = orgSelector.replace(/:hover\b/g, ":focus-within");
        if (i !== 0) { // Avoid double insertion
            const prevRule = sheet.cssRules[i - 1];
            if (prevRule.selectorText === newSelector &&
                prevRule.style.cssText === rule.style.cssText) {
                return i;
            }
        }
        sheet.insertRule(`${newSelector} {${rule.style.cssText}}`, i);
        return i + 1;
    });
}

const makeAccessibleSheetList = () => {
    return Array.from(document.styleSheets).map((sheet) => {
        if (accessible(sheet)) {
            return Promise.resolve(sheet);
        }
        const originalLink = sheet.ownerNode;
        const href = originalLink.href;
        if (href.startsWith("resource://") || href.startsWith("chrome://")) {
            return Promise.resolve(null);
        }
        return new Promise((resolve, reject) => {
            const link = originalLink.cloneNode(true);
            link.crossOrigin = "anonymous";
            link.addEventListener("load", (e) => {
                resolve(e.target.sheet);
                originalLink.parentNode.removeChild(originalLink);
            }, { once: true });
            link.addEventListener("error", (e) => {
                console.warn("can't load ", e.target.href, location.href);
                link.parentNode.removeChild(link);
                resolve(null);
            }, { once: true });
            originalLink.parentNode.insertBefore(link, originalLink);
        });
    });
};

const accessible = (sheet) => {
    try {
        sheet.cssRules; // check CORS.
        return true;
    }
    catch (e) {
        return false;
    }
};

class Parser {
    constructor() {
        const nonascii = "(?:[\\uD800-\\uDBFF][\\uDC00-\\uDFFF]|[\\u0080-\\uD7FF\\uE000-\\uFFFD])";
        const wc = "[\\x09\\x0A\\x0C\\x0D\\x20]";
        const escape = `\\\\[0-9a-fA-F]{1,6}${wc}?|\\\\(?:[\\uD800-\\uDBFF][\\uDC00-\\uDFFF]|[\\x20-\\x7E\\u0080-\\uD7FF\\uE000-\\uFFFD])`
        const stringchar = `(?:[\\x09\\x20\\x21\\x23-\\x26\\x28-\\x5b\\x5d-\\x7E]|${nonascii}|${escape}|\\\\(?:\\x0A|\\x0D\\x0A|\\x0D|\\x0C))`;
        const ident = `(?:-?(?:[a-zA-Z_]|${nonascii}|${escape})(?:[a-zA-Z0-9_-]|${nonascii}|${escape})*)`;
        const string = `(?:"(?:${stringchar}|')*"|'(?:${stringchar}|")*')`;

        const wqnamePrefix = `(?:(${ident}?|\\*)\\|)`;
        const attribMatch = `(?:[~|^$*]?=${wc}*)`;
        const attribFlags = `(?:${ident}${wc}*)`;
        const attrib = `\\[${wc}*${wqnamePrefix}?${ident}${wc}*(?:${attribMatch}(?:${ident}|${string})${wc}*${attribFlags}?)?\\]`;
        const nth = `${wc}*(?:[-+]?[0-9]*(?:n|\\\\0{0,4}(?:4e|6e)(?:\\r\\n|${wc})?|\\\\n)(?:${wc}*[-+]${wc}*[0-9]+)?|[-+]?[0-9]+|odd|even)`;

        this.nth = new RegExp(nth, "iy");
        this.ident = new RegExp(ident, "y");

        this.attrib = new RegExp(attrib, "y");
        this.typeSelector = new RegExp(`${wqnamePrefix}?(${ident}|\\*)`, "y");
        this.idOrClassOrAttrib = new RegExp(`(?:#${ident}|\\.${ident}|${attrib})`, "y");
        this.pseudo = new RegExp(`(::?${ident})(\\(${wc}*)?`, "y");
        this.pseudoFuncEnd = new RegExp(`${wc}*\\)`, "y");
        this.comma = new RegExp(`${wc}*,${wc}*`, "y");
        this.combinator = new RegExp(`${wc}*([\\x09\\x0A\\x0C\\x0D\\x20>+~])${wc}*`, "y");
        this.pseudoElement = /^:(?::?(:?before|after|first-line|first-letter)|:(?:selection|cue|backdrop|placeholder))$/i;
    }
    getHoverSelectorInfo(selectorListStr) {
        const infoList = [];
        const input = { str: selectorListStr, matchedLen: 0 };
        if (!this._getComplexSelectorInfo(input, infoList)) {
            throw new Error("invalid selector-list: " + input);
        }
        if (!selectorListStr.includes(":hover", input.matchedLen)) {
            return infoList;
        }
        const length = selectorListStr.length;
        while (input.matchedLen !== length) {
            if (!Parser._test(this.comma, input)) {
                console.warn("no comma:", input);
                break;
            }
            if (!this._getComplexSelectorInfo(input, infoList)) {
                throw new Error("invalid selector-list: " + input);
            }
            if (!selectorListStr.includes(":hover", input.matchedLen)) {
                return infoList;
            }
        }
        return infoList;
    }
    _getComplexSelectorInfo(input, infoList) {
        const info = this.complexSelector(input);
        if (!info) {
            return false;
        }
        if (info.hasHover && !info.hasNamespace) {
            infoList.push(info.infoList);
        }
        return true;
    }

    complexSelector(input) {
        const result = { hasNamespace: false, hasHover: false, infoList: [] };
        const parseInfo = {
            startIndex: input.matchedLen, combinator: null, pseudoInfoList: []
        };
        const info = this.compoundSelector(input);
        if (!info) {
            return null;
        }
        Parser._updateParseInfo(info, input, parseInfo, result);

        while (true) {
            const copy = { str: input.str, matchedLen: input.matchedLen };
            const combinatorResult = Parser._exec(this.combinator, copy);
            if (!combinatorResult) {
                break;
            }
            const [matched, combinator] = combinatorResult;

            const info = this.compoundSelector(copy);
            if (!info) {
                if (combinator !== " ") {
                    throw new Error(`invalid complex-selector: ${input}`);
                }
                break;
            }
            if (parseInfo.startIndex === input.matchedLen) {
                parseInfo.startIndex += matched.length;
                parseInfo.combinator = combinator;
            }
            input.matchedLen = copy.matchedLen;
            Parser._updateParseInfo(info, input, parseInfo, result);
        }

        if (parseInfo.startIndex !== input.matchedLen) {
            Parser._pushSelectorInfo(input, parseInfo, result, false);
        }

        return result;
    }
    static _updateParseInfo(info, input, parseInfo, result) {
        info.pseudoInfoList.forEach((elem) => elem[0] -= parseInfo.startIndex);
        Array.prototype.push.apply(
            parseInfo.pseudoInfoList, info.pseudoInfoList);
        if (info.hasNamespace) {
            result.hasNamespace = true;
        }
        if (info.hasHover && info.type !== "a") {
            result.hasHover = true;
            Parser._pushSelectorInfo(input, parseInfo, result, true);
            parseInfo.startIndex = input.matchedLen;
            parseInfo.combinator = null;
            parseInfo.pseudoInfoList = [];
        }
    }
    static _pushSelectorInfo(input, parseInfo, result, isTarget) {
        result.infoList.push({
            selector: input.str.substring(
                parseInfo.startIndex, input.matchedLen),
            combinator: parseInfo.combinator,
            pseudoInfoList: parseInfo.pseudoInfoList,
            isTarget: isTarget
        });
    }

    compoundSelectorList(input) {
        const info = { hasNamespace: false, infoList: [] };
        if (!this._getCompoundSelectorInfo(input, info)) {
            return null;
        }
        while (Parser._test(this.comma, input)) {
            if (!this._getCompoundSelectorInfo(input, info)) {
                throw new Error("invalid compound-selector-list: " + input);
            }
        }
        return info;
    }
    _getCompoundSelectorInfo(input, info) {
        const csInfo = this.compoundSelector(input);
        if (!csInfo) {
            return false;
        }
        if (csInfo.hasNamespace) {
            info.hasNamespace = true;
        }
        info.infoList.push(csInfo);
        return true;
    }

    compoundSelector(input) {
        const info = {
            type: "*", hasNamespace: false, hasHover: false, pseudoInfoList: [],
        };
        const result = Parser._exec(this.typeSelector, input);
        if (result) {
            const [matched, namespace, typeSelector] = result;
            if (namespace && namespace !== "*") {
                info.hasNamespace = true;
            }
            info.type = typeSelector;
        }
        else {
            if (!this._nonTypeSimpleSelector(input, info)) {
                return null;
            }
        }
        while (this._nonTypeSimpleSelector(input, info)) {
        }
        return info;
    }
    _nonTypeSimpleSelector(input, info) {
        const result = Parser._exec(this.idOrClassOrAttrib, input);
        if (result) {
            const [matched, namespace] = result;
            if (namespace && namespace !== "*") {
                info.hasNamespace = true;
            }
            return true;
        }

        const pseudoStartIndex = input.matchedLen;
        const pseudResult = this._pseudoExec(input);
        if (!pseudResult) {
            return false;
        }
        const [pseudoName, hasNamespace] = pseudResult;
        if (hasNamespace) {
            info.hasNamespace = true;
        }
        if (pseudoName === ":hover") {
            info.hasHover = true;
            info.pseudoInfoList.push([pseudoStartIndex, Parser._removeHover]);
        }
        else if (this.pseudoElement.test(pseudoName)) {
            const length = pseudoName.length;
            info.pseudoInfoList.push(
                [pseudoStartIndex, (str, index) => str.substr(index + length)]);
        }
        return true;
    }
    // return [pseudoName, hasNamespace];
    _pseudoExec(input) {
        const result = Parser._exec(this.pseudo, input);
        if (!result) {
            return null;
        }
        const [matched, pseudoName, isFunc] = result;

        if (!isFunc) {
            return [pseudoName, false];
        }

        const argsResult = this._pseudoFuncArgs(input, pseudoName);
        if (!argsResult) {
            throw new Error(`invalid pseudo function: ${input}`);
        }
        if (!Parser._test(this.pseudoFuncEnd, input)) {
            throw new Error(`Missing end parenthesis ${input}`);
        }
        const [hasNamespace] = argsResult;
        return [pseudoName, hasNamespace];
    }
    _pseudoFuncArgs(input, pseudoName) {
        switch (pseudoName) {
            case ":not": {
                const info = this.compoundSelectorList(input);
                if (!info) {
                    return null;
                }
                return [info.hasNamespace];
            }
            case ":dir":
            case ":lang": {
                if (!Parser._test(this.ident, input)) {
                    return null;
                }
                return [false];
            }
            case ":nth-child":
            case ":nth-last-child":
            case ":nth-of-type":
            case ":nth-last-of-type": {
                if (!Parser._test(this.nth, input)) {
                    return null;
                }
                return [false];
            }
            default:
                return null;
        }
    }
    static _removeHover(str, index) {
        return ":not([tabindex='0'])" + str.substr(index + 6);
    };

    static _test(pattern, input) {
        pattern.lastIndex = input.matchedLen;
        if (pattern.test(input.str)) {
            input.matchedLen = pattern.lastIndex;
            return true;
        }
        return false;
    }
    static _exec(pattern, input) {
        pattern.lastIndex = input.matchedLen;
        const match = pattern.exec(input.str);
        if (match) {
            input.matchedLen = pattern.lastIndex;
            return match;
        }
        return null;
    }
}

return class HoverKillerImpl {
    static insertFocusRule() {
        const promiseList = makeAccessibleSheetList();
        Promise.all(promiseList).then((sheetList) => {
            sheetList.forEach((sheet) => {
                if (!sheet) {
                    return;
                }
                try {
                    insertFocusRule(sheet);
                }
                catch (e) {
                    console.error(Utils.errorString(e), sheet.href);
                }
            });
        });
    }

    static setTabIndex() {
        const sheetList = Array.from(document.styleSheets).filter(accessible);
        const hoverSelectorList = [];
        sheetList.forEach((sheet) => {
            collectHoverSelectors(sheet, hoverSelectorList);
        });
        const parser = new Parser();
        const parseInfoList = hoverSelectorList.map((selector) => {
            try {
                return [selector, parser.getHoverSelectorInfo(selector)];
            }
            catch (e) {
                console.error(Utils.errorString(e));
                return [selector, []];
            }
        });
        parseInfoList.forEach(([selector, infoList]) => {
            try {
                infoList.forEach((info) => setTabIndex(document, 0, info));
            }
            catch (e) {
                console.error(Utils.errorString(e), selector, infoList);
            }
        });
    }

    static killHover() {
        HoverKillerImpl.insertFocusRule();
        HoverKillerImpl.setTabIndex();
    }

    static makeParser() {
        return new Parser();
    }
}

})();

