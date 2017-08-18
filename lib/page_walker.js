const electron = require('electron');
const Window = require('./window');

class PageWalker {
  constructor(app){
    this.windows = { default: new Window({ title: "MainWindow - PageWalker" }) };
    this.app = app;
    app.on('ready', ()=>{
      Object.keys(this.windows).forEach((name)=>{ this.windows[name].emit('ready') });
    })
    app.on('window-all-closed', ()=>{ app.quit() });
  }
  getWindow(name = "default"){
    return this.windows[name]
  }
  createWindow(name, windowOptions = {}){
    this.windows[name] = new Window(windowOptions);
  }
  get page(){
    return this.getWindow().page;
  }
}

module.exports = new PageWalker(electron.app)
