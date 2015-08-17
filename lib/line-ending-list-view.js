'use babel'

import { SelectListView } from 'atom-space-pen-views'

export default class LineEndingListView extends SelectListView {
  initialize (callback) {
    this.callback = callback
    super.initialize()
    this.setItems([{name: 'LF'}, {name: 'CRLF'}])
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
    this.callback(ending.name)
  }

  reset () {
    this.filterEditorView.focus()
    this.populateList()
  }
}
