const fs = require("fs");
const {promisify} = require('util');
const {config} = require("../utils/config");

class ResultStore {
  // ファイルから前回の結果をロードし、それを格納した配列で解決されるPromiseを返す
  static loadPreviousResults(){
    if(!fs.existsSync(config.successSaveFile))
      return Promise.resolve([]);

    return new Promise((resolve, reject)=>{
      fs.readFile(config.successSaveFile, 'utf-8', (err, data)=>{ err ? reject(err) : resolve(data) })
    })
    .then((data)=>{
      return data.split("\n")
    })
  }
  // すべてのテストが成功した場合に、すべてのテストタイトルをファイルに書き出す
  // ファイル書込みが終わると解決するPromiseを返す
  static saveAll(suite){
    return this.write(suite, []);
  }
  // 失敗したときに呼ばれる結果保存メソッド
  // failtest までのテストを保存する
  // ファイル書込みが終わると解決するPromiseを返す
  static saveSucceeded(suite, failtest){
    let noSucceeded = [];
    let failedTitle = failtest.fullTitle().replace(/"before each" hook for "(.+)"/, "$1");
    suite.eachTest((test)=>{
      if(noSucceeded.length > 0 || test.fullTitle() == failedTitle){
        noSucceeded.push(test.fullTitle());
      }
    });
    if(noSucceeded.length > 0){
      return this.write(suite, noSucceeded);
    }
  };

  /**
   * 引数で指定された noSucceeded 以外のテスト名をファイルに書き込む
   * @private:
   */
  static write(suite, noSucceeded){
    let succeededs = [];
    suite.eachTest((test)=>{
      if(noSucceeded.indexOf(test.fullTitle()) == -1)
        succeededs.push(test.fullTitle())
    })
    return new Promise((resolve, reject)=>{
      fs.writeFile(config.successSaveFile, succeededs.join("\n")+"\n", (err)=>{
        err ? reject(err) : resolve();
      })
    })
  }
}

module.exports = ResultStore;
