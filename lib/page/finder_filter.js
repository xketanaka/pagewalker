
/**
 * Private helper functions used by FinderFilter.
 */
class Private {
  // returns a javascript string literal (including quotes) for the given value
  static toJsString(str){
    return JSON.stringify(String(str));
  }
  static haveContent(content, haveContent = true){
    content = this.toJsString(content.trim());
    return `(elm, i)=>{ return (typeof elm.textContent == "string") && (elm.textContent.trim() == ${content}) === ${haveContent} }`;
  }
  static haveValue(value, haveValue = true){
    value = this.toJsString(value.trim());
    return `(elm, i)=>{ return (typeof elm.value == "string") && (elm.value.trim() == ${value}) === ${haveValue} }`;
  }
  static haveClass(classname, haveClass = true){
    return `(elm, i)=>{ return elm && (elm.classList.contains(${this.toJsString(classname)})) === ${haveClass} }`;
  }
  static haveStyle(styleName, value, haveStyle = true){
    return `(elm, i)=>{ let style = getComputedStyle(elm); return style && (style[${this.toJsString(styleName)}] == ${this.toJsString(value)}) === ${haveStyle} }`
  }
  static haveAttribute(attrName, value, haveAttribute = true){
    if (value === undefined || value === null) {
      return `(elm, i)=>{ return elm.hasAttribute(${this.toJsString(attrName)}) === ${haveAttribute} }`;
    } else {
      value = this.toJsString(value.trim());
      return `(elm, i)=>{ return (elm.getAttribute(${this.toJsString(attrName)}) == ${value}) === ${haveAttribute} }`;
    }

  }
  static textMatch(regexp, textMatch = true){
    return `(elm, i)=>{ return (typeof elm.textContent == "string") && (!!elm.textContent.match(${regexp.toString()})) === ${textMatch} }`;
  }
  static valueMatch(regexp, valueMatch = true){
    return `(elm, i)=>{ return (typeof elm.value == "string") && (!!elm.value.match(${regexp.toString()})) === ${valueMatch} }`;
  }
  static textIncludes(content, textIncludes = true){
    content = this.toJsString(content.trim());
    return `(elm, i)=>{ return (typeof elm.textContent == "string") && (!!elm.textContent.includes(${content})) === ${textIncludes} }`;
  }
  static valueIncludes(value, valueIncludes = true){
    value = this.toJsString(value.trim());
    return `(elm, i)=>{ return (typeof elm.value == "string") && (!!elm.value.includes(${value})) === ${valueIncludes} }`;
  }
  static be(propName, bool){
    return `(elm, i)=>{ return elm && elm.${propName} === ${bool} }`;
  }
  static isClickable(){
    return "a,button,input[type=button],input[type=submit]";
  }
  static isVisible(bool){
    // The visibility of an <option> depends on whether its parent <select> is open,
    // so check the parent <select> instead. Treat as visible where checkVisibility is unavailable.
    return `(elm, i)=>{ const t = (elm.tagName == "OPTION") ? elm.closest("select") : elm; const v = (t && t.checkVisibility) ? t.checkVisibility() : true; return v === ${bool} }`;
  }
  static indexOf(index){
    return `(elm, i)=>{ return i == ${index} }`;
  }
  static parent(){
    return `(elm, i)=>{ return elm.parentNode }`;
  }
  static closest(selector){
    selector = this.toJsString(selector);
    return `(elm, i)=>{ return elm.closest(${selector}) }`;
  }
}

/**
 * This class provides filtering methods for Finder.
 * This class is Mixined to "Finder" class
 */
