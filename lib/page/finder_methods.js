/**
 * This is a Mixin object to extend for Finder class.
 * Define the Alias method for methods that is defined in Finder class, or define any other convinience methods.
 */
class FinderMethods {
  /**
   * Alias of "selectOption"
   * @return {Promise}
   */
  choose(content){
    return this.selectOption(content);
  }

  /**
  * this is same for `page.waitForPageLoad(async ()=>{ await this.click() })`
  */
  clickAndWaitLoading(){
    return this.page.waitForPageLoad(()=>{ this.click() });
  }

  /**
  * this is same for `page.waitForAjaxDone(async ()=>{ await this.click() })`
  */
  clickAndWaitAjaxDone(){
    return this.page.waitForAjaxDone(()=>{ this.click() });
  }
}

module.exports = FinderMethods;
