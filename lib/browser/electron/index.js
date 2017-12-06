const electron = require('electron');
const {BrowserWindow} = electron;
const Browser = require('../interface/browser');
const ElectronPage = require('./electron_page');

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
  createBrowserWindow(windowOptions, callbacks){
    const browserWindow = new BrowserWindow(windowOptions);

    browserWindow.webContents.on('context-menu', (e, params)=>{
      browserWindow.webContents.inspectElement(params.x, params.y);
    })
    browserWindow.webContents.on('new-window', (event, url, frameName, disposition, options, additionalFeatures)=>{
      event.preventDefault();
      let newWindow = callbacks['new-window'](frameName, undefined, options);
      if(url && url != "about:blank"){
        newWindow.page.load(url)
      }
      event.newGuest = newWindow.browserWindow
    })
    const browserWindowId = browserWindow.id; // on closed event, browserWindow object has been destroyed, so could not get "id";
    browserWindow.on('closed', (event)=>{
      callbacks['closed'](browserWindowId);
    });
    return Promise.resolve({ id: browserWindow.id, browserWindow: browserWindow });
  }
  /**
   * Get a browserWindow object by id if browserWindow given the id exist.
   * @return {Promise<object>} - object is browserWindow object provided by each browser.
   */
  getBrowserWindowById(id){
    return Promise.resolve(id && BrowserWindow.fromId(parseInt(id)));
  }

  createBrowserPage(window){
    return new ElectronPage(window);
  }
}

module.exports = ElectronBrowser;
