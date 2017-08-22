
function getEmptyLogger(){ return (msg)=>{ /* ignore */ }; }
function getPrefixedLogger(prefix){ return (msg)=>{ console.log(`[${prefix}] ${msg}`) }; }

function Debug(){
  console.log(...arguments);
}

Debug.getLogger = (name)=>{
  if(Debug.loggers[name]) return Debug.loggers[name];

  if(Debug.target.includes(name)){
    return Debug.loggers[name] = getPrefixedLogger(name);
  }else{
    return Debug.loggers[name] = getEmptyLogger();
  }
}
Debug.target  = (process.env["DEBUG_LOG"] || "").split(",").map(v => v.trim()).filter(v => v);
Debug.loggers = {};

module.exports = Debug;
