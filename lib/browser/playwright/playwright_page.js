const path = require('path');
const fs = require('fs');
const EventEmitter = require('events');
const BrowserPage = require("../interface/browser_page");
const BrowserSocket = require("../interface/browser_socket");
const PlaywrightFinderExtention = require("./playwright_finder_extention");
const {config} = require("../../utils/config");
const DateFormat = require('../../utils/date_format');
const Logger = require('../../utils/logger')

const TIMEOUT_MSEC = config.mocha.timeout;
const DOWNLOAD_PATH = path.resolve(config.fileDownloadDir);

/**
 * BrowserPage implementation for Playwright.
 */
class PlaywrightPage extends BrowserPage {
  constructor(window){
    super();
    this._window = window;
    const browserSocket = this._browserSocket = new PlaywrightSocket();

    this._window.whenReady().then(()=>{
      this.nativeObject.exposeFunction('invokeBrowserSocket', (method, ...args)=>{
        // TODO
        // arguments may be given as ['[','"','s','e','n','d',,,,,
        if(method == "["){
           args = JSON.parse(method + args.join(""));
           method = args.shift();
        }
        return browserSocket[method](...args);
      })
      this.nativeObject.addInitScript(()=>{
        window.browserSocket = {
          on: (...args)=>{ window.invokeBrowserSocket('on', ...args) },
          once: (...args)=>{ window.invokeBrowserSocket('once', ...args) },
          removeAllListeners: (...args)=>{ window.invokeBrowserSocket('removeAllListeners', ...args) },
          send: (...args)=>{ window.invokeBrowserSocket('send', ...args) },
        }
      });
    })
  }
  on(eventName, callback){
    this._addEventListener(eventName, callback, false)
  }
  once(eventName, callback){
    this._addEventListener(eventName, callback, true)
  }
  _addEventListener(eventName, callback, once = true){
    if(eventName in PlaywrightPage.EventMappings){
      this.nativeObject[once ? 'once' : 'on'](PlaywrightPage.EventMappings[eventName], callback)
    }else{
      super[once ? 'once' : 'on'](eventName, callback)
    }
  }
  removeAllListeners(eventName){
    if(eventName in PlaywrightPage.EventMappings){
      this.nativeObject.removeAllListeners(PlaywrightPage.EventMappings[eventName])
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
    return PlaywrightFinderExtention;
  }
  /**
   * @return {Promise<BrowserPage>}
   */
  loadURL(url, options = {}){
    return this.nativeObject.goto(url)
    .catch((err)=>{
      // a navigation still pending from the previous action (e.g. an inline download)
      // can interrupt this navigation (firefox is strict about this).
      // wait for it to settle, then retry once.
      if(String(err.message).includes('interrupted by another navigation')){
        return this.nativeObject.waitForLoadState('load', { timeout: TIMEOUT_MSEC }).catch(()=>{})
        .then(()=>{ return this.nativeObject.goto(url) });
      }
      throw err;
    });
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
    // pagewalker rejects with a string (e.toString()) inside the browser, but the
    // firefox driver drops non-Error rejection values ("undefined" reaches Node).
    // convert rejection values to Error before they cross the protocol.
    // code can be an expression or statements: statements are wrapped in an IIFE.
    const stripped = String(code).replace(/;\s*$/, "");
    const expression = PlaywrightPage._isExpression(stripped) ? stripped : `(()=>{ ${code} })()`;
    const wrapped = `Promise.resolve().then(()=>{ return (${expression}) })` +
                    `.catch((e)=>{ throw (e instanceof Error ? e : new Error(e)) })`;
    return this.nativeObject.evaluate(wrapped, ...args);
  }
  /**
   * @private
   */
  static _isExpression(code){
    try {
      new Function(`return (${code})`);
      return true;
    } catch(e) {
      return false;
    }
  }
  /**
   * show developer tool, not supported yet.
   */
  openDevTools(){ /*ignore*/ }
  /**
   * Wait for download completion caused by the given action.
   * "attachment" is handled with playwright's first-class download event,
   * "inline" is handled by saving the response body.
   * @return {Promise<object>}
   */
  waitForDownload(action, options){

    const downloadPath = options.downloadPath || path.join(DOWNLOAD_PATH, DateFormat.toTimepstampMsecString(new Date()))
    const callbacks = {};
    let timeoutId;

    const cleanup = ()=>{
      this.nativeObject.off('download', callbacks['download']);
      this.nativeObject.off('response', callbacks['response']);
      clearTimeout(timeoutId);
      return true;
    }

    return new Promise((resolve, reject)=>{
      timeoutId = setTimeout(()=>{ cleanup() && reject(new Error('timeout')) }, TIMEOUT_MSEC);

      // content-disposition: attachment
      callbacks['download'] = (download)=>{
        const filename = download.suggestedFilename();
        const savedFilePath = path.resolve(path.join(downloadPath, filename));
        download.saveAs(savedFilePath)
        .then(()=>{ cleanup() && resolve({ filename: filename, savedFilePath: savedFilePath }) })
        .catch((err)=>{ cleanup() && reject(err) });
      };

      // "inline" is saved from the response body.
      // "attachment" is also tried from the response body, because some browsers
      // (e.g. WebKit) don't fire the download event; in browsers where the resource
      // is detached for downloading (e.g. Chromium), body() fails and the download
      // event above takes care of it instead.
      callbacks['response'] = (response)=>{
        let contentDisposition = response.headers()["content-disposition"];
        if(!contentDisposition || !contentDisposition.match(/^(attachment|inline);/)) return;
        const isInline = !!contentDisposition.match(/^inline;/);

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

        response.body()
        .then((buffer)=>{
          return fs.promises.mkdir(downloadPath, { recursive: true })
          .then(()=>{ return fs.promises.writeFile(fileInfo.savedFilePath, buffer) })
          .then(()=>{
            // "inline" means the browser is navigating to the file itself.
            // wait until the navigation settles, so that the next page.load
            // does not conflict with it (firefox is strict about this).
            return isInline ? this.nativeObject.waitForLoadState('load').catch(()=>{}) : undefined;
          })
          .then(()=>{ cleanup() && resolve(fileInfo) });
        })
        .catch((err)=>{
          // for "attachment", body() failure means the browser handles it as a real
          // download: leave it to the download event.
          if(isInline){ cleanup() && reject(err) }
        });
      };

      this.nativeObject.on('download', callbacks['download']);
      this.nativeObject.on('response', callbacks['response']);
      Promise.resolve(action && action()).catch(reject);
    }); // end Promise
  }

  /**
   * @return {Promise<string>} resolved by confirm message
   */
  _waitForDialog(dialogType, action, message = undefined, isClickOK = false){
    return new Promise((resolve, reject)=>{

      let dialogCallback;

      let timeoutId = setTimeout(()=>{
        this.nativeObject.off('dialog', dialogCallback);
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
          this.nativeObject.off('dialog', dialogCallback);
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

  setExtraHTTPHeaders(headers) {
    return this.nativeObject.setExtraHTTPHeaders(headers);
  }
}

/**
 * BrowserSocket implementation for Playwright (in-process EventEmitter).
 */
class PlaywrightSocket extends BrowserSocket {
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

PlaywrightPage.EventMappings = {
  [BrowserPage.Events.Load]: 'domcontentloaded',
  [BrowserPage.Events.LoadError]: 'requestfailed',
}

module.exports = PlaywrightPage;
