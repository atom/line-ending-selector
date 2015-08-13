'use babel';

import _ from 'underscore-plus';

import LineEndingListView from './line-ending-list-view';
import {Point, Range, CompositeDisposable, Disposable} from 'atom';
import helpers from './helpers';

let lineEndingTile = null;
let disposables = null;

const LINE_ENDINGS_BY_NAME = {
  "CRLF": "\r\n",
  "LF": "\n"
};

export function activate() {
  disposables = new CompositeDisposable;
  disposables.add(atom.commands.add('atom-text-editor', {
    'line-ending-selector:convert-to-LF': (event) => {
      setLineEnding(event.target.getModel(), '\n');
    },
    'line-ending-selector:convert-to-CRLF': (event) => {
      setLineEnding(event.target.getModel(), '\r\n');
    }
  }));
}

export function deactivate() {
  disposables.dispose();
}

export function consumeStatusBar(statusBar) {
  lineEndingTile = document.createElement('a');
  lineEndingTile.className = "line-ending-tile";

  const debouncedUpdateTile = _.debounce(updateTile, 0);
  let currentBufferDisposable = null;

  disposables.add(atom.workspace.observeActivePaneItem((item) => {
    if (currentBufferDisposable) currentBufferDisposable.dispose();

    if (item && item.getBuffer) {
      let buffer = item.getBuffer();
      currentBufferDisposable = buffer.onDidChange(({newText}) => {
        if (newText === "\r\n" || newText === "\n") {
          debouncedUpdateTile(buffer);
        }
      });

      updateTile(buffer);
    } else {
      currentBufferDisposable = null;
      lineEndingTile.textContent = "";
    }
  }));

  disposables.add(new Disposable(() => {
    if (currentBufferDisposable) currentBufferDisposable.dispose();
  }));

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

  disposables.add(new Disposable(() => panel.destroy()));

  lineEndingTile.addEventListener('click', () => {
    panel.show();
    listView.reset();
  });

  let tile = statusBar.addRightTile({item: lineEndingTile, priority: 200});
  disposables.add(new Disposable(() => tile.destroy()));
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
