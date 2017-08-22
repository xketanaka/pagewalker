const FinderBase = require('./finder_base');
const {PageAction, PageFilter} = require('./page_functions');

class Finder extends FinderBase {
  constructor(page, ...args){
    super(page, ...args)
  }
  /*
   * Get a textContent of element which is found first by Finder.
   * @return {Promise} Promise resolved with element.textContent
   */
  text(){
    return this.withAction(PageAction.text).evaluate()
  }
  /**
   * Get a value of element which is found first by Finder.
   * @return {Promise} Promise resolved with element.value
   */
  value(){
    return this.withAction(PageAction.value).evaluate()
  }
  /**
   * Click an element which is found first by Finder
   * @return {Promise} Promise resolved after click event
   */
  click(){
    return this.withAction(PageAction.click).evaluate()
  }
  /**
   * Get a count of elements which is found by Finder.
   * @return {Promise} Promise resolved with matched number
   */
  count(){
    return this.withAction(PageAction.count).evaluate()
  }
  /**
   * return true if count of elements which is found by Finder is over one.
   * @return {Promise}
   */
  exist(){
    return this.count().then(count => count >= 1)
  }
  /**
   * return true if count of elements which is found by Finder is zero.
   * @return {Promise}
   */
  notExist(){
    return this.exist().then(exist => !exist)
  }
  /**
   * Set given value to value of all elements which is found by Finder
   * @return {Promise} Promise resolved after setting value
   */
  setValue(val){
    return this.withAction(PageAction.setValue(val)).evaluate()
  }
  /**
   * Alias of "setValue"
   */
  fillIn(val){
    return this.setValue(val)
  }
  /**
   * Set given text to textContent of all elements which is found by Finder
   * @return {Promise} Promise resolved after setting textContent
   */
  setText(text){
    return this.withAction(PageAction.setText(text)).evaluate()
  }
  /**
   * Set "checked" property true on all elements which is found by Finder
   * @return {Promise}
   */
  check(){
    // TODO target is all elements
    return this.withAction(PageAction.setChecked(true)).evaluate()
  }
  /**
   * Set "checked" property true on all elements which is found by Finder
   * @return {Promise}
   */
  uncheck(){
    // TODO target is all elements
    return this.withAction(PageAction.setChecked(false)).evaluate()
  }
  /**
   * Alias of "click"
   */
  chooseRadioButton(){
    return this.click();
  }
  /**
   * Set "selected" property true on element which is found by Finder
   * @return {Promise}
   */
  select(){
    return this.withAction(PageAction.setSelected(true)).evaluate();
  }
  /**
   * Set "selected" property true on option element whose textContent match the given string.
   * This method is assumed to be called on a select element
   * @return {Promise}
   */
  selectOption(content){
    return this.find("option", PageFilter.haveContent(content.trim())).select();
  }
  /**
   * Alias of "selectOption"
   */
  choose(content){
    return this.selectOption(content);
  }
  attachFile(filepath){
    // TODO
  }
  executeJs(code){
    return this.withAction(code).evaluate();
  }
  /**
   * @return {Promise} Promise which resolved with array of finder, that array length is matched number
   */
  toArray(){
    return this.withAction(PageAction.count).evaluate()
    .then((count)=>{
      let array = [];
      for(let i = 0; i < count; i++){
        array.push(this.clone().find(`(node, idx)=>{ return idx == ${i} }`));
      }
      return array;
    })
  }
  /**
   * Get new Finder for the first matched element
   * Alias of "indexOf(0)"
   */
  getFirst(){
    return this.indexOf(0);
  }
  /**
   * Get new Finder for the given index of matched elements
   */
  indexOf(i){
    return this.withAction(PageAction.count).evaluate()
    .then((count)=>{
      if(count < i){ throw `Finder have matched less Elements than given value(${i}) !` }
      return this.clone().find(`(node, idx)=>{ return idx == ${i} }`);
    })
  }
  /**
   * return true if all elements which is found by Finder satisfied given filter
   * @example
   * page.find("input").every(PageFilter.haveValue("123"))
   */
  every(code){
    return this.withMatcher(code, `(filtered)=>{ return filtered.length == elements.length }`)
  }

  clickAndExpectPageLoaded(...args){
    if(args.length > 0){ this.find(...args) }
    return this.page.expectPageLoaded(()=>{ this.click() });
  }
  clickAndExpectAjaxComplete(...args){
    if(args.length > 0){ this.find(...args) }
    return this.page.expectAjaxComplete(()=>{ this.click() });
  }
}

module.exports = Finder;
