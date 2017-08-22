
class PageAction {
  static get count(){
    return (elements)=>{ return elements ? elements.length : 0 }
  }
  static get text(){
    return (elements)=>{ return elements && elements[0].textContent }
  }
  static setText(text){
    return `(elements)=>{ for(let i = 0; i < elements.length; i++){ elements[i].textContent = "${text}" } }`
  }
  static get value(){
    return (elements)=>{ return elements && elements[0].value }
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
    return `(elements)=>{ for(let i = 0; i < elements.length; i++){ elements[i].checked = ${bool}; } }`
  }
  static setSelected(bool){
    return `(elements)=>{ elements && elements[0].selected = ${bool} }`
  }
}

let PageFilterPrivate = {
  haveContent: (content, haveContent = true)=>{
    return `(elm, i)=>{ return elm.textContent && (elm.textContent.trim() == "${content.trim()}") === ${haveContent} }`;
  },
  haveValue: (value, haveValue = true)=>{
    return `(elm, i)=>{ return elm.value && (elm.value.trim() == "${value.trim()}") === ${haveValue} }`;
  },
  haveClass: (classname, haveClass = true)=>{
    return `(elm, i)=>{ return elm && (elm.classList.contains("${classname}")) === ${haveClass} }`;
  },
  haveStyle: (styleName, value, haveStyle = true)=>{
    return `(elm, i)=>{ let style = getComputeStyle(elm); return stye && (style["${styleName}"] == "${value}") === ${haveStyle} }`
  },
  be: (propName, bool)=>{
    return `(elm, i)=>{ return elm && elm.${propName} === ${bool} }`;
  }
}

class PageFilter {
  /**
   * return function code to select elements which have given content as element.textContent
   */
  static haveContent(content){
    return PageFilterPrivate.haveContent(content, true);
  }
  /**
   * return function code to select elements which do not have given content as element.textContent
   */
  static notHaveContent(content){
    return PageFilterPrivate.haveContent(content, false);
  }
  /**
   * return function code to select elements which have given value as element.value
   */
  static haveValue(value){
    return PageFilterPrivate.haveValue(value, true);
  }
  /**
   * return function code to select elements which do not have given value as element.value
   */
  static notHaveValue(value){
    return PageFilterPrivate.haveValue(value, false);
  }
  static beChecked(bool){
    return PageFilterPrivate.be("checked", bool)
  }
  static beSelected(bool){
    return PageFilterPrivate.be("selected", bool)
  }
  static beDisabled(bool){
    return PageFilterPrivate.be("disabled", bool)
  }
  static haveClass(classname){
    return PageFilterPrivate.haveClass(classname, true);
  }
  static notHaveClass(classname){
    return PageFilterPrivate.haveClass(classname, false);
  }
  static haveStyle(styleName, value){
    return PageFilterPrivate.haveStyle(styleName, value, true);
  }
  static notHaveStyle(styleName, value){
    return PageFilterPrivate.haveStyle(styleName, value, false);
  }
  // TODO: 疑似セレクタ系を追加する

}

module.exports = { PageAction: PageAction, PageFilter: PageFilter };
