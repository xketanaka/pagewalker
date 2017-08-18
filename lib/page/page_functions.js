
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

class PageFilter {
  static haveContent(content){
    return `(elm, i)=>{ return elm.textContent && elm.textContent.trim() == "${content.trim()}" }`;
  }
  static haveValue(value){
    return `(elm, i)=>{ return elm.value && elm.value.trim() == "${value.trim()}" }`;
  }
  static beChecked(bool){
    return `(elm, i)=>{ return elm && elm.checked === ${bool} }`;
  }
  static beSelected(bool){
    return `(elm, i)=>{ return elm && elm.selected === ${bool} }`;
  }
}

module.exports = { PageAction: PageAction, PageFilter: PageFilter };
