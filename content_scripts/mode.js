let gMode = undefined;

class Mode {
    constructor(frameInfo) {
        this._frameInfo = frameInfo;
        this._lastCommand = [undefined, undefined];
    }
    postMessage(msg) {
        this._frameInfo.postMessage(msg);
    }
    sendMessage(msg) {
        return this._frameInfo.sendMessage(msg);
    }
    changeMode(mode, data) {
        this.reset();
        gMode = Mode.createMode(mode, this._frameInfo, data);
    }
    get frameInfo() {
        return this._frameInfo;
    }
    get lastCommand() {
        return this._lastCommand;
    }
    static createMode(mode, frameInfo, data = undefined) {
        switch (mode) {
            case "NORMAL":
                return new NormalMode(frameInfo, NORMAL_KEY_MAP, data);
            case "INSERT":
                return new InsertMode(frameInfo, INSERT_KEY_MAP, data);
            case "HINT":
                return new HintMode(frameInfo, data);
            case "VISUAL":
                return new VisualMode(frameInfo, VISUAL_KEY_MAP, data);
            case "CARET":
                return new CaretMode(frameInfo, VISUAL_KEY_MAP, data);
            case "CONSOLE":
                return new ConsoleMode(frameInfo, data);
            default:
                console.assert(false, "never reach here");
                return new NormalMode(frameInfo, NORMAL_KEY_MAP);
        }
    }
}

