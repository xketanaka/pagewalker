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
      browser: "electron",
      scenarioDir: "scenario",
      scenarioFile: undefined,
      ignoreDir: "supports",
      silentMode: false,
      exitImmediately: false,  // whether or not keep shows for browser window on failed
      takeScreenshotAuto: false,
      fileDownloadDir: "downloads",
      screenshotsDir: "screenshots",
      width: 1024,
      height: 768,
      mocha: {
        ui: "bdd",
        bail: true,
        reporter: "spec",
        timeout: 5000,
        slow: false,
      },
      assertion: {
        png: {
          threshold: 0.3,
          ksize: 50
        }
      },
      logger: {
        appenders: {
          out: { type: 'stdout' }
        },
        categories: {
          default: { appenders: ['out'], level: 'debug' },
        },
      },
      electron: {
        show: true,
        webPreferences: {
          nodeIntegration: false,
          preload: path.join(__dirname, "../browser/electron/window_preloaded.js"),
          allowRunningInsecureContent: true
        }
      },
      puppeteer: {
        headless: false
      },
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
        case "-s":
        case "--silent":          config.silentMode     = true; break;
        default:
          let optionKey = cmdOpt.option(true).replace(/--/, '');
          if(this.instance.isExists(optionKey)){
            Config.assign(config, optionKey, cmdOpt.getValueOrFail())
          }else{
            const msg = "Unexpected CommandLine Argument, [" + cmdOpt.option() + "]"
            console.log(msg);
            throw new Error(msg);
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
      this.instance.electron.show = false;
      this.instance.puppeteer.headless = true;
      this.instance.mocha.reporter = "dot";
      this.instance.exitImmediately = true;
    }
    this.instance.puppeteer.defaultViewport = this.instance.puppeteer.defaultViewport || {};
    this.instance.electron.width = this.instance.puppeteer.defaultViewport.width = this.instance.width;
    this.instance.electron.height = this.instance.puppeteer.defaultViewport.height = this.instance.height;

    // validates
    if(!["electron", "puppeteer"].includes(this.instance.browser)){
      throw new Error(`config.browser is not allowed! [${this.instance.browser}]`)
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
    let parentObj = this;
    return !!key.split(".").every((k)=>{
      let isExists = parentObj && (k in parentObj);
      parentObj = isExists && parentObj[k];
      return isExists;
    })
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
        if(!object[key]){
          object[key] = {}
        }
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
