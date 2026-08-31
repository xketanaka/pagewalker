
/**
 * This class provides action methods for Finder.
 * This class is Mixined to "Finder" class
 */
class FinderAction {
  // returns a javascript string literal (including quotes) for the given value
  static toJsString(str){
    return JSON.stringify(String(str));
  }
  /**
   * javascript code to move the focus as a user does.
   * an element which can not be focused (span, div and so on) does not take the focus,
   * but still takes it away from the previously focused element.
   * @private
   */
  static get focusCode(){
    return `if(elm && document.activeElement !== elm){
      const __active = document.activeElement;
      if(typeof elm.focus == "function"){ elm.focus() }
      if(document.activeElement === __active && __active && __active !== document.body
         && typeof __active.blur == "function"){
        __active.blur();
      }
    }`;
  }
  static get count(){
    return (elements)=>{ return elements ? elements.length : 0 }
  }
  static text({trim = false} = {}){
    return `(elements)=>{ return elements && (${!!trim} ? elements[0]?.textContent?.trim() : elements[0]?.textContent) }`
  }
  static attribute(attrName){
    return `(elements)=>{ return elements && elements[0]?.attributes[${this.toJsString(attrName)}]?.value }`;
  }
  static setText(text){
    return `(elements)=>{ for(let i = 0; i < elements.length; i++){ elements[i].textContent = ${this.toJsString(text)} } }`
  }
  static get value(){
    return (elements)=>{ return elements && elements[0]?.value }
  }
  static setValue(val, {focus = false} = {}){
    return `(elements)=>{
      for(let i = 0; i < elements.length; i++){
        const elm = elements[i];
        ${focus ? this.focusCode : ''}
        let beforeVal = elm.value;
         elm.value = ${this.toJsString(val)}
         if (beforeVal != elm.value) {
           elm.dispatchEvent(new Event('input', { bubbles: true }));
           elm.dispatchEvent(new Event('change', { bubbles: true }));
         }
      }
    }`
  }
  static get click(){
    return `(elements)=>{
      if(elements && elements[0]){
        const elm = elements[0];
        ${this.focusCode}
        let event = document.createEvent('MouseEvent');
        event.initMouseEvent("click", true, true, window, 0, 0, 0, 0, 0, false, false, false, false, 0, null);
        elements[0].dispatchEvent(event);
      }
    }`
  }
  static get checked(){
    return (elements)=>{ return elements && elements[0]?.checked }
  }
  static setChecked(bool){
    return `(elements)=>{
      for(let i = 0; i < elements.length; i++){
        if((!!elements[i].checked) == ${bool}) continue;

        const elm = elements[i];
        ${this.focusCode}
        let event = document.createEvent('MouseEvent');
        event.initMouseEvent("click", true, true, window, 0, 0, 0, 0, 0, false, false, false, false, 0, null);
        elements[i].dispatchEvent(event);
      }
    }`
  }
  static setSelected(bool){
    return `(elements)=>{
      if(elements && elements[0]){
        // focus the select as a user does, so the previously focused element fires blur/change
        const elm = elements[0].closest('select') || elements[0];
        ${this.focusCode}
        const changed = elements[0].selected !== ${bool};
        elements[0].selected = ${bool};
        if(!changed) return;

        if (elements[0].tagName.toUpperCase() == "OPTION") {
          elements[0].closest('select').value = elements[0].value;
          elements[0].closest('select').dispatchEvent(new Event('input', { bubbles: true }));
          elements[0].closest('select').dispatchEvent(new Event('change', { bubbles: true }));
        } else {
          let event = document.createEvent('HTMLEvents');
          event.initEvent("change", true, true);
          elements[0].dispatchEvent(event);
        }
      }
    }`
  }
  static keydown(options = {}){
    return `(elements)=>{
      if(elements && elements[0]){
        const elm = elements[0];
        ${this.focusCode}
        const options = {
          key: '${options.key || "Enter"}',
          code: '${options.code || "Enter"}',
          bubbles: true,
          cancelable: true
        };
        elements[0].dispatchEvent(new KeyboardEvent('keydown', options));
      }
    }`
  }
  static get submit(){
    return (elements)=>{
      if(elements && elements[0]){
        let form;
        if (elements[0].tagName.toUpperCase() == "FORM") {
          form = elements[0]
        }
        else if (elements[0].form) {
          form = elements[0].form;
        }
        else if (elements[0].closest('form')) {
          form = elements[0].closest('form');
        }
        const event = new Event("submit", { bubbles: true, cancelable: true });
        form && form.dispatchEvent(event);
      }
    }
  }

  ////// instance methods //////////////////////////////////////////////////////////////////

  /**
   * Get a textContent of element which is found first by Finder.
   * @return {Promise} Promise resolved with element.textContent
   * @param {Object} options
   * @param {boolean} options.trim - If true, trim textContent. Default is false.
   */
  text({trim = false} = {}){
    return this.withAction(FinderAction.text({trim})).evaluate()
  }
  /**
   * Get a value of element which is found first by Finder.
   * @return {Promise} Promise resolved with element.value
   */
  value(){
    return this.withAction(FinderAction.value).evaluate()
  }
  /**
   * Get a value of element.checked which is found first by Finder.
   * @return {Promise} Promise resolved with element.checked
   */
  checked(){
    return this.withAction(FinderAction.checked).evaluate()
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
    return this.withAction(FinderAction.click).evaluateAction()
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
   * Set given value to value of all elements which is found by Finder.
   * Unlike fillIn(), this assigns the value by script and does not move the focus by default.
   * @param {string} val - value to be set
   * @param {object} options
   * @param {boolean} options.focus - if true, focus the element as a user does (default false)
   * @return {Promise} Promise resolved after setting value
   */
  setValue(val, options = {}){
    return this.withAction(FinderAction.setValue(val, options)).evaluateAction()
  }
  /**
   * Set given text to textContent of all elements which is found by Finder
   * @return {Promise} Promise resolved after setting textContent
   */
  setText(text){
    return this.withAction(FinderAction.setText(text)).evaluateAction()
  }
  /**
   * Set "checked" property true on all elements which is found by Finder
   * @return {Promise}
   */
  check(){
    // TODO target is all elements
    return this.withAction(FinderAction.setChecked(true)).evaluateAction()
  }
  /**
   * Set "checked" property true on all elements which is found by Finder
   * @return {Promise}
   */
  uncheck(){
    // TODO target is all elements
    return this.withAction(FinderAction.setChecked(false)).evaluateAction()
  }
  /**
   * Alias of "click"
   * @return {Promise}
   */
  chooseRadioButton(){
    return this.click();
  }
  /**
   * Set "selected" property true on element which is found by Finder.
   * This method is supposed to be called on the "option" element
   * @return {Promise}
   */
  select(){
    return this.withAction(FinderAction.setSelected(true)).evaluateAction();
  }
  /**
   * Press given key on element which is found by Finder.
   * @param {Object} options - options is passed to the KeyboardEvent constructor. The default value is the Enter key.
   * @return {Promise}
   */
  keydown(options){
    return this.withAction(FinderAction.keydown(options)).evaluateAction()
  }
  /**
   * Submit the form as if pressing Enter on an element within the form
   * @return {Promise}
   */
  submit(){
    return this.withAction(FinderAction.submit).evaluateAction();
  }
}

module.exports = FinderAction;
