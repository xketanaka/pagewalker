const path = require('path');
const Finder = require('./finder');
const Assert = require('./assert');
const PageMethods = require('./page_methods');
const pageWalker = require('../page_walker');
const {config} = pageWalker;
const Browser = require('../browser/interface/browser');
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
   * URL of current page
   * @return {string}
   */
  get url(){
    return this.browserPage.getURL();
  }
  /**
   * Reload current page.
   * @return {Promise<object>}
   */
  reload(){
    return this.browserPage.reload();
  }
  /**
   * Load new page which is URL given, and returned Promise is resolved when finished load.
   * @return {Promise}
   */
  load(url, options = {}){
    let loadURL = (urlString)=>{
      return this.waitForPageLoad(()=>{ if(urlString) return this.browserPage.loadURL(urlString, options) })
    };
    if(this.window.isReadyForPage()){
      return loadURL(url)
    }else{
      return new Promise((resolve, reject)=>{
        this.window.once('readyForPage', ()=>{ loadURL(url).then(resolve).catch(reject) });
      });
    }
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
    return this.newPromiseWithCheckReady((resolve, reject)=>{
      let timeoutId = setTimeout(()=>{ reject(new Error('timeout in waitForPageLoad')) }, TIMEOUT_MSEC);

      let clearListenerAndTimer = ()=>{
        this.browserPage.removeAllListeners(BrowserPage.Events.Load);
        this.browserPage.removeAllListeners(BrowserPage.Events.LoadError);
        clearTimeout(timeoutId);
      }

      this.browserPage.once(BrowserPage.Events.Load, (event)=>{
        clearListenerAndTimer();
        resolve(this)
      })
    }, action)
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
    return this.newPromiseWithCheckReady((resolve, reject)=>{
      this.browserPage.waitForDownload(()=>{}, options).then(resolve).catch(reject);
    }, action)
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
    return this.newPromiseWithCheckReady((resolve, reject)=>{
      let windowOpenCallback;
      let timeoutId = setTimeout(()=>{
        pageWalker.browser.removeListener(Browser.Events.NewWindow, windowOpenCallback);
        reject('timeout in waitForNewWindow');
      }, TIMEOUT_MSEC);

      windowOpenCallback = (browserWindow)=>{
        clearTimeout(timeoutId);
        if(pageWalker.getWindowByBrowserWindow(browserWindow)){
          resolve(pageWalker.getWindowByBrowserWindow(browserWindow));
        }else{
          reject(new Error(`no window found!`));
        }
      };
      pageWalker.browser.once(Browser.Events.NewWindow, windowOpenCallback);
    }, action)
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
    return this.newPromiseWithCheckReady((resolve, reject)=>{
      let timeoutId = setTimeout(()=>{ reject('timeout in waitForBrowserSocket') }, TIMEOUT_MSEC);
      this.browserPage.socket.removeAllListeners(channel);
      this.browserPage.socket.once(channel, (arg)=>{
        clearTimeout(timeoutId);

        resolve(arg);
      });
    }, action)
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
      if(result == 'timeout') throw new Error('timeout in waitForAjaxDone');
      throw new Error(`unknown error: ${result}`);
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

    return this.newPromiseWithCheckReady((resolve, reject)=>{
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

    return this.newPromiseWithCheckReady((resolve, reject)=>{
      this.browserPage.waitForAlert(action, alertOptioin.message)
      .then(resolve).catch(reject);
    })
  }
  /**
   * @private
   */
  newPromiseWithCheckReady(func, action){
    let promise1 = new Promise((resolve, reject)=>{
      if(!this.window.isReadyForPage()){
        return reject("PageContent is not ready!, Please call the 'load' method first");
      }
      try{
        return (func && func(resolve, reject));
      }catch(err){
        return reject(err)
      }
    });

    let promise2 = new Promise((resolve, reject)=>{
      try {
        let result = action && action();
        if(result instanceof Promise){
          result.then(resolve).catch(reject)
        }else{
          resolve(result);
        }
      }catch(e){
        reject(e);
      }
    });
    return Promise.all([promise1, action && promise2]).then((values)=>{ values[1] });
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
    return this.newPromiseWithCheckReady((resolve, reject)=>{
      return this.browserPage.executeJavaScript(code, true).then(resolve).catch(reject);
    })
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
  openDevTools(){
    return this._browserPage.openDevTools();
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

// Mixin
Object.assign(Page.prototype, PageMethods);

module.exports = Page;
