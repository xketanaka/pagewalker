const path = require('path');
const fs = require('fs');
const EventEmitter = require('events');
const BrowserPage = require("../interface/browser_page");
const BrowserSocket = require("../interface/browser_socket");
const PuppeteerFinderExtention = require("./puppeteer_finder_extention");
const {config} = require("../../utils/config");
const DateFormat = require('../../utils/date_format');
const Logger = require('../../utils/logger')

const TIMEOUT_MSEC = config.mocha.timeout;
const DOWNLOAD_PATH = path.resolve(config.fileDownloadDir);

class PuppeteerPage extends BrowserPage {
  constructor(window){
    super();
    this._window = window;
    const browserSocket = this._browserSocket = new PuppeteerSocket();

    this._window.on('readyForPage', ()=>{
      this.nativeObject.exposeFunction('invokeBrowserSocket', (method, ...args)=>{
        // TODO
        // arguments may be given as ['[','"','s','e','n','d',,,,,
        if(method == "["){
           args = JSON.parse(method + args.join(""));
           method = args.shift();
        }
        return browserSocket[method](...args);
      })
      this.nativeObject.evaluateOnNewDocument(()=>{
        window.browserSocket = {
          on: (...args)=>{ window.invokeBrowserSocket('on', ...args) },
          once: (...args)=>{ window.invokeBrowserSocket('once', ...args) },
          removeAllListeners: (...args)=>{ window.invokeBrowserSocket('removeAllListeners', ...args) },
          send: (...args)=>{ window.invokeBrowserSocket('send', ...args) },
        }
      });
      this._setDownloadPath(DOWNLOAD_PATH);
    })
  }
  on(eventName, callback){
    this._addEventListener(eventName, callback, false)
  }
  once(eventName, callback){
    this._addEventListener(eventName, callback, true)
  }
  _addEventListener(eventName, callback, once = true){
    if(eventName in PuppeteerPage.EventMappings){
      this.nativeObject[once ? 'once' : 'on'](PuppeteerPage.EventMappings[eventName], callback)
    }else{
      super[once ? 'once' : 'on'](eventName, callback)
    }
  }
  removeAllListeners(eventName){
    if(eventName in PuppeteerPage.EventMappings){
      this.nativeObject.removeAllListeners(PuppeteerPage.EventMappings[eventName])
    }else{
      super.removeAllListeners(eventName);
    }
  }
  /**
   * @return {Window}
   */
  get window(){
    return this._window;
  }
  /**
   * @return {object}
   */
  get nativeObject(){
    return this._window.browserWindow;
  }
  /**
   * @return {BrowserSocket}
   */
  get socket(){
    return this._browserSocket;
  }
  /**
   * @return {Finder}
   */
  get FinderClass(){
    return PuppeteerFinderExtention;
  }
  /**
   * @return {Promise<BrowserPage>}
   */
  loadURL(url, options = {}){
    return this.nativeObject.goto(url);
  }
  /**
   * @return {string}
   */
  getURL(){
    return this.nativeObject.url();
  }
  /**
   * @return {Promise<object>}
   */
  reload(){
    return this.nativeObject.reload();
  }
  /**
   * @return {Promise<string|number|boolean>}
   */
  executeJavaScript(code, ...args){
    return this.nativeObject.evaluate(code, ...args);
  }
  /**
   * show developer tool, not supported yet.
   */
  openDevTools(){ /*ignoe*/ }
  /**
   * @private
   */
  _setDownloadPath(downloadPath){
    if(config.puppeteer.product == "chrome"){
      return this.nativeObject._client().send(
        'Page.setDownloadBehavior', {　behavior: 'allow', downloadPath: downloadPath }
      );
    }else{
      return Promise.resolve();
    }
  }
  /**
   * @return {Promise<object>}
   */
   waitForDownload(action, options){

    const downloadPath = options.downloadPath || path.join(DOWNLOAD_PATH, DateFormat.toTimepstampMsecString(new Date()))
    const timerIds = {}
    const callbacks = {};

    const clearPageCallback = ()=>{
      if(callbacks['response']) this.nativeObject.removeListener('response', callbacks['response']);
      if(callbacks['requestfinished']) this.nativeObject.removeListener('requestfinished', callbacks['requestfinished']);
      clearTimeout(timerIds['timeout']);
      clearInterval(timerIds['interval']);
      return true;
    }

    return new Promise((resolve, reject)=>{
      timerIds['timeout'] = setTimeout(()=>{ clearPageCallback() && reject(new Error('timeout')) }, TIMEOUT_MSEC);

      callbacks['response'] = (response)=>{
        let contentDisposition = response.headers()["content-disposition"];
        if(!contentDisposition) return;

        const matched1 = contentDisposition.match(/filename\*=(?:utf|UTF)-?8''(.*)$/);
        const matched2 = contentDisposition.match(/filename=\"(.*)\"$/);
        if(!matched1 && !matched2) {
          Logger.warn(`Content-Disposition header don't include filename attribute. [${contentDisposition}]`);
        }
        if(matched1) {
          matched1[1] = decodeURIComponent(matched1[1]);
        }
        const filename = matched1 ? matched1[1] : (matched2 ? matched2[1] : "no name");
        const fileInfo = { filename: filename, savedFilePath: path.resolve(path.join(downloadPath, filename)) };

        // wait for having downloaded in downloadPath
        if(contentDisposition.match(/^attachment;/)){

          timerIds['interval'] = setInterval(()=>{
            fs.readdir(downloadPath, (err, files)=>{
              if(err){
                if(err.code === 'ENOENT') return; // have not created directory yet.
                return clearPageCallback() && reject(new Error(err));
              }
              if (files.length === 0) return; // no downloaded file
              // In downloading, the file are given name to match for /.crdownload/
              if(Array.from(files).some(file => /.*\.crdownload$/.test(file))) return;

              // files exits, and not downloading now -> completed
              clearPageCallback() && resolve(fileInfo);
            });
          }, 100); // 100msec
        }
        if(contentDisposition.match(/^inline;/)){

          callbacks['requestfinished'] = (request)=>{
            const response = request.response();
            if(!response) return;
            if(!request.response().headers()["content-disposition"]) return;

            delete fileInfo.savedFilePath;
            clearPageCallback() && resolve(fileInfo);
          }
          this.nativeObject.on('requestfinished', callbacks['requestfinished']);
        }
      };

      this.nativeObject.on('response', callbacks['response']);
      this._setDownloadPath(downloadPath).then(()=>{ action && action() })
    })
  }

  /**
   * @return {Promise<string>} resolved by confirm message
   */
  _waitForDialog(dialogType, action, message = undefined, isClickOK = false){
    return new Promise((resolve, reject)=>{

      let dialogCallback;

      let timeoutId = setTimeout(()=>{
        this.nativeObject.removeListener('dialog', dialogCallback);
        reject(new Error('timeout'));
      }, TIMEOUT_MSEC);

      dialogCallback = (dialog)=>{

        let actualType = dialog.type();
        let actualMessage = dialog.message();

        (isClickOK ? dialog.accept() : dialog.dismiss())
        .then(()=>{
          if(dialogType != actualType){
            return Logger.warn(`Unexpected dialog type: ${actualType}`);
          }
          if(message && message != actualMessage){
            return Logger.warn(`expected message is "${message}", but actual is "${actualMessage}"`);
          }
          clearTimeout(timeoutId);
          this.nativeObject.removeListener('dialog', dialogCallback);
          resolve(actualMessage);
        })
        .catch(reject);
      };

      this.nativeObject.on('dialog', dialogCallback);
      action();
    });
  }

  /**
   * @return {Promise<string>} resolved by confirm message
   */
  waitForConfirm(action, message = undefined, isClickOK = false){
    return this._waitForDialog('confirm', action, message, isClickOK);
  }

  /**
   * @return {Promise<string>} resolved by alert message
   */
  waitForAlert(action, message = undefined){
    return this._waitForDialog('alert', action, message, true);
  }

  takeScreenshot(filename){
    return this.nativeObject.screenshot({ path: filename, type: "png" });
  }
}

class PuppeteerSocket extends BrowserSocket {
  constructor(){
    super();
    this.emitter = new EventEmitter();
  }
  on(channel, callback){
    return this.emitter.on(channel, callback);
  }
  once(channel, callback){
    return this.emitter.once(channel, callback);
  }
  removeAllListeners(channel){
    return this.emitter.removeAllListeners(channel);
  }
  send(channel, ...args){
    return this.emitter.emit(channel, ...args)
  }
}

PuppeteerPage.EventMappings = {
  [BrowserPage.Events.Load]: 'domcontentloaded',
  [BrowserPage.Events.LoadError]: 'requestfailed',
}

module.exports = PuppeteerPage;
