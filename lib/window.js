const EventEmitter = require('events');
const path = require('path');
const {BrowserWindow} = require('electron');
const Page = require('./page/page');

const DefaultBrowserOptions = {
  width: 1024,
  height: 768,
  show: true,
  webPreferences: {
    nodeIntegration: false,
    preload: path.join(__dirname, "window_preloaded.js"),
    allowRunningInsecureContent: true
  }
};

class Window extends EventEmitter {
  constructor(options = {}){
    super();
    let opt = Object.assign({}, DefaultBrowserOptions, options)
    if(options.webPreferences){
      Object.assign(opt.webPreferences, DefaultBrowserOptions.webPreferences, options.webPreferences);
    }
    this.on('ready', ()=>{
      this._browserWindow = new BrowserWindow(opt);
    })
  }
  get browserWindow(){ return this._browserWindow }
  get page(){
    return this._page = this._page || new Page(this)
  }
}

module.exports = Window;
