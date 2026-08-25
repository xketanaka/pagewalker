const FinderBase = require('./finder_base');
const FinderAction = require('./finder_action');
const FinderFilter = require('./finder_filter');
const FinderMixin = require('./finder_mixin');
const mixin = require('../utils/mixin');
const {randomUUID} = require('crypto');

// attribute to mark the target element of a native (browser-side) action
const MARKER_ATTRIBUTE = 'data-pagewalker-target';

/**
 * @extends {FinderBase}
 * @extends {FinderAction}
 * @extends {FinderFilter}
 */
class Finder extends FinderBase {
  constructor(page, ...args){
    super(page, ...args)
  }
  /**
   * Set "selected" property true on option element whose textContent match the given string.
   * This method is assumed to be called on a select element
   * This method is the same as `page.find("select").find("option").haveText(content).select();
   * @return {Promise}
   */
  selectOption(content){
    return this.find("option", FinderFilter.haveContent(content.trim())).select();
  }
  /**
   * Attach the file given with filePath.
   * This method implemented at FinderExtentions by Browser. so please read api-document of FinderExtentions you use.
   * @param {string} filePath - Specify the path of the file to be attached
   * @param {object} options - options given to FinderExtentions
   * @return {Promise}
   */
  attachFile(filePath, options = {}){
    throw new Error("not implemented")
  }
  /**
   * Fill the given text into the element as a user does with the keyboard.
   * Unlike setValue() which assigns the value by script, the browser itself types it,
   * so frameworks (React and so on) recognize it as a real user input.
   * This method implemented at FinderExtentions by Browser. so please read api-document of FinderExtentions you use.
   * @param {string} text - text to be filled in
   * @param {object} options - options given to FinderExtentions
   * @return {Promise}
   */
  fillIn(text, options = {}){
    throw new Error("not implemented")
  }
  /**
   * Mark the first matched element with a temporary attribute, and return a css selector for it.
   * The condition chain is evaluated in the browser, so this works for any finder.
   * The marker value is unique per call, so a marker left by another call is never matched.
   * Pass the returned selector to removeMarker() after use.
   * @private
   * @return {Promise<string>} resolved with a css selector for the marked element
   */
  markFirstElement(){
    const markerValue = `${Date.now().toString(36)}-${randomUUID()}`;
    return this.withAction(`(elements)=>{
      if(!elements || elements.length == 0) return false;
      elements[0].setAttribute("${MARKER_ATTRIBUTE}", "${markerValue}");
      return true;
    }`).evaluateAction()
    .then((marked)=>{
      if(!marked) throw new Error('Element not found');
      return `[${MARKER_ATTRIBUTE}="${markerValue}"]`;
    })
  }
  /**
   * Remove the marker set by markFirstElement().
   * Failures are ignored: the page may be gone already, and a leftover marker is harmless
   * because its value is unique per call.
   * @private
   * @param {string} selector - the selector returned by markFirstElement()
   * @return {Promise}
   */
  removeMarker(selector){
    return this.page.executeJs(
      `document.querySelectorAll('${selector}').forEach((e)=>{ e.removeAttribute("${MARKER_ATTRIBUTE}") })`
    ).catch(()=>{ /* ignore */ })
  }
  /**
   * execute "JavaScript code" given as argument
   * @return {Promise}
   */
  executeJs(code){
    return this.withAction(code).evaluate();
  }
  /**
   * @return {Promise} Promise which resolved with array of finder, that array length is matched number
   */
  toArray(){
    return this.count()
    .then((count)=>{
      let array = [];
      for(let i = 0; i < count; i++){
        array.push(this.clone().find(`(node, idx)=>{ return idx == ${i} }`));
      }
      return array;
    })
  }
  /**
   * return true if all elements which is found by Finder satisfied given filter
   * @example
   * await page.find("input").every(FinderFilter.haveValue("123")) // return true or false
   */
  every(code){
    let filtered = this.clone().find(code);
    return Promise.all([ this.count(), filtered.count() ])
    .then((beforeAndAfter)=>{ return beforeAndAfter[0] == beforeAndAfter[1] })
  }

  /**
   * Make this finder object executed in given iframe.
   * @param {Finder} finderForIframe - finder object for iframe
   * @return {Finder}
   * @example
   *   await page.find("h3").inIframe(page.find("iframe").first()).text()
   */
  inIframe(finderForIframe){
    return this.withContext(finderForIframe.toContextString());
  }
  /**
   * @private
   */
  toContextString(){
    let codeToFindIframeObject = this.clone().withAction(elements => elements).toJsCode();
    return `(()=>{ ${codeToFindIframeObject} })()[0].contentWindow`;
  }
}

mixin(Finder.prototype, FinderAction.prototype);
mixin(Finder.prototype, FinderFilter.prototype);
mixin(Finder.prototype, FinderMixin);

module.exports = Finder;
