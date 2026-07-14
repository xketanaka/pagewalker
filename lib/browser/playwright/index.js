const playwright = require('playwright');
const Browser = require('../interface/browser');
const PlaywrightPage = require('./playwright_page');

/**
* SupportEvent
*  - ready
*  - new-window
*  - closed
*/
class PlaywrightBrowser extends Browser {
  constructor(options = {}){
    super();

    const { browserType = 'chromium', viewport, ...launchOptions } = options;

    playwright[browserType].launch(launchOptions)
    .then((browser)=>{
      this._browser = browser;
      return browser.newContext({ viewport: viewport, acceptDownloads: true });
    })
    .then((context)=>{
      this._context = context;

      // fires for every page in the context: context.newPage() and popups(window.open)
      context.on('page', (page)=>{
        this.emit(Browser.Events.NewWindow, page);
        page.on('close', ()=>{ this.emit(Browser.Events.Closed, page) });
      });

      this._ready = true;
      this.emit(Browser.Events.Ready);
    })
    .catch((err)=>{
      console.error(`[pagewalker] Failed to launch playwright browser "${browserType}".`);
      console.error(String(err.message));
      console.error(`[pagewalker] If the browser is not installed yet, run: npx playwright install ${browserType}`);
      process.exit(1);
    })
  }
  isReady(){
    return !!this._ready;
  }
  exit(...args){
    Promise.resolve(this._browser && this._browser.close())
    .catch(()=>{ /* ignore close failure on exit */ })
    .then(()=>{ process.exit(...args) });
  }
  createBrowserWindow(windowOptions){
    return new Promise((resolve, reject)=>{
      if(this.isReady()){
        this._context.newPage().then(resolve).catch(reject);
      }else{
        this.on(Browser.Events.Ready, ()=>{
          this._context.newPage().then(resolve).catch(reject);
        })
      }
    })
  }
  createBrowserPage(window){
    return new PlaywrightPage(window);
  }
}

module.exports = PlaywrightBrowser;
