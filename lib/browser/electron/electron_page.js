const fs = require('fs');
const path = require('path');
const {ipcMain} = require('electron');
const BrowserPage = require("../interface/browser_page");
const BrowserSocket = require("../interface/browser_socket");
const ElectronFinderExtention = require("./electron_finder_extention");
const {config} = require("../../utils/config");
const DateFormat = require('../../utils/date_format');
const Logger = require('../../utils/logger');
const uuidv4 = require('uuid').v4;

const TIMEOUT_MSEC = config.mocha.timeout;

class ElectronPage extends BrowserPage {
  constructor(window){
    super();
    this._window = window;
  }
  get window(){
    return this._window;
  }
  get nativeObject(){
    return this._window.browserWindow.webContents;
  }
  on(eventName, callback){
    this._addEventListener(eventName, callback, false)
  }
  once(eventName, callback){
    this._addEventListener(eventName, callback, true)
  }
  _addEventListener(eventName, callback, once = true){
    if(eventName in ElectronPage.EventMappings){
      this.nativeObject[once ? 'once' : 'on'](ElectronPage.EventMappings[eventName], callback)
    }else{
      super[once ? 'once' : 'on'](eventName, callback)
    }
  }
  removeAllListeners(eventName){
    if(eventName in ElectronPage.EventMappings){
      this.nativeObject.removeAllListeners(ElectronPage.EventMappings[eventName])
    }else{
      super.removeAllListeners(eventName);
    }
  }
  get socket(){
    this._socket = this._socket || new ElectronSocket();
    return this._socket;
  }
  get FinderClass(){
    return ElectronFinderExtention;
  }
  loadURL(url, options = {}){
    return this.nativeObject.loadURL(url)
  }
  /**
   * @return {string}
   */
  getURL(){
    return this.nativeObject.getURL();
  }
  /**
   * @return {Promise<object}
   */
  reload(){
    return this.nativeObject.reload();
  }
  executeJavaScript(code, ...args){
    return this.nativeObject.executeJavaScript(code, ...args);
  }
  openDevTools(){
    return this.nativeObject.openDevTools();
  }
  waitForDownload(action, options){
    return new Promise((resolve, reject)=>{
      let timeoutId = setTimeout(()=>{ reject(new Error('timeout')) }, TIMEOUT_MSEC);

      this.nativeObject.session.webRequest.onResponseStarted((details)=>{
        let key = Object.keys(details.responseHeaders).find(key => key.toLowerCase() == "content-disposition");
        if (!key) return;

        const disposition = details.responseHeaders[key].find(value => value.match(/[\s]*inline/) || value.match(/[\s]*attachment/));
        if (disposition.match(/[\s]*attachment/)) {

          this.nativeObject.session.once('will-download', (event, item, webContents) => {

            const result = { filename: item.getFilename() };
            // Set the save path, making Electron not to prompt a save dialog.
            const saveFilename = `${DateFormat.toTimepstampMsecString(new Date())}_${item.getFilename()}`;
            result.savedFilePath = path.resolve(path.join(config.fileDownloadDir, saveFilename));

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
          });
        }
        else if (disposition.match(/[\s]*inline/)) {
          this.nativeObject.once('did-navigate', (event, url, httpResponseCode) => {
            clearTimeout(timeoutId);
            resolve({ filename: '', saveedFilePaht: '' });
          });
        }
      });

      action();
    });
  }
  _waitForDialog(dialogType, action, message = undefined, isClickOK = false){
    return new Promise((resolve, reject)=>{
      const channel = 'dialog_' + uuidv4();

      let dialogCallback;

      dialogCallback = (arg, event)=>{
        if(arg == 'timeout'){
          this.socket.removeAllListeners(channel);
          return reject(new Error('timeout'));
        }

        if(message == arg || !message){
          this.socket.removeAllListeners(channel)
          event.returnValue = isClickOK;
          resolve(arg);
        }else{
          Logger.warn(`expected message is "${message}", but actual is "${arg}"`);
          event.returnValue = "keepWaiting";
        }
      };

      this.socket.on(channel, dialogCallback);

      return this.executeJavaScript(`(()=>{
        let __original_dialog_func = window.${dialogType};

        let timerId = setTimeout(()=>{
          window.browserSocket.send('${channel}', 'timeout');
          window.${dialogType} = __original_dialog_func;

        }, ${TIMEOUT_MSEC});

        let __new_dialog_func = function(message){
          window.${dialogType} = __original_dialog_func;
          var ret = browserSocket.sendSync('${channel}', message || 'hello');
          if(ret == 'keepWaiting'){
            window.${dialogType} = __new_dialog_func;
          }else{
            clearTimeout(timerId);
          }
          return ret;
        };
        window.${dialogType} = __new_dialog_func;
      })()`, true)
      .then(()=>{ return action && action() })
      .catch(reject)
    });
  }
  waitForConfirm(action, message = undefined, isClickOK = false){
    return this._waitForDialog('confirm', action, message, isClickOK);
  }
  waitForAlert(action, message = undefined){
    return this._waitForDialog('alert', action, message, true);
  }
  takeScreenshot(filename){
    try{
      if(!this.nativeObject.debugger.isAttached()){
        this.nativeObject.debugger.attach("1.1");
      }
    }catch(err){ throw new Error("Debugger attach failed : " + err) }

    return new Promise((resolve, reject)=>{
      this.nativeObject.debugger.sendCommand("Page.captureScreenshot", { format: "png" }, (err, res)=>{
        this.nativeObject.debugger.detach();
        err && err.code ? reject(err.toString()) : resolve(res.data);
      })
    })
    .then((data)=>{
      return new Promise((resolve, reject)=>{
        fs.writeFile(filename, new Buffer(data,'base64'), (err)=>{
          err ? reject(err) : resolve(filename)
        })
      })
    });
  }
}

class ElectronSocket extends BrowserSocket {
  on(channel, callback){
    return ipcMain.on(channel, (event, arg)=>{ callback(arg, event) });
  }
  once(channel, callback){
    return ipcMain.once(channel, (event, arg)=>{ callback(arg, event) });
  }
  removeAllListeners(channel){
    return ipcMain.removeAllListeners(channel);
  }
  removeListener(channel, callback){
    return ipcMain.removeListener(channel, callback);
  }
  send(channel, ...args){ throw new Error("Not Implemented") }
}

ElectronPage.EventMappings = {
  [BrowserPage.Events.Load]: 'did-finish-load',
  [BrowserPage.Events.LoadError]: 'did-fail-load',
}

module.exports = ElectronPage;
