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
        frameInfo.showFixedMessage(`-- ${this.constructor.getModeName()} --`);
    }
    getTarget() {
        return selection.anchorNode;
    }
    consume(key, frameInfo) {
        if (key === "0" && this.count !== "0" && // Is continuation of count?
            !this.mapper.hasPendingKeys()) {
            return [false, undefined, undefined, undefined];
        }
        return this.mapper.get(key);
    }
    onReset(frameInfo) {
        frameInfo.hideFixedMessage();
        if (this.selection) {
            try {
                this.destroy(this.selection);
            }
            catch (e) {
                console.error('visual mode reset error:', Utils.errorString(e));
            }
        }
    }
    onInvoking(cmd, frameInfo) {
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
    onDropKeys(dropKeys) {
        this.count = "0";
    }
    onNonConsumed(key) {
        if (key.length === 1 && "0" <= key && key <= "9") {
            this.count += key;
        }
        else {
            this.count = "0";
        }
        return true;
    }
}

class VisualMode extends VisualModeBase {
    static getModeName() {
        return "VISUAL";
    }
    init(selection) {}
    destroy(selection) {
        selection.collapseToEnd();
    }
    selectionModify(selection, direction, granularity) {
        selection.modify("extend", direction, granularity);
    }
}

class CaretMode extends VisualModeBase {
    static getModeName() {
        return "CARET";
    }
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

