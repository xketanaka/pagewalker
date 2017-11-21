const EventEmitter = require('events');

class BrowserPage extends EventEmitter {
  /**
   * @return {Window}
   */
  get window(){ throw new Error("Not Implemented") }
  /**
   * @return {object}
   */
  get nativeObject(){ throw new Error("Not Implemented") }
  /**
   * @return {BrowserSocket}
   */
  get socket(){ throw new Error("Not Implemented") }
  /**
   * @return {Promise<BrowserPage>}
   */
  loadURL(url, options = {}){ throw new Error("Not Implemented") }
  /**
   * @return {string}
   */
  getURL(){ throw new Error("Not Implemented") }
  /**
   * @return {Promise<string|number|boolean>}
   */
  executeJavaScript(code, ...args){ throw new Error("Not Implemented") }
  /**
   * @return {Promise<object>}
   */
  waitForDownload(action, options){ throw new Error("Not Implemented") }
}

BrowserPage.Events = {
  Load: 'load',
  LoadError: 'load-error',
  FrameLoad: 'frame-load',
  FrameLoadError: 'frame-load-error',
  Download: 'download',
  NewWindow: 'new-window',
  Confirm: 'confirm',
  Alert: 'alert',
  AjaxDone: 'ajax-done',
  browserSocket: 'browser-socket',
}
module.exports = BrowserPage;
