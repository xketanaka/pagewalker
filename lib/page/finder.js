const FinderBase = require('./finder_base');
const FinderAction = require('./finder_action');
const FinderFilter = require('./finder_filter');

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
   * Alias of "selectOption"
   * @return {Promise}
   */
  choose(content){
    return this.selectOption(content);
  }
  attachFile(filepath){
    // TODO
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
   * @return {Promise} Get new Finder for the first matched element. this is same to "indexOf(0)"
   */
  getFirst(){
    return this.indexOf(0);
  }
  /**
   * @return {Promise} Get new Finder for the given index of matched elements
   */
  indexOf(i){
    return this.count()
    .then((count)=>{
      if(count < i){ throw `Finder have matched less Elements than given value(${i}) !` }
      return this.clone().find(`(node, idx)=>{ return idx == ${i} }`);
    })
  }
  /**
   * return true if all elements which is found by Finder satisfied given filter
   * @example
   * await page.find("input").every(FinderFilter.haveValue("123")) // return true or false
   */
  every(code){
    return this.withMatcher(code, `(filtered)=>{ return filtered.length == elements.length }`)
  }

  clickAndExpectPageLoaded(...args){
    if(args.length > 0){ this.find(...args) }
    return this.page.expectPageLoaded(()=>{ this.click() });
  }
  /**
   * alias of clickAndExpectPageLoaded
   */
  clickAndWaitLoading(...args){
    return this.clickAndExpectPageLoaded(...args);
  }
  clickAndExpectAjaxComplete(...args){
    if(args.length > 0){ this.find(...args) }
    return this.page.expectAjaxComplete(()=>{ this.click() });
  }
}

function mixin(dest, source){
  for(let key of Reflect.ownKeys(source)){
    if(key === "constructor") continue;

    let descriptor = Object.getOwnPropertyDescriptor(source, key);
    descriptor.configurable = true;
    descriptor.enumerable   = false;
    if(descriptor.hasOwnProperty("writable")){
      descriptor.writable = true;
    }
    Object.defineProperty(dest, key, descriptor);
  }
}

mixin(Finder.prototype, FinderAction.prototype);
mixin(Finder.prototype, FinderFilter.prototype);

module.exports = Finder;
