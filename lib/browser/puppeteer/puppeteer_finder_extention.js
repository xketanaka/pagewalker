const fs = require("fs");
const path = require("path");
const Finder = require("../../page/finder");

// filling in is retried this many times when the keystrokes have not arrived
const FILL_IN_RETRY_COUNT = 3;

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
      return this.withMarkerCleanup(selector,
        this.page.browserPage.nativeObject.$(selector).then((handle)=> handle.uploadFile(filePath)));
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
    return this.fillInWithRetry(String(text), options, FILL_IN_RETRY_COUNT);
  }
  /**
   * Mark the element, fill it in, and make sure that the text has arrived.
   * A re-render of the page between marking the element and typing into it detaches the element,
   * and then the keystrokes are lost silently: they are sent to the focused element, which is
   * not the detached one any more. Filling it in again works, because the element is marked again.
   * @private
   * @return {Promise}
   */
  fillInWithRetry(text, options, restCount){
    return this.markFirstElement()
    .then((selector)=>{
      const filling = this.page.browserPage.nativeObject.$(selector)
      .then((handle)=>{
        // the element is gone already, when the page has been re-rendered after marking it
        if(!handle) return false;

        // type() appends to the current value, so clear it first.
        // dispatch an input event too, so that frameworks sync their state with the cleared value
        return handle.evaluate((elm)=>{
          if(!('value' in elm) || elm.value === '') return;
          elm.value = '';
          elm.dispatchEvent(new Event('input', { bubbles: true }));
        })
        .then(()=> handle.type(text, { delay: options.delay || 0 }))
        // look the element up again, so that the value of the live element is checked even when
        // the marked one has been detached by a re-render
        .then(()=> this.value())
        // an empty value means that no keystroke has arrived. it is not compared to the text
        // itself, because the page can transform it (an input mask, for example)
        .then((value)=> text === '' || value !== '');
      });
      return this.withMarkerCleanup(selector, filling)
      .catch((err)=>{ if(restCount <= 0) throw err; return false });
    })
    .then((filled)=>{
      if(filled) return;
      if(restCount <= 0){
        throw new Error(`Could not fill in "${text}": the element may have been re-rendered while filling it`);
      }
      return this.fillInWithRetry(text, options, restCount - 1);
    });
  }
}

module.exports = PuppeteerFinderExtention;
