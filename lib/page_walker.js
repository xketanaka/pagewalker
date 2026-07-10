const Logger = require('./utils/logger');
const LoadWalkerModule = ()=>{ return require('./walker/walker') }; // for Lazy loading
const LoadWindowModudle = ()=>{ return require('./page/window') }; // for Lazy loading
const Browser = require('./browser/interface/browser');

/**
 * Orchestrator of pagewalker. Initializes the browser backend and the test runner,
 * and manages Window objects. This module exports the singleton instance.
 */
class PageWalker {
  constructor(){
    this.windows = new Map(); // browserWindow object (provided by each browser) -> Window
  }
  initialize(config){
    if(this.config) return; // already initialized.

    const Walker = LoadWalkerModule();
    Logger.initialize(config);

    this._config = config;
    this._browser = new (require(`./browser/${config.browser}`))(config[config.browser]);
    this._walker = new Walker(config);
  }
  start(config){
    this.initialize(config);

    // Attach event handler to browser.
    this._browser.on(Browser.Events.Ready, ()=>{
      this._walker.walk((failures)=>{
        console.log(`[${failures == 0? 'SUCCESS': 'FAILURE'}!] finished with status:${failures}`);
        if(this.config.exitImmediately){
          this._browser.exit(failures);  // exit with non-zero status if there were failures
        }else{
          this.windows.forEach((window)=>{ window.page.openDevTools() });
        }
      })
    });
    this._browser.on(Browser.Events.NewWindow, (browserWindow)=>{
      if(!this.windows.has(browserWindow)){
        this.createWindow(browserWindow);
      }
    });
    this._browser.on(Browser.Events.Closed, (browserWindow)=>{
      // browserWindow may be null (puppeteer emits Closed with null for non-page targets)
      if(browserWindow) this.removeWindow(browserWindow);
    });
  }
  /**
   * @return {Browser} Browser Object(Instance will be relayed on Browser used)
   */
  get browser(){
    return this._browser;
  }
  get config(){
    return this._config;
  }
  get page(){
    if(!this._defaultWindow){
      this._defaultWindow = this.createWindow(undefined, { title: "MainWindow - PageWalker" });
    }
    return this._defaultWindow.page;
  }
  /**
   * @return {Window} Window object which wraps the given browserWindow, or undefined.
   */
  getWindowByBrowserWindow(browserWindow){
    return this.windows.get(browserWindow);
  }
  /**
   * Create a Window object and register it to the windows map.
   * If browserWindow is not given, it is created asynchronously and registered when ready.
   * @private
   */
  createWindow(browserWindow, windowOptions = {}){
    const Window = LoadWindowModudle();
    const window = new Window(this._browser, browserWindow, windowOptions);
    if(browserWindow){
      // register synchronously so that NewWindow listeners (e.g. waitForNewWindow)
      // can look this window up immediately in the same event loop.
      this.windows.set(browserWindow, window);
    }else{
      window.whenReady().then((w)=>{ this.windows.set(w.browserWindow, w) });
    }
    return window;
  }
  /**
   * remove window referrence, but not destroy window object.
   * @private
   */
  removeWindow(browserWindow){
    this.windows.delete(browserWindow);
  }
}

module.exports = new PageWalker();
