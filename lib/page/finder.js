const fs = require('fs');
const path = require('path');
const FinderBase = require('./finder_base');
const FinderAction = require('./finder_action');
const FinderFilter = require('./finder_filter');

/**
 * @extends {FinderBase}
 * @extends {FinderAction}
 * @extends {FinderFilter}
 */
class Finder extends FinderBase {
  constructor(page, ...args){
    super(page, ...args)
  }
  /**
   * Set "selected" property true on option element whose textContent match the given string.
   * This method is assumed to be called on a select element
   * @return {Promise}
   */
  selectOption(content){
    return this.find("option", FinderFilter.haveContent(content.trim())).select();
  }
  /**
   * Alias of "selectOption"
   * @return {Promise}
   */
  choose(content){
    return this.selectOption(content);
  }
  /**
   * Attach the file given with filePath.
   * Rather than setting it to the files attribute of the specified input element,
   * set it as the data-file-object attribute of the input element.
   * This is because the files attribute can not be rewritten by script
   * @param {string} filePath - Specify the path of the file to be attached
   * @param {object} options
   * @param {object} options.fileType - type attribute of the File (see HTML5 File API)
   * @param {object} options.replaceSubmitWithAjax - whether replace form-submit with ajax request, default is true.
   * @return {Promise}
   */
  attachFile(filePath, options = {}){
    const fileType = options.fileType || "";
    options.replaceSubmitWithAjax = options.replaceSubmitWithAjax || true;

    return (options.replaceSubmitWithAjax ? this.clone().replaceSubmitWithAjax() : Promise.resove())
    .then(()=>{
      return this.executeJs(`(elements)=>{
        const input = elements[0];
        ipcRenderer.once('file-body-transfer', (event, data)=>{
          input.attributes["data-file-object"] = new File([data], '${path.basename(filePath)}', { type: "${fileType}" });
          ipcRenderer.send('file-body-transfer-end', 'done');
        });
      }`);
    })
    .then(()=>{
      let data = fs.readFileSync(filePath);
      return this.page.expectIpcReceived(()=>{
        this.page.webContents.send('file-body-transfer', data);
      }, 'file-body-transfer-end')
    });
  }
  /**
   * Replace the behavior when form is submitted with ajax. And The behavior is below,
   * Send the request by including the File object specified in the data-file-object attribute of
   * the input element of type=file in the form.
   * When submit request get response 200:OK, call onSuccess callback with response object,
   * by default replace document.body by response.text() and ipcMessage send on channel 'submit-ajax-done'.
   * When submit request get response 302:Redirect, call onRedirect callback with response object,
   * by default load the page of response.url, and pageLoaded event occur.
   * When submit request get response neither 200:OK or 302:Redirect, call onRespoinse callback with response object,
   * by default throw Error
   * @param {object} callbacks - An object with callback with each attribute name
   * @param {function,string} callbacks.onSuccess - callback function for handling response when status 200.
   * @param {function,string} callbacks.onRedirect - callback function for handling response when status 302.
   * @param {function,string} callbacks.onResponse - callback function for handling response when status is not 200 and 302.
   * @return {Promise}
   */
  replaceSubmitWithAjax(callbacks = {}){
    const callbacksDefault = {
      onSuccess: (response)=>{ response.text().then((text)=>{ document.body.innerHTML = text }) },
      onRedirect: (response)=>{ window.location.href = response.url; ipcRenderer.send('submit-ajax-done', 'done'); },
      onResponse: (response)=>{ throw new Error(response.status + " " + response.statusText) }
    };
    callbacks.onSuccess  = callbacks.onSuccess  || callbacksDefault.onSuccess;
    callbacks.onRedirect = callbacks.onRedirect || callbacksDefault.onRedirect;
    callbacks.onResponse = callbacks.onResponse || callbacksDefault.onResponse;

    return this.executeJs(`(elements)=>{
        let searchTag = (el, tag)=>{ return el == null || el.tagName == tag ? el : searchTag(el.parentElement, tag) };
        let form = searchTag(elements[0].parentElement, "FORM");

        form && !form.attributes["data-upload-file-event-listener-added"] && form.addEventListener('submit', (event)=>{
          form.attributes["data-upload-file-event-listener-added"] = true;
          event.preventDefault();

          const formData = new FormData(form);
          for(let i = 0; i < form.elements.length; i++){
            let input = form.elements[i];
            if(input && input.type == "file" && input.attributes["data-file-object"]){
              formData.append(input.name, input.attributes["data-file-object"]);
            }
          }
          fetch(form.action, {
            method: form.method, body: formData, credentials: 'same-origin', redirect: 'manual'
          })
          .then((response)=>{
            switch(response.status){
              case 200: return (${callbacks.onSuccess.toString()})(response);
              case 302: return (${callbacks.onRedirect.toString()})(response);
              default:  return (${callbacks.onResponse.toString()})(response);
            }
          })
        })
      }`
    );
  }
  /**
   * execute "JavaScript code" given as argument
   * @return {Promise}
   */
  executeJs(code){
    return this.withAction(code).evaluate();
  }
  /**
   * @return {Promise} Promise which resolved with array of finder, that array length is matched number
   */
  toArray(){
    return this.count()
    .then((count)=>{
      let array = [];
      for(let i = 0; i < count; i++){
        array.push(this.clone().find(`(node, idx)=>{ return idx == ${i} }`));
      }
      return array;
    })
  }
  /**
   * @return {Promise} Get new Finder for the first matched element. this is same to "indexOf(0)"
   */
  getFirst(){
    return this.indexOf(0);
  }
  /**
   * @return {Promise} Get new Finder for the given index of matched elements
   */
  indexOf(i){
    return this.count()
    .then((count)=>{
      if(count < i){ throw `Finder have matched less Elements than given value(${i}) !` }
      return this.clone().find(`(node, idx)=>{ return idx == ${i} }`);
    })
  }
  /**
   * return true if all elements which is found by Finder satisfied given filter
   * @example
   * await page.find("input").every(FinderFilter.haveValue("123")) // return true or false
   */
  every(code){
    return this.withMatcher(code, `(filtered)=>{ return filtered.length == elements.length }`)
  }

  clickAndExpectPageLoaded(...args){
    if(args.length > 0){ this.find(...args) }
    return this.page.expectPageLoaded(()=>{ this.click() });
  }
  /**
   * alias of clickAndExpectPageLoaded
   */
  clickAndWaitLoading(...args){
    return this.clickAndExpectPageLoaded(...args);
  }
  clickAndExpectAjaxComplete(...args){
    if(args.length > 0){ this.find(...args) }
    return this.page.expectAjaxComplete(()=>{ this.click() });
  }
}

function mixin(dest, source){
  for(let key of Reflect.ownKeys(source)){
    if(key === "constructor") continue;

    let descriptor = Object.getOwnPropertyDescriptor(source, key);
    descriptor.configurable = true;
    descriptor.enumerable   = false;
    if(descriptor.hasOwnProperty("writable")){
      descriptor.writable = true;
    }
    Object.defineProperty(dest, key, descriptor);
  }
}

mixin(Finder.prototype, FinderAction.prototype);
mixin(Finder.prototype, FinderFilter.prototype);

module.exports = Finder;
