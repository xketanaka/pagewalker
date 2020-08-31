/**
 * This is a Mixin object to extend for Finder class.
 * Define the Alias method for methods that is defined in Finder class, or define any other convinience methods.
 */
const finderMixin = {
  /**
   * Alias of "selectOption"
   * @return {Promise}
   */
  choose: function(content){
    return this.selectOption(content);
  },

  /**
   * Alias of "text"
   * @return {Promise}
   */
  content: function(){
    return this.text();
  },

  /**
   * Alias of "setText"
   * @return {Promise}
   */
  setContent: function(text){
    return this.setText(text);
  },

  /**
  * this is same for `page.waitForPageLoad(async ()=>{ await this.click() })`
  */
  clickAndWaitLoading: function(){
    return this.page.waitForPageLoad(()=>{ this.click() });
  },

  /**
  * this is same for `page.waitForAjaxDone(async ()=>{ await this.click() })`
  */
  clickAndWaitAjaxDone: function(){
    return this.page.waitForAjaxDone(()=>{ this.click() });
  }
}

module.exports = finderMixin;
