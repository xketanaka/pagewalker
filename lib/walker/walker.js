const Mocha = require('mocha');
const fs = require('fs');
const path = require('path');
const ResultStore = require("./result_store");

class Walker {
  constructor(config){
    this.config = config;
    this.mocha = new Mocha(config.mocha);

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
    let originalFunctions = {};
    let delayedFunctions = [];
    this.mocha.suite.on('pre-require', (context)=>{
      originalFunctions.describe = context.describe;
      originalFunctions.xdescribe = context.xdescribe;
      originalFunctions.describeOnly = context.describe.only;
      context.describe = function(title, fn){
        delayedFunctions.push(["describe", title, fn, this]);
      }
      context.xdescribe = function(title, fn){
        delayedFunctions.push(["xdescribe", title, fn, this]);
      }
      context.describe.only = function(title, fn){
        delayedFunctions.push(["describeOnly", title, fn, this]);
      }
      // set to aliases
      context.context = context.suite = context.describe;
      context.xcontext = context.describe.skip = context.xdescribe;
    })
    this.mocha.suite.on('post-require', (context)=>{
      context.context = context.suite = context.describe = originalFunctions.describe;
      context.xcontext = context.xdescribe = originalFunctions.xdescribe;
    })
    this.mocha.loadFiles();
    delayedFunctions.forEach((array)=>{
      let func = originalFunctions[array[0]];
      func.call(array[3], array[1], array[2]);
    })
  }

  walk(callback){
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
