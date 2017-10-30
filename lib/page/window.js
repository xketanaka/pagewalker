const EventEmitter = require('events');
const path = require('path');
const {BrowserWindow} = require('electron');
const {config} = require('../utils/config');
const Page = require('./page');
const pageWalker = require('../page_walker');

class Window extends EventEmitter {
  constructor(name, appIsReady, options = {}){
    super();
    this.name = name;
    let configCloned = config.clone();
    configCloned.merge({ browserWindow: options });

    let windowSetup = ()=>{
      this._browserWindow = new BrowserWindow(configCloned.browserWindow);
      this._browserWindow.webContents.on('context-menu', (e, params)=>{
        this._browserWindow.webContents.inspectElement(params.x, params.y);
      })
      this._browserWindow.webContents.on('new-window', (...args) => {
        pageWalker.onCreateNewWindow(...args)
      })
      this._browserWindow.on('closed', (event)=>{
        pageWalker.removeWindow(this.name);
      })
    };
    // setup now or later
    appIsReady ? windowSetup() : this.on('ready', windowSetup);
  }
  /**
   * @return {object} BrowserWindow Object
   * @see https://github.com/electron/electron/blob/master/docs/api/browser-window.md
   */
  get browserWindow(){ return this._browserWindow }
  /**
   * close this BrowserWindow();
   */
  close(){
    this.browserWindow.close();
  }
  /**
   * @private
   */
  isReady(){ return !!this.browserWindow }
  get page(){
    return this._page = this._page || new Page(this)
  }
}

module.exports = Window;
