const EventEmitter = require('events');

class Browser extends EventEmitter {

  // event ready

  isReady(){ throw new Error("Not Implemented.") }
  exit(){ throw new Error("Not Implemented.") }
  createWindow(config, callbacks){ throw new Error("Not Implemented.") }
  static get BrowserPage(){ throw new Error("Not Implemented.") }
}

module.exports = Browser;
