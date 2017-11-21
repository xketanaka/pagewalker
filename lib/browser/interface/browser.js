const EventEmitter = require('events');

class Browser extends EventEmitter {

  isReady(){ throw new Error("Not Implemented.") }
  exit(){ throw new Error("Not Implemented.") }
  createWindow(config, callbacks){ throw new Error("Not Implemented.") }
  createBrowserPage(window){ throw new Error("Not Implemented.") }
}

Browser.Events = {
  Ready: 'ready',
}

module.exports = Browser;
