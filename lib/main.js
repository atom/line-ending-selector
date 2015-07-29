'use babel';

import LineEndingListView from './line-ending-list-view';
import {Point, Range} from 'atom';
import helpers from './helpers';

let lineEndingTile = null;

export function activate() {
}

const LINE_ENDINGS_BY_NAME = {
  "CRLF": "\r\n",
  "LF": "\n"
};

export function consumeStatusBar(statusBar) {
  lineEndingTile = document.createElement('a');
  lineEndingTile.className = "line-ending-tile";

  atom.workspace.observeActivePaneItem((item) => {
    if (item && item.getBuffer) {
      let lineEnding = getLineEnding(item);
      if (!lineEnding) {
        lineEnding = getPlatformLineEnding();
        item.getBuffer().setPreferredLineEnding(LINE_ENDINGS_BY_NAME[lineEnding]);
      }
      lineEndingTile.textContent = lineEnding;
    } else {
      lineEndingTile.textContent = "";
    }
  });

  let listView = new LineEndingListView((lineEnding) => {
    if (lineEnding) {
      lineEndingTile.textContent = lineEnding;
      setLineEnding(atom.workspace.getActivePaneItem(), LINE_ENDINGS_BY_NAME[lineEnding]);
    }
    panel.hide();
  });

  let panel = atom.workspace.addModalPanel({
    item: listView,
    visible: false
  });

  lineEndingTile.addEventListener('click', () => {
    panel.show();
    listView.reset();
  });

  statusBar.addRightTile({item: lineEndingTile, priority: 200});
}

function getPlatformLineEnding() {
  if (helpers.getProcessPlatform() === 'win32') return 'CRLF';
  return 'LF';
}

function getLineEnding(item) {
  let hasLF = false;
  let hasCRLF = false;
  if (item && item.scan) {
    item.scan(/\n|\r\n/g, ({matchText}) => {
      if (matchText === "\n") hasLF = true;
      if (matchText === "\r\n") hasCRLF = true;
    });
  }
  if (hasLF && hasCRLF) return "Mixed";
  if (hasLF) return "LF";
  if (hasCRLF) return "CRLF";
  return null;
}

function setLineEnding(item, lineEnding) {
  if (item && item.getBuffer) {
    let buffer = item.getBuffer();
    buffer.setPreferredLineEnding(lineEnding);
    buffer.transact(() => {
      for (let i = 0; i < buffer.lines.length - 1; i++) {
        let line = buffer.lines[i];
        buffer.setTextInRange(new Range(new Point(i, line.length), new Point(i + 1, 0)), lineEnding, {normalizeLineEndings: false});
      }
    });
  }
}
