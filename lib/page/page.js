const {ipcMain} = require('electron');
const Finder = require('./finder');
const PageFunctions = require('./page_functions');

const TIMEOUT_MSEC = 10000;

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
    if(!this.window.isReady) throw "PageContent is not ready!, Please call the 'load' method first"
  }
  /**
   * @return {Promise}
   */
  load(url, options = {}){
    let loadURLFunction = ()=>{
      return this.expectPageLoaded(()=>{ if(url) this.webContents.loadURL(url, options) })
    };
    if(this.window.isReady){
      return loadURLFunction()
    }else{
      return new Promise((resolve, reject)=>{
        this.window.on('ready', ()=>{ loadURLFunction().then(resolve).catch(reject) });
      });
    }
  }
  /**
   * Alias of load
   */
  waitLoading(...args){
    return this.load(...args)
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
    return new Promise((resolve,reject)=>{
      try{ this.checkReady() }catch(err){ return reject(err) }
      this.webContents.removeAllListeners('did-finish-load');
      this.webContents.removeAllListeners('did-fail-load');
      try{ action && action() }catch(e){ reject(e) }
      let timeoutId = setTimeout(()=>{ reject('timeout') }, TIMEOUT_MSEC);
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
    return new Promise((resolve,reject)=>{
      try{ this.checkReady() }catch(err){ return reject(err) }

      // TODO
    })
  }
  /**
   * @param {function} action - A function representing the operation of sending IPC
   * @param {string} channel - string of representing the channel of IPC
   * @return {Promise}
   */
  expectIpcReceived(action, channel = 'asynchronous-message'){
    return new Promise((resolve, reject)=>{
      try{ this.checkReady() }catch(err){ return reject(err) }
      try{
        let timeoutId = setTimeout(()=>{ reject('timeout') }, TIMEOUT_MSEC);
        ipcMain.once(channel, (event, arg)=>{
          clearTimeout(timeoutId);
          resolve(arg);
        });
        action && action()
      }catch(e){ reject(e) }
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
   * @param {string} code - JavaScript Code for executing this page.
   * @return {Promise}
   */
  executeJs(code){
    try{ this.checkReady() }catch(err){ return Promise.reject(err) }
    return this.webContents.executeJavaScript(code, true)
  }
  /**
   * @override
   * @return {Finder} new Finder object
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

  //////////// sample implementation /////////////////////////////////////

  clickAndExpectPageLoaded(...args){
    return this.expectPageLoaded(()=>{
      this.find("a,button,input[type=button],input[type=submit]").find(...args).click()
    })
  }
}

module.exports = Page;