class FinderFilter {
  /**
   * @return {string} return function code to select elements which have given content as element.textContent
   */
  static haveContent(content){
    return Private.haveContent(content, true);
  }
  /**
   * @return {string} return function code to select elements which do not have given content as element.textContent
   */
  static notHaveContent(content){
    return Private.haveContent(content, false);
  }
  /**
  * Alias of haveContent
   * @return {string} return function code to select elements which have given content as element.textContent
   */
  static haveText(text){
    return this.haveContent(text)
  }
  /**
   * Alias of notHaveContent
   * @return {string} return function code to select elements which do not have given content as element.textContent
   */
  static notHaveText(text){
    return this.notHaveContent(text)
  }
  /**
   * @return {string} return function code to select elements which have given value as element.value
   */
  static haveValue(value){
    return Private.haveValue(value, true);
  }
  /**
   * @return {string} return function code to select elements which do not have given value as element.value
   */
  static notHaveValue(value){
    return Private.haveValue(value, false);
  }
  /**
   * @return {string} return function code to select elements which have given value as element.checked attribute.
   */
  static beChecked(bool){
    return Private.be("checked", bool)
  }
  /**
   * @return {string} return function code to select elements which have given value as element.selected attribute.
   */
  static beSelected(bool){
    return Private.be("selected", bool)
  }
  /**
   * @return {string} return function code to select elements which have given value as element.disabled attribute.
   */
  static beDisabled(bool){
    return Private.be("disabled", bool)
  }
  /**
   * @return {string} return function code to select elements which have given value in element.classList attribute.
   */
  static haveClass(classname){
    return Private.haveClass(classname, true);
  }
  /**
   * @return {string} return function code to select elements which do not have given value in element.classList attribute.
   */
  static notHaveClass(classname){
    return Private.haveClass(classname, false);
  }
  /**
   * @return {string} return function code to select elements which have given value in window.getComputedStyle(element)
   */
  static haveStyle(styleName, value){
    return Private.haveStyle(styleName, value, true);
  }
  /**
   * @return {string} return function code to select elements which do not have given value in window.getComputedStyle(element)
   */
  static notHaveStyle(styleName, value){
    return Private.haveStyle(styleName, value, false);
  }
  /**
   * @return {string} return function code to select elements which have given attrName. If value given, select elements which have given value in element.getAttribute(attrName).
   */
  static haveAttribute(attrName, value){
    return Private.haveAttribute(attrName, value, true);
  }
  /**
   * @return {string} return function code to select elements which do not have given attrName. If value given, select elements which do not have value in element.getAttribute(attrName)
   */
  static notHaveAttribute(attrName, value){
    return Private.haveAttribute(attrName, value, false);
  }
  /**
   * @return {string} return function code to select elements which match given regexp as element.textContent
   */
  static textMatch(regexp){
    if (!(regexp instanceof RegExp)) {
      regexp = new RegExp(regexp);
    }
    return Private.textMatch(regexp, true);
  }
  /**
   * @return {string} return function code to select elements which match given regexp as element.value
   */
  static valueMatch(regexp){
    if (!(regexp instanceof RegExp)) {
      regexp = new RegExp(regexp);
    }
    return Private.valueMatch(regexp, true);
  }
  /**
   * @return {string} return function code to select elements which includes given content as element.textContent
   */
  static textIncludes(content){
    return Private.textIncludes(content, true);
  }
  /**
   * @return {string} return function code to select elements which includes given value as element.value
   */
  static valueIncludes(value){
    return Private.valueIncludes(value, true);
  }
  /**
   * @return {string} return css selector string to select clickable elements like a, button, input[type=button]
   */
  static isClickable(){
    return Private.isClickable()
  }
  /**
   * @return {string} return function code to visible elements. It is extracted by the checkVisibility method.
   */
  static beVisible(){
    return Private.isVisible(true);
  }
  /**
   * @return {string} return function code to select elements which is in given index in elements
   */
  static indexOf(i){
    return Private.indexOf(i);
  }
  /**
   * @return {string} return function code to map parent node.
   */
  static parent(){
    return Private.parent();
  }
  /**
   * @return {string} return function code to map closest node which matches given selector.
   */
  static closest(selector){
    return Private.closest(selector);
  }

  ////// instance methods /////////////////////////////////////////////////////////////////////

