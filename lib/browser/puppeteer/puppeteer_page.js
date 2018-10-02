const path = require('path');
const fs = require('fs');
const EventEmitter = require('events');
const BrowserPage = require("../interface/browser_page");
const BrowserSocket = require("../interface/browser_socket");
const PuppeteerFinderExtention = require("./puppeteer_finder_extention");
const {config} = require("../../utils/config");
const DateFormat = require('../../utils/date_format');

const TIMEOUT_MSEC = config.mocha.timeout;
const DOWNLOAD_PATH = path.resolve(config.fileDownloadDir);

class PuppeteerPage extends BrowserPage {
  constructor(window){
    super();
    this._window = window;
    const browserSocket = this._browserSocket = new PuppeteerSocket();

    this._window.on('ready', ()=>{
      this.nativeObject.exposeFunction('invokeBrowserSocket', (...args)=>{
        return browserSocket[args[0]](...(args.slice(1)));
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
    return this.nativeObject._client.send(
      'Page.setDownloadBehavior', {　behavior: 'allow', downloadPath: downloadPath }
    );
  }
  /**
   * @return {Promise<object>}
   */
  waitForDownload(action, options){
    const isDownloadComplete = (path)=>{
      return new Promise((resolve, reject)=>{
        fs.readdir(path, (err, files)=>{ err ? reject(err) : resolve(files) })
      })
      .then((files)=>{
        if (files.length === 0) return false;
        // now downloading file have name to match for /.crdownload/
        const nowDownloading = Array.from(files).some(file => /.*\.crdownload$/.test(file))
        return !nowDownloading
      });
    };

    const waitResponse = ()=>{
      return new Promise((resolve, reject)=>{
        let timeoutId = setTimeout(()=>{ reject(new Error('timeout')) }, TIMEOUT_MSEC);
        this.nativeObject.removeAllListeners('response');
        this.nativeObject.on('response', (response)=>{
          let contentDisposition = response.headers["content-disposition"];
          if(contentDisposition){
            clearTimeout(timeoutId);
            let matched = contentDisposition.match(/filename=\"(.*)\"$/);
            resolve(matched ? matched[1] : "");
          }
        })
        action();
      })
    };
    const waitTimeSpanMs = 100;
    const downloadPath = options.downloadPath || path.join(DOWNLOAD_PATH, DateFormat.toTimepstampMsecString(new Date()))
    if(!options.downloadPath){
      fs.mkdirSync(downloadPath)
    }
    return this._setDownloadPath(downloadPath)
// patch start: ( TODO )
// page.on('response') do not happen in puppeteer v0.13, so check saved file.
//    .then(waitResponse)
//    .then((filename)=>{
    .then(()=>{
      action();
// patch end
      return new Promise((resolve, reject)=>{
        let totalWaitTimeMs = 0;
        const waitAndCheck = ()=>{
          if(totalWaitTimeMs > TIMEOUT_MSEC) return reject(new Error('timeout'));

          setTimeout(()=>{
            totalWaitTimeMs += waitTimeSpanMs;
            isDownloadComplete(downloadPath).catch(reject).then((completed)=>{
              if(!completed) return waitAndCheck();

// patch start
              return new Promise((resolve, reject)=>{
                const findDownloadedFile = ()=>{
                  fs.readdir(downloadPath, (err, files)=>{
                    if(err) reject(err);
                    if(!files[0]) return setTimeout(findDownloadedFile, waitTimeSpanMs);
                    resolve(files[0]);
                  })
                };
                findDownloadedFile();
              })
              .then((filename)=>{
// patch end
                resolve({ filename: filename, savedFilePath: path.resolve(path.join(downloadPath, filename)) });
              });
            })
          }, waitTimeSpanMs);
        };
        waitAndCheck();
      });
    });
  }

  /**
   * @return {Promise<string>} resolved by confirm message
   */
  _waitForDialog(dialogType, action, message = undefined, isClickOK = false){
    return new Promise((resolve, reject)=>{
      let timeoutId = setTimeout(()=>{ reject(new Error('timeout')) }, TIMEOUT_MSEC);
      this.nativeObject.once('dialog', (dialog)=>{
        if(dialog.type != dialogType) return;

        clearTimeout(timeoutId);
        if(message && message != dialog.message()){
          return reject(new Error(`expected message is "${message}", but actual is "${dialog.message()}"`));
        }
        (isClickOK ? dialog.accept() : dialog.dismiss()).then(resolve);
      })
      action();
    })
  }
  waitForConfirm(action, message = undefined, isClickOK = false){
    return this._waitForDialog('confirm', action, message, isClickOK);
  }

  /**
   * @return {Promise<string>} resolved by alert message
   */
  waitForAlert(action, message = undefined){
    return this._waitForDialog('alert', action, message, true);
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
  [BrowserPage.Events.Load]: 'load',
  [BrowserPage.Events.LoadError]: 'requestfailed',
}

module.exports = PuppeteerPage;
