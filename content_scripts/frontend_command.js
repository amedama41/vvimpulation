'use strict';

class FrontendCommand {
    /**
     * Commands for scrolling
     */
    static scrollTop(count, frameInfo) {
        const elem = Scroll.getVerticalScrollableElem(frameInfo.getTarget());
        if (elem && elem.scrollTop !== 0) {
            elem.scrollTop = 0;
            return;
        }
        window.scrollTo(window.scrollX, 0);
    }
    static scrollBottom(count, frameInfo) {
        const elem = Scroll.getVerticalScrollableElem(frameInfo.getTarget());
        if (elem && elem.clientHeight !== elem.scrollHeight - elem.scrollTop) {
            elem.scrollTop = elem.scrollHeight - elem.clientHeight;
            return;
        }
        window.scrollTo(window.scrollX, window.scrollMaxY);
    }
    static scrollUp(count, frameInfo) {
        const elem = Scroll.getVerticalScrollableElem(frameInfo.getTarget());
        if (elem && elem.scrollTop !== 0) {
            elem.scrollTop -= Math.max(count, 20);
            return;
        }
        window.scrollByLines(Math.max(count, 4) * -1);
    }
    static scrollDown(count, frameInfo) {
        const elem = Scroll.getVerticalScrollableElem(frameInfo.getTarget());
        if (elem && elem.clientHeight !== elem.scrollHeight - elem.scrollTop) {
            elem.scrollTop += Math.max(count, 20);
            return;
        }
        window.scrollByLines(Math.max(count, 4) * 1);
    }
    static scrollLineUp(count, frameInfo) {
        window.scrollByLines(Math.max(count, 1) * -1);
    }
    static scrollLineDown(count, frameInfo) {
        window.scrollByLines(Math.max(count, 1) * 1);
    }
    static moveHalfPageUp(count, frameInfo) {
        const elem = Scroll.getVerticalScrollableElem(frameInfo.getTarget());
        if (elem && elem.scrollTop !== 0) {
            elem.scrollTop -= Math.max(count, 1) * elem.clientHeight / 2;
            return;
        }
        window.scrollBy(0, Math.max(count, 1) * -window.innerHeight / 2);
    }
    static moveHalfPageDown(count, frameInfo) {
        const elem = Scroll.getVerticalScrollableElem(frameInfo.getTarget());
        if (elem && elem.clientHeight !== elem.scrollHeight - elem.scrollTop) {
            elem.scrollTop += Math.max(count, 1) * elem.clientHeight / 2;
            return;
        }
        window.scrollBy(0, Math.max(count, 1) * window.innerHeight / 2);
    }
    static movePageUp(count, frameInfo) {
        const elem = Scroll.getVerticalScrollableElem(frameInfo.getTarget());
        if (elem && elem.scrollTop !== 0) {
            elem.scrollTop -= Math.max(count, 1) * elem.clientHeight;
            return;
        }
        window.scrollByPages(Math.max(count, 1) * -1);
    }
    static movePageDown(count, frameInfo) {
        const elem = Scroll.getVerticalScrollableElem(frameInfo.getTarget());
        if (elem && elem.clientHeight !== elem.scrollHeight - elem.scrollTop) {
            elem.scrollTop += Math.max(count, 1) * elem.clientHeight;
            return;
        }
        window.scrollByPages(Math.max(count, 1) * 1);
    }
    static scrollLeft(count, frameInfo) {
        const elem = Scroll.getHorizontalScrollableElem(frameInfo.getTarget());
        if (elem && elem.scrollLeft !== 0) {
            elem.scrollLeft -= Math.max(count, 20);
            return;
        }
        window.scrollBy(-20, 0);
    }
    static scrollRight(count, frameInfo) {
        const elem = Scroll.getHorizontalScrollableElem(frameInfo.getTarget());
        if (elem && elem.clientWidth !== elem.scrollWidth - elem.scrollLeft) {
            elem.scrollLeft += Math.max(count, 20);
            return;
        }
        window.scrollBy(20, 0);
    }
    static scrollHome(count, frameInfo) {
        const elem = Scroll.getHorizontalScrollableElem(frameInfo.getTarget());
        if (elem && elem.scrollLeft !== 0) {
            elem.scrollLeft = 0;
            return;
        }
        window.scrollTo(0, window.scrollY);
    }
    static scrollEnd(count, frameInfo) {
        const elem = Scroll.getHorizontalScrollableElem(frameInfo.getTarget());
        if (elem && elem.clientWidth !== elem.scrollWidth - elem.scrollLeft) {
            elem.scrollLeft = elem.scrollWidth;
            return;
        }
        window.scrollTo(window.scrollMaxX, window.scrollY);
    }
    static scrollPercent(count, frameInfo) {
        if (count === 0) {
            return;
        }
        window.scrollTo(window.scrollX, window.scrollMaxY * count / 100);
    }
    static scrollMiddle(count, frameInfo) {
        return FrontendCommand.scrollPercent(50, frameInfo);
    }
    static moveTargetAtTop(count, frameInfo) {
        const elem = frameInfo.getTarget();
        elem.scrollIntoView(true);
    }
    static moveTargetAtCenter(count, frameInfo) {
        const elem = frameInfo.getTarget();
        const rect = elem.getBoundingClientRect();
        // (bottom + top) / 2 - height / 2
        window.scrollBy(0, (rect.bottom + rect.top - window.innerHeight) / 2);
    }
    static moveTargetAtBottom(count, frameInfo) {
        const elem = frameInfo.getTarget();
        elem.scrollIntoView(false);
    }

