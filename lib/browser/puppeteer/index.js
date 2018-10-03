const puppeteer = require('puppeteer');
const Browser = require('../interface/browser');
const PuppeteerPage = require('./puppeteer_page');

class PuppeteerBrowser extends Browser {
  constructor(options = {}){
    super();
    // puppeteer v0.13 not supported launch "defaultViewport" option, so setViewport later.
    this._launchOptions = options;
    puppeteer.launch(options).then((browser)=>{
      this._browser = browser;
      this.emit(Browser.Events.Ready);
    })
    this.on(Browser.Events.Ready, ()=>{ this._ready = true });
  }
  isReady(){
    return !!this._ready;
  }
  exit(...args){
    this._browser && this._browser.close();
    process.exit(...args);
  }
  createBrowserWindow(windowOptions, callbacks){
    return new Promise((resolve, reject)=>{
      if(this.isReady()){
        this._browser.newPage().then(resolve);
      }
      this.on(Browser.Events.Ready, ()=>{
        this._browser.newPage().then(resolve);
      })
    })
    .then((browserPage)=>{
      this._browserPage = browserPage;
      // puppeteer v0.13 not supported launch "defaultViewport" option, so setViewport now.
      if(this._launchOptions.defaultViewport){
        this._browserPage.setViewport(this._launchOptions.defaultViewport);
      }
      this._browser.on('targetcreated', (target)=>{
        if(target.type() != 'page') return;
        target.page().then((page)=>{
          return page.evaluate(()=>{ return window.name })
        })
        .then((frameName)=>{
          callbacks['new-window'](frameName, target._targetInfo.targetId, {});
        })
      })
      this._browser.on('targetdestroyed', (target)=>{
        if(target.type() != 'page') return;
        callbacks['closed'](target._targetInfo.targetId)
      })
      return { id: browserPage._client.targetId(), browserWindow: browserPage };
    })
  }
  /**
   * Get a browserWindow object by id if browserWindow given the id exist.
   * @return {Promise<object>} - object is browserWindow object provided by each browser.
   */
  getBrowserWindowById(id){
    if(id && this._browser){
      return this._browser.pages()
      .then((pages)=>{
        return pages.filter(page => page._client.targetId() == id)[0];
      })
    }else{
      return Promise.resolve()
    }
  }
  createBrowserPage(window){
    return new PuppeteerPage(window);
  }
}

module.exports = PuppeteerBrowser;
