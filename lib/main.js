'use babel'

import _ from 'underscore-plus'
import {CompositeDisposable, Disposable} from 'atom'
import SelectListView from 'atom-select-list'
import StatusBarItem from './status-bar-item'
import helpers from './helpers'

const LineEndingRegExp = /\r\n|\n/g
const LFRegExp = /(^|[^\r])\n/g
const CRLFRegExp = /\r\n/g

let disposables = null
let modalPanel = null
let lineEndingListView = null

export function activate () {
  disposables = new CompositeDisposable()

  disposables.add(atom.commands.add('atom-text-editor', {
    'line-ending-selector:show': (event) => {
      if (!modalPanel) {
        lineEndingListView = new SelectListView({
          items: [{name: 'LF', value: '\n'}, {name: 'CRLF', value: '\r\n'}],
          filterKeyForItem: (lineEnding) => lineEnding.name,
          didConfirmSelection: (lineEnding) => {
            // TODO[v1.19]: Remove conditional once atom.workspace.getActiveTextEditor ships in Atom v1.19
            if (atom.workspace.getActiveTextEditor) {
              setLineEnding(atom.workspace.getActiveTextEditor(), lineEnding.value)
            } else {
              setLineEnding(atom.workspace.getActivePaneItem(), lineEnding.value)
            }
            modalPanel.hide()
          },
          didCancelSelection: () => {
            modalPanel.hide()
          },
          elementForItem: (lineEnding) => {
            const element = document.createElement('li')
            element.textContent = lineEnding.name
            return element
          }
        })
        modalPanel = atom.workspace.addModalPanel({item: lineEndingListView})
        disposables.add(new Disposable(() => {
          lineEndingListView.destroy()
          modalPanel.destroy()
          modalPanel = null
        }))
      }

      lineEndingListView.reset()
      modalPanel.show()
      lineEndingListView.focus()
    },

    'line-ending-selector:convert-to-LF': (event) => {
      const editorElement = event.target.closest('atom-text-editor')
      setLineEnding(editorElement.getModel(), '\n')
    },

    'line-ending-selector:convert-to-CRLF': (event) => {
      const editorElement = event.target.closest('atom-text-editor')
      setLineEnding(editorElement.getModel(), '\r\n')
    }
  }))
}

export function deactivate () {
  disposables.dispose()
}

export function consumeStatusBar (statusBar) {
  let statusBarItem = new StatusBarItem()
  let currentBufferDisposable = null
  let tooltipDisposable = null

  const updateTile = _.debounce((buffer) => {
    getLineEndings(buffer).then((lineEndings) => {
      if (lineEndings.size === 0) {
        let defaultLineEnding = getDefaultLineEnding()
        buffer.setPreferredLineEnding(defaultLineEnding)
        lineEndings = new Set().add(defaultLineEnding)
      }
      statusBarItem.setLineEndings(lineEndings)
    })
  }, 0)

  const observeActiveItem = function (item) {
    if (currentBufferDisposable) currentBufferDisposable.dispose()

    if (item && item.getBuffer) {
      let buffer = item.getBuffer()
      updateTile(buffer)
      currentBufferDisposable = buffer.onDidChange(({oldText, newText}) => {
        if (!statusBarItem.hasLineEnding('\n')) {
          if (newText.indexOf('\n') >= 0) {
            updateTile(buffer)
          }
        } else if (!statusBarItem.hasLineEnding('\r\n')) {
          if (newText.indexOf('\r\n') >= 0) {
            updateTile(buffer)
          }
        } else if (oldText.indexOf('\n')) {
          updateTile(buffer)
        }
      })
    } else {
      statusBarItem.setLineEndings(new Set())
      currentBufferDisposable = null
    }

    if (tooltipDisposable) {
      disposables.remove(tooltipDisposable)
      tooltipDisposable.dispose()
    }
    tooltipDisposable = atom.tooltips.add(statusBarItem.element, {
      title () {
        return `File uses ${statusBarItem.description()} line endings`
      }
    })
    disposables.add(tooltipDisposable)
  }

  // TODO[v1.19]: Remove conditional once atom.workspace.observeActiveTextEditor ships in Atom v1.19
  if (atom.workspace.observeActiveTextEditor) {
    disposables.add(atom.workspace.observeActiveTextEditor(observeActiveItem))
  } else {
    disposables.add(atom.workspace.observeActivePaneItem(observeActiveItem))
  }

  disposables.add(new Disposable(() => {
    if (currentBufferDisposable) currentBufferDisposable.dispose()
  }))

  statusBarItem.onClick(() => {
    let editor

    // TODO[v1.19]: Remove conditional once atom.workspace.getActiveTextEditor ships in Atom v1.19
    if (atom.workspace.getActiveTextEditor) {
      editor = atom.workspace.getActiveTextEditor()
    } else {
      editor = atom.workspace.getActivePaneItem()
    }

    atom.commands.dispatch(
      atom.views.getView(editor),
      'line-ending-selector:show'
    )
  })

  let tile = statusBar.addRightTile({item: statusBarItem, priority: 200})
  disposables.add(new Disposable(() => tile.destroy()))
}

function getDefaultLineEnding () {
  switch (atom.config.get('line-ending-selector.defaultLineEnding')) {
    case 'LF':
      return '\n'
    case 'CRLF':
      return '\r\n'
    case 'OS Default':
    default:
      return (helpers.getProcessPlatform() === 'win32') ? '\r\n' : '\n'
  }
}

function getLineEndings (buffer) {
  if (typeof buffer.find === 'function') {
    return Promise.all([
      buffer.find(LFRegExp),
      buffer.find(CRLFRegExp)
    ]).then(([hasLF, hasCRLF]) => {
      const result = new Set()
      if (hasLF) result.add('\n')
      if (hasCRLF) result.add('\r\n')
      return result
    })
  } else {
    return new Promise((resolve) => {
      const result = new Set()
      for (let i = 0; i < buffer.getLineCount() - 1; i++) {
        result.add(buffer.lineEndingForRow(i))
      }
      resolve(result)
    })
  }
}

function setLineEnding (item, lineEnding) {
  if (item && item.getBuffer) {
    let buffer = item.getBuffer()
    buffer.setPreferredLineEnding(lineEnding)
    buffer.setText(buffer.getText().replace(LineEndingRegExp, lineEnding))
  }
}