    /**
     * Commands for focus manipulation
     */
    static focusTopFrame(count, frameInfo) {
        // Suppress scroll when an html element has height 100%.
        DomUtils.fixedFocus(document.documentElement);
    }
    static focusin(count, frameInfo) {
        const elem = frameInfo.getTarget();
        try {
            elem.focus();
        }
        catch (e) {
            console.warn(
                `Element ${elem} is likely dead:`, Utils.errorString(e));
        }
    }
    static focusout(count, frameInfo) {
        const elem = frameInfo.getTarget();
        try {
            elem.blur();
        }
        catch (e) {
            console.warn(
                `Element ${elem} is likely dead:`, Utils.errorString(e));
        }
    }
    static focusNext(count, frameInfo) {
        const walker = createFocusNodeWalker(frameInfo.getTarget());
        const node = walker.nextNode();
        if (node) {
            setTimeout(() => node.focus(), 0);
        }
        else {
            // TODO: move parent frame
            walker.currentNode = document.documentElement;
            const firstNode = (walker.firstChild() || document.documentElement);
            setTimeout(() => firstNode.focus(), 0);
        }
    }
    static focusPrevious(count, frameInfo) {
        const walker = createFocusNodeWalker(frameInfo.getTarget());
        const node = walker.previousNode();
        if (node) {
            node.focus();
        }
        else {
            // TODO: move parent frame
            walker.currentNode = document.documentElement;
            const lastNode = getLastNode(walker);
            setTimeout(() => lastNode.focus(), 0);
        }
    }

    /**
     * Commands for search
     **/
    static findNextPage(count, frameInfo) {
        const NEXT_KEYWORDS = [
            "次のページ", "次へ", "次ページ", "NEXT", ">>", "»"
        ];
        focusNextKeywordLink(
            NEXT_KEYWORDS, Math.max(count, 1), frameInfo.getTarget());
    }
    static findPreviousPage(count, frameInfo) {
        const PREVIOUS_KEYWORDS = [
            "前のページ", "前へ", "前ページ", "PREV", "<<", "«"
        ];
        focusNextKeywordLink(
            PREVIOUS_KEYWORDS, Math.max(count, 1), frameInfo.getTarget());
    }

    /**
     * Commands for page load manipulation
     */
    static stopLoad(count, frameInfo) {
        window.stop();
    }

    /**
     * Commands for page history
     */
    static back(count, frameInfo) {
        // TODO
        history.go(-Math.min(Math.max(count, 1), history.length - 1));
    }
    static forward(count, frameInfo) {
        // TODO
        history.go(Math.min(Math.max(count, 1), history.length - 1));
    }

    /**
     * Commands for URL edit
     */
    static incrementURL(count, frameInfo) {
        incrementURL(location, Math.max(count, 1));
    }
    static decrementURL(count, frameInfo) {
        incrementURL(location, -Math.max(count, 1));
    }
    static goToParent(count, frameInfo) {
        const path = location.pathname;
        if (path === "/") {
            return;
        }
        const pathList = path.split("/");
        pathList.length -= Math.max(1, Math.min(count, pathList.length));
        location.href = location.origin + pathList.join("/");
    }
    static goToRoot(count, frameInfo) {
        location.href = location.origin;
    }

