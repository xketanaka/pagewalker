const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const assert = require('assert');

class Assert {
  constructor(page, config){
    this._page = page;
    this._config = config;
  }
  equal(identifier){
    identifier = this.normalizeFilename(identifier);
    if(!identifier.match(/\.(png|PNG)/)){
      identifier = identifier + ".png";
    }
    let actualFilePath = path.resolve(path.join(this._config.screenshotsDir, `actual/${identifier}`));
    let expectedFilePath = path.resolve(path.join(this._config.screenshotsDir, `expected/${identifier}`));
    return this._page.takeScreenshot(actualFilePath)
    .then(()=>{
      return new Promise((resolve, reject)=>{
        fs.stat(expectedFilePath, (err, stat)=>{
          if(err && err.code == 'ENOENT') return resolve(false);
          if(err) return reject(err);
          if(stat.isFile()) return resolve(true);
          else return reject(`FAIL: ${expectedFilePath} is a Directory!`);
        });
      })
      .then((exists)=>{
        return exists || this.copyFile(actualFilePath, expectedFilePath);
      })
    })
    .then(()=>{
      return Promise.all([ this.checksum(actualFilePath), this.checksum(expectedFilePath) ]);
    })
    .then((checksums)=>{
      assert.equal(checksums[0], checksums[1]);
    })
  }
  copyFile(src, dest){
    return new Promise((resolve, reject)=>{
      let doneFlg = false;
      let done = (isSuccess, v)=>{ if(doneFlg) return; doneFlg = true; isSuccess ? resolve(v) : reject(v) }

      let rstream = fs.createReadStream(src);
      let wstream = fs.createWriteStream(dest);
      rstream.on("error", (err)=>{ done(false, err) });
      wstream.on("error", (err)=>{ done(false, err) });
      wstream.on("close", ()=>{ done(true) });
      rstream.pipe(wstream);
    })
  }
  checksum(filePath){
    return new Promise((resolve, reject)=>{
      let hash = crypto.createHash('md5');
      let input = fs.createReadStream(filePath);
      input.on('readable', ()=>{
        const data = input.read();
        if(data){
          hash.update(data);
        }else{
          resolve(hash.digest('hex'));
        }
      });
      input.on('error', reject);
    })
  }
  normalizeFilename(identifier){
    return identifier.replace(/[\ \/\:\*\?\\]/g, "_").replace(/\"/g, "'").replace(/</g, "(").replace(/>/, ")");
  }
}

module.exports = Assert;
