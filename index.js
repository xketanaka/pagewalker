global.Promise = require('bluebird');
global.Promise.config({ longStackTraces: true });

const pageWalker = module.exports = require("./lib/page_walker");

if(process.argv[1].match(/\/pagewalker\/index.js$/)){
  const Config = require("./lib/utils/config");
  pageWalker.start(Config.create(process.argv.slice(2)));
}
