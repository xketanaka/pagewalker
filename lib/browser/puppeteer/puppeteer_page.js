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
// Downloads are received here, and then moved to the directory given to waitForDownload().
const DOWNLOAD_STAGING_PATH = path.join(DOWNLOAD_PATH, '.staging');

// puppeteer Browser -> Promise<CDPSession> which receives the download events
const downloadSessions = new WeakMap();

/**
 * BrowserPage implementation for Puppeteer.
 */
class PuppeteerPage extends BrowserPage {
  constructor(window){
    super();
    this._window = window;
    const browserSocket = this._browserSocket = new PuppeteerSocket();

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
      this.nativeObject.evaluateOnNewDocument(()=>{
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
  off(eventName, callback){
    if(eventName in PuppeteerPage.EventMappings){
      this.nativeObject.off(PuppeteerPage.EventMappings[eventName], callback)
    }else{
      super.off(eventName, callback);
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
  /**
   * @private
   */
  /**
   * Returns the CDP session which receives the download events of the browser.
   * It is a browser level session, because a page level one does not receive a download begun in
   * another target (window.open, target="_blank", ...). "eventsEnabled" is what makes the browser
   * send the events, and it is effective only on the session which sent it.
   * @private
   * @return {Promise<object>} resolved with the CDP session
   */
  static downloadSession(browser){
    if(!downloadSessions.has(browser)){
      downloadSessions.set(browser, Promise.resolve()
        .then(()=> browser.target().createCDPSession())
        .then((session)=>{
          return session.send('Browser.setDownloadBehavior', {
            behavior: 'allow', downloadPath: DOWNLOAD_STAGING_PATH, eventsEnabled: true
          }).then(()=> session);
        })
      );
    }
    return downloadSessions.get(browser);
  }
  /**
   * Move a downloaded file, creating the destination directory.
   * @private
   * @return {Promise}
   */
  static moveFile(fromPath, toPath){
    return fs.promises.mkdir(path.dirname(toPath), { recursive: true })
    .then(()=> fs.promises.rename(fromPath, toPath))
    .catch((err)=>{
      if(err.code != 'EXDEV') throw err;
      // the staging directory can be on another file system
      return fs.promises.copyFile(fromPath, toPath).then(()=> fs.promises.unlink(fromPath));
    });
  }
  /**
   * Wait for a file to be downloaded by the given action.
   *
   * A "Content-Disposition: attachment" response is received by the browser as a download, and
   * it is detected by the download events of CDP. The "response" event is not used for it: the
   * browser detaches such a resource for downloading, and the event does not fire at all when
   * the download is begun by a[download], target="_blank" or window.open.
   * A "inline" response is not a download (the browser shows it), so the body is saved here.
   * @return {Promise<object>}
   */
  waitForDownload(action, options){

    const downloadPath = options.downloadPath || path.join(DOWNLOAD_PATH, DateFormat.toTimepstampMsecString(new Date()))

    return PuppeteerPage.downloadSession(this.nativeObject.browser())
    .then((session)=>{
      return new Promise((resolve, reject)=>{
        const callbacks = {};
        let timeoutId;
        let download;   // { guid, suggestedFilename } of the download begun by the action

        const cleanup = ()=>{
          session.off('Browser.downloadWillBegin', callbacks['willBegin']);
          session.off('Browser.downloadProgress', callbacks['progress']);
          this.nativeObject.off('response', callbacks['response']);
          clearTimeout(timeoutId);
          return true;
        }

        timeoutId = setTimeout(()=>{
          // tell which of them happened, so that a failure on CI can be investigated
          const reason = download ? `the download "${download.suggestedFilename}" did not finish`
                                  : 'no download has begun';
          cleanup() && reject(new Error(`timeout (${reason})`));
        }, options.timeout || TIMEOUT_MSEC);

        callbacks['willBegin'] = (event)=>{
          // the first download after the action is the one which the action has begun
          download = download || { guid: event.guid, suggestedFilename: event.suggestedFilename };
        };
        callbacks['progress'] = (event)=>{
          if(!download || event.guid != download.guid) return;
          if(event.state == 'canceled'){
            return cleanup() && reject(new Error(`the download "${download.suggestedFilename}" was canceled by the browser`));
          }
          if(event.state != 'completed') return;

          const fileInfo = {
            filename: download.suggestedFilename,
            savedFilePath: path.resolve(path.join(downloadPath, download.suggestedFilename))
          };
          // move it out of the staging directory, where a download of the same name is overwritten
          PuppeteerPage.moveFile(event.filePath, fileInfo.savedFilePath)
          .then(()=>{ cleanup() && resolve(fileInfo) })
          .catch((err)=>{ cleanup() && reject(err) });
        };

        // "inline" is shown by the browser, so it never becomes a download
        callbacks['response'] = (response)=>{
          const contentDisposition = response.headers()["content-disposition"];
          if(!contentDisposition || !contentDisposition.match(/^inline;/)) return;

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

          return fs.promises.mkdir(downloadPath, { recursive: true })
          .then(()=>{ return response.content() })
          .then((buffer)=>{ return fs.promises.writeFile(fileInfo.savedFilePath, buffer) })
          .then(()=>{ cleanup() && resolve(fileInfo) })
          .catch((err)=>{ cleanup() && reject(err) });
        };

        session.on('Browser.downloadWillBegin', callbacks['willBegin']);
        session.on('Browser.downloadProgress', callbacks['progress']);
        this.nativeObject.on('response', callbacks['response']);

        Promise.resolve(action && action()).catch(reject);
      }); // end Promise
    });
  }

  /**
   * @return {Promise<string>} resolved by confirm message
   */
  _waitForDialog(dialogType, action, options = {}){
    const { message, isClickOK = false } = options;
    return new Promise((resolve, reject)=>{

      let dialogCallback;

      let timeoutId = setTimeout(()=>{
        this.nativeObject.off('dialog', dialogCallback);
        reject(new Error('timeout'));
      }, options.timeout || TIMEOUT_MSEC);

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
  waitForConfirm(action, options = {}){
    return this._waitForDialog('confirm', action, options);
  }

  /**
   * @return {Promise<string>} resolved by alert message
   */
  waitForAlert(action, options = {}){
    return this._waitForDialog('alert', action, Object.assign({}, options, { isClickOK: true }));
  }

  takeScreenshot(filename){
    return this.nativeObject.screenshot({ path: filename, type: "png" });
  }

  setExtraHTTPHeaders(headers) {
    return this.nativeObject.setExtraHTTPHeaders(headers);
  }

  /**
   * @return {boolean} whether this page has been closed
   */
  isClosed(){
    return this.nativeObject.isClosed();
  }
}

/**
 * BrowserSocket implementation for Puppeteer (in-process EventEmitter).
 */
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
