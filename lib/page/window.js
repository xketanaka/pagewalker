const EventEmitter = require('events');
const path = require('path');
const {config} = require('../utils/config');
const Page = require('./page');
const pageWalker = require('../page_walker');

class Window extends EventEmitter {
  constructor(id, browser, browserWindow, options = {}){
    super();
    this.id = id;

    let configCloned = config.clone();
    configCloned.merge({ [config.browser]: options });

    let windowSetupAfterReady = ()=>{
      pageWalker.browser.createBrowserWindow(configCloned[config.browser])
      .then((createdBrowserWindow)=>{
        this._browserWindow = createdBrowserWindow;
        this.emit('readyForPage');
      });
    };

    // if browserWindow has been ready
    if(browserWindow){
      this._browserWindow = browserWindow;
      this.emit('readyForPage');
      return;
    }

    // if Browser has been ready
    if(browser && browser.isReady()){
      windowSetupAfterReady();
    }else{
      browser.on('ready', windowSetupAfterReady);
    }
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