    /**
     * Commands for video manipulation
     */
    static playOrPause(count, frameInfo) {
        const video = document.querySelector("video");
        if (!video) {
            return;
        }
        if (video.paused) {
            video.play();
        }
        else {
            video.pause();
        }
    }
    static volumeUp(count, frameInfo) {
        const video = document.querySelector("video");
        if (!video) {
            return;
        }
        video.volume = Math.min(video.volume + Math.max(1, count) / 100, 1.0);
    }
    static volumeDown(count, frameInfo) {
        const video = document.querySelector("video");
        if (!video) {
            return;
        }
        video.volume = Math.max(video.volume - Math.max(1, count) / 100, 0.0);
    }
    static seekForward(count, frameInfo) {
        const video = document.querySelector("video");
        if (!video) {
            return;
        }
        if (count === 0) {
            count = 5;
        }
        video.currentTime = Math.min(video.currentTime + count, video.duration);
    }
    static seekBack(count, frameInfo) {
        const video = document.querySelector("video");
        if (!video) {
            return;
        }
        if (count === 0) {
            count = 5;
        }
        video.currentTime = Math.max(video.currentTime - count, 0);
    }
    static switchLoop(count, frameInfo) {
        const video = document.querySelector("video");
        if (!video) {
            return;
        }
        video.loop = !video.loop;
    }
    static reloadVideo(count, frameInfo) {
        const video = document.querySelector("video");
        if (!video) {
            return;
        }
        video.load();
    }
    static showVideInfo(count, frameInfo) {
        const video = document.querySelector("video");
        if (!video) {
            return;
        }
        const duration = video.duration;
        let sec = duration;
        const hour = Math.floor(sec / 60 / 60);
        sec -= hour * 60 * 60;
        const min = Math.floor(sec / 60);
        sec -= min * 60;
        const pad = (num) => ("0" + num.toString()).substr(-2);
        const durationStr = `${pad(hour)}:${pad(min)}:${pad(sec)} (${duration}s)`;

        const msg = (
`Src: ${video.src}
CurrentSrc: ${video.currentSrc}
Duration: ${durationStr}s
CurrentTime: ${video.currentTime}
Volume: ${video.volume}
Loop: ${video.loop}`
        );
        frameInfo.showMessage(msg);
    }

    /**
     * Commands for current frame
     **/
    static openLinkInFrame(count, frameInfo) {
        const elem = frameInfo.getTarget();
        const url = getLink(elem);
        if (url) {
            location.href = url;
        }
    }
    static openSourceInFrame(count, frameInfo) {
        const elem = frameInfo.getTarget();
        const url = getSource(elem);
        if (url) {
            location.href = url;
        }
    }
    static backFrame(count, frameInfo) {
        history.go(-Math.min(Math.max(count, 1), history.length - 1));
    }
    static forwardFrame(count, frameInfo) {
        history.go(Math.min(Math.max(count, 1), history.length - 1));
    }
    static stopLoadFrame(count, frameInfo) {
        window.stop();
    }
    static reloadFrame(count, frameInfo) {
        location.reload();
    }
    static incrementFrameURL(count, frameInfo) {
        incrementURL(location, Math.max(count, 1));
    }
    static decrementFrameURL(count, frameInfo) {
        incrementURL(location, -Math.max(count, 1));
    }
    static yankFrameURL(count, frameInfo) {
        if (DomUtils.setToClipboard(location.href)) {
            frameInfo.showMessage("Yank current frame URL");
        }
    }
    static yankFrameHost(count, frameInfo) {
        if (DomUtils.setToClipboard(location.host)) {
            frameInfo.showMessage("Yank current frame host");
        }
    }
    static yankFrameTitle(count, frameInfo) {
        if (DomUtils.setToClipboard(document.title)) {
            frameInfo.showMessage("Yank current frame title");
        }
    }
    static showFrameURL(count, frameInfo) {
        frameInfo.showMessage(
            "Title: " + document.title + "\n" + "URL: " + location.href);
    }

