const Utils = (function() {

class CommandMapper {
    constructor(cmdMap) {
        this.cmdMap = cmdMap;
        this.prevMapAndCmd = undefined;
    }
    get(key) {
        let optCmd = undefined;
        if (this.prevMapAndCmd) {
            const mapAndCmd = this.prevMapAndCmd[0].get(key);
            if (mapAndCmd) {
                if (mapAndCmd[0].size !== 0) {
                    this.prevMapAndCmd = mapAndCmd;
                    return [true, undefined, undefined];
                }
                else {
                    this.prevMapAndCmd = undefined;
                    return [true, undefined, mapAndCmd[1]];
                }
            }
            else {
                optCmd = this.prevMapAndCmd[1] || "";
            }
        }

        const mapAndCmd = this.cmdMap.get(key);
        if (mapAndCmd) {
            if (mapAndCmd[0].size !== 0) {
                this.prevMapAndCmd = mapAndCmd;
                return [true, optCmd, undefined];
            }
            else {
                return [true, optCmd, mapAndCmd[1]];
            }
        }
        else {
            return [false, optCmd, undefined];
        }
    }
    reset() {
        this.prevMapAndCmd = undefined;
    }
}

function getKeyList(keySeq, specialKeyPattern1, specialKeyPattern2) {
    const keyList = [];
    while (keySeq.length > 0) {
        let result = undefined;
        let key = undefined;
        if ((result = specialKeyPattern1.exec(keySeq))) {
            const modifiers = result[1].split("-").sort();
            modifiers.shift(); // remove blank
            key = "<" + modifiers.join("-") + "-" + result[2] + ">";
        }
        else if ((result = specialKeyPattern2.exec(keySeq))) {
            key = result[0];
        }
        else {
            if (keySeq.startsWith("\\")) {
                if (keySeq.length < 2) {
                    return undefined;
                }
                keySeq = keySeq.substr(1);
            }
            key = keySeq[0];
        }

        keyList.push(key);
        keySeq = keySeq.substr(key.length);
    }
    return keyList;
}

const KEY_NAME_MAP = {
    "Escape": "Esc", " ": "Space",
    "ArrowUp": "Up", "ArrowDown": "Down",
    "ArrowLeft": "Left", "ArrowRight": "Right",
    " ": "Space", "\u00a5": "\\", "\u005c": "\\"
};

return class {
    static getRegulatedKey(keyEvent) {
        let key = keyEvent.key
        if (["Shift", "Control", "Alt", "Meta"].indexOf(key) !== -1) {
            return undefined;
        }
        if (key in KEY_NAME_MAP) {
            key = KEY_NAME_MAP[key];
        }

        const isSpecialKey = (key.length !== 1);

        let modifiers = "";
        if (keyEvent.altKey) modifiers += "A-";
        if (keyEvent.ctrlKey) modifiers += "C-";
        if (keyEvent.metaKey) modifiers += "M-";
        if (keyEvent.shiftKey && isSpecialKey) modifiers += "S-";

        if (!isSpecialKey && modifiers.length !== 0) {
            key = key.toUpperCase();
        }

        if (isSpecialKey || modifiers.length > 0) {
            return `<${modifiers}${key}>`
        }
        else {
            return key;
        }
    }

    static toPreparedCmdMap(cmdMap) {
        const preMap = new Map();
        const specialKeyPattern1 = /^<((?:[ACMS]-)+)(\S[^>]*)>/;
        const specialKeyPattern2 = /^<\w+>/;
        for (var keySeq of Object.keys(cmdMap)) {
            const keyList = getKeyList(
                keySeq, specialKeyPattern1, specialKeyPattern2);
            if (keyList === undefined) {
                console.warn("invalid mapping keySeq:", keySeq);
                continue;
            }

            const cmd = cmdMap[keySeq];
            const lastKey = keyList.pop();
            const lastMap = keyList.reduce((map, key) => {
                if (!map.has(key)) {
                    map.set(key, [new Map(), undefined]);
                }
                return map.get(key)[0];
            }, preMap);
            const mapAndCmd = lastMap.get(lastKey);
            if (mapAndCmd !== undefined) {
                mapAndCmd[1] = cmd;
            }
            else {
                lastMap.set(lastKey, [new Map(), cmd]);
            }
        }
        return preMap;
    }

    static makeCommandMapper(cmdMap) {
        return new CommandMapper(cmdMap);
    }

    static countToModifiers(count) {
        const ctrl = !!(count & 0b0001);
        const shift = !!(count & 0b0010);
        const alt = !!(count & 0b0100);
        const meta = !!(count & 0b1000);
        return [ctrl, shift, alt, meta];
    }

    static modifiersToCount(ctrl, shift, alt, meta) {
        let count = 0;
        if (ctrl) {
            count |= 0b0001;
        }
        if (shift) {
            count |= 0b0010;
        }
        if (alt) {
            count |= 0b0100;
        }
        if (meta) {
            count |= 0b1000;
        }
        return count;
    }

    static errorString(error) {
        if (error instanceof Error) {
            return `${error.message} (${error.fileName}:${error.lineNumber})`;
        }
        else {
            return error && error.toString();
        }
    }
};

})();

