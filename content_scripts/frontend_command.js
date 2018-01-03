'use strict';

class FrontendCommand {
    /**
     * Commands for scrolling
     */
    static scrollTop(count, frameInfo) {
        const baseElem = getScrollBaseElement(frameInfo.getTarget());
        const elem = Scroll.getVerticalScrollableElem(baseElem);
        if (elem) {
            elem.scrollTop = 0;
            return;
        }
        if (window.scrollMaxY === 0 && !frameInfo.isTopFrame()) {
            frameInfo.forwardToParent({ command: "scrollTop", count });
        }
        else {
            window.scrollTo(window.scrollX, 0);
        }
    }
    static scrollBottom(count, frameInfo) {
        const baseElem = getScrollBaseElement(frameInfo.getTarget());
        const elem = Scroll.getVerticalScrollableElem(baseElem);
        if (elem) {
            elem.scrollTop = elem.scrollTopMax;
            return;
        }
        if (window.scrollMaxY === 0 && !frameInfo.isTopFrame()) {
            frameInfo.forwardToParent({ command: "scrollBottom", count });
        }
        else {
            window.scrollTo(window.scrollX, window.scrollMaxY);
        }
    }
    static scrollUp(count, frameInfo) {
        const baseElem = getScrollBaseElement(frameInfo.getTarget());
        const elem = Scroll.getVerticalScrollableElem(baseElem);
        if (elem) {
            elem.scrollTop -= Math.max(count, 20);
            return;
        }
        if (window.scrollMaxY === 0 && !frameInfo.isTopFrame()) {
            frameInfo.forwardToParent({ command: "scrollUp", count });
        }
        else {
            window.scrollByLines(Math.max(count, 4) * -1);
        }
    }
    static scrollDown(count, frameInfo) {
        const baseElem = getScrollBaseElement(frameInfo.getTarget());
        const elem = Scroll.getVerticalScrollableElem(baseElem);
        if (elem) {
            elem.scrollTop += Math.max(count, 20);
            return;
        }
        if (window.scrollMaxY === 0 && !frameInfo.isTopFrame()) {
            frameInfo.forwardToParent({ command: "scrollDown", count });
        }
        else {
            window.scrollByLines(Math.max(count, 4) * 1);
        }
    }
    static scrollLineUp(count, frameInfo) {
        window.scrollByLines(Math.max(count, 1) * -1);
    }
    static scrollLineDown(count, frameInfo) {
        window.scrollByLines(Math.max(count, 1) * 1);
    }
    static moveHalfPageUp(count, frameInfo) {
        const baseElem = getScrollBaseElement(frameInfo.getTarget());
        const elem = Scroll.getVerticalScrollableElem(baseElem);
        if (elem) {
            elem.scrollTop -= Math.max(count, 1) * elem.clientHeight / 2;
            return;
        }
        if (window.scrollMaxY === 0 && !frameInfo.isTopFrame()) {
            frameInfo.forwardToParent({ command: "moveHalfPageUp", count });
        }
        else {
            window.scrollBy(0, Math.max(count, 1) * -window.innerHeight / 2);
        }
    }
    static moveHalfPageDown(count, frameInfo) {
        const baseElem = getScrollBaseElement(frameInfo.getTarget());
        const elem = Scroll.getVerticalScrollableElem(baseElem);
        if (elem) {
            elem.scrollTop += Math.max(count, 1) * elem.clientHeight / 2;
            return;
        }
        if (window.scrollMaxY === 0 && !frameInfo.isTopFrame()) {
            frameInfo.forwardToParent({ command: "moveHalfPageDown", count });
        }
        else {
            window.scrollBy(0, Math.max(count, 1) * window.innerHeight / 2);
        }
    }
    static movePageUp(count, frameInfo) {
        const baseElem = getScrollBaseElement(frameInfo.getTarget());
        const elem = Scroll.getVerticalScrollableElem(baseElem);
        if (elem) {
            elem.scrollTop -= Math.max(count, 1) * elem.clientHeight;
            return;
        }
        if (window.scrollMaxY === 0 && !frameInfo.isTopFrame()) {
            frameInfo.forwardToParent({ command: "movePageUp", count });
        }
        else {
            window.scrollByPages(Math.max(count, 1) * -1);
        }
    }
    static movePageDown(count, frameInfo) {
        const baseElem = getScrollBaseElement(frameInfo.getTarget());
        const elem = Scroll.getVerticalScrollableElem(baseElem);
        if (elem) {
            elem.scrollTop += Math.max(count, 1) * elem.clientHeight;
            return;
        }
        if (window.scrollMaxY === 0 && !frameInfo.isTopFrame()) {
            frameInfo.forwardToParent({ command: "movePageDown", count });
        }
        else {
            window.scrollByPages(Math.max(count, 1) * 1);
        }
    }
    static scrollVerticalMiddle(count, frameInfo) {
        const baseElem = getScrollBaseElement(frameInfo.getTarget());
        const elem = Scroll.getVerticalScrollableElem(baseElem);
        if (elem) {
            elem.scrollTop = elem.scrollTopMax / 2;
            return;
        }
        if (window.scrollMaxY === 0 && !frameInfo.isTopFrame()) {
            frameInfo.forwardToParent(
                { command: "scrollVerticalMiddle", count });
        }
        else {
            window.scrollTo(window.scrollX, window.scrollMaxY / 2);
        }
    }
    static scrollLeft(count, frameInfo) {
        const baseElem = getScrollBaseElement(frameInfo.getTarget());
        const elem = Scroll.getHorizontalScrollableElem(baseElem);
        if (elem) {
            elem.scrollLeft -= Math.max(count, 20);
            return;
        }
        if (window.scrollMaxX === 0 && !frameInfo.isTopFrame()) {
            frameInfo.forwardToParent({ command: "scrollLeft", count });
        }
        else {
            window.scrollBy(-20, 0);
        }
    }
    static scrollRight(count, frameInfo) {
        const baseElem = getScrollBaseElement(frameInfo.getTarget());
        const elem = Scroll.getHorizontalScrollableElem(baseElem);
        if (elem) {
            elem.scrollLeft += Math.max(count, 20);
            return;
        }
        if (window.scrollMaxX === 0 && !frameInfo.isTopFrame()) {
            frameInfo.forwardToParent({ command: "scrollRight", count });
        }
        else {
            window.scrollBy(20, 0);
        }
    }
    static scrollHome(count, frameInfo) {
        const baseElem = getScrollBaseElement(frameInfo.getTarget());
        const elem = Scroll.getHorizontalScrollableElem(baseElem);
        if (elem) {
            elem.scrollLeft = 0;
            return;
        }
        if (window.scrollMaxX === 0 && !frameInfo.isTopFrame()) {
            frameInfo.forwardToParent({ command: "scrollHome", count });
        }
        else {
            window.scrollTo(0, window.scrollY);
        }
    }
    static scrollEnd(count, frameInfo) {
        const baseElem = getScrollBaseElement(frameInfo.getTarget());
        const elem = Scroll.getHorizontalScrollableElem(baseElem);
        if (elem) {
            elem.scrollLeft = elem.scrollLeftMax;
            return;
        }
        if (window.scrollMaxX === 0 && !frameInfo.isTopFrame()) {
            frameInfo.forwardToParent({ command: "scrollEnd", count });
        }
        else {
            window.scrollTo(window.scrollMaxX, window.scrollY);
        }
    }
    static scrollHorizontalMiddle(count, frameInfo) {
        const baseElem = getScrollBaseElement(frameInfo.getTarget());
        const elem = Scroll.getHorizontalScrollableElem(baseElem);
        if (elem) {
            elem.scrollLeft = elem.scrollLeftMax / 2;
            return;
        }
        if (window.scrollMaxX === 0 && !frameInfo.isTopFrame()) {
            frameInfo.forwardToParent(
                { command: "scrollHorizontalMiddle", count });
        }
        else {
            window.scrollTo(window.scrollMaxX / 2, window.scrollY);
        }
    }
    static scrollPercent(count, frameInfo) {
        if (count === 0) {
            return;
        }
        window.scrollTo(window.scrollX, window.scrollMaxY * count / 100);
    }
    static moveTargetAtTop(count, frameInfo) {
        const elem = getScrollBaseElement(frameInfo.getTarget());
        elem.scrollIntoView(true);
    }
    static moveTargetAtCenter(count, frameInfo) {
        const elem = getScrollBaseElement(frameInfo.getTarget());
        const rect = elem.getBoundingClientRect();
        // (bottom + top) / 2 - height / 2
        window.scrollBy(0, (rect.bottom + rect.top - window.innerHeight) / 2);
    }
    static moveTargetAtBottom(count, frameInfo) {
        const elem = getScrollBaseElement(frameInfo.getTarget());
        elem.scrollIntoView(false);
    }

