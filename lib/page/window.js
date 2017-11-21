const EventEmitter = require('events');
const path = require('path');
const {config} = require('../utils/config');
const Page = require('./page');
const pageWalker = require('../page_walker');

class Window extends EventEmitter {
  constructor(name, appIsReady, options = {}){
    super();
    this.name = name;
    // setup now or later
    let configCloned = config.clone();
    configCloned.merge({ [config.browser]: options });

    let windowSetup = ()=>{
      this._browserWindow = pageWalker.browser.createWindow(configCloned[config.browser], {
        'new-window': (...args) => {
          pageWalker.onCreateNewWindow(...args)
        },
        'closed': (event)=>{
          pageWalker.removeWindow(this.name);
        }
      })
    };
    appIsReady ? windowSetup() : this.on('ready', windowSetup);
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
  get page(){
    if(!this._page){
      this._page = new Page(pageWalker.browser.createBrowserPage(this));
    }
    return this._page;
  }
}

module.exports = Window;
