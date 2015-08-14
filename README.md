# Line Ending Selector [![Build Status](https://travis-ci.org/atom/line-ending-selector.svg?branch=master)](https://travis-ci.org/atom/line-ending-selector)

![status bar tile](https://cloud.githubusercontent.com/assets/1305617/9274149/6b317568-4293-11e5-83ba-614a6c0d9890.png)


This is an [Atom](https://atom.io) package that displays the current line ending type of a file: `CRLF` (Windows), `LF` (Unix), or `Mixed` (both). It also lets the user change the line ending of a file.

## Install

Search for this package, "line-ending-selector", in the Install tab of Atom's Setting View. You can get to the Settings View by pressing <kbd>cmd + ,</kbd>. Select this package and click "Install".

## To Use

When the package is activated it will show the current line ending of the file in the right side of the status-bar. If a new file is created the line ending will start with the system default: `CRLF` for Windows and `LF` for Mac and Linux. If a file contains both it will display `Mixed`.

### Changing a File's Line Ending

You can click the line ending in the status-bar to open a modal with the line ending options. Selecting a different line ending will change each line of the

![modal](https://cloud.githubusercontent.com/assets/1305617/9273907/2be5c136-4291-11e5-94af-65ece408eb12.png)

**Line Endings**

- `CRLF` is "\r\n"
- `LF` is "\n"

#### Atom Commands

You can also change a file's line endings by using or <kbd>cmd + shift + P</kbd> searching for these commands:

```text
line-ending-selector:convert-to-LF
line-ending-selector:convert-to-CRLF
```
