const EventEmitter = require('events');

class Browser extends EventEmitter {

  isReady(){ throw new Error("Not Implemented.") }
  exit(...args){ throw new Error("Not Implemented.") }
  /**
   * @return {Promise<object>} - object is browserWindow object provided by each browser.
   */
  createBrowserWindow(config, callbacks){ throw new Error("Not Implemented.") }
  /**
   * Get a browserWindow object by id if browserWindow given the id exist.
   * @return {Promise<object>} - object is browserWindow object provided by each browser.
   */
  getBrowserWindowById(id){ throw new Error("Not Implemented.") }
  /**
   * @return {BrowserPage}
   */
  createBrowserPage(window){ throw new Error("Not Implemented.") }
}

Browser.Events = {
  Ready: 'ready',
}

module.exports = Browser;
