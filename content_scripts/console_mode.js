class ConsoleMode extends Mode {
    constructor(frameInfo, options) {
        super(frameInfo);
        this.consoleFrame = document.getElementById("wimpulation-console");
        if (!this.consoleFrame) {
            throw new Error("Console frame is not loaded yet");
        }
        this.lastFocusedElem = document.activeElement;

        this.sendMessage({ command: "setConsoleMode", options: options })
            .then((result) => {
                // Maybe current mode is not already console.
                if (super.isCurrentMode()) {
                    // activeElement may be null (e.g. about:blank).
                    if (this.lastFocusedElem) {
                        this.lastFocusedElem.blur();
                    }
                    this.consoleFrame.classList.add("wimpulation-show-console");
                    this.consoleFrame.focus();
                }
            })
            .catch((result) => {
                // Maybe current mode is not already console.
                if (super.isCurrentMode()) {
                    super.changeMode("NORMAL");
                }
            });
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
                    const x = window.scrollX;
                    const y = window.scrollY;
                    this.lastFocusedElem.focus();
                    // Restore position which was changed by focus
                    window.scrollTo(x, y);
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
}