  /**
   * @return {Finder} return filtered Finder object which have the specified value
   */
  haveValue(val){
    return this.find(FinderFilter.haveValue(val))
  }
  /**
   * @return {Finder} return filtered Finder object which does not have the specified value
   */
  notHaveValue(val){
    return this.find(FinderFilter.notHaveValue(val))
  }
  /**
   * @return {Finder} return filtered Finder object which have the specified text
   */
  haveContent(content){
    return this.find(FinderFilter.haveContent(content))
  }
  /**
   * @return {Finder} return filtered Finder object which does not have the specified text
   */
  notHaveContent(content){
    return this.find(FinderFilter.notHaveContent(content))
  }
  /**
   * @return {Finder} return filtered Finder object which have the specified text
   */
  haveText(text){
    return this.find(FinderFilter.haveContent(text))
  }
  /**
   * @return {Finder} return filtered Finder object which does not have the specified text
   */
  notHaveText(text){
    return this.find(FinderFilter.notHaveContent(text))
  }
  /**
   * @return {Finder} return filtered Finder object which have been checked
   */
  beChecked(){
    return this.find(FinderFilter.beChecked(true))
  }
  /**
   * @return {Finder} return filtered Finder object which do not have been checked
   */
  notBeChecked(){
    return this.find(FinderFilter.beChecked(false))
  }
  /**
   * @return {Finder} return filtered Finder object which have been selected
   */
  beSelected(){
    return this.find(FinderFilter.beSelected(true))
  }
  /**
   * @return {Finder} return filtered Finder object which do not have been selected
   */
  notBeSelected(){
    return this.find(FinderFilter.beSelected(false))
  }
  /**
   * @return {Finder} return filtered Finder object which is visible (extracted by checkVisibility)
   */
  beVisible(){
    return this.find(FinderFilter.beVisible())
  }
  /**
   * @return {Finder} return filtered Finder object which have specified CssClass
   */
  haveCssClass(classname){
    return this.find(FinderFilter.haveClass(classname))
  }
  /**
   * @return {Finder} return filtered Finder object which do not have specified CssClass
   */
  notHaveCssClass(classname){
    return this.find(FinderFilter.notHaveClass(classname))
  }
  /**
   * @return {Finder} return filtered Finder object which have specified CssProperty
   */
  haveCssProperty(propName, value){
    return this.find(FinderFilter.haveStyle(propName, value))
  }
  /**
   * @return {Finder} return filtered Finder object which do not have specified CssProperty
   */
  notHaveCssProperty(propName, value){
    return this.find(FinderFilter.notHaveStyle(propName, value))
  }
  /**
   * @return {Finder} return filtered Finder object which have specified attrName. If value given, return filtered Finder object which have specified attribute-value
   */
  haveAttribute(attrName, value){
    return this.find(FinderFilter.haveAttribute(attrName, value))
  }
  /**
   * @return {Finder} return filtered Finder object which do not have specified attrName. If value given, return filtered Finder object which do not have specified attribute-value.
   */
  notHaveAttribute(attrName, value){
    return this.find(FinderFilter.notHaveAttribute(attrName, value))
  }
  /**
   * @return {Finder} return filtered Finder object whose textContent matches given regexp
   */
  textMatch(regexp){
    return this.find(FinderFilter.textMatch(regexp))
  }
  /**
   * @return {Finder} return filtered Finder object whose value matches given regexp
   */
  valueMatch(regexp){
    return this.find(FinderFilter.valueMatch(regexp))
  }
  /**
   * @return {Finder} return filtered Finder object whose textContent includes given content
   */
  textIncludes(content){
    return this.find(FinderFilter.textIncludes(content))
  }
  /**
   * @return {Finder} return filtered Finder object whose value includes given value
   */
  valueIncludes(value){
    return this.find(FinderFilter.valueIncludes(value))
  }

  /**
   * @return {Finder} return filtered Finder object which is clickable like a, button, input[type=button]
   */
  isClickable(){
    return this.find(FinderFilter.isClickable())
  }
  /**
   * @return {Finder} return filtered Finder object which is in given index in elements
   */
  indexOf(i){
    return this.find(FinderFilter.indexOf(i));
  }
  /**
   * @return {Finder} return Finder for the first matched element. this is same to "indexOf(0)"
   */
  first(){
    return this.indexOf(0);
  }
  /**
   * @return {Finder} return Finder object for the parent element.
   */
  parent(){
    return this.map(FinderFilter.parent())
  }
  /**
   * @return {Finder} return Finder object for the closest node.
   */
  closest(selector){
    return this.map(FinderFilter.closest(selector))
  }
}

module.exports = FinderFilter;
