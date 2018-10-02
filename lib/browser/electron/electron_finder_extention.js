const fs = require("fs");
const path = require("path");
const Finder = require("../../page/finder");

class ElectronFinderExtention extends Finder {

  /**
   * Attach the file given with filePath.
   * @param {string} filePath - Specify the path of the file to be attached
   * @return {Promise}
   */
  attachFile(filePath){
    let uniqueString = ((strong = 100000)=>{
      return "s" + new Date().getTime().toString(16) + Math.floor(strong*Math.random()).toString(16);
    })();

    if(!path.isAbsolute(filePath)){
      filePath = path.resolve(filePath);
    }

    let nativeObject = this.page.browserPage.nativeObject;
    try{
      if(!nativeObject.debugger.isAttached()){
        nativeObject.debugger.attach("1.1");
      }
    }catch(err){ throw new Error("Debugger attach failed : " + err) }

    return this.executeJs(`(elements)=>{
      const input = elements[0];
      input.classList.add('${uniqueString}');
    }`)
    .then(()=>{
      let selectorParams = (res)=>{ return { nodeId: res.root.nodeId, selector: `input.${uniqueString}` } };
      let attachParams = (res)=>{ return { nodeId: res.nodeId, files: [filePath] } };

      return new Promise((resolve, reject)=>{
        nativeObject.debugger.sendCommand("DOM.getDocument", {}, (err, res)=>{
          nativeObject.debugger.sendCommand("DOM.querySelector", selectorParams(res), (err, res)=>{
            nativeObject.debugger.sendCommand("DOM.setFileInputFiles", attachParams(res), (err, res)=>{
              nativeObject.debugger.detach();
              err && err.code ? reject(err.toString()) : resolve();
            });
          });
        })
      });
    });
  }
}

module.exports = ElectronFinderExtention;
