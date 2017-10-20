
class CommandLineOption {
  constructor(optString){
    this._option = optString;
  }
  option(removeHyphen = false){
    if(removeHyphen){
      return this._option.slice(this._option[1] == "-" ? 2 : 1);
    }
    return this._option;
  }
  setValue(val){ this._value = val }
  getValueOrFail(){
    if(this._value == undefined) throw new Error("CommandLine Argument [" + this.option() + "] is missing.");
    return this._value;
  }
}

class OptParser {
  constructor(commandLineArgs){
    this._commandLineOptions = [];
    this._scriptArguments = [];
    commandLineArgs.forEach((arg, i)=>{
      if(arg[0] == "-"){
        this._commandLineOptions.push(new CommandLineOption(arg));
      }else{
        if(i > 0 && commandLineArgs[i-1][0] == "-"){
          this._commandLineOptions[this._commandLineOptions.length - 1].setValue(arg)
        }else{
          this._scriptArguments.push(arg);
        }
      }
    });
  }
  parse(callback){
    return this._commandLineOptions.reduce((result, cmdOpt, index, array)=>{
      callback(result, cmdOpt, index, array);
      return result;
    }, {});
  }
  scriptArguments(){
    return this._scriptArguments;
  }
}

module.exports = OptParser;
