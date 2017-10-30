
class Private {
  static haveContent(content, haveContent = true){
    return `(elm, i)=>{ return elm.textContent && (elm.textContent.trim() == "${content.trim()}") === ${haveContent} }`;
  }
  static haveValue(value, haveValue = true){
    return `(elm, i)=>{ return elm.value && (elm.value.trim() == "${value.trim()}") === ${haveValue} }`;
  }
  static haveClass(classname, haveClass = true){
    return `(elm, i)=>{ return elm && (elm.classList.contains("${classname}")) === ${haveClass} }`;
  }
  static haveStyle(styleName, value, haveStyle = true){
    return `(elm, i)=>{ let style = getComputeStyle(elm); return style && (style["${styleName}"] == "${value}") === ${haveStyle} }`
  }
  static be(propName, bool){
    return `(elm, i)=>{ return elm && elm.${propName} === ${bool} }`;
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
   * @return {string} return function code to select elements which has given value as element.checked attribute.
   */
  static beChecked(bool){
    return Private.be("checked", bool)
  }
  /**
   * @return {string} return function code to select elements which has given value as element.selected attribute.
   */
  static beSelected(bool){
    return Private.be("selected", bool)
  }
  /**
   * @return {string} return function code to select elements which has given value as element.disabled attribute.
   */
  static beDisabled(bool){
    return Private.be("disabled", bool)
  }
  /**
   * @return {string} return function code to select elements which has given value in element.classList attribute.
   */
  static haveClass(classname){
    return Private.haveClass(classname, true);
  }
  /**
   * @return {string} return function code to select elements which do not has given value in element.classList attribute.
   */
  static notHaveClass(classname){
    return Private.haveClass(classname, false);
  }
  /**
   * @return {string} return function code to select elements which has given value in window.getComputedStyle(element)
   */
  static haveStyle(styleName, value){
    return Private.haveStyle(styleName, value, true);
  }
  /**
   * @return {string} return function code to select elements which do not has given value in window.getComputedStyle(element)
   */
  static notHaveStyle(styleName, value){
    return Private.haveStyle(styleName, value, false);
  }

  ////// instance methods /////////////////////////////////////////////////////////////////////

  /**
   * @return {Finder} return filtered Finder object which has the specified value
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
   * @return {Finder} return filtered Finder object which has the specified text
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
   * @return {Finder} return filtered Finder object which has the specified text
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
   * @return {Finder} return filtered Finder object which has been checked
   */
  beChecked(){
    return this.find(FinderFilter.beChecked(true))
  }
  /**
   * @return {Finder} return filtered Finder object which do not has been checked
   */
  notBeChecked(){
    return this.find(FinderFilter.beChecked(false))
  }
  /**
   * @return {Finder} return filtered Finder object which has been selected
   */
  beSelected(){
    return this.find(FinderFilter.beSelected(true))
  }
  /**
   * @return {Finder} return filtered Finder object which do not has been selected
   */
  notBeSelected(){
    return this.find(FinderFilter.beSelected(false))
  }
  /**
   * @return {Finder} return filtered Finder object which has specified CssClass
   */
  haveCssClass(classname){
    return this.find(FinderFilter.haveClass(classname))
  }
  /**
   * @return {Finder} return filtered Finder object which do not has specified CssClass
   */
  notHaveCssClass(classname){
    return this.find(FinderFilter.notHaveClass(classname))
  }
  /**
   * @return {Finder} return filtered Finder object which has specified CssProperty
   */
  haveCssProperty(propName, value){
    return this.find(FinderFilter.haveStyle(propName, value))
  }
  /**
   * @return {Finder} return filtered Finder object which do not has specified CssProperty
   */
  notHaveCssProperty(propName, value){
    return this.find(FinderFilter.notHaveStyle(propName, value))
  }
}

module.exports = FinderFilter;
