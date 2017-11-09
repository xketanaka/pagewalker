const path = require('path');
const {ipcMain} = require('electron');
const Finder = require('./finder');
const pageWalker = require('../page_walker');
const {config} = pageWalker;
const DateFormat = require('../utils/date_format');

const TIMEOUT_MSEC = pageWalker.config.mocha.timeout;

class Page {
  constructor(window, context = undefined){
    this._window = window;
    this._context = context;
  }
  /**
   * @return {Window} Window Object which contains this page.
   */
  get window(){ return this._window }
  /**
   * @private
   */
  get context(){ return this._context }
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
   * Wait loading for contents in new page.
   * @param {function} action - A function representing the operation of loading new page.
   * @return {Promise}
   */
  expectPageLoaded(action){
    return this._expectContentLoaded(action, 'did-finish-load', 'did-fail-load')
  }
  /**
   * Wait loading for contents in frame.
   * @param {function} action - A function representing the operation of loading in frame contents
   * @return {Promise}
   */
  expectFrameLoaded(action){
    return this._expectContentLoaded(action, 'did-frame-finish-load', 'did-fail-load')
  }
  /**
   * @private
   */
  _expectContentLoaded(action, successEvent, failEvent){
    return this.invokeAfterReady((resolve, reject)=>{
      this.webContents.removeAllListeners(successEvent);
      this.webContents.removeAllListeners(failEvent);

      let timeoutId = setTimeout(()=>{ reject(new Error('timeout')) }, TIMEOUT_MSEC);
      this.webContents.once(successEvent, (event)=>{
        clearTimeout(timeoutId)
        resolve(this)
      })
      this.webContents.once(failEvent, (event)=>{
        clearTimeout(timeoutId)
        reject(event)
      })
      this.invokeAction(action, reject);
    })
  }
  /**
   * Wait file-download completed and resolve the promise with savedFile path.
   * A File is saved in config.fileDownloadDir with timestamp string like '20171225002540_print.pdf'
   * @param {function} action - A function representing the operation of file download
   * @return {Promise}
   * @example
   *   const filePath = await page.expectDownloaded(()=>{
   *     ...
   *   })
   *   assert.equal(await (util.promisify(fs.readFile))(filePath, 'utf-8'), ...);
   */
  expectDownloaded(action){
    return this.invokeAfterReady((resolve, reject)=>{
      let timeoutId = setTimeout(()=>{ reject('timeout') }, TIMEOUT_MSEC);

      this.webContents.session.once('will-download', (event, item, webContents) => {
        // Set the save path, making Electron not to prompt a save dialog.
        let filename = `${DateFormat.toTimepstampString(new Date())}_${item.getFilename()}`;
        let savePath = path.resolve(path.join(config.fileDownloadDir, filename));
        item.setSavePath(savePath);
        item.on('updated', (event, state)=>{
          if(state === 'interrupted') reject(new Error('Download is interrupted'));
        })
        item.once('done', (event, state) => {
          clearTimeout(timeoutId);
          if(state == 'completed'){
            resolve(savePath)
          }else{
            reject(new Error(`Download failed: ${state}`))
          }
        })
      })
      this.invokeAction(action, reject);
    })
  }
  /**
   * Wait new-window opend and resolve the promise with Window object.
   * @param {function} action - A function representing the operation of open new window
   * @return {Promise}
   * @example
   *   const newWin = await page.expectNewWindow(()=>{
   *     ...
   *   })
   *   newWin.page.find(...).click();
   *   newWin.close();
   */
  expectNewWindow(action){
    return this.invokeAfterReady((resolve, reject)=>{
      let timeoutId = setTimeout(()=>{ reject('timeout') }, TIMEOUT_MSEC);
      this.webContents.once('new-window', (event, url, frameName)=>{
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
      this.invokeAction(action, reject);
    })
  }
  /**
   * @param {function} action - A function representing the operation of sending Ajax request
   * @return {Promise}
   */
  expectAjaxComplete(action){
    return this.expectIpcReceived(()=>{
      return this.executeJs(`{
        let _XMLHttpRequest = ${this.context ? this.context : 'window'}.XMLHttpRequest;
        let _ipcRenderer = ${this.context ? 'parent' : 'window'}.ipcRenderer;
        if(!_XMLHttpRequest.prototype.__original_open){
          _XMLHttpRequest.prototype.__original_open = _XMLHttpRequest.prototype.open;
        }
        _XMLHttpRequest.prototype.open = function(){
          let timeoutId = setTimeout(()=>{ _ipcRenderer.send('asynchronous-message', 'timeout') }, ${TIMEOUT_MSEC})
          this.addEventListener('readystatechange', function(){
            if(this.readyState == 4){
              clearTimeout(timeoutId);
              setTimeout(()=>{ _ipcRenderer.send('asynchronous-message', 'ajaxComplete') }, 0);
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
    return this.webContents.executeJavaScript(code, true)
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
   * @return {Finder}
   * @example
   *   const pageInIframe = page.inIframe(page.find("iframe").first());
   *   await pageInIframe.find("h3").text()
   */
  inIframe(finderForIframe){
    return new Page(this.window, finderForIframe.toContextString());
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
