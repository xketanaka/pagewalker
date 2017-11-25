const path = require('path');
const {ipcMain} = require('electron');
const BrowserPage = require("../interface/browser_page");
const BrowserSocket = require("../interface/browser_socket");
const ElectronFinderExtention = require("./electron_finder_extention");
const {config} = require("../../utils/config");
const DateFormat = require('../../utils/date_format');

const TIMEOUT_MSEC = config.mocha.timeout;

class ElectronPage extends BrowserPage {
  constructor(window){
    super();
    this._window = window;

    this._window.on('ready', ()=>{
      this.nativeObject.on('new-window', (event, url, frameName)=>{
        this.emit(BrowserPage.Events.NewWindow, frameName);
      })
    })
  }
  on(eventName, callback){
    this._addEventListener(eventName, callback, fasle)
  }
  once(eventName, callback){
    this._addEventListener(eventName, callback)
  }
  _addEventListener(eventName, callback, once = true){
    if(eventName in ElectronPage.EventMappings){
      this.nativeObject[once ? 'once' : 'on'](ElectronPage.EventMappings[eventName], callback)
    }else{
      super[once ? 'once' : 'on'](evnetName, callback)
    }
  }
  removeAllListeners(eventName){
    if(eventName in ElectronPage.EventMappings){
      this.nativeObject.removeAllListeners(ElectronPage.EventMappings[eventName])
    }else{
      super.removeAllListeners(eventName);
    }
  }
  get window(){
    return this._window;
  }
  get nativeObject(){
    return this._window.browserWindow.webContents;
  }
  get socket(){
    this._socket = this._socket || new ElectronSocket();
    return this._socket;
  }
  get FinderClass(){
    return ElectronFinderExtention;
  }
  loadURL(url, options = {}){
    return this.nativeObject.loadURL(url, options)
  }
  getURL(){
    return this.nativeObject.getURL();
  }
  executeJavaScript(code, ...args){
    return this.nativeObject.executeJavaScript(code, ...args);
  }
  waitForDownload(action, options){
    return new Promise((resolve, reject)=>{
      let timeoutId = setTimeout(()=>{ reject('timeout') }, TIMEOUT_MSEC);

      this.nativeObject.session.once('will-download', (event, item, webContents) => {
        const result = {};
        // Set the save path, making Electron not to prompt a save dialog.
        result.filename = `${DateFormat.toTimepstampString(new Date())}_${item.getFilename()}`;
        result.savedFilePath = path.resolve(path.join(config.fileDownloadDir, result.filename));

        item.setSavePath(result.savedFilePath);
        item.on('updated', (event, state)=>{
          if(state === 'interrupted') reject(new Error('Download is interrupted'));
        })
        item.once('done', (event, state) => {
          clearTimeout(timeoutId);
          if(state == 'completed'){
            resolve(result)
          }else{
            reject(new Error(`Download failed: ${state}`))
          }
        })
      })
      action();
    });
  }
  waitForConfirm(action, message = undefined, isClickOK = false){
    return new Promise((resolve, reject)=>{
      const channel = 'confirm-synchronous';
      let timeoutId = setTimeout(()=>{ reject(new Error('timeout')) }, TIMEOUT_MSEC);
      this.socket.once(channel, (event, arg)=>{
        clearTimeout(timeoutId);
        if(message && message != arg){
          reject(new Error(`expected message is "${message}", but actual is "${arg}"`));
        }
        event.returnValue = isClickOK;
        resolve(message);
      });
      return this.executeJavaScript(`{
        let __original_confirm = window.confirm;
        window.confirm = function(message){
          var ret = browserSocket.sendSync('${channel}', message);
          window.confirm = __original_confirm;
          return ret;
        };
      }`, true)
      .then(()=>{ return action && action() })
      .catch(reject)
    });
  }
}

class ElectronSocket extends BrowserSocket {
  on(channel, callback){
    return ipcMain.on(channel, callback);
  }
  once(channel, callback){
    return ipcMain.once(channel, callback);
  }
  removeAllListeners(channel){
    return ipcMain.removeAllListeners(channel);
  }
}

ElectronPage.EventMappings = {
  [BrowserPage.Events.Load]: 'did-finish-load',
  [BrowserPage.Events.LoadError]: 'did-fail-load',
  [BrowserPage.Events.FrameLoad]: 'did-frame-finish-load',
  [BrowserPage.Events.FrameLoadError]: 'did-fail-load',

  [BrowserPage.Events.Confirm]: 'confirm',
  [BrowserPage.Events.Alert]: 'alert',
  [BrowserPage.Events.AjaxDone]: 'ajax-done',
  [BrowserPage.Events.browserSocket]: 'browser-socket',
}

module.exports = ElectronPage;
