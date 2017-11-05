/**
 * Classes derived from this class must implements init and selectionModify
 * methods.
 */
class VisualModeBase extends Mode {
    constructor(frameInfo, keyMap, data) {
        super(frameInfo);
        const selection  = window.getSelection();
        if (selection.rangeCount === 0) {
            throw new Error("No selection");
        }
        this.selection = selection;
        this.init(this.selection);
        this.mapper = Utils.makeCommandMapper(keyMap);
    }
    reset() {
        if (this.selection) {
            try {
                this.destroy(this.selection);
            }
            catch (e) {
                console.error('visual mode reset error:', Utils.errorString(e));
            }
        }
    }
    getTarget() {
        return selection.anchorNode;
    }
    handle(key) {
        const [consumed, optCmd, cmd] = this.mapper.get(key);
        if (optCmd) {
            this._invoke(optCmd);
        }
        if (cmd) {
            return this._invoke(cmd);
        }
        return true;
    }
    _invoke(cmd) {
        if (cmd.startsWith("move ")) {
            const [prefix, direction, granularity] = cmd.split(" ");
            this.selectionModify(this.selection, direction, granularity);
            return true;
        }
        else {
            return !invokeCommand(cmd, 0, this);
        }
    }
}

class VisualMode extends VisualModeBase {
    init(selection) {}
    destroy(selection) {
        selection.collapseToEnd();
    }
    selectionModify(selection, direction, granularity) {
        selection.modify("extend", direction, granularity);
    }
}

class CaretMode extends VisualModeBase {
    init(selection) {
        const node = this.selection.focusNode;
        const offset = this.selection.focusOffset;
        selection.setBaseAndExtent(node, offset, node, offset);
        selection.modify("extend", "forward", "character");
    }
    destroy(selection) {
        selection.collapseToStart();
    }
    selectionModify(selection, direction, granularity) {
        selection.collapseToStart();
        selection.modify("move", direction, granularity);
        selection.modify("extend", "forward", "character");
    }
}

