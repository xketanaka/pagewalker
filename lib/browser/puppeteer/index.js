const puppeteer = require('puppeteer');
const Browser = require('../interface/browser');
const PuppeteerPage = require('./puppeteer_page');

/**
* SupportEvent
*  - ready
*  - new-window
*  - closed
*/
class PuppeteerBrowser extends Browser {
  constructor(options = {}){
    super();

    // puppeteer v0.13 not supported launch "defaultViewport" option, so setViewport later.
    // this._launchOptions = options;
    puppeteer.launch(options).then((browser)=>{
      this._browser = browser;
      this._ready = true;
      this.emit(Browser.Events.Ready);

      // trigger new-window
      this._browser.on('targetcreated', (target)=>{

        if(target.type() != 'page') return;
        target.page().then((page)=>{
          return page.evaluate(()=>{ return window.name })
          .then((frameName)=>{
            this.emit(Browser.Events.NewWindow, page, frameName)
          })
        })
      })
      // trigger closed
      this._browser.on('targetdestroyed', (target)=>{
        // https://github.com/puppeteer/puppeteer/issues/5500
        // target.type() が other となる模様
        if(target.type() == 'page' || target.type() == 'other'){
          target.page().then((page)=>{
            this.emit(Browser.Events.Closed, page)
          })
        }
      })
    })
  }
  isReady(){
    return !!this._ready;
  }
  exit(...args){
    this._browser && this._browser.close();
    process.exit(...args);
  }
  createBrowserWindow(windowOptions){
    return new Promise((resolve, reject)=>{
      if(this.isReady()){
        this._browser.newPage().then(resolve);
      }
      this.on(Browser.Events.Ready, ()=>{
        this._browser.newPage().then(resolve);
      })
    })
  }
  createBrowserPage(window){
    return new PuppeteerPage(window);
  }
}

module.exports = PuppeteerBrowser;
