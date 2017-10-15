const fs = require("fs");
const path = require("path");

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
      successSaveFile: "success-scenario.log",
      silentMode: true,
      startFromFirst: false,
      mocha: {
        ui: "bdd",
        bail: true,
        reporter: "spec",
        timeout: 5000,
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

    if(fs.existsSync(this.CONFIG_FILE_PATH)){
      this.instance.merge(JSON.parse(fs.readFileSync(this.CONFIG_FILE_PATH, 'utf8')));
    }
    // TODO parse commandLineArgs
    // -s --silent
    // -r --reset
    // scenarioFile or scenarioDir
    //

    // apply options
    if(this.instance.silentMode){
      this.instance.browserWindow.show = false;
    }
    return this.instance;
  }
  static get config(){
    return this.instance;
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
    })
  }
}

module.exports = Config;
