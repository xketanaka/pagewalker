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
   * @return {Finder}
   */
  get FinderClass(){
    return require("../../page/finder");
  }
  /**
   * @return {Promise<BrowserPage>}
   */
  loadURL(url, options = {}){ throw new Error("Not Implemented") }
  /**
   * @return {string}
   */
  getURL(){ throw new Error("Not Implemented") }
  /**
   * @return {Promise<object>}
   */
  reload(){ throw new Error("Not Implemented") }
  /**
   * @return {Promise<string|number|boolean>}
   */
  executeJavaScript(code, ...args){ throw new Error("Not Implemented") }
  /**
   * show developer tool
   */
  openDevTools(){ throw new Error("Not Implemented") }
  /**
   * @return {Promise<object>}
   */
  waitForDownload(action, options){ throw new Error("Not Implemented") }
  /**
   * @return {Promise<string>} resolved by confirm message
   */
  waitForConfirm(action, message, isClickOK){ throw new Error("Not Implemented") }
  /**
   * @return {Promise<string>} resolved by alert message
   */
  waitForAlert(action, message){ throw new Error("Not Implemented") }
  /**
   * @return {Promise<string>} resolved by saved filename
   */
  takeScreenshot(filename){ throw new Error("Not Implemented") }
}

BrowserPage.Events = {
  Load: 'load',
  LoadError: 'load-error',
  Download: 'download',
  NewWindow: 'new-window',
  Confirm: 'confirm',
  Alert: 'alert',
  AjaxDone: 'ajax-done',
  browserSocket: 'browser-socket',
}
module.exports = BrowserPage;
