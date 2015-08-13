'use babel';

import _ from 'underscore-plus';

import LineEndingListView from './line-ending-list-view';
import {Point, Range, CompositeDisposable, Disposable} from 'atom';
import helpers from './helpers';

let lineEndingTile = null;
let disposables = null;
let currentLineEnding = null;

const LINE_ENDINGS_BY_NAME = {
  "CRLF": "\r\n",
  "LF": "\n"
};

const LINE_ENDINGS = ["\n", "\r\n"]

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
      updateTile(buffer);
      currentBufferDisposable = buffer.onDidChange(({newText}) => {
        for (let ending of LINE_ENDINGS)
          if (ending !== currentLineEnding && newText.indexOf(ending) >= 0) {
            debouncedUpdateTile(buffer);
            return;
          }
      });
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
  let lineEndingName = getLineEnding(buffer);
  currentLineEnding = LINE_ENDINGS_BY_NAME[lineEndingName];

  if (!lineEndingName) {
    lineEndingName = getPlatformLineEnding();
    buffer.setPreferredLineEnding(LINE_ENDINGS_BY_NAME[lineEndingName]);
  }
  lineEndingTile.textContent = lineEndingName;
}

function getPlatformLineEnding() {
  if (helpers.getProcessPlatform() === 'win32') return 'CRLF';
  return 'LF';
}

function getLineEnding(buffer) {
  let hasLF = false;
  let hasCRLF = false;

  for (let i = 0; i < buffer.getLineCount(); i++) {
    switch (buffer.lineEndingForRow(i)) {
      case "\n":
        hasLF = true;
        break;
      case "\r\n":
        hasCRLF = true;
        break;
    }
  }

  if (hasLF && hasCRLF) return "Mixed";
  if (hasLF) return "LF";
  if (hasCRLF) return "CRLF";
  return null;
}

const LineEndingRegExp = /\r\n|\n/g

function setLineEnding(item, lineEnding) {
  if (item && item.getBuffer) {
    let buffer = item.getBuffer();
    buffer.setPreferredLineEnding(lineEnding);
    buffer.setText(buffer.getText().replace(LineEndingRegExp, lineEnding))
  }
}
