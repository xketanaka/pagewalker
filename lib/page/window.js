const EventEmitter = require('events');
const path = require('path');
const {config} = require('../utils/config');
const Page = require('./page');
const pageWalker = require('../page_walker');

class Window extends EventEmitter {
  constructor(id, name, browser, options = {}){
    super();
    this.id = id; // unless window exists, id is undefined
    this.name = name;
    // setup now or later
    let configCloned = config.clone();
    configCloned.merge({ [config.browser]: options });

    let windowSetup = ()=>{
      pageWalker.browser.createBrowserWindow(configCloned[config.browser], {
        'new-window': (frameName, id, options) => {
          return pageWalker.getWindow(frameName) || pageWalker.createWindow(frameName, id, options);
        },
        'closed': (id)=>{
          pageWalker.removeWindowById(id);
        }
      })
      .then((result)=>{
        this._browserWindow = result.browserWindow;
        this.id = result.id;
        this.emit('ready');
      });
    };
    if(browser && browser.isReady()){
      browser.getBrowserWindowById(id)
      .then((browserWindow)=>{
        if(browserWindow){
          this._browserWindow = browserWindow;
          this.emit('ready');
        }else{
          windowSetup();
        }
      })
    }else{
      browser.on('ready', windowSetup);
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
    // Each browserWindow object have close() method.
    this._browserWindow.close();
  }
  /**
   * @private
   */
  isReady(){ return !!this._browserWindow }
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
