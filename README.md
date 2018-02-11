# VVimpulation
A Firefox add-on which provides keyboard navigation like Vim

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

