const Finder = require("../../page/finder");

// filling in is retried this many times when the keystrokes have not arrived
const FILL_IN_RETRY_COUNT = 3;

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
      return this.withMarkerCleanup(selector, this.page.browserPage.nativeObject.setInputFiles(selector, filePath));
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
    if(!options.sequentially){
      // fill() resolves the selector at the moment of filling, so it is not disturbed by a re-render
      return this.markFirstElement()
      .then((selector)=>{
        return this.withMarkerCleanup(selector, this.page.browserPage.nativeObject.fill(selector, String(text)));
      })
    }
    return this.fillInSequentiallyWithRetry(String(text), FILL_IN_RETRY_COUNT);
  }
  /**
   * Mark the element, press the keys into it, and make sure that the text has arrived.
   * A re-render of the page between marking the element and pressing the keys detaches the
   * element, and then the keystrokes are lost silently: they are sent to the focused element,
   * which is not the detached one any more.
   * @private
   * @return {Promise}
   */
  fillInSequentiallyWithRetry(text, restCount){
    const nativePage = this.page.browserPage.nativeObject;
    return this.markFirstElement()
    .then((selector)=>{
      const filling = nativePage.fill(selector, "")
      .then(()=> nativePage.locator(selector).pressSequentially(text))
      // look the element up again, so that the value of the live element is checked even when
      // the marked one has been detached by a re-render
      .then(()=> this.value())
      // an empty value means that no keystroke has arrived. it is not compared to the text
      // itself, because the page can transform it (an input mask, for example)
      .then((value)=> text === '' || value !== '');

      return this.withMarkerCleanup(selector, filling)
      .catch((err)=>{ if(restCount <= 0) throw err; return false });
    })
    .then((filled)=>{
      if(filled) return;
      if(restCount <= 0){
        throw new Error(`Could not fill in "${text}": the element may have been re-rendered while filling it`);
      }
      return this.fillInSequentiallyWithRetry(text, restCount - 1);
    });
  }
}

module.exports = PlaywrightFinderExtention;
