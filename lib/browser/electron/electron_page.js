const BrowserPage = require("../interface/browser_page");

class ElectronPage extends BrowserPage {
  constructor(window){
    super();
    this._window = window;
  }
  get window(){
    return this._window;
  }
  get nativeObject(){
    return this._window.browserWindow.webContents;
  }
}

module.exports = ElectronPage;
