class InsertMode extends Mode {
    constructor(frameInfo, keyMap, data) {
        super(frameInfo);
        this.mapper = Utils.makeCommandMapper(keyMap);
        this.lastFocusedElem = data.lastFocusedElem;
        this.target = data.editableElement;
        this.target.undoStack = [];
        this.target.focus();
        if (document.activeElement !== this.target) {
            throw new Error(`Target element is not focusable (${this.target})`);
        }
        this.target.classList.add("wimpulation-input");
        this.inInvoking = false;
        this.blurHandler = (e) => {
            if (this.inInvoking) {
                return;
            }
            FrontendCommand.toNormalMode(0, this);
        };
        this.target.addEventListener("blur", this.blurHandler, true);
    }
    getTarget() {
        return this.target;
    }
    handle(key) {
        const [consumed, optCmd, cmd] = this.mapper.get(key);
        if (optCmd) {
            this._invoke(optCmd);
        }
        if (cmd) {
            return this._invoke(cmd);
        }
        if (consumed) {
            return true;
        }
        if (key.length === 1
            || key === "<Space>" || key === "<S-Space>"
            || key === "<Backspace>" || key === "<Delete>"
            || key === "<Enter>") {
            this.target.undoStack.push(this.target.value);
            return false;
        }
        return true;
    }
    reset() {
        try {
            this.target.removeEventListener("blur", this.blurHandler, true);
            this.target.classList.remove("wimpulation-input");
            if (document.activeElement === this.target) {
                if (document.hasFocus && this.lastFocusedElem) {
                    this.lastFocusedElem.focus();
                }
            }
        }
        catch (e) {
            console.warn("Some error occured:", Utils.errorString(e));
        }
    }
    _invoke(cmd) {
        this.inInvoking = true;
        try {
            return !invokeCommand(cmd, 0, this);
        }
        finally {
            this.inInvoking = false;
        }
    }
}

