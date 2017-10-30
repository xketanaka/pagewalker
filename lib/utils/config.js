const fs = require("fs");
const path = require("path");
const OptParser = require("./opt_parser");

/**
 * this class have configuratin information.
 */
class Config {
  static get CONFIG_FILE_PATH(){
    return "config.json";
  }
  static get DEFAULT_CONFIG(){
    return {
      scenarioDir: "scenario",
      scenarioFile: undefined,
      ignoreDir: "supports",
      successSaveFile: "success-scenario.log",
      silentMode: false,
      startFromFirst: false,
      fileDownloadDir: "downloads",
      mocha: {
        ui: "bdd",
        bail: true,
        reporter: "spec",
        timeout: 5000,
        slow: false,
      },
      browserWindow: {
        width: 1024,
        height: 768,
        show: true,
        webPreferences: {
          nodeIntegration: false,
          preload: path.join(__dirname, "..", "window_preloaded.js"),
          allowRunningInsecureContent: true
        }
      }
    }
  }
  static create(commandLineArgs){
    this.instance = new Config();
    this.instance.merge(Config.DEFAULT_CONFIG)
    this.instance.loadConfigFile(this.CONFIG_FILE_PATH);
    this.instance.loadConfigFile(this.CONFIG_FILE_PATH + ".local");

    let optParser = new OptParser(commandLineArgs);
    this.instance.merge(optParser.parse((config, cmdOpt)=>{
      switch(cmdOpt.option()){
        case "-r":
        case "--reset":           config.startFromFirst = true; break;
        case "-s":
        case "--silent":          config.silentMode     = true; break;
        default:
          if(this.instance.isExists(cmdOpt.options(true))){
            Config.assign(config, cmdOpt.options(true), cmdOpt.getValueOrFail())
          }else{
            throw new Error("Unexpected CommandLine Argument, [" + cmdOpt.options() + "]");
          }
      }
    }));

    optParser.scriptArguments().forEach((args)=>{
      let filePath = args[0] == "/" ? args : path.join(process.cwd(), args);
      let stat = fs.statSync(filePath)
      let keyName = stat.isDirectory() ? "scenarioDir" : "scenarioFile";
      if(!(this.instance[keyName] instanceof Array)){
        this.instance[keyName] = []
      }
      this.instance[keyName].push(args);
    })

    // apply options
    if(this.instance.silentMode){
      this.instance.browserWindow.show = false;
      this.instance.mocha.reporter = "dot";
    }
    return this.instance;
  }
  static get config(){
    return this.instance;
  }
  /**
   * @private
   */
  loadConfigFile(filePath){
    if(fs.existsSync(filePath)){
      this.merge(JSON.parse(fs.readFileSync(filePath, 'utf8')));
    }
  }
  clone(){
    let cloned = new Config();
    cloned.merge(this);
    return cloned;
  }
  merge(source){
    Config.merge(this, source);
  }
  static merge(dest, source){
    Object.keys(source).forEach((key)=>{
      if(typeof source[key] == "object" && typeof dest[key] == "object"){
        this.merge(dest[key], source[key]);
      }else{
        dest[key] = source[key];
      }
    });
  }
  isExists(key){
    return !!key.split(".").reduce((result, k)=>{ return Config.isExists(result, k) })
  }
  static isExists(object, key){
    if(typeof object != "object") return false;
    if(key in object){
      return typeof object[key] == "object" ? object[key] : true;
    }
  }
  static assign(config, key, value){
    let keys = key.split(".");
    keys.reduce((object, key, index)=>{
      if(index < keys.length - 1){
        return object[key];
      }
      switch(typeof object[key]){
        case 'number':  object[key] = new Number(value);
        case 'boolean': object[key] = new Boolean(value);
        default:        object[key] = value;
      }
    }, config);
  }
}

module.exports = Config;
