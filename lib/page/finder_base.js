
class FinderBase {
  static convertArgumentsToConditions(...args){
    return args.map((arg)=>{
      if(typeof arg == 'function'){
        return new Filter(arg.toString());
      }
      if(typeof arg == 'string'){
        if(arg.match(/\)\s*=>\s*\{/) || arg.trim().match(/^function/)){
          return new Filter(arg);
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
    this._matcher = undefined;
    this._action = undefined;
  }
  get page(){ return this._page }
  get conditions(){ return this._conditions }
  get matcher(){ return this._matcher }
  get action(){ return this._action }
  get allowNotFound(){ return this._allowNotFound }
  allowNotFound(val){ this._allowNotFound = val }
  /**
   * @return {Object} cloned object
   */
  clone(){
    return Object.assign(new this.constuctor(this.page), {
      _conditions: this.conditions.concat(),
      allowNotFound: this.allowNotFound,
      _matcher: this.matcher,
      _action: this.action
    });
  }
  /**
   * @return {FinderBase} self which have added conditions
   */
  find(...args){
    this.conditions.concat(FinderBase.convertArgumentsToConditions(...args));
    return this;
  }
  withAction(action){
    this._action = typeof action == "function" ?  action.toString() : action;
    return this;
  }
  withMatcher(filter, matcher){
    if(typeof filter == "function"){ filter = filter.toString() }
    if(typeof matcher == "function"){ matcher = matcher.toString() }
    this._matcher = new Matcher(filter, matcher);
    return this;
  }
  /**
   * @return {Promise} Promise resolved in evaluated JavaScript code
   */
  evaluate(){
    if(this.matcher && this.action){ throw "Both action and matcher were specified" }

    let conditions = this.conditions;
    if(!conditions || !(conditions[0] instanceof Selector)){
      conditions = [new Selector("*")];
    }

    let jsCode = `
      var elements = Array.from(document.querySelectorAll("${conditions[0].selector}"));
    `;
    jsCode += conditions.slice(1).map((condition)=>{
      return condition instanceof Selector ?
        `{
          elements = elements.reduce((arr, e, idx)=>{
            return arr.concat(Array.from(e.querySelectorAll("${condtion.selector}")));
          }, []);
        }` :
        `{
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
    else if(this.matcher){
      jsCode += `{
        let filtered = (${this.matcher.filter})(elements);
        return (${this.matcher.matcher})(filtered);
      }`;
    }
    else{
      jsCode += `return elements.length;`
    }
//console.log(jsCode)

    return this.page.executeJs(`(()=>{ try{ ${jsCode} }catch(e){ return Promise.reject(e.toString()) } })()`)
    .then((val)=>{
      if(this.matcher && val === false){ throw "No Match!" }
      return val;
    })
  }
}

class Filter {
  constructor(code){
    this.code = code;
  }
}
class Selector {
  constructor(selector){
    this.selector = selector;
  }
}
class Matcher {
  constructor(filter, matcher){
    this.filter = filter;
    this.matcher = matcher;
  }
}

module.exports = FinderBase;
