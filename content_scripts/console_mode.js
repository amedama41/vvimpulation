class ConsoleMode extends Mode {
    constructor(frameInfo, options) {
        super(frameInfo);
        this.options = options;
        this.lastFocusedElem = document.activeElement;
        this.consoleFrame = document.getElementById("wimpulation-console");
        if (!this.consoleFrame) {
            throw new Error("Console frame is not loaded yet");
        }

        // activeElement may be null (e.g. about:blank).
        if (this.lastFocusedElem) {
            this.lastFocusedElem.blur();
        }
        this.consoleFrame.classList.add("wimpulation-show-console");
        this.consoleFrame.focus();
    }
    reset() {
        // Reset focus only when console frame is focused.
        // If search succeeds or user click elements outside of console,
        // frame is not focused.
        if (document.activeElement === this.consoleFrame) {
            try {
                // Need blur because lastFocusedElem may not be focusable.
                this.consoleFrame.blur();
                if (this.lastFocusedElem) {
                    this.lastFocusedElem.focus();
                }
            }
            catch (e) {
                console.warn(
                    "lastFocusedElem is likely dead:", Utils.errorString(e));
            }
        }
        this.consoleFrame.classList.remove("wimpulation-show-console");
    }
    handle() {
        return true;
    }
    getTarget() {
        return this.consoleFrame;
    }
    getConsoleOptions() {
        return this.options;
    }
}

