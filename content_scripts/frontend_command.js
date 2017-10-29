class FrontendCommand {
    /**
     * Commands for scrolling
     */
    static scrollTop(count, mode) {
        window.scrollTo(window.scrollX, 0);
    }
    static scrollBottom(count, mode) {
        window.scrollTo(window.scrollX, window.scrollMaxY);
    }
    static scrollUp(count, mode) {
        const elem = Scroll.getVerticalScrollableElem(mode.getElement());
        if (elem && elem.scrollTop !== 0) {
            elem.scrollTop -= Math.max(count, 20);
            return;
        }
        window.scrollByLines(Math.max(count, 4) * -1);
    }
    static scrollDown(count, mode) {
        const elem = Scroll.getVerticalScrollableElem(mode.getElement());
        if (elem && elem.clientHeight !== elem.scrollHeight - elem.scrollTop) {
            elem.scrollTop += Math.max(count, 20);
            return;
        }
        window.scrollByLines(Math.max(count, 4) * 1);
    }
    static scrollLineUp(count, mode) {
        window.scrollByLines(Math.max(count, 1) * -1);
    }
    static scrollLineDown(count, mode) {
        window.scrollByLines(Math.max(count, 1) * 1);
    }
    static moveHalfPageUp(count, mode) {
        const elem = Scroll.getVerticalScrollableElem(mode.getElement());
        if (elem && elem.scrollTop !== 0) {
            elem.scrollTop -= Math.max(count, 1) * elem.clientHeight / 2;
            return;
        }
        window.scrollBy(0, Math.max(count, 1) * -window.innerHeight / 2);
    }
    static moveHalfPageDown(count, mode) {
        const elem = Scroll.getVerticalScrollableElem(mode.getElement());
        if (elem && elem.clientHeight !== elem.scrollHeight - elem.scrollTop) {
            elem.scrollTop += Math.max(count, 1) * elem.clientHeight / 2;
            return;
        }
        window.scrollBy(0, Math.max(count, 1) * window.innerHeight / 2);
    }
    static movePageUp(count, mode) {
        const elem = Scroll.getVerticalScrollableElem(mode.getElement());
        if (elem && elem.scrollTop !== 0) {
            elem.scrollTop -= Math.max(count, 1) * elem.clientHeight;
            return;
        }
        window.scrollByPages(Math.max(count, 1) * -1);
    }
    static movePageDown(count, mode) {
        const elem = Scroll.getVerticalScrollableElem(mode.getElement());
        if (elem && elem.clientHeight !== elem.scrollHeight - elem.scrollTop) {
            elem.scrollTop += Math.max(count, 1) * elem.clientHeight;
            return;
        }
        window.scrollByPages(Math.max(count, 1) * 1);
    }
    static scrollLeft(count, mode) {
        const elem = Scroll.getHorizontalScrollableElem(mode.getElement());
        if (elem && elem.scrollLeft !== 0) {
            elem.scrollLeft -= Math.max(count, 20);
            return;
        }
        window.scrollBy(-20, 0);
    }
    static scrollRight(count, mode) {
        const elem = Scroll.getHorizontalScrollableElem(mode.getElement());
        if (elem && elem.clientWidth !== elem.scrollWidth - elem.scrollLeft) {
            elem.scrollLeft += Math.max(count, 20);
            return;
        }
        window.scrollBy(20, 0);
    }
    static scrollHome(count, mode) {
        const elem = Scroll.getHorizontalScrollableElem(mode.getElement());
        if (elem && elem.scrollLeft !== 0) {
            elem.scrollLeft = 0;
            return;
        }
        window.scrollTo(0, window.scrollY);
    }
    static scrollEnd(count, mode) {
        const elem = Scroll.getHorizontalScrollableElem(mode.getElement());
        if (elem && elem.clientWidth !== elem.scrollWidth - elem.scrollLeft) {
            elem.scrollLeft = elem.scrollWidth;
            return;
        }
        window.scrollTo(window.scrollMaxX, window.scrollY);
    }
    static scrollPercent(count, mode) {
        if (count === 0) {
            return;
        }
        window.scrollTo(window.scrollX, window.scrollMaxY * count / 100);
    }
    static scrollMiddle(count, mode) {
        FrontendCommand.scrollPercent(50);
    }

    /**
     * Commands for focus manipulation
     */
    static focusTopFrame() {
        const a = document.createElement("a");
        a.style.position = "absolute";
        a.style.top = window.scrollY + "px";
        a.style.left = window.scrollX + "px";
        a.href = "";
        const target = document.documentElement;
        target.appendChild(a);
        a.focus();
        a.blur();
        target.removeChild(a);
    }
    static focusin(count, mode) {
        const elem = mode.getElement();
        try {
            elem.focus();
        }
        catch (e) {
            console.warn(`Element ${elem} is likely dead:`, e);
        }
    }
    static focusout(count, mode) {
        const elem = mode.getElement();
        try {
            elem.blur();
        }
        catch (e) {
            console.warn(`Element ${elem} is likely dead:`, e);
        }
    }

    /**
     * Commands for search
     **/
    static findNextPage(count) {
        const NEXT_KEYWORDS = [
            "次のページ", "次へ", "次ページ", "NEXT", ">>", "»"
        ];
        for (let key of NEXT_KEYWORDS) {
            if (window.find(key, false, false, true, true)) break;
            if (window.find(key, false, true, true, true)) break;
        }
    }
    static findPreviousPage(count) {
        const PREVIOUS_KEYWORDS = [
            "前のページ", "前へ", "前ページ", "PREV", "<<", "«"
        ];
        for (let key of PREVIOUS_KEYWORDS) {
            if (window.find(key, false, false, true, true)) break;
            if (window.find(key, false, true, true, true)) break;
        }
    }

    /**
     * Commands for page load manipulation
     */
    static stopLoad(count) {
        window.stop();
    }

    /**
     * Commands for page history
     */
    static back(count) {
        // TODO
        history.go(-Math.min(Math.max(count, 1), history.length - 1));
    }
    static forward(count) {
        // TODO
        history.go(Math.min(Math.max(count, 1), history.length - 1));
    }

    /**
     * Commands for URL edit
     */
    static incrementURL(count) {
        incrementURL(location, Math.max(count, 1));
    }
    static decrementURL(count) {
        incrementURL(location, -Math.max(count, 1));
    }
    static goToParent(count) {
        const path = location.pathname;
        if (path === "/") {
            return;
        }
        const pathList = path.split("/");
        pathList.length -= Math.max(1, Math.min(count, pathList.length));
        location.href = location.origin + pathList.join("/");
    }
    static goToRoot(count) {
        location.href = location.origin;
    }

    /**
     * Commands for video manipulation
     */
    static playOrPause() {
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
    static volumeUp(count) {
        const video = document.querySelector("video");
        if (!video) {
            return;
        }
        video.volume = Math.min(video.volume + Math.max(1, count) / 100, 1.0);
    }
    static volumeDown(count) {
        const video = document.querySelector("video");
        if (!video) {
            return;
        }
        video.volume = Math.max(video.volume - Math.max(1, count) / 100, 0.0);
    }
    static seekForward(count) {
        const video = document.querySelector("video");
        if (!video) {
            return;
        }
        if (count === 0) {
            count = 5;
        }
        video.currentTime = Math.min(video.currentTime + count, video.duration);
    }
    static seekBack(count) {
        const video = document.querySelector("video");
        if (!video) {
            return;
        }
        if (count === 0) {
            count = 5;
        }
        video.currentTime = Math.max(video.currentTime - count, 0);
    }
    static switchLoop() {
        const video = document.querySelector("video");
        if (!video) {
            return;
        }
        video.loop = !video.loop;
    }
    static reloadVideo() {
        const video = document.querySelector("video");
        if (!video) {
            return;
        }
        video.load();
    }
    static showVideInfo() {
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
        alert(msg);
    }

    /**
     * Commands for current frame
     **/
    static stopLoadFrame() {
        window.stop();
    }
    static reloadFrame() {
        location.reload();
    }
    static incrementFrameURL(count) {
        incrementURL(location, Math.max(count, 1));
    }
    static decrementFrameURL(count) {
        incrementURL(location, -Math.max(count, 1));
    }
    static yankFrameURL() {
        DomUtils.setToClipboard(location.href);
    }
    static showFrameURL() {
        alert("Title: " + document.title + "\n" + "URL: " + location.href);
    }

    /**
     * Commands for link manipulation
     **/
    static openLink(count, mode) {
        const elem = mode.getElement();
        const url = getLink(elem);
        if (!url) {
            return false;
        }
        gFrameMgr.postMessage({ command: 'openLink', url: url });
        return true;
    }
    static openLinkInTab(count, mode) {
        const elem = mode.getElement();
        const url = getLink(elem);
        if (!url) {
            return false;
        }
        const active = (count === 0);
        gFrameMgr.postMessage(
            { command: 'openLinkInTab', url: url, active: active });
        return true;
    }
    static yankLink(count, mode) {
        const elem = mode.getElement();
        const url = getLink(elem);
        if (!url) {
            return false;
        }
        DomUtils.setToClipboard(url);
        return true;
    }
    static downloadLink(tabId, mode) {
        const elem = mode.getElement();
        const url = getLink(elem);
        if (!url) {
            return false;
        }
        gFrameMgr.postMessage({ command: 'downloadLink', url: url });
        return true;
    }
    static pressEnter(count, mode) {
        const elem = mode.getElement();
        const ctrl = (count === 1);
        const shift = (count === 2);
        const alt = (count === 3);
        const meta = (count === 4);
        emulateEnter(elem, "keypress", ctrl, alt, shift, meta);
    }

    /**
     * Commands for mouse emulation
     **/
    static mouseclick(count, mode) {
        const elem = mode.getElement();
        const ctrl = (count === 1);
        const shift = (count === 2);
        const alt = (count === 3);
        const meta = (count === 4);
        emulateClick(elem, ctrl, alt, shift, meta);
    }
    static mousedown(count, mode) {
        const elem = mode.getElement();
        const ctrl = (count === 1);
        const shift = (count === 2);
        const alt = (count === 3);
        const meta = (count === 4);
        emulateMouseEvent(
            elem, "mousedown", 0, ctrl, alt, shift, meta);
    }
    static mousein(count, mode) {
        const elem = mode.getElement();
        const doc = elem.ownerDocument;
        const body = doc.body || doc.documentElement;
        emulateMouseEvent(
            elem, "mouseover", 0, false, false, false, false, body);
        emulateMouseEvent(
            elem, "mousemove", 0, false, false, false, false);
    }
    static mouseout(count, mode) {
        const elem = mode.getElement();
        const doc = elem.ownerDocument;
        const body = doc.body || doc.documentElement;
        emulateMouseEvent(
            elem, "mouseout", 1, false, false, false, false, body);
        emulateMouseEvent(
            elem, "mousemove", 1, false, false, false, false);
    }

    static yankCurrentURL() {
        DomUtils.setToClipboard(location.href);
    }
    static repeatLastCommand(count, mode) {
        const [func, cnt] = mode.lastCmd;
        if (func === undefined) {
            return;
        }
        func(count !== 0 ? count : cnt);
    }

    /**
     * Commands for mode changing
     */
    static toInsertMode(count, mode) {
        const target = mode.getElement();
        if (!DomUtils.isEditable(target)) {
            return FrontendCommand.toInsertModeOnFirstElement(count);
        }
        gModeMgr.changeMode("INSERT", {
            lastFocusedElem: undefined,
            editableElement: target
        });
    }
    static toInsertModeOnFirstElement(count) {
        const inputs = DomUtils.getInputList(document);
        if (inputs.length === 0) {
            return;
        }
        const target = inputs[Math.min(count, inputs.length - 1)];
        gModeMgr.changeMode("INSERT", {
            lastFocusedElem: document.activeElement,
            editableElement: target
        });
    }
    static toInsertModeOnLastElement(count) {
        FrontendCommand.toInsertModeOnFirstElement(100000);
    }
    static toHintMode() {
        gFrameMgr.postMessage({ command: "toHintMode", type: "link" });
    }
    static toHintFocusMode() {
        gFrameMgr.postMessage({ command: "toHintMode", type: "focus" });
    }
    static toHintMediaMode() {
        gFrameMgr.postMessage({ command: "toHintMode", type: "media" });
    }
    static toVisualMode() {
        gModeMgr.changeMode("VISUAL");
    }
    static toExMode(defaultValue = "") {
        gFrameMgr.postMessage({
            command: "toConsoleMode", mode: "EX", data: defaultValue
        });
    }
    static toExModeOpen() {
        FrontendCommand.toExMode("open ");
    }
    static toExModeOpenCurrentURL() {
        FrontendCommand.toExMode("open " + location.href);
    }
    static toExModeTabOpen() {
        FrontendCommand.toExMode("tabopen ");
    }
    static toExModeTabOpenCurrentURL() {
        FrontendCommand.toExMode("tabopen " + location.href);
    }
    static toSearchMode(isBackward = false) {
        gFrameMgr.postMessage({
            command: "toConsoleMode", mode: "SEARCH", data: isBackward
        });
    }
    static toBackwardSearchMode() {
        FrontendCommand.toSearchMode(true);
    }

}

function incrementURL(location, count) {
    const url = decodeURI(location.href);
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
        if (elem.href !== undefined) {
            if (elem.href instanceof SVGAnimatedString) {
                return elem.href.animVal;
            }
            return elem.href;
        }
        if (elem.src !== undefined) {
            return elem.src;
        }
    }
    catch (e) {
        console.warn(`Element ${elem} is likely dead:`, e);
    }
    return undefined;
}

function emulateClick(target, ctrl, alt, shift, meta) {
    if (!ctrl && target.target) {
        target.target = "_top";
    }
    emulateMouseEvent(target, "click", 0, ctrl, alt, shift, meta);
}

function emulateMouseEvent(
    target, type, rect,
    ctrl=false, alt=false, shift=false, meta=false, related=null) {
    if (rect === 0) {
        rect = target.getBoundingClientRect();
    }
    if (rect === 1) {
        rect = related.getBoundingClientRect();
    }
    const x = Math.max((rect.left + rect.right) / 2, 0);
    const y = Math.max((rect.top + rect.bottom) / 2, 0);
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

