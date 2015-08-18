'use babel'

export default class StatusBarItem {
  constructor () {
    this.element = document.createElement('a')
    this.element.className = 'line-ending-tile'
    this.setLineEndings(new Set())
  }

  setLineEndings (lineEndings) {
    this.lineEndings = lineEndings
    this.element.textContent = lineEndingName(lineEndings)
  }

  hasLineEnding (lineEnding) {
    return this.lineEndings.has(lineEnding)
  }

  onClick (callback) {
    this.element.addEventListener('click', callback)
  }
}

function lineEndingName (lineEndings) {
  if (lineEndings.size > 1) {
    return 'Mixed'
  } else if (lineEndings.has('\n')) {
    return 'LF'
  } else if (lineEndings.has('\r\n')) {
    return 'CRLF'
  } else {
    return ''
  }
}
