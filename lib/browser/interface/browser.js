const EventEmitter = require('events');

class Browser extends EventEmitter {

  isReady(){ throw new Error("Not Implemented.") }
  exit(...args){ throw new Error("Not Implemented.") }
  /**
   * @return {Promise<object>} - object is browserWindow object provided by each browser.
   */
  createBrowserWindow(config, callbacks){ throw new Error("Not Implemented.") }
  /**
   * @return {BrowserPage}
   */
  createBrowserPage(window){ throw new Error("Not Implemented.") }
}

Browser.Events = {
  Ready: 'ready',
  NewWindow: 'new-window',
  Closed: 'closed',
}

module.exports = Browser;
