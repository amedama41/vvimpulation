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
        return true;
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
        return false;
    }
    Array.from(elems).forEach((elem) => {
        const result = setTabIndex(elem, index + 1, selectorInfo);
        if (result && info.isTarget) {
            elem.tabIndex = Math.max(elem.tabIndex, 0);
        }
    });
    return true;
}

const collectHoverSelectors = (sheet, hoverSelectorList) => {
    const cssRules = sheet.cssRules;
    for (let i = 0; i < cssRules.length; ++i) {
        const rule = cssRules[i];
        switch (rule.type) {
            case CSSRule.STYLE_RULE:
                const selector = rule.selectorText;
                if (selector.includes(":hover")) {
                    hoverSelectorList.push(selector);
                }
                break;
            case CSSRule.MEDIA_RULE:
            case CSSRule.SUPPORTS_RULE:
            case CSSRule.DOCUMENT_RULE || 13:
                collectHoverSelectors(rule, hoverSelectorList);
                break;
            default:
                break;
        }
    }
}

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

        const wqname_prefix = `(?:(${ident}?|\\*)\\|)`;
        const attrib_match = `(?:[~|^$*]?=${wc}*)`;
        const attrib_flags = `(?:${ident}${wc}*)`;
        const attrib = `\\[${wc}*${wqname_prefix}?${ident}${wc}*(?:${attrib_match}(?:${ident}|${string})${wc}*${attrib_flags}?)?\\]`;
        const nth = `${wc}*(?:[-+]?[0-9]*(?:n|\\\\0{0,4}(?:4e|6e)(?:\\r\\n|${wc})?|\\\\n)(?:${wc}*[-+]${wc}*[0-9]+)?|[-+]?[0-9]+|odd|even)`;

        this.nth = new RegExp(nth, "iy");
        this.ident = new RegExp(ident, "y");

        this.attrib = new RegExp(attrib, "y");
        this.type_selector = new RegExp(`${wqname_prefix}?(${ident}|\\*)`, "y");
        this._id_or_class_or_attrib = new RegExp(`(?:#${ident}|\\.${ident}|${attrib})`, "y");
        this.pseudo = new RegExp(`(::?${ident})(\\(${wc}*)?`, "y");
        this.pseudo_func_end = new RegExp(`${wc}*\\)`, "y");
        this.comma = new RegExp(`${wc}*,${wc}*`, "y");
        this.combinator = new RegExp(`${wc}*([\\x09\\x0A\\x0C\\x0D\\x20>+~])${wc}*`, "y");
        this.pseudo_element = /^:(?::?(:?before|after|first-line|first-letter)|:(?:selection|cue|backdrop|placeholder))$/i;
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
        const result = Parser._exec(this.type_selector, input);
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
        const result = Parser._exec(this._id_or_class_or_attrib, input);
        if (result) {
            const [matched, namespace] = result;
            if (namespace && namespace !== "*") {
                info.hasNamespace = true;
            }
            return true;
        }

        const pseudoStartIndex = input.matchedLen;
        const pseudo_result = this._pseudo_exec(input);
        if (!pseudo_result) {
            return false;
        }
        const [pseudoName, hasNamespace] = pseudo_result;
        if (hasNamespace) {
            info.hasNamespace = true;
        }
        if (pseudoName === ":hover") {
            info.hasHover = true;
            info.pseudoInfoList.push([pseudoStartIndex, Parser._removeHover]);
        }
        else if (this.pseudo_element.test(pseudoName)) {
            const length = pseudoName.length;
            info.pseudoInfoList.push(
                [pseudoStartIndex, (str, index) => str.substr(index + length)]);
        }
        return true;
    }
    // return [pseudoName, hasNamespace];
    _pseudo_exec(input) {
        const result = Parser._exec(this.pseudo, input);
        if (!result) {
            return null;
        }
        const [matched, pseudoName, isFunc] = result;

        if (!isFunc) {
            return [pseudoName, false];
        }

        const argsResult = this._pseudo_func_args(input, pseudoName);
        if (!argsResult) {
            throw new Error(`invalid pseudo function: ${input}`);
        }
        if (!Parser._test(this.pseudo_func_end, input)) {
            throw new Error(`Missing end parenthesis ${input}`);
        }
        const [hasNamespace] = argsResult;
        return [pseudoName, hasNamespace];
    }
    _pseudo_func_args(input, pseudoName) {
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
    static makeParser() {
        return new Parser();
    }
}

})();

