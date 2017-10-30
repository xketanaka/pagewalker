const {ipcMain} = require('electron');
const Finder = require('./finder');
const pageWalker = require('../page_walker');

const TIMEOUT_MSEC = pageWalker.config.mocha.timeout;

class Page {
  constructor(window){
    this._window = window;
  }
  /**
   * @return {Window} Window Object which contains this page.
   */
  get window(){ return this._window }
  /**
   * @return {object} WebContents Object
   * @see https://github.com/electron/electron/blob/master/docs/api/web-contents.md
   */
  get webContents(){ return this.window.browserWindow.webContents }
  /**
   * @private
   */
  checkReady(){
    if(!this.window.isReady()) throw "PageContent is not ready!, Please call the 'load' method first"
  }
  /**
   * @return {Promise}
   */
  load(url, options = {}){
    let loadURLFunction = ()=>{
      return this.expectPageLoaded(()=>{ if(url) this.webContents.loadURL(url, options) })
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
   * @return {Promise}
   */
  waitLoading(...args){
    if(typeof args[0] == 'undefined' || typeof args[0] == 'function'){
      return this.expectPageLoaded(...args)
    }else{
      return this.load(...args)
    }
  }
  /**
   * @return {string} URL of current page
   */
  get url(){
    return this.webContents.getURL();
  }
  /**
   * @param {function} action - A function representing the operation of loading new page
   * @return {Promise}
   */
  expectPageLoaded(action){
    return this.invokeAfterReady((resolve, reject)=>{
      this.webContents.removeAllListeners('did-finish-load');
      this.webContents.removeAllListeners('did-fail-load');
      action && action();

      let timeoutId = setTimeout(()=>{ reject(new Error('timeout')) }, TIMEOUT_MSEC);
      this.webContents.once('did-finish-load', (event)=>{
        clearTimeout(timeoutId)
        resolve(this)
      })
      this.webContents.once('did-fail-load', (event)=>{
        clearTimeout(timeoutId)
        reject(event)
      })
    })
  }
  /**
   * @param {function} action - A function representing the operation of file download
   * @return {Promise}
   */
  expectDownloaded(action){
    return this.invokeAfterReady((resolve, reject)=>{
      // TODO
    })
  }
  /**
   * @param {function} action - A function representing the operation of open new window
   * @return {Promise}
   */
  expectNewWindow(action){
    return this.invokeAfterReady((resolve, reject)=>{
      this.webContents.on('new-window', (event, url, frameName)=>{
        if(pageWalker.getWindow(frameName)){
          resolve(pageWalker.getWindow(frameName));
        }else{
          reject(new Error(`no window opened! [${frameName}]`));
        }
      })
      action && action();
    })
  }
  /**
   * @param {function} action - A function representing the operation of sending IPC
   * @param {string} channel - string of representing the channel of IPC
   * @return {Promise}
   */
  expectIpcReceived(action, channel = 'asynchronous-message'){
    return this.invokeAfterReady((resolve, reject)=>{
      let timeoutId = setTimeout(()=>{ reject('timeout') }, TIMEOUT_MSEC);
      ipcMain.once(channel, (event, arg)=>{
        clearTimeout(timeoutId);

        resolve(arg);
      });
      action && action();
    })
  }
  /**
   * @param {function} action - A function representing the operation of sending Ajax request
   * @return {Promise}
   */
  expectAjaxComplete(action){
    return this.expectIpcReceived(()=>{
      return this.executeJs(`
        if(!XMLHttpRequest.prototype.__original_open){
          XMLHttpRequest.prototype.__original_open = XMLHttpRequest.prototype.open;
        }
        XMLHttpRequest.prototype.open = function(){
          let timeoutId = setTimeout(()=>{ ipcRenderer.send('asynchronous-message', 'timeout') }, ${TIMEOUT_MSEC})
          this.addEventListener('readystatechange', function(){
            if(this.readyState == 4){
              clearTimeout(timeoutId);
              setTimeout(()=>{ ipcRenderer.send('asynchronous-message', 'ajaxComplete') }, 0);
            }
          });
          XMLHttpRequest.prototype.__original_open.apply(this, arguments);
        };
      `)
      .then(()=>{ action && action() })
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
   *   await page.expectConfirmDialog({ message: "Are you OK?", isClickOK: false }, ()=>{
   *     page.find("button.submit-form").click()
   *   })
   *
   *   await page.waitLoading(async ()=>{
   *     await page.expectConfirmDialog(()=>{
   *       page.find("button.submit-form").click()
   *     })
   *   })
   */
  expectConfirmDialog(confirmOption, action){
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
      ipcMain.once(channel, (event, arg)=>{
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
          var ret = ipcRenderer.sendSync('${channel}', message);
          window.confirm = window.__original_confirm;
          return ret;
        };
      `)
      .then(()=>{ action && action() })
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
   * @param {string} code - JavaScript Code for executing this page.
   * @return {Promise}
   */
  executeJs(code){
    try{ this.checkReady() }catch(err){ return Promise.reject(err) }
    return this.webContents.executeJavaScript(code, true)
  }
  /**
   * Create and Return new Finder object with given finder-condition
   * @override
   * @return {Finder}
   */
  find(...args){
    return new Finder(this, ...args);
  }
  /**
   * Get the HTML source of current page.
   * @return {Promise} resolved by current HTML source.
   */
  getSourceHTML(){
    return this.executeJs(`document.getElementsByTagName("html")[0].outerHTML`);
  }

  findClickable(){
    return this.find("a,button,input[type=button],input[type=submit]")
  }
}

module.exports = Page;
