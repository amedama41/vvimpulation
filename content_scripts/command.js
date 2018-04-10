'use strict';

const COMMAND_DESCRIPTIONS = {

    /** Commands for page scrolling **/
    scrollTop: { description: "Scroll to the top of the area where the target resides" },
    scrollBottom: { description: "Scroll to the bottom of the area where the target resides" },
    scrollUp: { description: "Scroll up the area where the target resides" },
    scrollDown: { description: "Scroll down the area where the target resides" },
    scrollLineUp: { topFrame: true, description: "Scroll up by 1 line" },
    scrollLineDown: { topFrame: true, description: "Scroll down by 1 line" },
    moveHalfPageUp: { description: "Scroll up the area where the target resides by a half page" },
    moveHalfPageDown: { description: "Scroll down the area where the target resides by a half page" },
    movePageUp: { description: "Scroll up the area where the target resides by a page" },
    movePageDown: { description: "Scroll down the area where the target resides by a page" },
    scrollVerticalMiddle: { description: "Go the vertical middle of the area where the target resides" },
    scrollLeft: { description: "Scroll left the area where the target resides" },
    scrollRight: { description: "Scroll right the area where the target resides" },
    scrollHome: { description: "Scroll to the left end of the area where the target resides" },
    scrollEnd: { description: "Scroll to the right end of the area where the target resides" },
    scrollHorizontalMiddle: { description: "Go the horizontal middle of the area where the target resides" },
    scrollPercent: { description: "Go to N% in the current page" },
    moveTargetAtTop: { description: "Display the target at the top of the screen" },
    moveTargetAtCenter: { description: "Display the target at the center of the screen" },
    moveTargetAtBottom: { description: "Display the target at the bottom of the screen" },

    /** Commands for console command execution **/
    execCommand: { description: "Execute a console command. This takes an argument such as execCommand|<console command>" },

    /** Commands for search **/
    search: { description: "Search a text. This takes an argument such as search|<search text>" },
    searchNext: { background: true, description: "Repeat the latest '/' or '?'" },
    searchPrevious: { background: true, description: "Repeat the latest '/' or '?' in opposite direction" },
    searchSelectionForward: { description: "Search selection text as keyword forward" },
    searchSelectionBackward: { description: "Search selection text as keyword backward" },
    findNext: { background: true, description: "This command is deprecated. Use searchNext" },
    findPrevious: { background: true, description: "This command is deprecated. Use searchPrevious" },
    findSelectionForward: { description: "This command is deprecated. Use searchSelectionForward" },
    findSelectionBackward: { description: "This command is deprecated. Use searchSelectionBackward" },
    findNextPage: { description: "Focus the next label link after the target" },
    findPreviousPage: { description: "Focus the previous label link after the target" },

    /** Commands for focus manipulation **/
    focusTopFrame: { topFrame: true, description: "Focus the most top frame" },
    focusin: { description: "Focus the target" },
    fixedFocusin: { description: "Focus the target without scroll" },
    focusout: { description: "Remove focus from the target" },
    focusNext: { description: "Focus the next element of the target" },
    focusPrevious: { description: "Focus the previous element of the target" },
    focusNextAndChangeMode: { description: "Focus the next element of the target and if the element is editable, then change to insert otherwise normal" },
    focusPreviousAndChangeMode: { description: "Focus the previous element of the target and if the element is editable, then change to insert otherwise normal" },
    focusNextFrame: { background: true, description: "Focus next frame" },
    focusPreviousFrame: { background: true, description: "Focus previous frame" },
    resetFocus: { description: "Reset focus state" },

    /** Commands for tab manipulation **/
    nextTab: { background: true, description: "Activate the next tab" },
    previousTab: { background: true, description: "Activate the previous tab" },
    firstTab: { background: true, description: "Activate the first tab" },
    lastTab: { background: true, description: "Activate the last tab" },
    lastActivatedTab: { background: true, description: "Activate the last activated tab" },
    moveTabToLeft: { background: true, description: "Move the current tab to left" },
    moveTabToRight: { background: true, description: "Move the current tab to right" },
    moveTabToNewWindow: { background: true, description: "Move the current tab to a new window" },
    moveTabToNextWindow: { background: true, description: "Move the current tab to the next window" },
    moveTabToPreviousWindow: { background: true, description: "Move the current tab to the previous window" },
    removeCurrentTab: { background: true, description: "Close the current tab" },
    undoCloseTab: { background: true, description: "Reopen the latest closed tab" },
    duplicateTab: { background: true, description: "Open the current page in a new tab" },
    openTab: { background: true, description: "Open a new tab" },
    toggleTabPinning: { background: true, description: "Switch the current tab pinning" },
    toggleTabMute: { background: true, description: "Switch the current tab mute" },

    /** Commands for window manipulation **/
    snapWindowToLeft: { background: true, description: "Snap the current window to screen left" },
    snapWindowToRight: { background: true, description: "Snap the current window to screen right" },
    snapWindowToTop: { background: true, description: "Snap the current window to screen top" },
    snapWindowToBottom: { background: true, description: "Snap the current window to screen bottom" },
    removeCurrentWindow: { background: true, description: "Close the current window" },

    /** Commands for page load manipulation **/
    stopLoad: { topFrame: true, description: "Stop loading of the page" },
    reload: { background: true, description: "Reload the current page" },
    reloadSkipCache: { background: true, description: "Reload the current page without cache" },

    /** Commands for page history **/
    back: { topFrame: true, description: "Go backward in the current tab history" },
    forward: { topFrame: true, description: "Go forward in the current tab history" },

    /** Commands for URL edit **/
    incrementURL: { topFrame: true, description: "Increment the last number in the current page URL" },
    decrementURL: { topFrame: true, description: "Decrement the last number in the current page URL" },
    goToParent: { topFrame: true, description: "Go to the parent directory of URL" },
    goToRoot: { topFrame: true, description: "Go to the root directory of URL" },

    /** Commands for video manipulation **/
    playOrPause: { description: "Play or pause a video" },
    volumeUp: { description: "Increase the volume of a video" },
    volumeDown: { description: "Decrease the volume of a video" },
    seekForward: { description: "Seek forward the playback time of a video" },
    seekBack: { description: "Seek backward the playback time of a video" },
    speedFaster: { description: "Make the play speed faster" },
    speedSlower: { description: "Make the play speed slower" },
    resetSpeed: { description: "Reset the play speed" },
    switchLoop: { description: "Switch loop mode of a video" },
    switchMute: { description: "Switch mute of a video" },
    reloadVideo: { description: "Reload a video" },
    showVideoInfo: { description: "Show information of a video" },

    /** Commands for current frame **/
    openLinkInFrame: { description: "Open the link of the target in the current frame" },
    openSourceInFrame: { description: "Open the source of the target in the current frame" },
    backFrame: { description: "Go backward in the current frame history" },
    forwardFrame: { description: "Go forward in the current frame history" },
    stopLoadFrame: { description: "Stop loading of the current frame" },
    reloadFrame: { description: "Reload the current frame" },
    incrementFrameURL: { description: "Increment the last number in the current frame URL" },
    decrementFrameURL: { description: "Decrement the last number in the current frame URL" },
    yankFrameURL: { description: "Yank the current frame URL" },
    yankFrameHost: { description: "Yank the current frame host" },
    yankFrameTitle: { description: "Yank the current frame title" },
    showFrameInfo: { description: "Show information of the current frame" },

    /** Commands for page zoom manipulation **/
    zoomIn: { background: true, description: "Zoom in" },
    zoomOut: { background: true, description: "Zoom out" },
    zoomReset: { background: true, description: "Reset zoom" },

    /** Commands for link manipulation **/
    openLink: { description: "Open the link of the target in the current tab" },
    openLinkInTab: { description: "Open the link of the target in a new tab" },
    openSource: { description: "Open the source of the target media in the current tab" },
    openSourceInTab: { description: "Open the source of the target media in a new tab" },
    yankLink: { description: "Yank the link of the target" },
    downloadLink: { description: "Download the link of the target" },
    pressEnter: { description: "Generate a enter key press event for the target" },

    /** Commands for mouse emulation **/
    mouseclick: { description: "Generate a mouse click event for the target" },
    mousedown: { description: "Generate a mouse down event for the target" },
    mouseup: { description: "Generate a mouse up event for the target" },
    mouseinTo: { description: "Generate a mouse in event from an element to the target" },
    mouseinFrom: { description: "Generate a mouse in event from the target to an element" },
    mouseoutTo: { description: "Generate a mouse out event from an element to the target" },
    mouseoutFrom: { description: "Generate a mouse out event from the target to an element" },
    mousemove: { description: "Generate a mouse move event on the target for N seconds" },

    /** Commands for select manipulation **/
    selectNextOption: { description: "Select the next option of the select element target" },
    selectPreviousOption: { description: "Select the previous option of the select element target" },
    toggleSelectOption: { description: "Switch the option selection of the select element target" },

    /** Commands for text edit **/
    deleteCharBackward: { description: "Delete a character backward of the target" },
    deleteWordBackward: { description: "Delete a word backward of the target" },
    deleteToBeginningOfLine: { description: "Delete characters to the beginning of a line of the target" },
    deleteToEndOfLine: { description: "Delete characters to the end of a line of the target" },
    charNext: { description: "Move a cursor to the next character of the target" },
    charPrevious: { description: "Move a cursor to the previous character of the target" },
    beginLine: { description: "Move a cursor to the beginning of a line of the target" },
    endLine: { description: "Move a cursor to the end of a line of the target" },
    nextLine: { description: "Move a cursor to the next line of the target" },
    previousLine: { description: "Move a cursor to the previous line of the target" },
    undo: { description: "Undo a modification of the target" },
    yankValue: { description: "Yank value of the target" },
    pasteValue: { description: "Paste a value from clipboard to the value of the target" },

    /** Commands for selection manipulation **/
    clearSelection: { description: "Clear selection" },
    collapseSelectionToStart: { description: "Collapse selection to start point" },
    collapseSelectionToEnd: { description: "Collapse selection to end point" },
    yankSelection: { description: "Yank selection contents" },
    deleteSelection: { description: "Delete selection contents" },
    reverseSelectionEndpoints: { description: "Reverse a selection cursor" },
    viewSelectionSource: { description: "View the source of a selection" },

    /** Commands for element manipulation **/
    selectElement: { description: "Select the target" },
    setCaret: { description: "Set a caret on the head of the target" },
    yankInnerText: { description: "Yank inner text of the target" },
    yankInnerHTML: { description: "Yank inner HTML of the target" },
    yankOuterHTML: { description: "Yank outer HTML of the target" },
    deleteElement: { description: "Delete the target" },
    deleteChildElements: { description: "Delete the child elements of the target" },
    setTabIndex: { description: "Set N tabindex to the target" },
    removeTabIndex: { description: "Remove tabindex from the target" },
    showElementInfo: { description: "Show the information of the target element" },

    /** Commands for mark **/
    mark: { description: "Mark current page position" },
    jumpToMark: { description: "Jump to a mark" },

    /** Commands for various applications **/
    showPageInfo: { topFrame: true, description: "Show the current page information" },
    viewSource: { description: "View the source of the current document" },
    smartOpen: { description: "Open the target in the current page or click the target" },
    smartOpenInTab: { description: "Open the target in a new page or click the target" },
    smartYank: { description: "Yank the target value or link or text" },
    yankCurrentURL: { topFrame: true, description: "Yank the current page URL" },
    yankPageHost: { topFrame: true, description: "Yank the current page host" },
    yankPageTitle: { topFrame: true, description: "Yank the current page title" },
    killHover: { background: true, description: "Insert focus selector rules corresponding to hover, and set tabindex to hover targets" },
    compose: { description: "Do multiple commands simultaneously" },
    repeatLastCommand: { description: "Run the latest invoked command" },
    showLastMessage: { topFrame: true, description: "Show the latest message" },
    ignore: { description: "Do nothing and pass through the keydown event" },
    nop: { description: "Do nothing but prevent the keydown event" },

    /** Commands for mode changing **/
    toSuspendMode: { background: true, description: "Change suspend mode" },
    toNormalMode: { description: "Change normal mode" },
    toInsertMode: { description: "Change insert mode with the current target or a first input element" },
    toInsertModeOnFirstElement: { description: "Change insert mode with a first input element"},
    toInsertModeOnLastElement: { description: "Change insert mode with a last input element" },
    toInsertModeOnPreviousInput: { description: "Change insert mode with a previous input element" },
    toInsertModeOnNextInput: { description: "Change insert mode with a next input element" },
    toInsertModeIfEditable: { description: "Change insert mode if the current target is editable" },
    toHintMode: { description: "Change link hint mode" },
    toHintFocusMode: { description: "Change focus hint mode" },
    toHintMediaMode: { description: "Change media hint mode" },
    toHintCodeMode: { description: "Change code hint mode" },
    toVisualMode: { description: "Change visual mode" },
    toCaretMode: { description: "Change caret mode" },
    toConsoleMode: { description: "Change console mode" },
    toConsoleModeWithURL: { description: "Change console mode with URL as default input" },
    toConsoleModeWithSelection: { description: "Change console mode with selection text as default input" },
    toSearchMode: { description: "Change search forward mode" },
    toBackwardSearchMode: { description: "Change search backward mode" },

    /** Commands specifically for each mode **/
    recordMacro: { mode: "normal", description: "Record a key sequence into a register, or stop recording when recording that" },
    playMacro: { mode: "normal", description: "Replay the key sequence of a specified register" },
    extendSelection: { mode: "visual", description: "Extend selection. This takes two arguments such as extendSelection|<direction>|<granularity>" },
};

