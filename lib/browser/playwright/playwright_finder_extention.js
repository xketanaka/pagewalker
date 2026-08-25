const Finder = require("../../page/finder");

/**
 * Finder extension implemented with Playwright.
 */
class PlaywrightFinderExtention extends Finder {

  /**
   * Attach the file given with filePath.
   * Now, it is not supported that you attach a file to input-elements in iframe .
   * @param {string} filePath - Specify the path of the file to be attached
   * @param {object} options
   * @return {Promise}
   */
  attachFile(filePath, options = {}){
    return this.markFirstElement()
    .catch(()=>{ throw new Error('input element to attach file is not found') })
    .then((selector)=>{
      return this.page.browserPage.nativeObject.setInputFiles(selector, filePath)
      .finally(()=> this.removeMarker(selector));
    })
  }

  /**
   * Fill the given text into the element as a user does with the keyboard.
   * Now, it is not supported that you fill in input-elements in iframe.
   * @param {string} text - text to be filled in
   * @param {object} options
   * @param {boolean} options.sequentially - if true, press keys one by one
   * @return {Promise}
   */
  fillIn(text, options = {}){
    const nativePage = this.page.browserPage.nativeObject;
    return this.markFirstElement()
    .then((selector)=>{
      const filling = options.sequentially ?
        nativePage.fill(selector, "").then(()=> nativePage.locator(selector).pressSequentially(String(text))) :
        nativePage.fill(selector, String(text));
      return filling.finally(()=> this.removeMarker(selector));
    })
  }
}

module.exports = PlaywrightFinderExtention;
