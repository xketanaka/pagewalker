const path = require('path');
const Finder = require('./finder');
const Assert = require('./assert');
const pageWalker = require('../page_walker');
const {config} = pageWalker;
const BrowserPage = require('../browser/interface/browser_page');

const TIMEOUT_MSEC = pageWalker.config.mocha.timeout;

class Page {
  constructor(browserPage, context = undefined){
    this._browserPage = browserPage;
    this._context = context;
  }
  /**
   * @return {BrowserPage} BrowserPage Object(Instance will be relayed on Browser used)
   */
  get browserPage(){ return this._browserPage }
  /**
   * @private
   */
  get context(){ return this._context }
  /**
   * @return {Window} Window Object which contains this page.
   */
  get window(){ return this._browserPage.window }
  /**
   * @return {object} Page Object provided by Each Browser
   */
  get webContents(){ return this._browserPage.nativeObject }
  /**
   * @return {Assert} Assert Object
   */
  get assert(){ return this._assert = this._assert || new Assert(this, config) }
  /**
   * @private
   */
  checkReady(){
    if(!this.window.isReady()) throw "PageContent is not ready!, Please call the 'load' method first"
  }
  /**
   * Load new page which is URL given, and returned Promise is resolved when finished load.
   * @return {Promise}
   */
  load(url, options = {}){
    let loadURLFunction = ()=>{
      return this.waitForPageLoad(()=>{ if(url) this.browserPage.loadURL(url, options) })
    };
    if(this.window.isReady()){
      return loadURLFunction()
    }else{
      return new Promise((resolve, reject)=>{
        this.window.on('ready', ()=>{ loadURLFunction().then(resolve).catch(reject) });
      });
    }
  }
  /**
   * When string given, load given URL page. Otherwise, wait for finish page load.
   * This is same for `page.load()` or `page.waitForPageLoad()`
   * @return {Promise}
   */
  waitLoading(...args){
    if(typeof args[0] == 'undefined' || typeof args[0] == 'function'){
      return this.waitForPageLoad(...args)
    }else{
      return this.load(...args)
    }
  }
  /**
   * URL of current page
   * @return {string}
   */
  get url(){
    return this.browserPage.getURL();
  }
  /**
   * Reload current page.
   * @return {Promise<object}
   */
  reload(){
    return this.browserPage.reload();
  }
  /**
   * Wait loading for contents in new page.
   * @param {function} action - A function representing the operation of loading new page.
   * @return {Promise}
   */
  waitForPageLoad(action){
    if(this._context){
      return this.waitForBrowserSocket('iframe-page-load', ()=>{
        return this.executeJs(`{
          ${this._context}.addEventListener('DOMContentLoaded', ()=>{
            window.browserSocket.send('iframe-page-load', 'loaded');
          })
        }`);
      })
    }
    return this.invokeAfterReady((resolve, reject)=>{
      this.browserPage.removeAllListeners(BrowserPage.Events.Load);
      this.browserPage.removeAllListeners(BrowserPage.Events.LoadError);

      let timeoutId = setTimeout(()=>{ reject(new Error('timeout')) }, TIMEOUT_MSEC);
      this.browserPage.once(BrowserPage.Events.Load, (event)=>{
        clearTimeout(timeoutId)
        resolve(this)
      })
      this.browserPage.once(BrowserPage.Events.LoadError, (event)=>{
        clearTimeout(timeoutId)
        reject(event)
      })
      this.invokeAction(action, reject);
    })
  }
  /**
   * Wait file-download completed and resolve the promise with result object(contains filename, savedFilePath)
   * A File is saved in config.fileDownloadDir with timestamp string like '20171225002540_print.pdf'
   * @param {function} action - A function representing the operation of file download
   * @param {object} options - options for downloading
   * @return {Promise<object>} object have property "filename" and "savedFilePath"
   * @example
   *   const item = await page.waitForDownload(()=>{
   *     ...
   *   })
   *   assert.equal(await (util.promisify(fs.readFile))(item.savedFilePath, 'utf-8'), ...);
   */
  waitForDownload(action, options = {}){
    return this.invokeAfterReady((resolve, reject)=>{
      return this.browserPage.waitForDownload(()=>{
        this.invokeAction(action, reject);
      }, options)
      .then(resolve).catch(reject);
    })
  }
  /**
   * Wait new-window opend and resolve the promise with Window object.
   * @param {function} action - A function representing the operation of open new window
   * @return {Promise}
   * @example
   *   const newWin = await page.waitForNewWindow(()=>{
   *     ...
   *   })
   *   newWin.page.find(...).click();
   *   newWin.close();
   */
  waitForNewWindow(action){
    return this.invokeAfterReady((resolve, reject)=>{
      let timeoutId = setTimeout(()=>{ reject('timeout') }, TIMEOUT_MSEC);
      this.browserPage.removeAllListeners(BrowserPage.Events.NewWindow);
      this.browserPage.once(BrowserPage.Events.NewWindow, (frameName)=>{
        clearTimeout(timeoutId);
        if(pageWalker.getWindow(frameName)){
          resolve(pageWalker.getWindow(frameName));
        }else{
          reject(new Error(`no window opened! [${frameName}]`));
        }
      })
      this.invokeAction(action, reject);
    })
  }
  /**
   * @param {string} channel - string of representing the channel of Browser Socket Message. default is 'asynchronous-message-channel'.
   * @param {function} action - A function representing the operation of sending Browser Socket Message
   * @return {Promise}
   */
  waitForBrowserSocket(channel, action){
    if(!action && typeof channel === 'function'){
      action = channel;
      channel = 'asynchronous-message-channel'
    }
    return this.invokeAfterReady((resolve, reject)=>{
      let timeoutId = setTimeout(()=>{ reject('timeout') }, TIMEOUT_MSEC);
      this.browserPage.socket.removeAllListeners(channel);
      this.browserPage.socket.once(channel, (arg)=>{
        clearTimeout(timeoutId);

        resolve(arg);
      });
      this.invokeAction(action, reject);
    })
  }
  /**
   * @param {function} action - A function representing the operation of sending Ajax request
   * @return {Promise}
   */
  waitForAjaxDone(action){
    return this.waitForBrowserSocket("notify-ajax-done", ()=>{
      return this.executeJs(`{
        let _XMLHttpRequest = ${this.context ? this.context : 'window'}.XMLHttpRequest;
        let _browserSocket = ${this.context ? 'parent' : 'window'}.browserSocket;
        let __original_open = _XMLHttpRequest.prototype.open;

        _XMLHttpRequest.prototype.open = function(){
          let timeoutId = setTimeout(()=>{ _browserSocket.send('notify-ajax-done', 'timeout') }, ${TIMEOUT_MSEC})
          this.addEventListener('readystatechange', function(){
            if(this.readyState == 4){
              clearTimeout(timeoutId);
              setTimeout(()=>{ _browserSocket.send('notify-ajax-done', 'ajaxComplete') }, 0);
            }
          });
          __original_open.apply(this, arguments);
        };
      }`)
      .then(()=>{ return action && action() })
    })
    .then((result)=>{
      if(result == 'ajaxComplete') return;
      throw result;
    });
  }
  /**
   * @param {object} confirmOption - specify message property(default undefined), and isClickOK property(default true)
   * @param {function} action - A function representing the operation of open confirm dialog
   * @return {Promise}
   * @example
   *   await page.waitConfirmDialog({ message: "Are you OK?", isClickOK: false }, ()=>{
   *     page.find("button.submit-form").click()
   *   })
   *
   *   await page.waitLoading(async ()=>{
   *     await page.waitForConfirm(async ()=>{
   *       await page.find("button.submit-form").click()
   *     })
   *   })
   */
  waitForConfirm(confirmOption, action){
    const defaultOption = { message: "", isClickOK: true };
    if(typeof action == "undefined" && typeof confirmOption == "function"){
      action = confirmOption
      confirmOption = defaultOption;
    }
    let message = confirmOption.message || defaultOption.message;
    let isClickOK = ('isClickOK' in confirmOption)? confirmOption.isClickOK : defaultOption.isClickOK;

    return this.invokeAfterReady((resolve, reject)=>{
      this.browserPage.waitForConfirm(action, message, isClickOK)
      .then(resolve).catch(reject);
    })
  }
  /**
   * @param {object} alertOptioin - specify message property(default undefined)
   * @param {function} action - A function representing the operation of open alert dialog
   * @return {Promise}
   * @example
   *   await page.waitAlertDialog({ message: "You are wrong!" }, ()=>{
   *     page.find("button.submit-form").click()
   *   })
   */
  waitForAlert(alertOptioin, action){
    const defaultOption = { message: "" };
    if(typeof action == "undefined" && typeof alertOptioin == "function"){
      action = alertOptioin
      alertOptioin = defaultOption;
    }

    return this.invokeAfterReady((resolve, reject)=>{
      this.browserPage.waitForAlert(action, alertOptioin.message)
      .then(resolve).catch(reject);
    })
  }
  /**
   * @private
   */
  invokeAfterReady(func){
    return new Promise((resolve, reject)=>{
      try{
        this.checkReady()
        func && func(resolve, reject);
      }
      catch(err){ return reject(err) }
    })
  }
  /**
   * @private
   */
  invokeAction(action, reject){
    let actionResult = action && action()
    if(actionResult instanceof Promise){
      actionResult.catch(reject)
    }
    return actionResult;
  }
  /**
   * @param {string} code - JavaScript Code for executing this page.
   * @return {Promise}
   */
  executeJs(code){
    try{ this.checkReady() }catch(err){ return Promise.reject(err) }
    return this.browserPage.executeJavaScript(code, true)
  }
  /**
   * Create and Return new Finder object with given finder-condition
   * @override
   * @return {Finder}
   */
  find(...args){
    let finder = new (this.browserPage.FinderClass)(this, ...args)
    return this.context ? finder.withContext(this.context) : finder;
  }
  /**
   * Create and Return new Page object in given iframe context.
   * @param {Finder} finderForIframe - finder object for iframe
   * @return {Page}
   * @example
   *   const pageInIframe = page.inIframe(page.find("iframe").first());
   *   await pageInIframe.find("h3").text()
   */
  inIframe(finderForIframe){
    return new Page(this._browserPage, finderForIframe.toContextString());
  }
  /**
   * Get the HTML source of current page.
   * @return {Promise} resolved by current HTML source.
   */
  getSourceHTML(){
    return this.executeJs(`document.getElementsByTagName("html")[0].outerHTML`);
  }
  /**
   * Create and Return new Finder object that is selecting clickable element
   * which is a-tag, button-tag, input[type=button,type=submit]-tag.
   * @return {Finder}
   */
  findClickable(){
    return this.find().isClickable()
  }

  openDevTools(){
    return this._browserPage.openDevTools();
  }
  // TODO: do you need this method?
  takeScreenshotAuto(){
    if(!config.takeScreenshotAuto) return Promise.resolve();

    let now = new Date();
    let datetimeString = now.toLocaleString().replace(/[\-\:]/g, '').replace(/\ /, '_');
    let millsecString = (1000 + now.getMilliseconds()).toString().substr(1);
    filename = `${datetimeString}_${millsecString}.png`
    return this.takeScreenshot(path.join(config.screenshotsDir, filename));
  }
  /**
   * Take a screenshot of this page.
   * @param {String} fileName - fileName for saving as it in config.screentshotsDir. If absolutePath is given, save to it.
   * @return {Promise} resolved when taken, the value is absolute filePath
   */
  takeScreenshot(fileName){
    if(!fileName){
      throw new Error('fileName is missing!')
    }
    if(!path.isAbsolute(fileName)){
      fileName = path.resolve(path.join(config.screenshotsDir, fileName));
    }
    return this.browserPage.takeScreenshot(fileName);
  }
}

module.exports = Page;
