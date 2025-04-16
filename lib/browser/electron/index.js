const electron = require('electron');
const {BrowserWindow} = electron;
const Browser = require('../interface/browser');
const ElectronPage = require('./electron_page');

/**
* SupportEvent
*  - ready
*  - new-window
*  - closed
*/
class ElectronBrowser extends Browser {
  constructor(options){
    super();
    this._app = electron.app;
    this._app.on('window-all-closed', ()=>{ this._app.quit() });
    this._app.on('ready', (...args)=>{ this.emit(Browser.Events.Ready, ...args) });
  }
  isReady(){
    return this._app.isReady();
  }
  exit(...args){
    return this._app.exit(...args)
  }
  /**
   * @return {Promise<object>} - object is browserWindow object provided by each browser.
   */
  createBrowserWindow(windowOptions){
    return Promise.resolve(this.createBrowserWindowNotPromise(windowOptions));
  }
  createBrowserPage(window){
    return new ElectronPage(window);
  }
  /**
   * @private
   * @return {object} - BrowserWindow object provided by electron.
   */
   createBrowserWindowNotPromise(windowOptions){
    const browserWindow = new BrowserWindow(windowOptions);

    browserWindow.webContents.on('context-menu', (e, params)=>{
      browserWindow.webContents.inspectElement(params.x, params.y);
    })
    browserWindow.webContents.on('did-create-window', (newBrowserWindow, {url, frameName, disposition, options})=>{
      this.emit(Browser.Events.NewWindow, newBrowserWindow, frameName);
    })
    browserWindow.on('closed', (event)=>{
      this.emit(Browser.Events.Closed, browserWindow);
    });
    return browserWindow;
  }
}

module.exports = ElectronBrowser;
