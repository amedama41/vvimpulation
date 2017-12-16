'use strict';

const DEFAULT_OPTIONS = {
    "keyMapping": {
        "normal": {
            ".": "repeatLastCommand",
            "<C-Z>": "toSuspendMode",
            "<Esc>": "toNormalMode",
            "<C-[>": "toNormalMode",
            "f": "toHintMode",
            "F": "toHintFocusMode",
            "t": "toHintMediaMode",
            "i": "toInsertMode",
            "I": "toInsertModeOnFirstElement",
            "A": "toInsertModeOnLastElement",
            "v": "toVisualMode",
            "gv": "toVisualModeWithCurrentSelection",
            ":": "toConsoleMode",
            "s": "toConsoleMode|open",
            "r": "toConsoleModeWithURL|open",
            "S": "toConsoleMode|tabopen",
            "R": "toConsoleModeWithURL|tabopen",
            "b": "toConsoleMode|buffer",
            "/": "toSearchMode",
            "?": "toBackwardSearchMode",
            "g<": "showLastMessage",
            "o": "smartOpen",
            "O": "smartOpenInTab",
            "gf": "openSource",
            "wgf": "openSourceInTab",
            "e": "pressEnter",
            "gg": "scrollTop",
            "G": "scrollBottom",
            "M": "scrollMiddle",
            "^": "scrollHome",
            "$": "scrollEnd",
            "k": "scrollUp",
            "j": "scrollDown",
            "h": "scrollLeft",
            "l": "scrollRight",
            "<C-U>": "moveHalfPageUp",
            "<C-D>": "moveHalfPageDown",
            "<C-B>": "movePageUp",
            "<C-F>": "movePageDown",
            "<C-Y>": "scrollLineUp",
            "<C-E>": "scrollLineDown",
            "%": "scrollPercent",
            "zt": "moveTargetAtTop",
            "zz": "moveTargetAtCenter",
            "zb": "moveTargetAtBottom",
            "gj": "selectNextOption",
            "gk": "selectPreviousOption",
            "g~": "toggleSelectOption",
            "n": "findNext",
            "N": "findPrevious",
            "*": "findSelectionForward",
            "#": "findSelectionBackward",
            "}": "findNextPage",
            "{": "findPreviousPage",
            ";": "focusNext",
            ",": "focusPrevious",
            "_": "resetFocus",
            "gt": "nextTab",
            "gT": "previousTab",
            "J": "nextTab",
            "K": "previousTab",
            "g0": "firstTab",
            "g$": "lastTab",
            "<C-^>": "lastActivatedTab",
            "<": "moveTabToLeft",
            ">": "moveTabToRight",
            "==": "moveTabToNewWindow",
            "g<": "moveTabToPreviousWindow",
            "g>": "moveTabToNextWindow",
            "u": "undoCloseTab",
            "dd": "removeCurrentTab",
            "dw": "removeCurrentWindow",
            "<C-C>": "stopLoad",
            "<C-L>": "reload",
            "g<C-L>": "reloadSkipCache",
            "<C-O>": "back",
            "<C-I>": "forward",
            "<C-A>": "incrementURL",
            "<C-X>": "decrementURL",
            "gu": "goToParent",
            "gU": "goToRoot",
            "zi": "zoomIn",
            "zo": "zoomOut",
            "zr": "zoomReset",
            "z=": "killHover",
            "yy": "yankCurrentURL",
            "yh": "yankPageHost",
            "yt": "yankPageTitle",
            "yit": "yankInnerHTML",
            "yat": "yankOuterHTML",
            "ye": "yankInnerText",
            "yv": "yankSelection",
            "ww": "focusNextFrame",
            "ww": "focusNextFrame",
            "wt": "focusTopFrame",
            "wf": "openSourceInFrame",
            "w<C-I>": "forwardFrame",
            "w<C-O>": "backFrame",
            "w<C-C>": "stopLoadFrame",
            "w<C-L>": "reloadFrame",
            "w<C-A>": "incrementFrameURL",
            "w<C-X>": "decrementFrameURL",
            "wyy": "yankFrameURL",
            "wyh": "yankFrameHost",
            "wyt": "yankFrameTitle",
            "w<C-G>": "showFrameURL",
            "<Space><Space>": "playOrPause",
            "<Space>j": "volumeDown",
            "<Space>k": "volumeUp",
            "<Space>h": "seekBack",
            "<Space>l": "seekForward",
            "<Space>r": "switchLoop",
            "<Space><C-L>": "reloadVideo",
            "<Space><C-G>": "showVideoInfo",
            "<Tab>": "ignore",
            "<S-Tab>": "ignore",
            "<Enter>": "ignore",
            "<C-Enter>": "ignore",
            "<S-Enter>": "ignore",
            "<A-Enter>": "ignore",
            "<M-Enter>": "ignore",
            "<Up>": "ignore",
            "<Down>": "ignore",
            "<Left>": "ignore",
            "<Right>": "ignore",
            "<PageUp>": "ignore",
            "<PageDown>": "ignore",
            "<Home>": "ignore",
            "<End>": "ignore",
        },
        "insert": {
            "<C-Z>": "toSuspendMode",
            "<C-H>": "deleteCharBackward",
            "<C-X>": "deleteWordBackward",
            "<C-K>": "deleteToEndOfLine",
            "<C-U>": "deleteToBeginningOfLine",
            "<C-F>": "charNext",
            "<C-B>": "charPrevious",
            "<C-A>": "beginLine",
            "<C-E>": "endLine",
            "<C-O>j": "nextLine",
            "<C-O><C-J>": "nextLine",
            "<C-O>k": "previousLine",
            "<C-O><C-K>": "previousLine",
            "<C-O>u": "undo",
            "<C-O><C-U>": "undo",
            "<C-O>y": "yankValue",
            "<C-O><C-Y>": "yankValue",
            "<C-O>p": "pasteValue",
            "<C-O><C-P>": "pasteValue",
            "<C-M>": "pressEnter",
            "<C-X><C-Y>": "scrollLineUp",
            "<C-X><C-E>": "scrollLineDown",
            "<C-C>": "toNormalMode",
            "<C-[>": "toNormalMode",
            "<Esc>": "toNormalMode",
            "<Tab>": "toInsertModeOnNextInput",
            "<S-Tab>": "toInsertModeOnPreviousInput",
        },
        "visual": {
            "h": "move backward character",
            "l": "move forward character",
            "b": "move backward word",
            "w": "move forward word",
            "j": "move forward line",
            "k": "move backward line",
            ")": "move forward sentence",
            "(": "move backward sentence",
            "}": "move forward paragraph",
            "{": "move backward paragraph",
            "^": "move backward lineboundary",
            "$": "move forward lineboundary",
            "G": "move forward documentboundary",
            "gg": "move backward documentboundary",
            "y": "yankSelection",
            "d": "deleteSelection",
            "o": "reverseSelectionEndpoints",
            "<C-Y>": "scrollLineUp",
            "<C-E>": "scrollLineDown",
            "c": "toCaretMode",
            "v": "toVisualModeWithCurrentSelection",
            "<C-[>": "toNormalMode",
            "<C-C>": "toNormalMode",
            "<Esc>": "toNormalMode",
        },
        "hint": {
            "<C-L>": { command: "hint.reconstruct" },
            "<Tab>": { command: "hint.nextHint" },
            "<S-Tab>": { command: "hint.previousHint" },
            ";": { command: "hint.nextHint" },
            ",": { command: "hint.previousHint" },
            "/": { command: "hint.startFilter" },
            "ff": { command: "hint.toggleAutoFocus" },
            "fi": { command: "focusin", count: 0 },
            "fo": { command: "focusout", count: 0 },
            "c": { command: "mouseclick", count: 0 },
            "mc": { command: "mouseclick", count: 0 },
            "mC": { command: "mouseclick", count: 2 },
            "m<C-C>": { command: "mouseclick", count: 1 },
            "m<M-C>": { command: "mouseclick", count: 8 },
            "md": { command: "mousedown", count: 0 },
            "mD": { command: "mousedown", count: 2 },
            "m<C-D>": { command: "mousedown", count: 1 },
            "mu": { command: "mouseup", count: 0 },
            "mU": { command: "mouseup", count: 2 },
            "m<C-U>": { command: "mouseup", count: 1 },
            "mi": { command: "mouseinTo", count: 0 },
            "mI": { command: "mouseinFrom", count: 0 },
            "mo": { command: "mouseoutFrom", count: 0 },
            "mO": { command: "mouseoutTo", count: 0 },
            "mm": { command: "mousemove", count: 5 },
            "e": { command: "pressEnter", count: 0 },
            "E": { command: "pressEnter", count: 2 },
            "<C-E>": { command: "pressEnter", count: 1 },
            "<M-E>": { command: "pressEnter", count: 8 },
            "o": { command: "smartOpen", count: 0 },
            "O": { command: "smartOpenInTab", count: 0 },
            "gf": { command: "openSource", count: 0 },
            "wgf": { command: "openSourceInTab", count: 0 },
            "wf": { command: "openSourceInFrame", count: 0 },
            "yy": { command: "yankLink", count: 0 },
            "yit": { command: "yankInnerHTML", count: 0 },
            "yat": { command: "yankOuterHTML", count: 0 },
            "ye": { command: "yankInnerText", count: 0 },
            "s": { command: "downloadLink", count: 0 },
            "v": { command: "selectElement", count: 0 },
            "dat": { command: "deleteElement", count: 0 },
            "<C-C>": { command: "toNormalMode", count: 0 },
            "<C-[>": { command: "toNormalMode", count: 0 },
            "<Esc>": { command: "toNormalMode", count: 0 },
        },
        "console": {
            "<Enter>": "console.execute",
            "<C-M>": "console.execute",
            "<C-H>": "console.deleteCharBackward",
            "<C-X>": "console.deleteWordBackward",
            "<C-U>": "console.deleteToBeginningOfLine",
            "<C-K>": "console.deleteToEndOfLine",
            "<C-A>": "console.beginLine",
            "<C-E>": "console.endLine",
            "<C-F>": "console.charNext",
            "<C-B>": "console.charPrevious",
            "<C-I>": "console.getCandidate",
            "<Tab>": "console.selectNextHistoryOrCandidate",
            "<S-Tab>": "console.selectPreviousHistoryOrCandidate",
            "<C-C>": "console.closeConsoleMode",
            "<Esc>": "console.closeConsoleMode",
            "<C-[>": "console.closeConsoleMode",
        }
    },

    "hintPattern": {
        "global": {
            "link": "*[onmousedown], *[onmouseup], *[onmouseover], *[onmouseout], *[onmousemove], *[onclick], *[oncommand], *[role='link'], *[role='button'], *[role='checkbox'], *[role='radio'], *[role='option'], input:not([type='hidden']):not([disabled]):not([readonly]), *[contenteditable='true'], *[contenteditable=''], a, button, select, textarea, area, summary, *[tabindex]:not([tabindex='-1'])",
            "focus": "body *",
            "media": "img, canvas, video, object, embed"
        },
        "local": {
            "twitter.com": {
                "link": [
                    ["div.new-tweets-bar.js-new-tweets-bar", "Link to display new tweets"],
                    ["div.dismiss.js-action-dismiss", "Dismiss button of recommended users"],
                    ["h1.Icon.Icon--bird.bird-topbar-etched", "Twitter icon on topbar"]
                ]
            }
        }
    },

    "searchEngine": {
        "defaultEngine": "google",
        "engines": {
            "google": {
                "searchUrl": "https://www.google.co.jp/search?q=%s&ie=utf-8&oe=utf-8&hl=ja",
                "suggest": {
                    "url": "https://suggestqueries.google.com/complete/search?client=firefox&hl=ja&qu=%s",
                    "type": "json",
                    "path": "$[1]",
                    "decode": false
                }
            },
            "twitter": {
                "searchUrl": "https://twitter.com/search?q=%s"
            }
        }
    }
};

