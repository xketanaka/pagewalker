const electron = require('electron');
const Config = require('./utils/config');
const LoadWalkerModule = ()=>{ return require('./walker/walker') }; // for Lazy loading
const LoadWindowModudle = ()=>{ return require('./page/window') }; // for Lazy loading

class PageWalker {
  constructor(){
    this.windows = {};
  }
  start(config){
    this._config = config;

    this._browser = new (require(`./browser/${config.browser}`))();

    const Walker = LoadWalkerModule();
    this._walker = new Walker(Config.config);

    this._browser.on('ready', ()=>{
      Object.values(this.windows).forEach((window)=>{ window.emit('ready') });

      this._walker.walk((failures)=>{
        console.log(`[${failures == 0? 'SUCCESS': 'FAILURE'}!] finished with status:${failures}`);
        if(this.config.exitImmediately){
          this._browser.exit(failures);  // exit with non-zero status if there were failures
        }else{
          Object.values(this.windows).forEach((window)=>{ window.browserWindow.webContents.openDevTools() });;
        }
      })
    })
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
    return this.getWindow().page;
  }
  getWindow(name = "__default__"){
    if(name == "__default__" && !this.windows[name]){
      this.createWindow("__default__", { title: "MainWindow - PageWalker" });
    }
    return this.windows[name]
  }
  createWindow(name, windowOptions = {}){
    const Window = LoadWindowModudle();
    const isReadyBrowser = this._browser && this._browser.isReady();
    this.windows[name] = new Window(name, isReadyBrowser, windowOptions);
    if(isReadyBrowser){
      this.windows[name].emit('ready');
    }
    return this.getWindow(name);
  }
  removeWindow(name){
    this.windows[name] = undefined;
  }
  /**
   * Handle window.open event.
   * prevent default-behavior and create new Window object which is managed by pageWalker.
   */
  onCreateNewWindow(event, url, frameName, disposition, options, additionalFeatures){
    event.preventDefault();
    let win = this.getWindow(frameName) || this.createWindow(frameName, options);
    if(url && url != "about:blank"){
      win.page.load(url)
    }
    event.newGuest = win.browserWindow
  }
}

module.exports = new PageWalker();
