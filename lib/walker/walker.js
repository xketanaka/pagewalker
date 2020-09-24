const Mocha = require('mocha');
const fs = require('fs');
const path = require('path');
const ResultStore = {} // require("./result_store");
const mkdirp = require("mkdirp");

class Walker {
  constructor(config){
    this.config = config;
    this.mocha = new Mocha(Object.assign({}, config.mocha, { timeout: config.mocha.timeout * 2 }));

    if(this.config.screenshotsDir){
      mkdirp.sync(path.join(this.config.screenshotsDir, 'actual'));
      mkdirp.sync(path.join(this.config.screenshotsDir, 'expected'));
    }

    if(this.config.scenarioFile){
      let scenarioFiles = Walker.toArray(this.config.scenarioFile);
      scenarioFiles.sort().forEach((file)=>{ this.mocha.addFile(file) })
    }else{
      let scenarioDirs = Walker.toArray(this.config.scenarioDir);
      let ignoreDirs = Walker.toArray(this.config.ignoreDir);
      scenarioDirs.map(dir => path.join(process.cwd(), dir)).forEach((scenarioDir)=>{
        if(!Walker.isDir(scenarioDir)){
          throw `Scenario Directory(${scenarioDir}) is not found or not directory!`;
        }
        Walker.findAllFilesSync(scenarioDir, ignoreDirs)
        .filter(file => file.substr(-3) === '.js')
        .forEach((file)=>{ this.mocha.addFile(file) })
      })
    }
    this.loadFiles();
  }
  loadFiles(){
    let originalFunctions = {};
    let delayedFunctions = [];
    this.mocha.suite.on('pre-require', (context)=>{
      originalFunctions.describe = context.describe;
      originalFunctions.xdescribe = context.xdescribe;
      originalFunctions.describeOnly = context.describe.only;
      context.describe = function(title, fn, ...args){
        delayedFunctions.push(["describe", this, title, fn, args]);
      }
      context.xdescribe = function(title, fn, ...args){
        delayedFunctions.push(["xdescribe", this, title, fn, args]);
      }
      context.describe.only = function(title, fn, ...args){
        delayedFunctions.push(["describeOnly", this, title, fn, args]);
      }
      // set to aliases
      context.context = context.suite = context.describe;
      context.xcontext = context.describe.skip = context.xdescribe;
    })
    this.mocha.suite.on('post-require', (context)=>{
      // restore desctibe, xdescribe, describe.only with object property function support
      // object property function support is describe("title", { "title": function(){...} }, ...args)
      ["describe", "xdescribe", "describeOnly"].forEach((key)=>{
        originalFunctions[key] = Walker.objectPropertySupport(originalFunctions[key]);
      })
      context.context = context.suite = context.describe = originalFunctions.describe;
      context.xcontext = context.xdescribe = originalFunctions.xdescribe;
      context.describe.only = originalFunctions.describeOnly;
      // hook function allows object property support.
      ["before", "after", "beforeEach", "afterEach"].filter(key => context[key]).forEach((key)=>{
        context[key] = Walker.objectPropertySupport(context[key]);
      })
    })
    this.mocha.loadFiles();
    delayedFunctions.forEach((array)=>{
      let func = originalFunctions[array[0]];
      func.call(array[1], array[2], array[3], ...array[4]); // this, title, fn, args
    })
  }
  /**
   * @private
   */
  static objectPropertySupport(originalFunc){
    let newFunc = function(title, fn, ...args){
      if(typeof title == "function"){
        originalFunc.call(this, title);
      }
      if(typeof fn == "function"){
        originalFunc.call(this, title, fn);
      }
      if(typeof fn == "object"){
        if(typeof fn[title] != "function") throw new Error(`Property missing! "${title}" on object [${fn}]`)
        originalFunc.call(this, title, function(){ return fn[title].call(this, ...args) });
      }
    };
    for(var prop in originalFunc){
      if(originalFunc.hasOwnProperty(prop)) newFunc[prop] = originalFunc[prop];
    }
    return newFunc;
  }
  walk(callback){
    this.mocha.run(callback);
  }
  walk_deprecated_(callback){
    Promise.resolve().then(()=>{
      return this.config.startFromFirst ? [] : ResultStore.loadPreviousResults();
    })
    .then((succeeded)=>{
      if(succeeded && succeeded.length > 0){
        let regexp = succeeded.map(s => s.replace(/[()|]/g, "\\$&")).join("|");
        this.mocha.options.grep = new RegExp("^("+ regexp +")$");
        this.mocha.options.invert = true;
      }
    })
    .then(()=>{
      let runner = this.mocha.run((failures)=>{
        if(failures==0){
          ResultStore.saveAll(this.mocha.suite).then(()=>{ callback(failures) })
        }else{
          callback(failures);
        }
      });
      runner.on('fail', (failtest, error)=>{
        ResultStore.saveSucceeded(this.mocha.suite, failtest);
      })
    })
  }

  static isDir(path){
    let stat = fs.statSync(path);
    return stat && stat.isDirectory();
  }
  static findAllFilesSync(dir, ignorePattern){
    let results = [];
    fs.readdirSync(dir)
    .filter(file => !ignorePattern.includes(file))
    .map(file => path.join(dir, file))
    .forEach((file)=>{
      if (this.isDir(file)){
        results = results.concat(Walker.findAllFilesSync(file, ignorePattern))
      }else{
        results.push(file)
      }
    })
    return results
  }
  static toArray(value){
    return (value instanceof Array) ? value : [ value ];
  }
}

module.exports = Walker;
