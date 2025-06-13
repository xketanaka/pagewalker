const fs = require('fs');
const path = require('path');
const { ssim } = require('ssim.js');
const { PNG } = require('pngjs');
const { default: pixelmatch } = require('pixelmatch');

class Assert {
  constructor(page, config){
    this._page = page;
    this._config = config;
  }
  equal(identifier, options){
    options = Object.assign({}, this._config.assertion, options);

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
      let expectedImage = fs.createReadStream(expectedFilePath).pipe(new PNG());
      let actualImage = fs.createReadStream(actualFilePath).pipe(new PNG());
      return Promise.all([
        new Promise((resolve, _)=>{ expectedImage.on('parsed', ()=>{ resolve(expectedImage) }) }),
        new Promise((resolve, _)=>{ actualImage.on('parsed', ()=>{ resolve(actualImage) }) }),
      ]);
    })
    .then((images)=>{
      // Check if the images are similar enough using SSIM
      const output = ssim(images[0], images[1]);
      if(output.mssim >= options.ssimThreshold) return;

      let diff = new PNG({ width: images[0].width, height: images[0].height });
      pixelmatch(images[0].data, images[1].data, diff.data, diff.width, diff.height, {
        threshold: options.diffThreshold,
      });

      return new Promise((resolve, _)=>{
        diff.pack().pipe(fs.createWriteStream("error-screenshot.png")).on('finish', resolve);
      })
      .then(()=>{
        let indent = '\t\t\t'
        throw new Error(
`[ERR_ASSERTION]: "actual/${identifier}" is different to "expected/${identifier}".
${indent}Saved the difference between the two images As "error-screenshot.png"`
        );
      })
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
  normalizeFilename(identifier){
    return identifier.replace(/[\ \/\:\*\?\\]/g, "_").replace(/\"/g, "'").replace(/</g, "(").replace(/>/, ")");
  }
}

module.exports = Assert;
