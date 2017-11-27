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

    this._browser = new (require(`./browser/${config.browser}`))(config[config.browser]);

    const Walker = LoadWalkerModule();
    this._walker = new Walker(config);

    this._browser.on('ready', ()=>{
      this._walker.walk((failures)=>{
        console.log(`[${failures == 0? 'SUCCESS': 'FAILURE'}!] finished with status:${failures}`);
        if(this.config.exitImmediately){
          this._browser.exit(failures);  // exit with non-zero status if there were failures
        }else{
          Object.values(this.windows).forEach((window)=>{ window.page.openDevTools() });;
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
  getWindowById(id){
    return Object.values(this.windows).filter(window => window.id && window.id == id )[0];
  }
  createWindow(name, windowOptions = {}){
    return this.createWindowWithId(name, undefined, windowOptions);
  }
  createWindowWithId(name, id, windowOptions = {}){
    const Window = LoadWindowModudle();
    this.windows[name] = new Window(id, name, this._browser, windowOptions);
    return this.windows[name];
  }
  /**
   * remove window referrence, but not destroy window object.
   */
  removeWindow(name){
    this.windows[name] = undefined;
  }
  /**
   * remove window referrence, but not destroy window object.
   */
  removeWindowById(id){
    let window = this.getWindowById(id);
    if(window && window.name){
      this.windows[window.name] = undefined;
    }

  }

}

module.exports = new PageWalker();