    /**
     * Commands for focus manipulation
     */
    static focusTopFrame(count, frameInfo) {
        const activeElement = document.activeElement;
        if (activeElement && activeElement.contentWindow) {
            // This blur is not necessary in order to focus documentElement,
            // but is necessary to show a border line of a focus element.
            activeElement.blur();
        }
        // Suppress scroll when an html element has height 100%.
        DomUtils.fixedFocus(document.documentElement);
    }
    static focusin(count, frameInfo, args) {
        _focusin(frameInfo, args, (elem) => elem.focus());
    }
    static fixedFocusin(count, frameInfo, args) {
        _focusin(frameInfo, args, DomUtils.fixedFocus);
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
    static focusNext(count, frameInfo, args) {
        focusNext(count, frameInfo, args, "focusNext");
    }
    static focusPrevious(count, frameInfo, args) {
        focusPrevious(count, frameInfo, args, "focusPrevious");
    }
    static focusNextAndChangeMode(count, frameInfo, args) {
        const elem =
            focusNext(count, frameInfo, args, "focusNextAndChangeMode");
        if (elem && DomUtils.isEditable(elem)) {
            frameInfo.changeMode("INSERT", { editableElement: elem });
        }
        else {
            frameInfo.changeMode("NORMAL");
        }
    }
    static focusPreviousAndChangeMode(count, frameInfo, args) {
        const elem =
            focusPrevious(count, frameInfo, args, "focusPreviousAndChangeMode");
        if (elem && DomUtils.isEditable(elem)) {
            frameInfo.changeMode("INSERT", { editableElement: elem });
        }
        else {
            frameInfo.changeMode("NORMAL");
        }
    }
    static resetFocus(count, frameInfo) {
        // Suppress scroll when an html element has height 100%.
        DomUtils.fixedFocus(document.documentElement);
    }

    /**
     * Commands for search
     **/
    static findSelectionForward(count, frameInfo) {
        const selection = window.getSelection();
        if (!selection || selection.isCollapsed) {
            return;
        }
        frameInfo.postMessage({
            command: "find", keyword: selection.toString(), backward: false,
            frameId: frameInfo.getSelfFrameId()
        });
    }
    static findSelectionBackward(count, frameInfo) {
        const selection = window.getSelection();
        if (!selection || selection.isCollapsed) {
            return;
        }
        frameInfo.postMessage({
            command: "find", keyword: selection.toString(), backward: true,
            frameId: frameInfo.getSelfFrameId()
        });
    }
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
        const video = _getVideoElement();
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
        const video = _getVideoElement();
        if (!video) {
            return;
        }
        video.volume = Math.min(video.volume + Math.max(1, count) / 100, 1.0);
    }
    static volumeDown(count, frameInfo) {
        const video = _getVideoElement();
        if (!video) {
            return;
        }
        video.volume = Math.max(video.volume - Math.max(1, count) / 100, 0.0);
    }
    static seekForward(count, frameInfo) {
        const video = _getVideoElement();
        if (!video) {
            return;
        }
        if (count === 0) {
            count = 5;
        }
        video.currentTime = Math.min(video.currentTime + count, video.duration);
    }
    static seekBack(count, frameInfo) {
        const video = _getVideoElement();
        if (!video) {
            return;
        }
        if (count === 0) {
            count = 5;
        }
        video.currentTime = Math.max(video.currentTime - count, 0);
    }
    static speedFaster(count, frameInfo) {
        const video = _getVideoElement();
        if (!video) {
            return;
        }
        video.playbackRate += Math.max(1, count) / 100;
    }
    static speedSlower(count, frameInfo) {
        const video = _getVideoElement();
        if (!video) {
            return;
        }
        video.playbackRate -= Math.max(1, count) / 100;
    }
    static resetSpeed(count, frameInfo) {
        const video = _getVideoElement();
        if (!video) {
            return;
        }
        video.playbackRate = 1;
    }
    static switchLoop(count, frameInfo) {
        const video = _getVideoElement();
        if (!video) {
            return;
        }
        video.loop = !video.loop;
    }
    static switchMute(count, frameInfo) {
        const video = _getVideoElement();
        if (!video) {
            return;
        }
        video.muted = !video.muted;
    }
    static reloadVideo(count, frameInfo) {
        const video = _getVideoElement();
        if (!video) {
            return;
        }
        video.load();
    }
    static showVideoInfo(count, frameInfo) {
        const video = _getVideoElement();
        if (!video) {
            return;
        }

        const formatTime = (time) => {
            let sec = time;
            const hour = Math.floor(sec / 60 / 60);
            sec -= hour * 60 * 60;
            const min = Math.floor(sec / 60);
            sec = Math.floor(sec - min * 60);
            const pad = (num) => ("0" + num.toString()).substr(-2);
            return `${pad(hour)}:${pad(min)}:${pad(sec)}`;
        };
        const buffered = (ranges) => {
            const rangeList = [];
            for (let i = 0; i < ranges.length; ++i) {
                const start = formatTime(ranges.start(i));
                const end = formatTime(ranges.end(i));
                rangeList.push(start + "-" + end);
            }
            return rangeList.join(", ");
        };
        const timeInfo = (time) => {
            const isNaN = Number.isNaN(time);
            return (isNaN ? "--:--:--" : `${formatTime(time)} (${time}s)`);
        };

        const infoList = [];
        infoList.push(`Src: ${video.src}`);
        infoList.push(`CurrentSrc: ${video.currentSrc}`);
        infoList.push(`Size: ${video.videoWidth}x${video.videoHeight}`);
        infoList.push(`Duration: ${timeInfo(video.duration)}`);
        infoList.push(`Buffered: ${buffered(video.buffered)}`);
        infoList.push(`CurrentTime: ${timeInfo(video.currentTime)}`);
        infoList.push(`Volume: ${video.volume}`);
        infoList.push(`Playback rate: ${video.playbackRate}`);
        infoList.push(`Mute: ${video.muted ? "ON" : "OFF"}`);
        infoList.push(`Loop: ${video.loop ? "ON" : "OFF"}`);

        frameInfo.showMessage(
            infoList.join("\n"), (count === 0 ? 3000 : count * 1000));
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
    static showFrameInfo(count, frameInfo) {
        FrontendCommand.showPageInfo(count, frameInfo);
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
        emulateMouseEvent(
            elem, "mouseenter", coord, false, false, false, false, body);
        emulateMouseEvent(elem, "mousemove", coord, false, false, false, false);
    }
    static mouseinFrom(count, frameInfo) {
        const elem = frameInfo.getTarget();
        const doc = elem.ownerDocument;
        const body = doc.body || doc.documentElement;
        const coord = getRandomCoord(body);
        emulateMouseEvent(
            body, "mouseover", coord, false, false, false, false, elem);
        emulateMouseEvent(
            body, "mouseenter", coord, false, false, false, false, elem);
        emulateMouseEvent(elem, "mousemove", coord, false, false, false, false);
    }
    static mouseoutTo(count, frameInfo) {
        const elem = frameInfo.getTarget();
        const doc = elem.ownerDocument;
        const body = doc.body || doc.documentElement;
        const coord = getRandomCoord(elem);
        emulateMouseEvent(
            body, "mouseout", coord, false, false, false, false, elem);
        emulateMouseEvent(
            body, "mouseleave", coord, false, false, false, false, elem);
        emulateMouseEvent(elem, "mousemove", coord, false, false, false, false);
    }
    static mouseoutFrom(count, frameInfo) {
        const elem = frameInfo.getTarget();
        const doc = elem.ownerDocument;
        const body = doc.body || doc.documentElement;
        const coord = getRandomCoord(body);
        emulateMouseEvent(
            elem, "mouseout", coord, false, false, false, false, body);
        emulateMouseEvent(
            elem, "mouseleave", coord, false, false, false, false, body);
        emulateMouseEvent(elem, "mousemove", coord, false, false, false, false);
    }
    static mousemove(count, frameInfo) {
        const elem = frameInfo.getTarget();
        count = Math.max(count, 1);
        const move = () => {
            emulateMouseEvent(elem, "mousemove", 0, false, false, false, false);
            if (--count !== 0) {
                setTimeout(move, 1000);
            }
        };
        move();
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
    static deleteChildElements(count, frameInfo) {
        const target = frameInfo.getTarget();
        for (let i = target.children.length; i > 0; --i) {
            target.removeChild(target.children[i - 1]);
        }
    }

    /**
     * Commands for various applications
     **/
    static showPageInfo(count, frameInfo) {
        const renderMode = (mode) => {
            switch (mode) {
                case "CSS1Compat":
                    return "Standards compliance mode";
                case "BackCompat":
                    return "Quirks mode";
                default:
                    return mode;
            }
        };
        const infoList = [];
        infoList.push("Title: " + document.title);
        infoList.push("Address: " + document.documentURI);
        infoList.push("Type: " + document.contentType);
        infoList.push("Render Mode: " + renderMode(document.compatMode));
        infoList.push("Text Encoding: " + document.characterSet);
        if (document.referrer) {
            infoList.push("Referring URL: " + document.referrer);
        }
        infoList.push("Modified: " + document.lastModified);
        const duration = (count === 0 ? 3000 : count * 1000);
        frameInfo.showMessage(infoList.join("\n"), duration);
    }
    static smartOpen(count, frameInfo) {
        smartOpenImpl(count, frameInfo, { command: 'openLink' });
    }
    static smartOpenInTab(count, frameInfo) {
        const [ctrl, shift, alt, meta] = Utils.countToModifiers(count);
        smartOpenImpl(
            count, frameInfo, { command: 'openLinkInTab', active: !shift });
    }
    static smartYank(count, frameInfo) {
        const elem = frameInfo.getTarget();
        if (elem.value) {
            return FrontendCommand.yankValue(count, frameInfo);
        }
        if (getSource(elem)) {
            return FrontendCommand.yankLink(count, frameInfo);
        }
        return FrontendCommand.yankInnerText(count, frameInfo);
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
    static compose(count, frameInfo, args) {
        args.forEach((command) => {
            invokeCommand(command, count, frameInfo);
        });
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
        frameInfo.showLastMessage(count === 0 ? 3000 : count * 1000);
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
    static toInsertModeIfEditable(count, frameInfo) {
        const target = frameInfo.getTarget();
        if (DomUtils.isEditable(target)) {
            frameInfo.changeMode("INSERT", { editableElement: target });
        }
    }
    static toHintMode(count, frameInfo) {
        // TODO: slot 3, 4
        const TYPE_LIST = ["link", "focus", "media", "code", "link"];
        const type = TYPE_LIST[count % TYPE_LIST.length];
        frameInfo.postMessage({ command: "toHintMode", type });
    }
    static toHintFocusMode(count, frameInfo) {
        FrontendCommand.toHintMode(1, frameInfo);
    }
    static toHintMediaMode(count, frameInfo) {
        FrontendCommand.toHintMode(2, frameInfo);
    }
    static toHintCodeMode(count, frameInfo) {
        FrontendCommand.toHintMode(3, frameInfo);
    }
    static toVisualMode(count, frameInfo) {
        const point = document.caretPositionFromPoint(0, 0);
        if (!point) {
            return;
        }
        const selection = window.getSelection();
        selection.setBaseAndExtent(
            point.offsetNode, point.offset, point.offsetNode, point.offset);
        frameInfo.changeMode("VISUAL");
    }
    static toVisualModeWithCurrentSelection(count, frameInfo) {
        frameInfo.changeMode("VISUAL");
    }
    static toCaretMode(selection, frameInfo) {
        frameInfo.changeMode("CARET");
    }
    static toConsoleMode(count, frameInfo, args) {
        args.push("");
        frameInfo.changeMode(
            "CONSOLE", { mode: "exec", defaultCommand: args.join(" ") });
    }
    static toConsoleModeWithURL(count, frameInfo, args) {
        args.push(location.href);
        frameInfo.changeMode(
            "CONSOLE", { mode: "exec", defaultCommand: args.join(" ") });
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

function getScrollBaseElement(target) {
    if (target !== document.body) {
        return target;
    }
    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0) {
        return target;
    }
    const selectionNode = selection.focusNode;
    if (selectionNode.nodeType === Node.ELEMENT_NODE) {
        return selectionNode;
    }
    else {
        return selectionNode.parentElement;
    }
}

function _getVideoElement() {
    const videoList = Array.prototype.filter.call(
        document.getElementsByTagName("video"), (video) => {
            if (video.currentSrc === "" || !DomUtils.isDisplay(video)) {
                return false;
            }
            const style = window.getComputedStyle(video, null);
            if (style.visibility === "hidden") {
                return false;
            }
            return true;
        });
    return (videoList.length !== 0 ? videoList[0] : null);
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

function nonPrivilegedURL(url) {
    const privilegedProtocols = [
        "chrome:", "javascript:", "data:", "file:", "about:"
    ];
    return !privilegedProtocols.includes(url.protocol);
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
                && nonPrivilegedURL(url)) {
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
        view: window,
        screenX: x + (window.mozInnerScreenX || window.screenX),
        screenY: y + (window.mozInnerScreenY || window.screenY),
        clientX: x,
        clientY: y,
        movementX: 10,
        movementY: 10,
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

function focusNext(count, frameInfo, args, command) {
    return _moveFocus(Math.max(count, 1), frameInfo, args.length > 0, {
        command: command,
        getNode: (walker) => walker.nextNode(),
        getDefaultNode: () => document.documentElement
    });
}
function focusPrevious(count, frameInfo, args, command) {
    return _moveFocus(Math.max(count, 1), frameInfo, args.length > 0, {
        command: command,
        getNode: (walker) => walker.previousNode(),
        getDefaultNode: _getLastNode
    });
}
function _getLastNode() {
    const walker = DomUtils.createFocusNodeWalker(document.documentElement);
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
function _moveFocus(count, frameInfo, isReset, details) {
    let node = frameInfo.getTarget();
    if (isReset) {
        node = details.getDefaultNode();
        if (node.contentWindow) {
            _focusRecursively(node, count, frameInfo, details.command);
            return null;
        }
        --count;
    }
    const walker = DomUtils.createFocusNodeWalker(document.documentElement);
    walker.currentNode = node;
    while (count > 0) {
        let next = details.getNode(walker);
        if (!next) {
            if (!frameInfo.isTopFrame()) {
                _exactlyFocus(node);
                frameInfo.forwardToParent({ command: details.command, count });
                return null;
            }
            next = details.getDefaultNode();
            walker.currentNode = next;
        }
        if (next.contentWindow) {
            _focusRecursively(next, count, frameInfo, details.command);
            return null;
        }
        node = next;
        --count;
    }
    _exactlyFocus(node);
    return node;
}
function _focusRecursively(node, count, frameInfo, command) {
    const activeElement = document.activeElement;
    if (activeElement) {
        activeElement.blur();
    }
    const childWindow = node.contentWindow;
    command = command + "|reset";
    if (!frameInfo.forwardToChildWindow(childWindow, { command, count })) {
        setTimeout(() => node.focus(), 0);
    }
}
function _exactlyFocus(node) {
    const activeElement = document.activeElement;
    if (activeElement && activeElement.contentWindow) {
        activeElement.blur();
    }
    node.focus();
}

function _focusin(frameInfo, args, focusElement) {
    const elem = frameInfo.getTarget();
    try {
        const activeElement = document.activeElement;
        if (activeElement && activeElement.contentWindow) {
            activeElement.blur();
        }
        focusElement(elem);
        frameInfo.focusThisFrame();
    }
    catch (e) {
        console.warn(
            `Element ${elem} is likely dead:`, Utils.errorString(e));
    }
}

function invokeCommand(cmdName, count, frameInfo) {
    const cmdAndArgs = cmdName.split("|");
    const cmdDesc = COMMAND_DESCRIPTIONS[cmdAndArgs[0]];
    let isIgnore;
    if (cmdDesc.background) {
        frameInfo.postMessage({ command: cmdName, count: count });
        isIgnore = false;
    }
    else if (cmdDesc.topFrame && !frameInfo.isTopFrame()) {
        frameInfo.forwardToFrame(0, { command: cmdName, count: count });
        isIgnore = false;
    }
    else {
        const command = cmdAndArgs.shift();
        isIgnore = FrontendCommand[command](count, frameInfo, cmdAndArgs);
    }
    frameInfo.postMessage({ command: "setLastCommand", cmdName, count });
    return isIgnore;
}

function focusNextKeywordLink(keywords, count, target) {
    keywords = keywords.map((key) => key.toLowerCase());
    const getText = (elem) => {
        if (elem.innerText) {
            return elem.innerText;
        }
        const img = elem.querySelector(":scope img");
        if (img) {
            return img.alt;
        }
        return "";
    };
    const pageHostname = location.hostname;
    const linkList = Array.prototype.filter.call(
        document.querySelectorAll("a[href]"), (link) => {
            return (link.getClientRects().length !== 0
                && window.getComputedStyle(link, null).visibility !== "hidden"
                && (link.protocol === "javascript:" ||
                    link.hostname === pageHostname)
                && keywords.some(
                    (k) => getText(link).toLowerCase().includes(k)));
        });
    if (linkList.length === 0) {
        return;
    }
    const positionBit = Node.DOCUMENT_POSITION_PRECEDING;
    const index = linkList.findIndex(
        (link) => (link.compareDocumentPosition(target) & positionBit));
    linkList[(Math.max(index - 1, -1) + count) % linkList.length].focus();
}

