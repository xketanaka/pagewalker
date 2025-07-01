const path = require('path');
const {URL} = require('url');
const fs = require('fs');
const Finder = require('./finder');
const Assert = require('./assert');
const PageMixin = require('./page_mixin');
const pageWalker = require('../page_walker');
const {config} = pageWalker;
const Browser = require('../browser/interface/browser');
const BrowserPage = require('../browser/interface/browser_page');
const mixin = require('../utils/mixin');
const DateFormat = require('../utils/date_format');

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
   * @deprecated
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
      return this.waitForBrowserSocket({ channel: 'iframe-page-load' }, ()=>{
        let invokeTrigger = action ?
          `cw.addEventListener('unload', ()=>{
            setTimeout(()=>{ cw.addEventListener('DOMContentLoaded', sendEventFunc) }, 0);
          });` :
          `setInterval(()=> {
            if (cw.document.readyState == 'complete') {
              sendEventFunc();
            }
          }, 100);`;
        return this.executeJs(`{
          let cw = (${this._context});
          let sendEventFunc = ()=>{ window.browserSocket.send('iframe-page-load', 'loaded') };
          ${invokeTrigger}
        }`)
        .then(()=>{
          if (action && typeof action == 'function') {
            return action();
          }
        })
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
      this.browserPage.waitForDownload(action, options).then(resolve).catch(reject);
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
   * Wait for appearance of element specified by css-selector.
   * @param {string} cssSelector - CSS Selector string for finding element.
   * @param {function} action -  - A function representing the operation
   * @return {Promise}
   */
  waitForSelector(cssSelector, action){
    return this.waitForFinder(this.find(cssSelector), action);
  }
  /**
   * Wait for appearance of element specified by Finder object.
   * @param {Finder} finder - Finder object for finding element.
   * @param {function} action -  - A function representing the operation
   * @return {Promise}
   */
  waitForFinder(finder, action){
    const channel = 'ch-finder-asynchronous';
    finder.allowNotFound(true);

    return this.waitForBrowserSocket({ channel: channel, timeout: TIMEOUT_MSEC + 1000 }, ()=>{
      return this.executeJs(`(()=>{
        function elementCountByFinder(){
          ${finder.toJsCode()}
        };
        function sendIfExists(){
          try{
            if(elementCountByFinder() > 0){
              browserSocket.send('${channel}', 'found');
              return true;
            }
          }catch(e){
            browserSocket.send('${channel}', 'unknown error');
            return true;
          }
        }

        if(sendIfExists()) return;

        let timerId = setTimeout(()=>{
          browserSocket.send('${channel}', 'timeout');
          observer.disconnect();
        }, ${TIMEOUT_MSEC});

        const observer = new MutationObserver((mutations)=>{
          if(sendIfExists()) {
            clearTimeout(timerId);
            return observer.disconnect();
          }
        });
        observer.observe(document.body, { childList: true, subtree: true });

      })()`)
      .then(()=>{ action && action() })
    })
    .then((socketResult)=>{
      if(socketResult == 'found') return;
      throw new Error(socketResult == 'timeout' ? 'timeout' : 'unknown error');
    });
  }
  /**
   * @param {object} socketOption - specify channel property, and timeout property.
   * @param {function} action - A function representing the operation of sending Browser Socket Message
   * @return {Promise}
   */
  waitForBrowserSocket(socketOption, action){
    if(!action && typeof socketOption === 'function'){
      action = socketOption;
      socketOption = { channel: 'asynchronous-message-channel' };
    }
    return this.newPromiseWithCheckReady((resolve, reject)=>{
      let timeoutId = setTimeout(()=>{ reject('timeout in waitForBrowserSocket') }, socketOption.timeout || TIMEOUT_MSEC);
      this.browserPage.socket.removeAllListeners(socketOption.channel);
      this.browserPage.socket.once(socketOption.channel, (arg)=>{
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
    return this.waitForBrowserSocket({ channel: "notify-ajax-done" }, ()=>{
      return this.executeJs(`(()=>{
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
      })();`)
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
   * if window.isReadyForPage is false, return failed promise.
   * if window.isReadyForPage is true, invoke given "func".
   *   And "resolve" which is passed to "func" is resolved, "action" will be called.
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
    return Promise.all([promise1, action && promise2]).then(values => values[0]);
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
  /**
   * @return {Assert} Assert Object
   */
  assertScreen(identifier, options){
    this._assert = this._assert || new Assert(this, config)
    return this._assert.equal(identifier, options)
  }

  /**
   * Download file that url given.
   * This method operates outside of browser.
   */
  wget(url){
    url = new URL(url);
    const http = require(url.protocol.replace(/\:/, ''));

    return new Promise((resolve, reject)=>{
      http.get(url.toString(),  (res) => {
        if (res.statusCode != 200) {
          return reject(new Error(`ERROR: download response with status code: ${res.statusCode}`))
        }

        let contentDisposition = res.headers["content-disposition"];
        let filename = "unknown_file";
        if (contentDisposition) {
          const matched1 = contentDisposition.match(/filename\*=utf8''(.*)$/);
          const matched2 = contentDisposition.match(/filename=\"(.*)\"$/);
          if (matched1 || matched2) {
            filename = matched1 ? matched1[1] : matched2[1];
          }
        }
        const saveFilename = `${DateFormat.toTimepstampMsecString(new Date())}_${filename}`;
        const result = {
          filename: filename,
          savedFilePath: path.resolve(path.join(config.fileDownloadDir, saveFilename))
        };

        let fWriteStream = fs.createWriteStream(result.savedFilePath)
        res.pipe(fWriteStream)

        fWriteStream.on('close', ()=>{
          resolve(result);
        });
      })
      .on('error', (err) => {
        reject(new Error(`Failure on downloading url [${url.toString()}], reason: ${err}`))
      });
    })
  }

  /**
   * Set HTTP Headers for all requests in this page.
   * @param {*} headers
   * @returns  {Promise}
   */
  setExtraHTTPHeaders(headers){
    return this.browserPage.setExtraHTTPHeaders(headers);
  }
}

mixin(Page.prototype, PageMixin);

module.exports = Page;
