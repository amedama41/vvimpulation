'use strict';

/**
 * Classes derived from this class must implements init and selectionModify
 * methods.
 */
class VisualModeBase {
    constructor(frameInfo, keyMap, data) {
        const selection  = window.getSelection();
        if (selection.rangeCount === 0) {
            const point = document.caretPositionFromPoint(0, 0);
            if (!point) {
                throw new Error("No selection");
            }
            selection.setBaseAndExtent(
                point.offsetNode, point.offset, point.offsetNode, point.offset);
        }
        this.selection = selection;
        this.count = "0";
        this.init(this.selection);
        this.mapper = Utils.makeCommandMapper(keyMap);
    }
    getTarget() {
        return selection.anchorNode;
    }
    onReset() {
        if (this.selection) {
            try {
                this.destroy(this.selection);
            }
            catch (e) {
                console.error('visual mode reset error:', Utils.errorString(e));
            }
        }
    }
    onKeyEvent(key, frameInfo) {
        const [consumed, optCmd, cmd, dropKeyList] = this.mapper.get(key);
        if (optCmd) {
            this._invoke(optCmd, frameInfo);
        }
        else if (dropKeyList) {
            this.count = "0";
        }
        if (cmd) {
            return this._invoke(cmd, frameInfo);
        }
        if (consumed) {
            return true;
        }
        if (key.length === 1 && "0" <= key && key <= "9") {
            this.count += key;
            return true;
        }
        this.count = "0";
        return true;
    }
    _invoke(cmd, frameInfo) {
        const count = parseInt(this.count, 10);
        this.count = "0";
        if (cmd.startsWith("move ")) {
            const [prefix, direction, granularity] = cmd.split(" ");
            for (let i = 0; i < Math.max(count, 1); ++i) {
                this.selectionModify(this.selection, direction, granularity);
            }
            return true;
        }
        else {
            return !invokeCommand(cmd, count, frameInfo);
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

