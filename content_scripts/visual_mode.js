class VisualCommand {
    static yankSelection(selection) {
        DomUtils.setToClipboard(selection.toString());
        VisualCommand.toNormalMode();
    }
    static reverseCursor(selection) {
        if (selection.isCollapsed) {
            return;
        }
        const anchorNode = selection.anchorNode;
        const anchorOffset = selection.anchorOffset;
        const focusNode = selection.focusNode;
        const focusOffset = selection.focusOffset;
        selection.setBaseAndExtent(
            focusNode, focusOffset, anchorNode, anchorOffset);
    }
    static toCaretMode(selection, mode) {
        mode.changeMode("CARET");
    }
    static toVisualMode(selection, mode) {
        mode.changeMode("VISUAL");
    }
    static toNormalMode(selection, mode) {
        mode.changeMode("NORMAL");
    }
}

/**
 * Classes derived from this class must implements init and selectionModify
 * methods.
 */
class VisualModeBase extends Mode {
    constructor(frameInfo, keyMap, data) {
        super(frameInfo);
        const selection  = window.getSelection();
        if (selection.rangeCount === 0) {
            setTimeout(() => super.changeMode("NORMAL"), 0);
            return;
        }
        this.selection = selection;
        this.init(this.selection);
        this.mapper = Utils.makeCommandMapper(keyMap);
    }
    reset() {
        if (this.selection) {
            try {
                this.selection.collapseToStart();
            }
            catch (e if e instanceof Error) {
                console.error(
                    'visual mode reset error', e.message, e.fileName, e.lineNumber);
            }
            catch (e) {
                console.error('visual mode reset error', e);
            }
        }
    }
    getElement() {
        return selection.anchorNode;
    }
    handle(key) {
        const [consumed, optCmd, cmd] = this.mapper.get(key);
        if (optCmd) {
            this._invokeCommand(optCmd);
        }
        if (cmd) {
            return this._invokeCommand(cmd);
        }
        return true;
    }
    _invokeCommand(cmd) {
        if (cmd.startsWith("move ")) {
            const [prefix, direction, granularity] = cmd.split(" ");
            this.selectionModify(this.selection, direction, granularity);
            return true;
        }
        else {
            return !VisualCommand[cmd](this.selection);
        }
    }
}

class VisualMode extends VisualModeBase {
    init(selection) {}
    selectionModify(selection, direction, granularity) {
        selection.modify("extend", direction, granularity);
    }
}

class CaretMode extends VisualModeBase {
    init(selection) {
        const node = this.selection.focusNode;
        const offset = this.selection.focusOffset;
        selection.setBaseAndExtent(node, offset, node, offset);
    }
    selectionModify(selection, direction, granularity) {
        selection.collapseToStart();
        selection.modify("move", direction, granularity);
        selection.modify("extend", "forward", "character");
    }
}

