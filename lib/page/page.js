const path = require('path');
const Finder = require('./finder');
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
   * Wait loading for contents in new page.
   * @param {function} action - A function representing the operation of loading new page.
   * @return {Promise}
   */
  waitForPageLoad(action){
    return this._waitForContent(action, BrowserPage.Events.Load, BrowserPage.Events.LoadError)
  }
  /**
   * Wait loading for contents in frame.
   * @param {function} action - A function representing the operation of loading in frame contents
   * @return {Promise}
   */
  waitForFrameLoaded(action){
    return this._waitForContent(action, BrowserPage.Events.FrameLoad, BrowserPage.Events.FrameLoadError)
  }
  /**
   * @private
   */
  _waitForContent(action, successEvent, failEvent){
    return this.invokeAfterReady((resolve, reject)=>{
      this.browserPage.removeAllListeners(successEvent);
      this.browserPage.removeAllListeners(failEvent);

      let timeoutId = setTimeout(()=>{ reject(new Error('timeout')) }, TIMEOUT_MSEC);
      this.browserPage.once(successEvent, (event)=>{
        clearTimeout(timeoutId)
        resolve(this)
      })
      this.browserPage.once(failEvent, (event)=>{
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
   * @return {Promise}
   * @example
   *   const item = await page.waitForDownload(()=>{
   *     ...
   *   })
   *   assert.equal(await (util.promisify(fs.readFile))(item.saveFilePath, 'utf-8'), ...);
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
   * @param {function} action - A function representing the operation of sending Browser Socket Message
   * @param {string} channel - string of representing the channel of Browser Socket Message
   * @return {Promise}
   */
  waitForBrowserSocket(action, channel = 'asynchronous-message'){
    return this.invokeAfterReady((resolve, reject)=>{
      let timeoutId = setTimeout(()=>{ reject('timeout') }, TIMEOUT_MSEC);
      this.browserPage.socket.removeAllListeners(channel);
      this.browserPage.socket.once(channel, (event, arg)=>{
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
    return this.waitForBrowserSocket(()=>{
      return this.executeJs(`{
        let _XMLHttpRequest = ${this.context ? this.context : 'window'}.XMLHttpRequest;
        let _browserSocket = ${this.context ? 'parent' : 'window'}.browserSocket;
        if(!_XMLHttpRequest.prototype.__original_open){
          _XMLHttpRequest.prototype.__original_open = _XMLHttpRequest.prototype.open;
        }
        _XMLHttpRequest.prototype.open = function(){
          let timeoutId = setTimeout(()=>{ _browserSocket.send('asynchronous-message', 'timeout') }, ${TIMEOUT_MSEC})
          this.addEventListener('readystatechange', function(){
            if(this.readyState == 4){
              clearTimeout(timeoutId);
              setTimeout(()=>{ _browserSocket.send('asynchronous-message', 'ajaxComplete') }, 0);
            }
          });
          _XMLHttpRequest.prototype.__original_open.apply(this, arguments);
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
      const channel = 'confirm-synchronous';
      let timeoutId = setTimeout(()=>{ reject(new Error('timeout')) }, TIMEOUT_MSEC);
      this.browserPage.socket.once(channel, (event, arg)=>{
        clearTimeout(timeoutId);
        if(message && message != arg){
          reject(new Error(`expected message is "${message}", but actual is "${arg}"`));
        }
        event.returnValue = isClickOK;
        resolve(message);
      });
      return this.executeJs(`
        if(!window.__original_confirm){
          window.__original_confirm = window.confirm;
        }
        window.confirm = function(message){
          var ret = browserSocket.sendSync('${channel}', message);
          window.confirm = window.__original_confirm;
          return ret;
        };
      `)
      .then(()=>{ return action && action() })
      .catch(reject)
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
    let finder = new Finder(this, ...args)
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

  findClickable(){
    return this.find().isClickable()
  }
}

module.exports = Page;
