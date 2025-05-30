const Logger = require("../utils/logger");

class FinderBase {
  static convertArgumentsToConditions(...args){
    return this.convertArgumentsToConditionsImpl(Filter, ...args);
  }
  static convertArgumentsToConditionsAsMapper(...args){
    return this.convertArgumentsToConditionsImpl(Mapper, ...args);
  }
  static convertArgumentsToConditionsImpl(conditionKlass, ...args){
    return args.map((arg)=>{
      if(typeof arg == 'function'){
        return new conditionKlass(arg.toString());
      }
      if(typeof arg == 'string'){
        if(arg.match(/\)\s*=>\s*\{/) || arg.match(/\w+\s*=>/) || arg.trim().match(/^function/)){
          return new conditionKlass(arg);
        }else{
          return new Selector(arg);
        }
      }
      throw `Condition parameter is unexpected value, [${arg}]`;
    })
  }
  constructor(page, ...args){
    this._page = page;
    this._conditions = FinderBase.convertArgumentsToConditions(...args);
    this._allowNotFound = false;
    this._context = undefined;
    this._action = undefined;
  }
  get page(){ return this._page }
  get conditions(){ return this._conditions }
  get action(){ return this._action }
  get context(){ return this._context }
  get allowNotFound(){ return this._allowNotFound }
  allowNotFound(val){ this._allowNotFound = val }
  /**
   * @params {Function} callback - Optional. if callback function given, it is called with the cloned as argument
   * @return {Object} cloned object
   */
  clone(callback){
    const cloned = Object.assign(new this.constructor(this.page), {
      _conditions: this.conditions.concat([]),
      allowNotFound: this.allowNotFound,
      _action: this.action,
      _context: this.context
    });
    if(callback && typeof callback == 'function'){
      callback(cloned);
    }
    return cloned;
  }
  /**
   * @return {FinderBase} new finder object which have added conditions
   */
  find(...args){
    return this.clone((cloned) => {
      cloned._conditions = this.conditions.concat(FinderBase.convertArgumentsToConditions(...args));
    });
  }
  /**
   * @return {FinderBase} new finder object with added mapping function
   */
  map(...args){
    return this.clone((cloned) => {
      cloned._conditions = this.conditions.concat(FinderBase.convertArgumentsToConditionsAsMapper(...args));
    });
  }
  withAction(action){
    return this.clone((cloned) => {
      cloned._action = typeof action == "function" ?  action.toString() : action;
    });
  }
  withContext(context){
    return this.clone((cloned) => {
      cloned._context = context;
    })
  }
  /**
   * generate and return javascript code for finding element by this finder object
   * @return {string}
   */
  toJsCode(){
    let conditions = this.conditions;
    if(!conditions || !(conditions[0] instanceof Selector)){
      conditions = [new Selector("*")];
    }

    const strEscape = (str => str.split('\\"').map(s => s.replace(/"/g, '\\"')).join('\\"'));

    let jsCode = `
      let _document = ${this.context ? this.context : 'window'}.document;
      var elements = Array.from(_document.querySelectorAll("${strEscape(conditions[0].selector)}"));
    `;
    jsCode += conditions.slice(1).map((condition)=>{
      if(condition instanceof Selector)
        return `{
          elements = elements.reduce((arr, e, idx)=>{
            return arr.concat(Array.from(e.querySelectorAll("${strEscape(condition.selector)}")));
          }, []);
        }`;
      if(condition instanceof Mapper)
        return `{
          let func = ${condition.code};
          elements = elements.map((e, idx)=>{ return func(e, idx) });
        }`;
      else
        return `{
          let func = ${condition.code};
          elements = elements.filter((e, idx)=>{ return func(e, idx) });
        }`;

    }).join("\n");

    if(!this.allowNotFound){
      jsCode += `
        if(elements.length == 0){
          return Promise.reject('not found');
        }
      `
    }
    if(this.action){
      jsCode += `
        return (${this.action})(elements);
      `;
    }
    else{
      jsCode += `return elements.length;`
    }
    return jsCode;
  }

  /**
   * @return {Promise} Promise resolved in evaluated JavaScript code
   */
  evaluate(){
    let jsCode = this.toJsCode();
    Logger.trace(`Evaluate Javascript "${jsCode}"`)

    return this.page.executeJs(`(()=>{ try{ ${jsCode} }catch(e){ return Promise.reject(e.toString()) } })()`)
    .catch((err)=>{
      Logger.debug(`Error occurred in page [${this.page.url}] on Evaluating Javascript: ${err}`);
      throw err
    })
  }
}

class Filter {
  constructor(code){
    this.code = code;
  }
}
class Mapper {
  constructor(code){
    this.code = code;
  }
}
class Selector {
  constructor(selector){
    this.selector = selector;
  }
}

module.exports = FinderBase;
