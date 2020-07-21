/**
 * This is a Mixin object to extend for Page class.
 * Define the Alias method for methods that is defined in Page class, or define any other convinience methods.
 */
let PageMethods = {
  /**
   * When string given, load given URL page. Otherwise, wait for finish page load.
   * This is same for `page.load()` or `page.waitForPageLoad()`
   * @return {Promise}
   */
  waitLoading: function(...args){
    if(typeof args[0] == 'undefined' || typeof args[0] == 'function'){
      return this.waitForPageLoad(...args)
    }else{
      return this.load(...args)
    }
  },
  /**
   * Alias of "waitForXXXX" method.
   * @param {string} type - Type of event for waiting. type string must be waitFor"XXXX".
   * @param {function} action - A function representing the operation of open alert dialog
   * @param {any} args - any arguments for waitFor"XXXX"
   */
  waitFor(type, action, ...args){
    if(!this[`waitFor${type}`]){
      throw new Error('Invalid type: ' + type);
    }
    return this[`waitFor${type}`](action, ...args);
  }
  /**
  * Create and Return new Finder object that is selecting clickable element
  * which is a-tag, button-tag, input[type=button,type=submit]-tag.
  * @return {Finder}
  */
  findClickable: function(){
    return this.find().isClickable()
  },
  // TODO: do you need this method?
  takeScreenshotAuto: function(){
    if(!config.takeScreenshotAuto) return Promise.resolve();

    let now = new Date();
    let datetimeString = now.toLocaleString().replace(/[\-\:]/g, '').replace(/\ /, '_');
    let millsecString = (1000 + now.getMilliseconds()).toString().substr(1);
    filename = `${datetimeString}_${millsecString}.png`
    return this.takeScreenshot(path.join(config.screenshotsDir, filename));
  }
}

module.exports = PageMethods;
