const electron = require('electron');
const {BrowserWindow} = electron;
const Browser = require('../interface/browser');
const ElectronPage = require('./electron_page');

class ElectronBrowser extends Browser {
  constructor(){
    super();
    this._app = electron.app;
    this._app.on('window-all-closed', ()=>{ this._app.quit() });
    this._app.on('ready', (...args)=>{ this.emit('ready', ...args) });
  }
  isReady(){
    return this._app.isReady();
  }
  exit(...args){
    return this._app.exit(...args)
  }
  createWindow(windowOptions, callbacks){
    const browserWindow = new BrowserWindow(windowOptions);
    browserWindow.webContents.on('context-menu', (e, params)=>{
      browserWindow.webContents.inspectElement(params.x, params.y);
    })
    browserWindow.webContents.on('new-window', callbacks['new-window'])
    browserWindow.on('closed', callbacks['closed']);
    return browserWindow;
  }
  get browserPageConstructor(){
    return ElectronPage;
  }
}

module.exports = ElectronBrowser;
