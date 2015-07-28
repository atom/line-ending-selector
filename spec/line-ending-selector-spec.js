'use babel';

describe("line ending selector", () => {
  let lineEndingTile, lineEndingModal, lineEndingSelector;

  beforeEach(() => {
    waitsForPromise(() => {
      return atom.packages.activatePackage('status-bar');
    });

    waitsForPromise(() => {
      return atom.packages.activatePackage('line-ending-selector');
    });

    waits(1);

    runs(() => {
      let statusBar = atom.workspace.getBottomPanels()[0].getItem();
      lineEndingModal = atom.workspace.getModalPanels()[0];
      lineEndingSelector = lineEndingModal.getItem();
      jasmine.attachToDOM(lineEndingSelector[0]);

      lineEndingTile = statusBar.getRightTiles()[0].getItem();
      expect(lineEndingTile.className).toBe("line-ending-tile");
      expect(lineEndingTile.textContent).toBe("");
    });
  });

  describe("when empty file is opened", () => {
    it("determines line ending from system platform", () => {
      waitsForPromise(() => {
        return atom.workspace.open("").then(() => {
          expect(lineEndingTile.textContent).toBe("LF");
        });
      });
    });
  });

  describe("when a file is opened that contains all Windows line endings", () => {
    it("displays 'CRLF' line endings", () => {
      waitsForPromise(() => {
        return atom.workspace.open('windows-endings.md').then(() => {
          expect(lineEndingTile.textContent).toBe("CRLF");
        });
      });
    });
  });

  describe("when a file is opened that contains mixed line endings", () => {
    it("displays 'Mixed' line endings", () => {
      waitsForPromise(() => {
        return atom.workspace.open('mixed-endings.md').then(() => {
          expect(lineEndingTile.textContent).toBe("Mixed");
        });
      });
    });
  });

  describe("when a file is opened that contains all Unix line endings", () => {
    it("displays 'LF' line endings", () => {
      waitsForPromise(() => {
        return atom.workspace.open('unix-endings.md').then(() => {
          expect(lineEndingTile.textContent).toBe("LF");
        });
      });
    });
  });

  describe("clicking the tile", () => {
    beforeEach(() => {
      waitsForPromise(() => {
        return atom.workspace.open('unix-endings.md');
      });

      runs(() => {
        lineEndingTile.dispatchEvent(new MouseEvent('click', {}));
      });
    });

    it("opens the line ending selector modal", () => {
      expect(lineEndingModal.isVisible()).toBe(true);
      expect(lineEndingSelector).toHaveFocus();
      let listItems = lineEndingSelector.list.find('li');
      expect(listItems[0].textContent).toBe('LF');
      expect(listItems[1].textContent).toBe('CRLF');

      lineEndingSelector.filterEditorView.getModel().setText('CR');

      advanceClock(100);

      atom.commands.dispatch(lineEndingSelector[0], 'core:confirm');
      expect(lineEndingModal.isVisible()).toBe(false);
      expect(lineEndingTile.textContent).toBe('CRLF');
    });

    describe("when modal is exited", () => {
      it("leaves the tile selection as-is", () => {
        atom.commands.dispatch(lineEndingSelector[0], 'core:cancel');
        expect(lineEndingTile.textContent).toBe('LF');
      });
    });
  });
});
