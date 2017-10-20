const electron = require('electron');
const Config = require('./utils/config');
const LoadWalkerModule = ()=>{ return require('./walker/walker') }; // for Lazy loading
const LoadWindowModudle = ()=>{ return require('./page/window') }; // for Lazy loading

class PageWalker {
  constructor(app){
    this.windows = {};
    this._app = app;
    this._app.on('window-all-closed', ()=>{ this._app.quit() });
    this._app.on('ready', ()=>{
      Object.values(this.windows).forEach((window)=>{ window.emit('ready') });
    })
  }
  start(commandLineArgs){
    this._config = Config.create(commandLineArgs);

    const Walker = LoadWalkerModule();
    this._walker = new Walker(Config.config);

    this._app.on('ready', ()=>{
      this._walker.walk((failures)=>{
        console.log(`[${failures == 0? 'SUCCESS': 'FAILURE'}!] finished with status:${failures}`);
        if(this.config.silentMode){
          this._app.exit(failures);  // exit with non-zero status if there were failures
        }else{
          Object.values(this.windows).forEach((window)=>{ window.browserWindow.webContents.openDevTools() });;
        }
      })
    })
  }
  get config(){
    return this._config;
  }
  get page(){
    return this.getWindow().page;
  }
  getWindow(name = "default"){
    if(name == "default" && !this.windows[name]){
      this.createWindow("default", { title: "MainWindow - PageWalker" });
    }
    return this.windows[name]
  }
  createWindow(name, windowOptions = {}){
    const Window = LoadWindowModudle();
    this.windows[name] = new Window(windowOptions);
    if(this._app.isReady()){
      this.windows[name].emit('ready');
    }
  }
}

module.exports = new PageWalker(electron.app)
