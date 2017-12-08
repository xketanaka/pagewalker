const fs = require("fs");
const path = require("path");
const Finder = require("../../page/finder");

class ElectronFinderExtention extends Finder {

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
        browserSocket.once('file-body-transfer', (event, data)=>{
          input.attributes["data-file-object"] = new File([data], '${path.basename(filePath)}', { type: "${fileType}" });
          browserSocket.send('file-body-transfer-end', 'done');
        });
      }`);
    })
    .then(()=>{
      let data = fs.readFileSync(filePath);
      return this.page.waitForBrowserSocket('file-body-transfer-end', ()=>{
        this.page.browserPage.nativeObject.send('file-body-transfer', data);
      })
    });
  }
  /**
   * Replace the behavior when form is submitted with ajax. And The behavior is below,
   * Send the request by including the File object specified in the data-file-object attribute of
   * the input element of type=file in the form.
   * When submit request get response 200:OK, call onSuccess callback with response object,
   * by default replace document.body by response.text() and message send with browserSocket on channel 'submit-ajax-done'.
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
      onSuccess: (response)=>{ response.text().then((text)=>{ document.body.innerHTML = text; browserSocket.send('submit-ajax-done', 'done'); }) },
      onRedirect: (response)=>{ window.location.href = response.url },
      onResponse: (response)=>{ throw new Error(response.status + " " + response.statusText) }
    };
    callbacks.onSuccess  = callbacks.onSuccess  || callbacksDefault.onSuccess;
    callbacks.onRedirect = callbacks.onRedirect || callbacksDefault.onRedirect;
    callbacks.onResponse = callbacks.onResponse || callbacksDefault.onResponse;

    return this.executeJs(`(elements)=>{
        let searchTag = (el, tag)=>{ return el == null || el.tagName == tag ? el : searchTag(el.parentElement, tag) };
        let form = searchTag(elements[0].parentElement, "FORM");
        if(!form || form.attributes["data-upload-file-event-listener-added"]) return;

        form.attributes["data-upload-file-event-listener-added"] = true;
        form.addEventListener('submit', (event)=>{
          event.preventDefault();

          const formData = new FormData(form);
          for(let i = 0; i < form.elements.length; i++){
            let input = form.elements[i];
            if(input && input.type == "file" && input.attributes["data-file-object"]){
              formData.append(input.name, input.attributes["data-file-object"]);
            }
          }
          fetch(form.action, {
            method: form.method, body: formData, credentials: 'same-origin',
          })
          .then((response)=>{
            const callbacks = {
              redirect: ${callbacks.onRedirect.toString()},
              success: ${callbacks.onSuccess.toString()},
              response: ${callbacks.onResponse.toString()}
            }
            switch(response.status){
              case 200: return response.redirected ? callbacks.redirect(response) : callbacks.success(response);
              case 302: return callbacks.redirect(response);
              default:  return callbacks.response(response);
            }
          })
        })
      }`
    );
  }
}

module.exports = ElectronFinderExtention;
