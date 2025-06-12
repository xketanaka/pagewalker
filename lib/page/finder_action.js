
/**
 * This class provides action methods for Finder.
 * This class is Mixined to "Finder" class
 */
class FinderAction {
  static get count(){
    return (elements)=>{ return elements ? elements.length : 0 }
  }
  static get text(){
    return (elements)=>{ return elements && elements[0]?.textContent }
  }
  static attribute(attrName){
    return `(elements)=>{ return elements && elements[0]?.attributes["${attrName}"]?.value }`;
  }
  static setText(text){
    return `(elements)=>{ for(let i = 0; i < elements.length; i++){ elements[i].textContent = "${text}" } }`
  }
  static get value(){
    return (elements)=>{ return elements && elements[0]?.value }
  }
  static setValue(val){
    return `(elements)=>{ for(let i = 0; i < elements.length; i++){ elements[i].value = "${val}" } }`
  }
  static get click(){
    return (elements)=>{
      if(elements && elements[0]){
        let event = document.createEvent('MouseEvent');
        event.initMouseEvent("click", true, true, window, 0, 0, 0, 0, 0, false, false, false, false, 0, null);
        elements[0].dispatchEvent(event);
      }
    }
  }
  static setChecked(bool){
    return `(elements)=>{
      for(let i = 0; i < elements.length; i++){
        if((!!elements[i].checked) == ${bool}) continue;

        let event = document.createEvent('MouseEvent');
        event.initMouseEvent("click", true, true, window, 0, 0, 0, 0, 0, false, false, false, false, 0, null);
        elements[i].dispatchEvent(event);
      }
    }`
  }
  static setSelected(bool){
    return `(elements)=>{
      if(elements && elements[0]){
        if(elements[0].selected !== ${bool}) {
          let event = document.createEvent('HTMLEvents');
          event.initEvent("change", true, true);
          elements[0].dispatchEvent(event);
        }

        elements[0].selected = ${bool};
      }
    }`
  }

  ////// instance methods //////////////////////////////////////////////////////////////////

  /*
   * Get a textContent of element which is found first by Finder.
   * @return {Promise} Promise resolved with element.textContent
   */
  text(){
    return this.withAction(FinderAction.text).evaluate()
  }
  /**
   * Get a value of element which is found first by Finder.
   * @return {Promise} Promise resolved with element.value
   */
  value(){
    return this.withAction(FinderAction.value).evaluate()
  }
  /**
   * Get a attribute of element which is found first by Finder.
   * @return {Promise} Promise resolved with element.attributes[attrName].value
   */
  attribute(attrName){
    return this.withAction(FinderAction.attribute(attrName)).evaluate()
  }
  /**
   * Click an element which is found first by Finder
   * @return {Promise} Promise resolved after click event
   */
  click(){
    return this.withAction(FinderAction.click).allowNotFound(false).evaluate()
  }
  /**
   * Get a count of elements which is found by Finder.
   * @return {Promise} Promise resolved with matched number
   */
  count(){
    return this.withAction(FinderAction.count).evaluate()
  }
  /**
   * @return {Promise} return true if count of elements which is found by Finder is over one.
   */
  exist(){
    return this.count().then(count => count >= 1)
  }
  /**
   * @return {Promise} return true if count of elements which is found by Finder is zero.
   */
  notExist(){
    return this.exist().then(exist => !exist)
  }
  /**
   * Set given value to value of all elements which is found by Finder
   * @return {Promise} Promise resolved after setting value
   */
  setValue(val){
    return this.withAction(FinderAction.setValue(val)).allowNotFound(false).evaluate()
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
    return this.withAction(FinderAction.setText(text)).allowNotFound(false).evaluate()
  }
  /**
   * Set "checked" property true on all elements which is found by Finder
   * @return {Promise}
   */
  check(){
    // TODO target is all elements
    return this.withAction(FinderAction.setChecked(true)).allowNotFound(false).evaluate()
  }
  /**
   * Set "checked" property true on all elements which is found by Finder
   * @return {Promise}
   */
  uncheck(){
    // TODO target is all elements
    return this.withAction(FinderAction.setChecked(false)).allowNotFound(false).evaluate()
  }
  /**
   * Alias of "click"
   * @return {Promise}
   */
  chooseRadioButton(){
    return this.click();
  }
  /**
   * Set "selected" property true on element which is found by Finder
   * @return {Promise}
   */
  select(){
    return this.withAction(FinderAction.setSelected(true)).allowNotFound(false).evaluate();
  }
}

module.exports = FinderAction;