    /**
     * Commands for link manipulation
     **/
    static openLink(count, frameInfo) {
        const elem = frameInfo.getTarget();
        const url = getLink(elem);
        if (url) {
            frameInfo.postMessage({ command: 'openLink', url: url });
        }
    }
    static openLinkInTab(count, frameInfo) {
        const elem = frameInfo.getTarget();
        const url = getLink(elem);
        if (url) {
            const active = (count === 0);
            frameInfo.postMessage(
                { command: 'openLinkInTab', url: url, active: active });
        }
    }
    static openSource(count, frameInfo) {
        const elem = frameInfo.getTarget();
        const url = getSource(elem);
        if (url) {
            frameInfo.postMessage({ command: 'openLink', url: url });
        }
    }
    static openSourceInTab(count, frameInfo) {
        const elem = frameInfo.getTarget();
        const url = getSource(elem);
        if (url) {
            const active = (count === 0);
            frameInfo.postMessage(
                { command: 'openLinkInTab', url: url, active: active });
        }
    }
    static yankLink(count, frameInfo) {
        const elem = frameInfo.getTarget();
        const url = getSource(elem);
        if (url) {
            if (DomUtils.setToClipboard(url)) {
                frameInfo.showMessage("Yank current target link");
            }
        }
    }
    static downloadLink(count, frameInfo) {
        const elem = frameInfo.getTarget();
        const url = getSource(elem);
        if (url) {
            frameInfo.postMessage({ command: 'downloadLink', url: url });
        }
    }
    static pressEnter(count, frameInfo) {
        const elem = frameInfo.getTarget();
        const [ctrl, shift, alt, meta] = Utils.countToModifiers(count);
        emulateEnter(elem, "keypress", ctrl, alt, shift, meta);
    }

    /**
     * Commands for mouse emulation
     **/
    static mouseclick(count, frameInfo) {
        const elem = frameInfo.getTarget();
        const [ctrl, shift, alt, meta] = Utils.countToModifiers(count);
        emulateClick(elem, ctrl, alt, shift, meta);
    }
    static mousedown(count, frameInfo) {
        const elem = frameInfo.getTarget();
        const [ctrl, shift, alt, meta] = Utils.countToModifiers(count);
        emulateMouseEvent(elem, "mousedown", 0, ctrl, alt, shift, meta);
    }
    static mouseup(count, frameInfo) {
        const elem = frameInfo.getTarget();
        const [ctrl, shift, alt, meta] = Utils.countToModifiers(count);
        emulateMouseEvent(elem, "mouseup", 0, ctrl, alt, shift, meta);
    }
    static mouseinTo(count, frameInfo) {
        const elem = frameInfo.getTarget();
        const doc = elem.ownerDocument;
        const body = doc.body || doc.documentElement;
        const coord = getRandomCoord(elem);
        emulateMouseEvent(
            elem, "mouseover", coord, false, false, false, false, body);
        emulateMouseEvent(elem, "mousemove", coord, false, false, false, false);
    }
    static mouseinFrom(count, frameInfo) {
        const elem = frameInfo.getTarget();
        const doc = elem.ownerDocument;
        const body = doc.body || doc.documentElement;
        const coord = getRandomCoord(body);
        emulateMouseEvent(
            body, "mouseover", coord, false, false, false, false, elem);
        emulateMouseEvent(elem, "mousemove", coord, false, false, false, false);
    }
    static mouseoutTo(count, frameInfo) {
        const elem = frameInfo.getTarget();
        const doc = elem.ownerDocument;
        const body = doc.body || doc.documentElement;
        const coord = getRandomCoord(elem);
        emulateMouseEvent(
            body, "mouseout", coord, false, false, false, false, elem);
        emulateMouseEvent(elem, "mousemove", coord, false, false, false, false);
    }
    static mouseoutFrom(count, frameInfo) {
        const elem = frameInfo.getTarget();
        const doc = elem.ownerDocument;
        const body = doc.body || doc.documentElement;
        const coord = getRandomCoord(body);
        emulateMouseEvent(
            elem, "mouseout", coord, false, false, false, false, body);
        emulateMouseEvent(elem, "mousemove", coord, false, false, false, false);
    }
    static mousemove(count, frameInfo) {
        const elem = frameInfo.getTarget();
        count = Math.max(count, 1);
        const timerId = setInterval(() => {
            emulateMouseEvent(elem, "mousemove", 0, false, false, false, false);
            if (--count === 0) {
                clearInterval(timerId);
            }
        }, 1000);
    }

