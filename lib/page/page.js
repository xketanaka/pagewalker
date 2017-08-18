const {ipcMain} = require('electron');
const Finder = require('./finder');
const PageFunctions = require('./page_functions');

const TIMEOUT_MSEC = 10000;

class Page {
  constructor(window){
    this._window = window;
    this.window.on('ready', ()=>{
      this._webContents = window.browserWindow.webContents;
      this.webContents.on('context-menu', (e, params)=>{
        this.webContents.inspectElement(params.x, params.y);
      })
    })
  }
  get window(){ return this._window }
  get webContents(){ return this._webContents }
  get functions(){ return PageFunctions }
  /**
   * @private
   */
  get isReady(){ return !!this.webContents }
  /**
   * @private
   */
  checkReady(){
    if(!this.isReady) throw "PageContent is not ready!, Please call the 'load' method first"
  }
  /**
   * @return {Promise}
   */
  load(url){
    let loadURLFunction = ()=>{
      return this.expectPageLoaded(()=>{ this.webContents.loadURL(url) })
    };
    if(this.isReady){
      return loadURLFunction()
    }else{
      return new Promise((resolve, reject)=>{
        this.window.on('ready', ()=>{ loadURLFunction().then(resolve).catch(reject) });
      });
    }
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

  //////////// sample implementation /////////////////////////////////////

  clickAndExpectPageLoaded(...args){
    return this.expectPageLoaded(()=>{
      this.find("a,button,input[type=button],input[type=submit]").find(...args).click()
    })
  }
}

module.exports = Page;
