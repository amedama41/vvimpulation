# VVimpulation
A Firefox add-on which provides keyboard navigation like Vim

## Permissions

VVimpulation uses the following WebExtensions API permissions.

- bookmarks: Open bookmarks by `open` console commands.
- clipboardRead: Paste values from the clipboard by `pasteValue` command.
- clipboardWrite: Copy texts to the clipboard by `yankCurrentURL` and etc.
- downloads: Download links by `downloadLink`, and manage download items by `download` console command.
- find: Highlight search results by `search` commands.
- history: Open URLs from browser history by `open` console commands, and manage the history by `history` console command.
- sessions: Reopen tabs and windows by `undoTab` and `undoWindow` console commands, and save window size by snapping window commands.
- storage: Save options, registers, and console command history.
- tabs: Get tab information by `buffer` and `undoTab` console commands.
- webNavigation: Manage child frames, and overwrite error pages.

VVimpulation also use all host permissions in order to get search suggestions in open console commands.

## Release Notes

### 1.2

Command
- Add showElementInfo command.
- Add toggleTransparency hint command.
- Add toggleTabPinning command.
- Add toggleTabMute command.

Enhancement
- Distinguish key patterns with shift and other modifiers from the patterns without shift.
- Exclude elements on edge of viewpoint from hint target.
- Change to the normal mode from the hint more smoothly.
- Highlight a current active hint target element.
- Prevent page auto focus to steal a focus from the console.
- Block extendSelection always traverse the sub tree under body or html node.
- Avoid to set caret at the head of a non-displayed text.
- Generate mousedown and mouseup events in smartOpen commands.
- Optimize the speed of displaying hint labels for huge pages.
- Handle keyup events in order to suppress keyup event actions defined by pages.
- Finish visual mode when other frame is focused.
- Show hint label on the position not covered by the ancestors.
- Change hint label color.
- Check ancestor covering for area elements.
- Add tr into default code hint pattern.

Bugfix
- Calculate frame areas taking into account the frame padding and border.
- Fix the timing to do automatic killHover.
- Fix the issue that the count of repeatLastCommand may be reset.
- Fix the mousemove target of mousein / mouseout commands.
- Fix calculation for poly shape area's rectangle.
- Fix that tiny-macro can not record 0.
- Fix error page when the URL has ampersands.

### 1.1

Command
- Deprecate findNext/findPrevious/findSelectionForward/findSelectionBackward command names. Add searchNext/searchPrevious/searchSelectionForward/searchSelectionBackward commands instead.
- Add execCommand command.
- Add search command.

Enhancemanet
- Add p tag to the default code hint pattern.
- Add the word "target" to the description of commands using a target.
- Keep insert mode even when other window is focused.
- Enable to repeat last console command execution.
- Enable to scroll by count value pixels.
- Not export empty key mapping entries to a options file.
- Scroll to new key mapping entry when it is added in the options page.

Bugfix
- Fix block extendSelection for the case that document's body has text children.
- Fix that selection may be cleared by caret display.
- Fix extracting error URL in error page.
- Finish hint mode on all frames when one frame changes the mode.
- Fix that some commands use count incorrectly.
- Remove search highlighting if no text is matched.
- Fix that setCaret can set a caret on comment node.
- Fix viewSelectionSource when selecting only text in a HTMLElement.
- Fix snapping window size.