    /**
     * Commands for select element manipulation
     **/
    static selectNextOption(count, frameInfo) {
        const select = frameInfo.getTarget();
        if (!(select instanceof HTMLSelectElement)) {
            return;
        }
        count = Math.max(count, 1);
        const index = (select.selectedIndex + count) % select.length;
        select.selectedIndex = index;
    }
    static selectPreviousOption(count, frameInfo) {
        const select = frameInfo.getTarget();
        if (!(select instanceof HTMLSelectElement)) {
            return;
        }
        const length = select.length;
        count = Math.max(count, 1) % length;
        const index = (select.selectedIndex - count + length) % length;
        select.selectedIndex = index;
    }
    static toggleSelectOption(count, frameInfo) {
        const select = frameInfo.getTarget();
        if (!(select instanceof HTMLSelectElement)) {
            return;
        }
        const options = Array.from(select.options).filter((o) => !o.disabled);
        if (options.length === 0) {
            return;
        }
        const index = Math.min(count, options.length - 1);
        options[index].selected = !options[index].selected;
    }

    /**
     * Commands for text edit
     **/
    static deleteCharBackward(count, frameInfo) {
        _editElement(frameInfo, (elem) => DomUtils.deleteCharBackward(elem));
    }
    static deleteWordBackward(count, frameInfo) {
        _editElement(frameInfo, (elem) => DomUtils.deleteWordBackward(elem));
    }
    static deleteToBeginningOfLine(count, frameInfo) {
        _editElement(
            frameInfo, (elem) => DomUtils.deleteToBeginningOfLine(elem));
    }
    static deleteToEndOfLine(count, frameInfo) {
        _editElement(frameInfo, (elem) => DomUtils.deleteToEndOfLine(elem));
    }
    static charNext(count, frameInfo) {
        DomUtils.charNext(frameInfo.getTarget());
    }
    static charPrevious(count, frameInfo) {
        DomUtils.charPrevious(frameInfo.getTarget());
    }
    static beginLine(count, frameInfo) {
        DomUtils.beginLine(frameInfo.getTarget());
    }
    static endLine(count, frameInfo) {
        DomUtils.endLine(frameInfo.getTarget());
    }
    static nextLine(count, frameInfo) {
        DomUtils.nextLine(frameInfo.getTarget());
    }
    static previousLine(count, frameInfo) {
        DomUtils.previousLine(frameInfo.getTarget());
    }
    static undo(count, frameInfo) {
        const elem = frameInfo.getTarget();
        if (!elem.undoStack || elem.undoStack.length === 0) {
            return;
        }
        elem.setRangeText(elem.undoStack.pop(), 0, elem.value.length, "end");
    }
    static yankValue(count, frameInfo) {
        const elem = frameInfo.getTarget();
        if (DomUtils.setToClipboard(elem.value)) {
            frameInfo.showMessage("Yank current target value");
        }
    }
    static pasteValue(count, frameInfo) {
        _editElement(frameInfo, (elem) => {
            // Reserve selection range because getFromClipboard can modify that.
            const start = elem.selectionStart;
            const end = elem.selectionEnd;
            const value = DomUtils.getFromClipboard();
            if (value === "") {
                return false;
            }
            elem.setRangeText(value, start, end, "end");
            return true;
        });
    }

    /**
     * Commands for selection manipulation
     **/
    static clearSelection(count, frameInfo) {
        const selection = window.getSelection();
        if (!selection) {
            return;
        }
        selection.removeAllRanges();
    }
    static yankSelection(count, frameInfo) {
        const selection = window.getSelection();
        if (!selection) {
            return;
        }
        if (DomUtils.setToClipboard(selection.toString())) {
            frameInfo.showMessage("Yank current selection text");
        }
    }
    static deleteSelection(count, frameInfo) {
        const selection = window.getSelection();
        if (!selection) {
            return;
        }
        selection.deleteFromDocument();
    }
    static reverseSelectionEndpoints(count, frameInfo) {
        const selection = window.getSelection();
        if (!selection || selection.isCollapsed) {
            return;
        }
        const anchorNode = selection.anchorNode;
        const anchorOffset = selection.anchorOffset;
        const focusNode = selection.focusNode;
        const focusOffset = selection.focusOffset;
        selection.setBaseAndExtent(
            focusNode, focusOffset, anchorNode, anchorOffset);
    }

