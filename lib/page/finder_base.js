const Logger = require("../utils/logger");
const {config} = require("../utils/config");

const NOT_READY_MARKER = "__pagewalker_element_not_ready__";

// RetryCount and Interval for Inside-page retries in auto-waiting 'marker' mode.
// Auto-waiting 'marker' mode consists of inside-page retries and node-layer retries.
const IN_PAGE_RETRY_COUNT = 5;
const IN_PAGE_RETRY_INTERVAL = 20;

/**
 * Base class of Finder. Holds the lazily-evaluated condition chain.
 */
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
    this._context = undefined;
    this._action = undefined;
  }
  get page(){ return this._page }
  get conditions(){ return this._conditions }
  get action(){ return this._action }
  get context(){ return this._context }
  /**
   * @param {Function} callback - Optional. if callback function given, it is called with the cloned as argument
   * @return {Object} cloned object
   */
  clone(callback){
    const cloned = Object.assign(new this.constructor(this.page), {
      _conditions: this.conditions.concat([]),
      _action: this.action,
      _context: this.context,
      _noWait: this._noWait,
      _waitTimeout: this._waitTimeout,
      _retry: this._retry,
      _allowWindowClose: this._allowWindowClose
    });
    if(callback && typeof callback == 'function'){
      callback(cloned);
    }
    return cloned;
  }
  /**
   * Disable auto-waiting for this finder.
   * The action is executed immediately even when config.autoWaiting.enabled is true.
   * If target element is not found when called, throw exception.
   * @return {FinderBase} new finder object
   */
  noWait(){
    return this.clone((cloned)=>{ cloned._noWait = true });
  }
  /**
   * Declare that the action closes the window itself, like clicking a link calling window.close().
   * Such an action can not return its result because the page is already gone, which is reported
   * as an error like "Target page, context or browser has been closed". This method makes the
   * action ignore that error.
   * @return {FinderBase} new finder object
   * @example
   * const newWin = await page.waitForNewWindow(()=>{ ... })
   * await newWin.page.find("a.close-link").allowWindowClose().click();
   */
  allowWindowClose(){
    return this.clone((cloned)=>{ cloned._allowWindowClose = true });
  }
  /**
   * Override the auto-waiting timeout for this finder.
   * @param {number} msec - timeout in milliseconds
   * @return {FinderBase} new finder object
   */
  waitTimeout(msec){
    return this.clone((cloned)=>{ cloned._waitTimeout = msec });
  }
  /**
   * Make evaluate() poll (retry) until the target condition is met, or the timeout elapses.
   * @param {object} opts
   * @param {string} opts.until - what "ready" means.
   *   'exist' (default): the element exists.
   *   'actionable': the element exists AND is visible and not disabled (includes 'exist').
   * @param {number} opts.timeout - msec. give up after this (default 5000)
   * @param {number} opts.interval - msec. polling interval (default 100)
   * @param {Function} opts.onTimeout - optional. returns the Error to throw on timeout (default: Error('timeout'))
   * @return {FinderBase} new finder object
   */
  withRetry(opts){
    return this.clone((cloned)=>{ cloned._retry = opts });
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
   * @param {object} options
   * @param {string} options.notFoundBehavior - how the generated code behaves when no element matches:
   *   'count'  (default) return the number of matched elements (and it is zero)
   *   'throw'  throw "Element not found"
   *   'marker' return the not-ready marker (for auto-waiting retries)
   * @param {string} options.until - used with notFoundBehavior: 'marker'.
   *   'exist' (default) ready once the element exists
   *   'actionable' ready once the element exists AND is visible and not disabled (includes 'exist')
   * @return {string}
   */
  toJsCode(options = {}){
    const notFoundBehavior = options.notFoundBehavior || 'count';
    let conditions = this.conditions;
    if(!conditions || !(conditions[0] instanceof Selector)){
      conditions = [new Selector("*")];
    }

    const strEscape = (str => str.split('\\"').map(s => s.replace(/"/g, '\\"')).join('\\"'));

    let findCode = `
      let _document = ${this.context ? this.context : 'window'}.document;
      var elements = Array.from(_document.querySelectorAll("${strEscape(conditions[0].selector)}"));
    `;
    findCode += conditions.slice(1).map((condition)=>{
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

    const resultCode = this.action ? `return (${this.action})(elements);` : `return elements.length;`;

    if(notFoundBehavior === 'marker'){
      let filterCode = '';
      if(options.until === 'actionable'){
        // 'actionable' requires the element to be visible and enabled.
        filterCode = `
          elements = elements.filter((e)=>{
            if(e.disabled) return false;
            // the visibility of an option depends on the dropdown being open: check the parent select instead
            const visibilityTarget = (e.tagName == 'OPTION') ? e.closest('select') : e;
            if(visibilityTarget && visibilityTarget.checkVisibility && !visibilityTarget.checkVisibility()) return false;
            return true;
          });
        `;
      }
      // Re-check inside the page a few times before returning the not-ready marker to Node
      return `
        return (async ()=>{
          for(let __attempt = 0; __attempt < ${IN_PAGE_RETRY_COUNT}; __attempt++){
            ${findCode}
            ${filterCode}
            if(elements.length > 0){ ${resultCode} }
            if(__attempt < ${IN_PAGE_RETRY_COUNT - 1}){
              await new Promise((__r)=> setTimeout(__r, ${IN_PAGE_RETRY_INTERVAL}));
            }
          }
          return "${NOT_READY_MARKER}";
        })();
      `;
    }

    let jsCode = findCode;
    if(notFoundBehavior === 'throw'){
      jsCode += `
        if(elements.length == 0){
          throw new Error('Element not found');
        }
      `;
    }
    jsCode += resultCode;
    return jsCode;
  }

  /**
   * Evaluate as a action (used by click, fillIn, check, ...).
   * The difference from `evaluate()` is how it behaves when an element is not found.
   * When config.autoWaiting.enabled is false, throws "Element not found" error.
   * When config.autoWaiting.enabled is true, retries until the target element exists, is visible and is not disabled.
   * @return {Promise} Promise resolved in evaluated JavaScript code
   */
  evaluateAction(){
    const autoWaiting = (config && config.autoWaiting) || {};
    const windowCloseErrorHandler = (err)=>{
      if(this._allowWindowClose && /page.*(has been closed|is closed)|browser has been closed|Session closed/i.test(String(err && err.message))){
        return;
      }
      throw err;
    };
    if(!autoWaiting.enabled || this._noWait){
      return this._evaluate({ notFoundBehavior: 'throw' }).catch(windowCloseErrorHandler);
    }
    const timeout = this._waitTimeout != undefined ? this._waitTimeout : (autoWaiting.timeout || 5000);
    const interval = autoWaiting.interval || 100;
    const onTimeout = (() => new Error(`Element not found or not actionable within ${timeout}ms`))

    return this.withRetry({ until: 'actionable', timeout, interval, onTimeout }).evaluate()
      .catch(windowCloseErrorHandler);
  }
  /**
   * Evaluate this finder and resolve with the result (the match count, or the action result).
   * @return {Promise} Promise resolved in evaluated JavaScript code
   */
  evaluate(){
    if(!this._retry){
      return this._evaluate();
    }
    const { until = 'exist', timeout = 5000, interval = 100, onTimeout = ()=> new Error('timeout') } = this._retry;
    const deadline = Date.now() + timeout;
    const delay = ()=>{
      // resolve(= finish delay) when the interval(=100ms) elapses OR the page load event.
      return new Promise((resolve)=>{
        let settled = false;
        let timer;
        const finish = ()=>{
          if(settled) return;
          settled = true;
          clearTimeout(timer);
          unsubscribe();
          resolve();
        };
        const unsubscribe = this.page.onceLoad(finish);
        timer = setTimeout(finish, interval);
      });
    };
    const loop = ()=>{
      return this._evaluate({ notFoundBehavior: 'marker', until })
      .then(
        (result)=>{
          if(result !== NOT_READY_MARKER) return result;
          if(Date.now() >= deadline) throw onTimeout();
          return delay().then(loop);
        },
        (err)=>{
          // the execution context can be destroyed by a navigation between attempts. retry in that case.
          const retriableRegexp = /Execution context was destroyed|Cannot find context|because of a navigation|frame got detached/i;
          if(Date.now() < deadline && retriableRegexp.test(String(err && err.message))){
            return delay().then(loop);
          }
          throw err;
        }
      );
    };
    return loop();
  }
  /**
   * @private
   * @param {object} options - passed through to toJsCode() (e.g. { notFoundBehavior: 'throw' })
   * @return {Promise} Promise resolved in evaluated JavaScript code
   */
  _evaluate(options = {}){
    let jsCode = this.toJsCode(options);
    Logger.trace(`Evaluate Javascript "${jsCode}"`)

    return this.page.executeJs(`(()=>{ try{ ${jsCode} }catch(e){ return Promise.reject(e.toString()) } })()`)
    .catch((err)=>{
      Logger.trace(`Error occurred in page [${this.page.url}] on Evaluating Javascript: ${err}`);
      throw typeof err === 'string' ? new Error(err) : err;
    })
  }
}

/**
 * Condition which filters elements. used in Finder condition chain.
 */
class Filter {
  constructor(code){
    this.code = code;
  }
}
/**
 * Condition which maps elements. used in Finder condition chain.
 */
class Mapper {
  constructor(code){
    this.code = code;
  }
}
/**
 * Condition which selects elements by CSS selector. used in Finder condition chain.
 */
class Selector {
  constructor(selector){
    this.selector = selector;
  }
}

module.exports = FinderBase;
