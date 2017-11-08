const COMMAND_DESCRIPTIONS = {

    /** Commands for page scrolling **/
    scrollTop: {},
    scrollBottom: {},
    scrollUp: {},
    scrollDown: {},
    scrollLineUp: {},
    scrollLineDown: {},
    moveHalfPageUp: {},
    moveHalfPageDown: {},
    movePageUp: {},
    movePageDown: {},
    scrollLeft: {},
    scrollRight: {},
    scrollHome: {},
    scrollEnd: {},
    scrollPercent: {},
    scrollMiddle: {},

    /** Commands for search **/
    findNext: { background: true },
    findPrevious: { background: true },
    findNextPage: {},
    findPreviousPage: {},

    /** Commands for focus manipulation **/
    focusTopFrame: { topFrame: true },
    focusin: {},
    focusout: {},
    focusNextFrame: { background: true },

    /** Commands for tab manipulation **/
    nextTab: { background: true },
    previousTab: { background: true },
    firstTab: { background: true },
    lastTab: { background: true },
    moveTabToLeft: { background: true },
    moveTabToRight: { background: true },
    removeCurrentTab: { background: true },
    undoCloseTab: { background: true },
    duplicateTab: { background: true },
    openTab: { background: true },

    /** Commands for window manipulation **/
    removeCurrentWindow: { background: true },

    /** Commands for page load manipulation **/
    stopLoad: { topFrame: true },
    reload: { background: true },
    reloadSkipCache: { background: true },

    /** Commands for page history **/
    back: { topFrame: true },
    forward: { topFrame: true },

    /** Commands for URL edit **/
    incrementURL: { topFrame: true },
    decrementURL: { topFrame: true },
    goToParent: { topFrame: true },
    goToRoot: { topFrame: true },

    /** Commands for video manipulation **/
    playOrPause: {},
    volumeUp: {},
    volumeDown: {},
    seekForward: {},
    seekBack: {},
    switchLoop: {},
    reloadVideo: {},
    showVideInfo: {},

    /** Commands for current frame **/
    openLinkInFrame: {},
    backFrame: {},
    forwardFrame: {},
    stopLoadFrame: {},
    reloadFrame: {},
    incrementFrameURL: {},
    decrementFrameURL: {},
    yankFrameURL: {},
    showFrameURL: {},

    /** Commands for page zoom manipulation **/
    zoomIn: { background: true },
    zoomOut: { background: true },
    zoomReset: { background: true },

    /** Commands for link manipulation **/
    openLink: {},
    openLinkInTab: {},
    yankLink: {},
    downloadLink: {},
    pressEnter: {},

    /** Commands for mouse emulation **/
    mouseclick: {},
    mousedown: {},
    mousein: {},
    mouseout: {},

    /** Commands for select manipulation **/
    selectNextOption: {},
    selectPreviousOption: {},
    toggleSelectOption: {},

    /** Commands for text edit **/
    deleteCharBackward: {},
    deleteWordBackward: {},
    deleteToBeggingOfLine: {},
    deleteToEndOfLine: {},
    charNext: {},
    charPrevious: {},
    beginLine: {},
    endLine: {},
    nextLine: {},
    previousLine: {},
    undo: {},
    yankValue: {},
    pasteValue: {},

    /** Commands for selection manipulation **/
    clearSelection: {},
    yankSelection: {},
    deleteSelection: {},
    reverseSelectionEndpoints: {},

    /** Commands for element manipulation **/
    selectElement: {},
    yankInnerText: {},
    yankInnerHTML: {},
    yankOuterHTML: {},
    deleteElement: {},

    /** Commands for various applications **/
    smartOpen: {},
    smartOpenInTab: {},
    yankCurrentURL: { topFrame: true },
    reloadHintPattern: { background: true },
    ignore: {},
    repeatLastCommand: {},

    /** Commands for mode changing **/
    toNormalMode: { background: true },
    toInsertMode: {},
    toInsertModeOnFirstElement: {},
    toInsertModeOnLastElement: {},
    toInsertModeOnPreviousInput: {},
    toInsertModeOnNextInput: {},
    toHintMode: {},
    toHintFocusMode: {},
    toHintMediaMode: {},
    toVisualMode: {},
    toCaretMode: {},
    toExMode: { topFrame: true },
    toExModeOpen: { topFrame: true },
    toExModeOpenCurrentURL: { topFrame: true },
    toExModeTabOpen: { topFrame: true },
    toExModeTabOpenCurrentURL: { topFrame: true },
    toSearchMode: { topFrame: true },
    toBackwardSearchMode: { topFrame: true },
};
