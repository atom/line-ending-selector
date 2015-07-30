'use babel';

import _ from 'underscore-plus';

import LineEndingListView from './line-ending-list-view';
import {Point, Range} from 'atom';
import helpers from './helpers';

let lineEndingTile = null;

const LINE_ENDINGS_BY_NAME = {
  "CRLF": "\r\n",
  "LF": "\n"
};

export function activate() {
  atom.commands.add('atom-text-editor', {
    'line-ending-selector:convert-to-LF': (event) => {
      setLineEnding(event.target.getModel(), '\n');
    },
    'line-ending-selector:convert-to-CRLF': (event) => {
      setLineEnding(event.target.getModel(), '\r\n');
    }
  });
}

export function consumeStatusBar(statusBar) {
  lineEndingTile = document.createElement('a');
  lineEndingTile.className = "line-ending-tile";

  const debouncedUpdateTile = _.debounce(updateTile, 0);

  atom.workspace.observeActivePaneItem((item) => {
    if (item && item.getBuffer) {
      let buffer = item.getBuffer();

      buffer.onDidChange(({newText}) => {
        if (newText === "\r\n" || newText === "\n") {
          debouncedUpdateTile(buffer);
        }
      });

      updateTile(buffer);
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

function updateTile(buffer) {
  let lineEnding = getLineEnding(buffer);

  if (!lineEnding) {
    lineEnding = getPlatformLineEnding();
    buffer.setPreferredLineEnding(LINE_ENDINGS_BY_NAME[lineEnding]);
  }
  lineEndingTile.textContent = lineEnding;
}


function getPlatformLineEnding() {
  if (helpers.getProcessPlatform() === 'win32') return 'CRLF';
  return 'LF';
}

function getLineEnding(buffer) {
  let hasLF = false;
  let hasCRLF = false;
  buffer.scan(/\n|\r\n/g, ({matchText}) => {
    if (matchText === "\n") hasLF = true;
    if (matchText === "\r\n") hasCRLF = true;
  });
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