    /**
     * Commands for element manipulation
     **/
    static selectElement(count, frameInfo) {
        const selection = window.getSelection();
        if (!selection) {
            return;
        }
        const target = frameInfo.getTarget();
        const parent = target.parentNode;
        const index = Array.from(parent.childNodes).indexOf(target);
        selection.removeAllRanges();
        selection.setBaseAndExtent(parent, index, parent, index + 1);
    }
    static yankInnerText(count, frameInfo) {
        if (DomUtils.setToClipboard(frameInfo.getTarget().innerText)) {
            frameInfo.showMessage("Yank current target innerText");
        }
    }
    static yankInnerHTML(count, frameInfo) {
        if (DomUtils.setToClipboard(frameInfo.getTarget().innerHTML)) {
            frameInfo.showMessage("Yank current target innerHTML");
        }
    }
    static yankOuterHTML(count, frameInfo) {
        if (DomUtils.setToClipboard(frameInfo.getTarget().outerHTML)) {
            frameInfo.showMessage("Yank current target outerHTML");
        }
    }
    static deleteElement(count, frameInfo) {
        const target = frameInfo.getTarget();
        target.parentNode.removeChild(target);
    }

    /**
     * Commands for various applications
     **/
    static smartOpen(count, frameInfo) {
        smartOpenImpl(count, frameInfo, { command: 'openLink' });
    }
    static smartOpenInTab(count, frameInfo) {
        const [ctrl, shift, alt, meta] = Utils.countToModifiers(count);
        smartOpenImpl(
            count, frameInfo, { command: 'openLinkInTab', active: !shift });
    }
    static yankCurrentURL(count, frameInfo) {
        if (DomUtils.setToClipboard(location.href)) {
            frameInfo.showMessage("Yank current page URL");
        }
    }
    static yankPageHost(count, frameInfo) {
        if (DomUtils.setToClipboard(location.host)) {
            frameInfo.showMessage("Yank current page host");
        }
    }
    static yankPageTitle(count, frameInfo) {
        if (DomUtils.setToClipboard(document.title)) {
            frameInfo.showMessage("Yank current page title");
        }
    }
    static repeatLastCommand(count, frameInfo) {
        frameInfo.sendMessage({ command: "getLastCommand" })
            .then(([cmdName, lastCount]) => {
                if (cmdName === undefined) {
                    return;
                }
                invokeCommand(
                    cmdName, count !== 0 ? count : lastCount, frameInfo);
            });
    }
    static showLastMessage(count, frameInfo) {
        frameInfo.showLastMessage();
    }
    static ignore(count, frameInfo) {
        return true;
    }

    /**
     * Commands for mode changing
     */
    static toNormalMode(count, frameInfo) {
        frameInfo.changeMode("NORMAL");
    }
    static toInsertMode(count, frameInfo) {
        const target = frameInfo.getTarget();
        if (!DomUtils.isEditable(target)) {
            return FrontendCommand.toInsertModeOnFirstElement(count, frameInfo);
        }
        frameInfo.changeMode("INSERT", { editableElement: target });
    }
    static toInsertModeOnFirstElement(count, frameInfo) {
        const inputs = DomUtils.getInputList(document);
        if (inputs.length === 0) {
            return;
        }
        const target = inputs[Math.min(count, inputs.length - 1)];
        frameInfo.changeMode("INSERT", { editableElement: target });
    }
    static toInsertModeOnLastElement(count, frameInfo) {
        return FrontendCommand.toInsertModeOnFirstElement(100000, frameInfo);
    }
    static toInsertModeOnPreviousInput(count, frameInfo) {
        const inputs = DomUtils.getInputList(document);
        const index = inputs.indexOf(frameInfo.getTarget());
        if (index === -1) return;
        frameInfo.changeMode("INSERT", {
            editableElement: inputs[(index - 1 + inputs.length) % inputs.length]
        });
    }
    static toInsertModeOnNextInput(count, frameInfo) {
        const inputs = DomUtils.getInputList(document);
        const index = inputs.indexOf(frameInfo.getTarget());
        if (index === -1) return;
        frameInfo.changeMode("INSERT", {
            editableElement: inputs[(index + 1) % inputs.length]
        });
    }
    static toHintMode(count, frameInfo) {
        // TODO: slot 3, 4
        const TYPE_LIST = ["link", "focus", "media", "link", "link"];
        const type = TYPE_LIST[count % TYPE_LIST.length];
        frameInfo.postMessage({ command: "toHintMode", type });
    }
    static toHintFocusMode(count, frameInfo) {
        FrontendCommand.toHintMode(1, frameInfo);
    }
    static toHintMediaMode(count, frameInfo) {
        FrontendCommand.toHintMode(2, frameInfo);
    }
    static toVisualMode(count, frameInfo) {
        frameInfo.changeMode("VISUAL");
    }
    static toCaretMode(selection, frameInfo) {
        frameInfo.changeMode("CARET");
    }
    static toExMode(count, frameInfo, defaultCommand="") {
        frameInfo.changeMode(
            "CONSOLE", { mode: "exec", defaultCommand: defaultCommand });
    }
    static toExModeOpen(count, frameInfo) {
        return FrontendCommand.toExMode(count, frameInfo, "open ");
    }
    static toExModeOpenCurrentURL(count, frameInfo) {
        return FrontendCommand.toExMode(
            count, frameInfo, "open " + location.href);
    }
    static toExModeTabOpen(count, frameInfo) {
        return FrontendCommand.toExMode(count, frameInfo, "tabopen ");
    }
    static toExModeTabOpenCurrentURL(count, frameInfo) {
        return FrontendCommand.toExMode(
            count, frameInfo, "tabopen " + location.href);
    }
    static toExModeBuffer(count, frameInfo) {
        return FrontendCommand.toExMode(count, frameInfo, "buffer ");
    }
    static toSearchMode(count, frameInfo, isBackward=false) {
        frameInfo.changeMode(
            "CONSOLE", { mode: "forwardSearch", defaultCommand: '' });
    }
    static toBackwardSearchMode(count, frameInfo) {
        frameInfo.changeMode(
            "CONSOLE", { mode: "backwardSearch", defaultCommand: '' });
    }
}

