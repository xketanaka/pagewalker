const fs = require("fs");
const path = require("path");
const Finder = require("../../page/finder");

class PuppeteerFinderExtention extends Finder {

  /**
   * Attach the file given with filePath.
   * Now, it is not supported that you attach a file to input-elements in iframe .
   * @param {string} filePath - Specify the path of the file to be attached
   * @param {object} options
   * @return {Promise}
   */
  attachFile(filePath, options = {}){
    const firstSelector = this.conditions[0].constructor.name == "Selector" ? this.conditions[0].selector : "*";

    return this.page.browserPage.nativeObject.$$(firstSelector)
    .then((elementHandles)=>{
      return this.conditions.reduce((prev, condition, i)=>{
        return prev.then((elementHandles)=>{
          if(condition.constructor.name == "Selector"){
            return i == 0 ? elementHandles : elementHandles.$$(condition.selector);
          }
          if(condition.constructor.name == "Filter"){
            return elementHandles.filter(eval(condition.code))
          }
        })
      }, Promise.resolve(elementHandles));
    })
    .then((elementHandles)=>{
      if(elementHandles.length == 0) throw new Error('input element to attach file is not found')

      return elementHandles[0].uploadFile(filePath);
    })
  }
}

module.exports = PuppeteerFinderExtention;
