'use strict';

const HINT_COMMAND_DESCRIPTIONS = {
    nextHint: { description: "Change the target to the next hint" },
    previousHint: { description: "Change the target to the previous hint" },
    reconstruct: { description: "Reconstruct hint labels" },
    startFilter: { description: "Start the hint filter" },
    toggleOverlap: { description: "Switch the overlap mode" },
    toggleAutoFocus: { description: "Switch the auto focus mode" },
    toggleTransparency: { description: "Switch transparency of hint labels" },
    invokeCommand: { description: "Invoke a non-hint command. This takes arguments such as invokeCommand|[<count>|]<command>" }
}

