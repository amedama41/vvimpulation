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

