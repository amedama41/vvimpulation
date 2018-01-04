'use strict';

const CONSOLE_COMMAND_DESCRIPTIONS = {
    closeConsoleMode: { description: "Close the console" },
    execute: { description: "Execute, or search, or filter with the input value" },

    selectNextHistory: { description: "Select the next input value from history" },
    selectPreviousHistory: { description: "Select the previous input value from history" },
    removeFromHistory: { description: "Remove the current input value from history" },
    removeAllHistory: { description: "Remove all history" },

    getCandidate: { description: "Get candidates and open the candidate list" },
    selectNextHistoryOrCandidate: { description: "Select the next candidate if the candidate list is opened. Otherwise select the next history" },
    selectPreviousHistoryOrCandidate: { description: "Select the previous candidate if the candidate list is opened. Otherwise select the previous history" },

    deleteCharBackward: { description: "Delete a character backward of the target. If input is empty, close the console" },
    deleteWordBackward: { description: "Delete a word backward of the target" },
    deleteToBeginningOfLine: { description: "Delete characters to the beginning of a line of the target" },
    deleteToEndOfLine: { description: "Delete characters to the end of a line of the target" },
    charNext: { description: "Move a cursor to the next character of the target" },
    charPrevious: { description: "Move a cursor to the previous character of the target" },
    beginLine: { description: "Move a cursor to the beginning of a line of the target" },
    endLine: { description: "Move a cursor to the end of a line of the target" },
};

