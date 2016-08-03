'use babel'

import { SelectListView } from 'atom-space-pen-views'

export default class LineEndingListView extends SelectListView {
  initialize (callback) {
    this.callback = callback
    super.initialize()
    this.addClass('line-ending')
    this.setItems([{name: 'LF', value: '\n'}, {name: 'CRLF', value: '\r\n'}])
  }

  getFilterKey () {
    return 'name'
  }

  viewForItem (ending) {
    let element = document.createElement('li')
    element.textContent = ending.name
    return element
  }

  cancelled () {
    this.callback()
  }

  confirmed (ending) {
    this.cancel()
    this.callback(ending.value)
  }

  reset () {
    this.filterEditorView.focus()
    this.populateList()
  }
}
