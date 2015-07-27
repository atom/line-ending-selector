'use babel';

let lineEndingTile = null;

export function activate() {
  atom.workspace.observeActivePaneItem((item) => {
    let ending = getLineEnding(item);
    if (lineEndingTile) lineEndingTile.textContent = ending;
  });
}

export function consumeStatusBar(statusBar) {
  lineEndingTile = document.createElement('a');
  lineEndingTile.className = "line-ending-tile";
  statusBar.addRightTile({item: lineEndingTile, priority: 200});
}

function getLineEnding(item) {
  if (!item) return "";
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
  if (process.platform === 'win32') return "CRLF";
  return "LF";
}
