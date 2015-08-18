'use babel'

import _ from 'underscore-plus'
import {CompositeDisposable, Disposable} from 'atom'
import LineEndingListView from './line-ending-list-view'
import StatusBarItem from './status-bar-item'
import helpers from './helpers'

const LineEndingRegExp = /\r\n|\n/g

let disposables = null

export function activate () {
  disposables = new CompositeDisposable()
  disposables.add(atom.commands.add('atom-text-editor', {
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
      let platformLineEnding = getPlatformLineEnding()
      buffer.setPreferredLineEnding(platformLineEnding)
      lineEndings = new Set().add(platformLineEnding)
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

  let listView = new LineEndingListView((lineEnding) => {
    if (lineEnding) {
      statusBarItem.setLineEndings(new Set().add(lineEnding))
      setLineEnding(atom.workspace.getActivePaneItem(), lineEnding)
    }

    panel.hide()
  })

  let panel = atom.workspace.addModalPanel({
    item: listView,
    visible: false
  })

  disposables.add(new Disposable(() => panel.destroy()))

  statusBarItem.onClick(() => {
    panel.show()
    listView.reset()
  })

  let tile = statusBar.addRightTile({item: statusBarItem.element, priority: 200})
  disposables.add(new Disposable(() => tile.destroy()))
}

function getPlatformLineEnding () {
  if (helpers.getProcessPlatform() === 'win32') {
    return '\r\n'
  } else {
    return '\n'
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
