const EventEmitter = require('events');

class BrowserPage extends EventEmitter {
  get window(){ throw new Error("Not Implemented") }
  get nativeObject(){ throw new Error("Not Implemented") }
}

module.exports = BrowserPage;
