'use babel'

import _ from 'underscore-plus'
import {CompositeDisposable, Disposable} from 'atom'
import StatusBarItem from './status-bar-item'
import helpers from './helpers'

const LineEndingRegExp = /\r\n|\n/g

let disposables = null
let modalPanel = null

export const config = {
  defaultLineEnding: {
    title: 'Default line ending for new files',
    type: 'string',
    'default': 'OS Default',
    enum: ['OS Default', 'LF', 'CRLF'],
    description: 'Default line ending for new files'
  }
}

export function activate () {
  disposables = new CompositeDisposable()

  disposables.add(atom.commands.add('atom-text-editor', {
    'line-ending-selector:show': (event) => {
      if (!modalPanel) {
        const LineEndingListView = require('./line-ending-list-view')

        modalPanel = atom.workspace.addModalPanel({
          item: new LineEndingListView((lineEnding) => {
            if (lineEnding) {
              setLineEnding(atom.workspace.getActivePaneItem(), lineEnding)
            }
            modalPanel.hide()
          })
        })

        disposables.add(new Disposable(() => {
          modalPanel.destroy()
          modalPanel = null
        }))
      }

      modalPanel.show()
      modalPanel.getItem().reset()
    },

    'line-ending-selector:convert-to-LF': (event) => {
      setLineEnding(event.target.getModel(), '\n')
    },

    'line-ending-selector:convert-to-CRLF': (event) => {
      setLineEnding(event.target.getModel(), '\r\n')
    }
  }))
}

export function deactivate () {
  disposables.dispose()
}

export function consumeStatusBar (statusBar) {
  let statusBarItem = new StatusBarItem()
  let currentBufferDisposable = null

  function updateTile (buffer) {
    let lineEndings = getLineEndings(buffer)
    if (lineEndings.size === 0) {
      let defaultLineEnding = getDefaultLineEnding()
      buffer.setPreferredLineEnding(defaultLineEnding)
      lineEndings = new Set().add(defaultLineEnding)
    }
    statusBarItem.setLineEndings(lineEndings)
  }

  let debouncedUpdateTile = _.debounce(updateTile, 0)

  disposables.add(atom.workspace.observeActivePaneItem((item) => {
    if (currentBufferDisposable) currentBufferDisposable.dispose()

    if (item && item.getBuffer) {
      let buffer = item.getBuffer()
      updateTile(buffer)
      currentBufferDisposable = buffer.onDidChange(({oldText, newText}) => {
        if (!statusBarItem.hasLineEnding('\n')) {
          if (newText.indexOf('\n') >= 0) {
            debouncedUpdateTile(buffer)
          }
        } else if (!statusBarItem.hasLineEnding('\r\n')) {
          if (newText.indexOf('\r\n') >= 0) {
            debouncedUpdateTile(buffer)
          }
        } else if (LineEndingRegExp.test(oldText)) {
          debouncedUpdateTile(buffer)
        }
      })
    } else {
      statusBarItem.setLineEndings(new Set())
      currentBufferDisposable = null
    }
  }))

  disposables.add(new Disposable(() => {
    if (currentBufferDisposable) currentBufferDisposable.dispose()
  }))

  statusBarItem.onClick(() => {
    atom.commands.dispatch(
      atom.views.getView(atom.workspace.getActivePaneItem()),
      'line-ending-selector:show'
    )
  })

  let tile = statusBar.addRightTile({item: statusBarItem.element, priority: 200})
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
  let result = new Set()
  for (let i = 0; i < buffer.getLineCount() - 1; i++) {
    result.add(buffer.lineEndingForRow(i))
  }
  return result
}

function setLineEnding (item, lineEnding) {
  if (item && item.getBuffer) {
    let buffer = item.getBuffer()
    buffer.setPreferredLineEnding(lineEnding)
    buffer.setText(buffer.getText().replace(LineEndingRegExp, lineEnding))
  }
}
