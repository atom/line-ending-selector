'use babel'

import helpers from '../lib/helpers'

function findStatusBar () {
  const footerPanels = atom.workspace.getFooterPanels()
  if (footerPanels.length > 0) return footerPanels[0].getItem()
  return atom.workspace.getBottomPanels()[0].getItem()
}

describe('line ending selector', () => {
  let lineEndingTile

  beforeEach(() => {
    waitsForPromise(() => {
      return atom.packages.activatePackage('status-bar')
    })

    waitsForPromise(() => {
      return atom.packages.activatePackage('line-ending-selector')
    })

    waits(1)

    runs(() => {
      let statusBar = findStatusBar()

      lineEndingTile = statusBar.getRightTiles()[0].getItem()
      expect(lineEndingTile.className).toMatch(/line-ending-tile/)
      expect(lineEndingTile.textContent).toBe('')
    })
  })

  describe('Commands', () => {
    let editor, editorElement

    beforeEach(() => {
      waitsForPromise(() => {
        return atom.workspace.open('mixed-endings.md').then((e) => {
          editor = e
          editorElement = atom.views.getView(editor)
        })
      })
    })

    describe('When "line-ending-selector:convert-to-LF" is run', () => {
      it('converts the file to LF line endings', () => {
        atom.commands.dispatch(editorElement, 'line-ending-selector:convert-to-LF')
        expect(editor.getText()).toBe('Hello\nGoodbye\nMixed\n')
      })
    })

    describe('When "line-ending-selector:convert-to-LF" is run', () => {
      it('converts the file to CRLF line endings', () => {
        atom.commands.dispatch(editorElement, 'line-ending-selector:convert-to-CRLF')
        expect(editor.getText()).toBe('Hello\r\nGoodbye\r\nMixed\r\n')
      })
    })
  })

  describe('Status bar tile', () => {
    describe('when an empty file is opened', () => {
      it('uses the default line endings for the platform', () => {
        waitsForPromise(() => {
          spyOn(helpers, 'getProcessPlatform').andReturn('win32')

          return atom.workspace.open('').then((editor) => {
            expect(lineEndingTile.textContent).toBe('CRLF')
            expect(editor.getBuffer().getPreferredLineEnding()).toBe('\r\n')
          })
        })

        waitsForPromise(() => {
          helpers.getProcessPlatform.andReturn('darwin')

          return atom.workspace.open('').then((editor) => {
            expect(lineEndingTile.textContent).toBe('LF')
            expect(editor.getBuffer().getPreferredLineEnding()).toBe('\n')
          })
        })
      })

      describe('when the "defaultLineEnding" setting is set to "LF"', () => {
        beforeEach(() => {
          atom.config.set('line-ending-selector.defaultLineEnding', 'LF')
        })

        it('uses LF line endings, regardless of the platform', () => {
          waitsForPromise(() => {
            spyOn(helpers, 'getProcessPlatform').andReturn('win32')

            return atom.workspace.open('').then((editor) => {
              expect(lineEndingTile.textContent).toBe('LF')
              expect(editor.getBuffer().getPreferredLineEnding()).toBe('\n')
            })
          })
        })
      })

      describe('when the "defaultLineEnding" setting is set to "CRLF"', () => {
        beforeEach(() => {
          atom.config.set('line-ending-selector.defaultLineEnding', 'CRLF')
        })

        it('uses CRLF line endings, regardless of the platform', () => {
          waitsForPromise(() => {
            return atom.workspace.open('').then((editor) => {
              expect(lineEndingTile.textContent).toBe('CRLF')
              expect(editor.getBuffer().getPreferredLineEnding()).toBe('\r\n')
            })
          })
        })
      })
    })

    describe('when a file is opened that contains only CRLF line endings', () => {
      it('displays "CRLF" as the line ending', () => {
        waitsForPromise(() => {
          return atom.workspace.open('windows-endings.md').then(() => {
            expect(lineEndingTile.textContent).toBe('CRLF')
          })
        })
      })
    })

    describe('when a file is opened that contains only LF line endings', () => {
      it('displays "LF" as the line ending', () => {
        waitsForPromise(() => {
          return atom.workspace.open('unix-endings.md').then((editor) => {
            expect(lineEndingTile.textContent).toBe('LF')
            expect(editor.getBuffer().getPreferredLineEnding()).toBe(null)
          })
        })
      })
    })

    describe('when a file is opened that contains only legacy CR line endings', () => {
      it('displays "CR" as the line ending', () => {
        waitsForPromise(() => {
          return atom.workspace.open('old-endings.md').then((editor) => {
            expect(lineEndingTile.textContent).toBe('CR')
            expect(editor.getBuffer().getPreferredLineEnding()).toBe(null)
          })
        })
      })
    })

    describe('when a file is opened that contains mixed line endings', () => {
      it('displays "Mixed" as the line ending', () => {
        waitsForPromise(() => {
          return atom.workspace.open('mixed-endings.md').then(() => {
            expect(lineEndingTile.textContent).toBe('Mixed')
          })
        })
      })
    })

    describe('clicking the tile', () => {
      let lineEndingModal, lineEndingSelector

      beforeEach(() => {
        jasmine.attachToDOM(atom.views.getView(atom.workspace))

        waitsForPromise(() => {
          return atom.workspace.open('unix-endings.md')
        })

        runs(() => {
          lineEndingTile.dispatchEvent(new MouseEvent('click', {}))
          lineEndingModal = atom.workspace.getModalPanels()[0]
          lineEndingSelector = lineEndingModal.getItem()
        })
      })

      it('opens the line ending selector modal', () => {
        expect(lineEndingModal.isVisible()).toBe(true)
        expect(lineEndingSelector).toHaveFocus()
        let listItems = lineEndingSelector.list.find('li')
        expect(listItems[0].textContent).toBe('LF')
        expect(listItems[1].textContent).toBe('CRLF')

        lineEndingSelector.filterEditorView.getModel().setText('CR')

        advanceClock(100)

        atom.commands.dispatch(lineEndingSelector[0], 'core:confirm')
        expect(lineEndingModal.isVisible()).toBe(false)

        advanceClock(1)

        expect(lineEndingTile.textContent).toBe('CRLF')
        let editor = atom.workspace.getActiveTextEditor()
        expect(editor.getText()).toBe('Hello\r\nGoodbye\r\nUnix\r\n')
        expect(editor.getBuffer().getPreferredLineEnding()).toBe('\r\n')
      })

      describe('when modal is exited', () => {
        it('leaves the tile selection as-is', () => {
          atom.commands.dispatch(lineEndingSelector[0], 'core:cancel')
          expect(lineEndingTile.textContent).toBe('LF')
        })
      })
    })

    describe('clicking out of a text editor', () => {
      it('displays no line ending in the status bar', () => {
        waitsForPromise(() => {
          return atom.workspace.open('unix-endings.md').then(() => {
            atom.workspace.getActivePane().destroy()
            expect(lineEndingTile.textContent).toBe('')
          })
        })
      })
    })

    describe('when the buffer\'s line endings change', () => {
      let editor, editorElement

      beforeEach(() => {
        waitsForPromise(() => {
          return atom.workspace.open('unix-endings.md').then((e) => {
            editor = e
            editorElement = atom.views.getView(editor)
          })
        })
      })

      it('updates the line ending text in the tile', () => {
        jasmine.useRealClock()

        let tileText = lineEndingTile.textContent
        let tileUpdateCount = 0
        Object.defineProperty(lineEndingTile, 'textContent', {
          get () {
            return tileText
          },

          set (text) {
            tileUpdateCount++
            tileText = text
          }
        })

        expect(lineEndingTile.textContent).toBe('LF')

        runs(() => {
          editor.setTextInBufferRange([[0, 0], [0, 0]], '... ')
          editor.setTextInBufferRange([[0, Infinity], [1, 0]], '\r\n', {normalizeLineEndings: false})
        })

        waits(1)

        runs(() => {
          expect(tileUpdateCount).toBe(1)
          expect(lineEndingTile.textContent).toBe('Mixed')
        })

        runs(() => {
          atom.commands.dispatch(editorElement, 'line-ending-selector:convert-to-CRLF')
        })

        waits(1)

        runs(() => {
          expect(tileUpdateCount).toBe(2)
          expect(lineEndingTile.textContent).toBe('CRLF')
        })

        runs(() => {
          atom.commands.dispatch(editorElement, 'line-ending-selector:convert-to-LF')
        })

        waits(1)

        runs(() => {
          expect(tileUpdateCount).toBe(3)
          expect(lineEndingTile.textContent).toBe('LF')
        })

        runs(() => {
          editor.setTextInBufferRange([[0, 0], [0, 0]], '\n')
        })

        waits(1)

        runs(() => {
          expect(tileUpdateCount).toBe(3)
        })
      })
    })
  })
})
