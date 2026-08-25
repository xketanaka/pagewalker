const fs = require("fs");
const path = require("path");
const Finder = require("../../page/finder");

/**
 * Finder extension implemented with Puppeteer.
 */
class PuppeteerFinderExtention extends Finder {

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
      return this.page.browserPage.nativeObject.$(selector)
      .then((handle)=> handle.uploadFile(filePath))
      .finally(()=> this.removeMarker(selector));
    })
  }

  /**
   * Fill the given text into the element as a user does with the keyboard.
   * Now, it is not supported that you fill in input-elements in iframe.
   * @param {string} text - text to be filled in
   * @param {object} options
   * @param {number} options.delay - msec to wait between key presses
   * @return {Promise}
   */
  fillIn(text, options = {}){
    return this.markFirstElement()
    .then((selector)=>{
      return this.page.browserPage.nativeObject.$(selector)
      .then((handle)=>{
        // type() appends to the current value, so clear it first
        return handle.evaluate((elm)=>{ if('value' in elm) elm.value = '' })
        .then(()=> handle.type(String(text), { delay: options.delay || 0 }));
      })
      .finally(()=> this.removeMarker(selector));
    })
  }
}

module.exports = PuppeteerFinderExtention;
