
const log4js = require ('log4js');

/**
 * Usage:
 *   const Logger = require('path/to/logger');
 *
 *   Logger.info "message"   (alias of Logger.default.info)
 *   Logger.category.info "message"   ("category" must be defined on log4js settings)
 */
class Logger {

  static trace(str){
    Logger.defaultLogger().trace(str);
  }
  static debug(str){
    Logger.defaultLogger().debug(str);
  }
  static warn(str){
    Logger.defaultLogger().warn(str);
  }
  static info(str){
    Logger.defaultLogger().info(str);
  }
  static error(str){
    Logger.defaultLogger().error(str);
  }
  static fatal(str){
    Logger.defaultLogger().fatal(str);
  }

  static initialize(config){
    log4js.configure(config.logger || {});
    if(config.logger?.level) {
      log4js.getLogger().level = config.logger.level;
    }
    if(config.logger?.categories && typeof config.logger.categories){
      Object.keys(config.logger.categories).forEach((category)=>{
        this[category] = log4js.getLogger(category);
      })
    }
  }

  static defaultLogger(){
    if(this.default){
      return this.default;
    }
    // return defaultLogger if not initialized.
    if(!this.__defaultLogger__){
      this.__defaultLogger__ = new Logger();
    }
    return this.__defaultLogger__;
  }

  trace(str){
    console.debug(`TRACE: #{str}`);
  }
  debug(str){
    console.debug(`DEBUG: #{str}`);
  }
  warn(str){
    console.log(`WARN: #{str}`);
  }
  info(str){
    console.log(`INFO: #{str}`);
  }
  error(str){
    console.log(`ERROR: #{str}`);
  }
  fatal(str){
    console.log(`FATAL: #{str}`);
  }
}

module.exports = Logger;
