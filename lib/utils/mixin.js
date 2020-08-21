
function mixin(dest, source){
  for(let key of Reflect.ownKeys(source)){
    if(key === "constructor") continue;

    let descriptor = Object.getOwnPropertyDescriptor(source, key);
    descriptor.configurable = true;
    descriptor.enumerable   = false;
    if(descriptor.hasOwnProperty("writable")){
      descriptor.writable = true;
    }
    Object.defineProperty(dest, key, descriptor);
  }
}

module.exports = mixin;
