const FinderBase = require('./finder_base');
const FinderAction = require('./finder_action');
const FinderFilter = require('./finder_filter');
const FinderMixin = require('./finder_mixin');
const mixin = require('../utils/mixin');

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
