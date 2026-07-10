const path = require('path');
const {config} = require('../utils/config');
const Page = require('./page');
const pageWalker = require('../page_walker');

/**
 * Represents a browser window which contains a Page.
 */
class Window {
  constructor(browser, browserWindow, options = {}){
    let configCloned = config.clone();
    configCloned.merge({ [config.browser]: options });

    // if browserWindow has been ready
    if(browserWindow){
      this._browserWindow = browserWindow;
      this._readyPromise = Promise.resolve(this);
      return;
    }

    // browserWindow will be created asynchronously after the browser is ready.
    this._readyPromise = new Promise((resolve)=>{
      let windowSetupAfterReady = ()=>{
        pageWalker.browser.createBrowserWindow(configCloned[config.browser])
        .then((createdBrowserWindow)=>{
          this._browserWindow = createdBrowserWindow;
          resolve(this);
        });
      };
      if(browser && browser.isReady()){
        windowSetupAfterReady();
      }else{
        browser.on('ready', windowSetupAfterReady);
      }
    });
  }
  /**
   * Returns a Promise resolved with this window when the underlying browserWindow is ready.
   * Safe to call at any time: if the window is already ready, the Promise is already resolved.
   * @return {Promise<Window>}
   */
  whenReady(){
    return this._readyPromise;
  }
  /**
   * @return {object} BrowserWindow Object(Provided by Each Browser)
   * @see Browser#createWindow
   */
  get browserWindow(){ return this._browserWindow }
  /**
   * close this BrowserWindow();
   */
  close(){
    // Each browserWindow object must have close() method.
    this._browserWindow.close();
  }
  /**
   * @private
   */
  isReadyForPage(){ return !!this._browserWindow }
  /**
   * get Page object in this window.
   * @return {Page}
   */
  get page(){
    if(!this._page){
      this._page = new Page(pageWalker.browser.createBrowserPage(this));
    }
    return this._page;
  }
}

module.exports = Window;