function incrementURL(location, count) {
    const url = decodeURIComponent(location.href);
    const match = /^(.*\D)(\d+)(\D*)$/.exec(url);
    if (!match) {
        return;
    }
    const oldNum = match[2];
    const newNum = (parseInt(oldNum, 10) + count).toString();
    const padding = "0".repeat(Math.max(oldNum.length - newNum.length, 0));

    location.href = match[1] + padding + newNum + match[3];
}

function getLink(elem) {
    try {
        if (!elem.href) {
            return undefined;
        }
        const link = elem.href;
        return (link instanceof SVGAnimatedString ? link.animVal : link);
    }
    catch (e) {
        console.warn(`Element ${elem} is likely dead:`, Utils.errorString(e));
    }
    return undefined;
}
function getSource(elem) {
    try {
        const link = (() => {
            if (elem.href) { // anchor, area
                return elem.href;
            }
            if (elem.currentSrc) { // video, audio (prefer currentSrc than src)
                return elem.currentSrc;
            }
            if (elem.src) { // img, embed
                return elem.src;
            }
            if (elem.data) { // object
                return elem.data;
            }
            if (elem.toDataURL) { // canvas
                return elem.toDataURL();
            }
        })();
        return (link instanceof SVGAnimatedString ? link.animVal : link);
    }
    catch (e) {
        console.warn(`Element ${elem} is likely dead:`, Utils.errorString(e));
    }
    return undefined;
}

function smartOpenImpl(count, frameInfo, openLinkMsg) {
    const elem = frameInfo.getTarget();
    const link = getLink(elem);
    if (link) {
        try {
            const url = new URL(link);
            const loc = location;
            // In the case the only hash is difference, use mouseclick emulation
            // because the target is likely to have some event listners.
            if ((url.host !== loc.host || url.pathname !== loc.pathname
                || url.search !== loc.search)
                && url.protocol !== "javascript:") {
                openLinkMsg.url = link;
                frameInfo.postMessage(openLinkMsg);
                return;
            }
        }
        catch (e) {
            // ignore
        }
    }
    if (elem instanceof HTMLInputElement) {
        const type = elem.type;
        if (type === "checkbox" || type === "radio" || type === "file") {
            FrontendCommand.mouseclick(count, frameInfo);
        }
        else {
            FrontendCommand.pressEnter(count, frameInfo);
        }
        if (type !== "button" && type !== "image" &&
            type !== "reset" && type !== "submit") {
            elem.dispatchEvent(
                new Event("change", { bubbles: true, cancelable: false }));
        }
        return;
    }
    if (elem instanceof HTMLSelectElement ||
        elem instanceof HTMLTextAreaElement) {
        FrontendCommand.pressEnter(count, frameInfo);
        elem.dispatchEvent(
            new Event("change", { bubbles: true, cancelable: false }));
        return;
    }
    return FrontendCommand.mouseclick(count, frameInfo);
}

function emulateClick(target, ctrl, alt, shift, meta) {
    if (!ctrl && target.target) {
        target.target = "_top";
    }
    emulateMouseEvent(target, "click", 0, ctrl, alt, shift, meta);
}

