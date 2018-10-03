const fs = require('fs');
const path = require('path');

class FsExt {
  static mkdirpSync(dirpath, mask = FsExt.defaultMask()){
    this.mkdirPrivate(dirpath, mask, (result)=>{}, (err)=>{
      throw new Error(`Error on mkdirpSync: cause is ${err}`)
    }, false);
  }
  static mkdirp(dirpath, mask = FsExt.defaultMask()){
    return new Promise((resolve, reject)=>{
      FsExt.mkdirPrivate(dirpath, mask, resolve, reject);
    })
  }
  static defaultMask(){
    parseInt('0777', 8) & (~process.umask());
  }
  static mkdirPrivate(dirpath, mask, resolve, reject, async = true){
    dirpath = path.resolve(dirpath);

    let callback = (err)=>{
      if(!err){
        return resolve(dirpath);
      }
      switch(err.code){
        case 'ENOENT':
          FsExt.mkdirPrivate(path.dirname(dirpath), mask, (p)=>{
            if(async){
              fs.mkdir(dirpath, mask, (err)=>{ err ? reject(err) : resolve(dirpath) });
            }else{
              try{
                fs.mkdirSync(dirpath, mask);
                resolve(dirpath)
              }catch(err2){
                reject(err2)
              }
            }
          }, reject, async);
          break;

        default:
          let statCallback = (err, stat)=>{
            if(err){
              reject(err);
            }else if(stat.isDirectory()){
              resolve(dirpath);
            }else{
              reject(`Error on mkdirp: given dirpath exists, and it is File. ${dirpath}`);
            }
          }
          if(async){
            fs.stat(dirpath, statCallback);
          }else{
            try{
              statCallback(undefined, fs.statSync(dirpath))
            }catch(err){
              statCallback(err);
            }
          }
          break;
       }
    }

    if(async){
      return fs.mkdir(dirpath, mask, callback)
    }
    try{
      fs.mkdirSync(dirpath, mask);
      resolve(dirpath);
    }catch(err){
      callback(err)
    }
  }
}

module.exports = FsExt;
