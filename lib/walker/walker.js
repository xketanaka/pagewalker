const Mocha = require('mocha');
const fs = require('fs');
const path = require('path');
const ResultStore = require("./result_store");

class Walker {
  constructor(config){
    this.config = config;
    this.mocha = new Mocha(config.mocha);

    if(this.config.scenarioFile){
      this.mocha.addFile(this.config.scenarioFile)
    }else{
      let scenarioDir = path.join(process.cwd(), this.config.scenarioDir);
      if(!Walker.isDir(scenarioDir)){
        throw `Scenario Directory(${this.config.scenarioDir}) is not found or not directory!`;
      }
      Walker.findAllFilesSync(scenarioDir)
      .filter(file => file.substr(-3) === '.js')
      .forEach((file)=>{ this.mocha.addFile(file) })
    }
    this.mocha.loadFiles();
  }

  walk(callback){
    Promise.resolve().then(()=>{
      return this.config.startFromFirst ? [] : ResultStore.loadPreviousResults();
    })
    .then((succeeded)=>{
      if(succeeded && succeeded.length > 0){
        let regexp = succeeded.map(s => s.replace(/[()|]/, "\\$&")).join("|");
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
  static findAllFilesSync(dir){
    let results = [];
    fs.readdirSync(dir).map(file => path.join(dir, file)).forEach((file)=>{
      if (this.isDir(file)){
        results = results.concat(Walker.findAllFiles(file))
      }else{
        results.push(file)
      }
    })
    return results
  }
}

module.exports = Walker;