function emulateMouseEvent(
    target, type, coord,
    ctrl=false, alt=false, shift=false, meta=false, related=null) {
    if (coord === 0) {
        coord = getRandomCoord(target);
    }
    if (coord === 1) {
        coord = getRandomCoord(related);
    }
    const x = coord[0];
    const y = coord[1];
    const mouseEvent = new MouseEvent(type, {
        bubbles: true,
        cancelable: true,
        screenX: x + (window.mozInnerScreenX || window.screenX),
        screenY: y + (window.mozInnerScreenY || window.screenY),
        clientX: x,
        clientY: y,
        ctrlKey: ctrl,
        shiftKey: shift,
        altKey: alt,
        metaKey: meta,
        button: 0,
        relatedTarget: related
    });
    target.dispatchEvent(mouseEvent);
}

function getRandomCoord(elem) {
    const rect = elem.getBoundingClientRect();
    const x = Math.random() * (rect.right - rect.left + 1) + rect.left;
    const y = Math.random() * (rect.bottom - rect.top + 1) + rect.top;
    return [x, y];
}

function emulateEnter(target, type, ctrl, alt, shift, meta) {
    const keyEvent = new KeyboardEvent(type, {
        bubbles: true,
        cancelable: true,
        key: 'Enter',
        code: 'Enter',
        ctrlKey: ctrl,
        shiftKey: shift,
        altKey: alt,
        metaKey: meta,
        keyCode: KeyboardEvent.DOM_VK_RETURN
    });
    target.dispatchEvent(keyEvent);
}

function _editElement(frameInfo, editFunc) {
    const elem = frameInfo.getTarget();
    const prevValue = elem.value;
    if (editFunc(elem)) {
        if (!elem.undoStack) {
            elem.undoStack = [];
        }
        elem.undoStack.push(prevValue);
    }
}

function invokeCommand(cmdName, count, frameInfo) {
    const cmdDesc = COMMAND_DESCRIPTIONS[cmdName];
    let isIgnore;
    if (cmdDesc.background) {
        frameInfo.postMessage({ command: cmdName, count: count });
        isIgnore = false;
    }
    else if (cmdDesc.topFrame && !frameInfo.isTopFrame()) {
        frameInfo.postMessage({
            command: 'forwardCommand', frameId: 0,
            data: { command: cmdName, count: count }
        });
        isIgnore = false;
    }
    else {
        isIgnore = FrontendCommand[cmdName](count, frameInfo);
    }
    frameInfo.postMessage({ command: "setLastCommand", cmdName, count });
    return isIgnore;
}

function focusNextKeywordLink(keywords, count, target) {
    keywords = keywords.map((key) => key.toLowerCase());
    const linkList = Array.prototype.filter.call(
        document.getElementsByTagName("a"), (link) => {
            return (link.getClientRects().length !== 0
                && keywords.some(
                    (k) => link.innerText.toLowerCase().includes(k)));
        });
    if (linkList.length === 0) {
        return;
    }
    const positionBit = Node.DOCUMENT_POSITION_PRECEDING;
    const index = linkList.findIndex(
        (link) => (link.compareDocumentPosition(target) & positionBit));
    linkList[(Math.max(index - 1, -1) + count) % linkList.length].focus();
}

function isNonFocusableAnchor(node) {
    // Anchor elements without href can not be focused.
    return (node instanceof HTMLAnchorElement &&
        !node.hasAttribute("href") &&
        !node.hasAttribute("tabindex"));
}
function createFocusNodeWalker(currentNode) {
    const acceptNode = (node) => {
        const rect = node.getBoundingClientRect();
        if (rect.width === 0 && rect.height === 0) {
            return NodeFilter.FILTER_REJECT;
        }
        if (rect.width === 0 || rect.height === 0) {
            return NodeFilter.FILTER_SKIP;
        }
        const style = window.getComputedStyle(node, null);
        if (style.visibility === "hidden") {
            return NodeFilter.FILTER_SKIP;
        }
        if ((node.tabIndex !== -1 && !isNonFocusableAnchor(node)) ||
            Scroll.isScrollable(node, style)) {
            return NodeFilter.FILTER_ACCEPT;
        }
        else {
            return NodeFilter.FILTER_SKIP;
        }
    };
    const walker = document.createTreeWalker(
        document.documentElement, NodeFilter.SHOW_ELEMENT, { acceptNode });
    walker.currentNode = currentNode;
    return walker;
}

function getLastNode(walker) {
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

