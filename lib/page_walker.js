const electron = require('electron');
const uuidv4 = require('uuid').v4;
const Config = require('./utils/config');
const LoadWalkerModule = ()=>{ return require('./walker/walker') }; // for Lazy loading
const LoadWindowModudle = ()=>{ return require('./page/window') }; // for Lazy loading
const Browser = require('./browser/interface/browser');

class PageWalker {
  constructor(){
    this.windows = {};
  }
  start(config){
    this._config = config;

    this._browser = new (require(`./browser/${config.browser}`))(config[config.browser]);

    const Walker = LoadWalkerModule();
    this._walker = new Walker(config);

    // Attach event handler to browser.
    this._browser.on(Browser.Events.Ready, ()=>{
      this._walker.walk((failures)=>{
        console.log(`[${failures == 0? 'SUCCESS': 'FAILURE'}!] finished with status:${failures}`);
        if(this.config.exitImmediately){
          this._browser.exit(failures);  // exit with non-zero status if there were failures
        }else{
          Object.values(this.windows).forEach((obj)=>{ obj.window.page.openDevTools() });;
        }
      })
    });
    this._browser.on(Browser.Events.NewWindow, (browserWindow, name)=>{
      let windowId = this.createWindow(name, browserWindow, {})
      Object.defineProperty(browserWindow, 'pwWindowUUID', { value: windowId, writable: false });
    });
    this._browser.on(Browser.Events.Closed, (browserWindow)=>{
      this.removeWindow(browserWindow.pwWindowUUID);
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
    if(!this.__defaultWindowId__){
      this.__defaultWindowId__ = this.createWindow("__default__", undefined, { title: "MainWindow - PageWalker" });
    }
    return this.getWindowById(this.__defaultWindowId__).page;
  }
  getWindowById(id){
    return this.windows[id] && this.windows[id].window;
  }
  getWindowByBrowserWindow(browserWindow){
    return this.getWindowById(browserWindow.pwWindowUUID);
  }
  getWindowByName(){
    return this.getWindowById(this.getWindowIdByName(name));
  }
  createWindow(name, browserWindow, windowOptions = {}){
    const Window = LoadWindowModudle();
    const id = uuidv4();
    this.windows[id] = {
      name: name,
      window: new Window(id, this._browser, browserWindow, windowOptions),
    }
    return id;
  }
  /**
   * remove window referrence, but not destroy window object.
   */
  removeWindow(id){
    delete this.windows[id];
  }
  /**
   *
   */
  getWindowIdByName(name){
    return Object.keys(this.windows).find(id => this.windows[id] && this.windows[id].name == name);
  }
}

module.exports = new PageWalker();
