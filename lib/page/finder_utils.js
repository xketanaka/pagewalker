const {PageAction, PageFilter} = require('./page_functions');

/**
 * This class provides shortcut methods of FinderBase.find()
 * This class is Mixined to "Finder" class and used
 */
class FinderUtils {
  /**
   * @return {Finder}
   */
  haveValue(val){
    return this.find(PageFilter.haveValue(val))
  }
  /**
   * @return {Finder}
   */
  haveText(text){
    return this.find(PageFilter.haveText(text))
  }
  /**
   * @return {Finder}
   */
  beChecked(){
    return this.find(PageFilter.beChecked(true))
  }
  /**
   * @return {Finder}
   */
  notBeChecked(){
    return this.find(PageFilter.beChecked(false))
  }
  /**
   * @return {Finder}
   */
  beSelected(){
    return this.find(PageFilter.beSelected(true))
  }
  /**
   * @return {Finder}
   */
  notBeSelected(){
    return this.find(PageFilter.beSelected(false))
  }
  haveCssClass(classname){
  }
  notHaveCssClass(classname){
  }
  haveCssProperty(propName, value){
  }
  notHaveCssProperty(propName, value){
  }
  // TODO: 疑似セレクタ系を追加する
}
