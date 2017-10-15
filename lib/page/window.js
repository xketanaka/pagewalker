const EventEmitter = require('events');
const path = require('path');
const {BrowserWindow} = require('electron');
const {config} = require('../utils/config');
const Page = require('./page');

class Window extends EventEmitter {
  constructor(options = {}){
    super();
    let configCloned = config.clone();
    configCloned.merge({ browserWindow: options });
    this.on('ready', ()=>{
      this._browserWindow = new BrowserWindow(configCloned.browserWindow);
      this._browserWindow.webContents.on('context-menu', (e, params)=>{
        this._browserWindow.webContents.inspectElement(params.x, params.y);
      })
    })
  }
  /**
   * @return {object} BrowserWindow Object
   * @see https://github.com/electron/electron/blob/master/docs/api/browser-window.md
   */
  get browserWindow(){ return this._browserWindow }
  /**
   * @private
   */
  get isReady(){ return !!this._browserWindow }
  get page(){
    return this._page = this._page || new Page(this)
  }
}

module.exports = Window;
