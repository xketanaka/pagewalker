global.Promise = require('bluebird');
global.Promise.config({ longStackTraces: true });

const Config = require("./lib/utils/config");

function main(config){
  if(!config){
    config = Config.create(process.argv.slice(2));
  }

  const pageWalker = module.exports = require("./lib/page_walker");
  pageWalker.start(config);
}

if(process.argv[1] && process.argv[1].match(/\/pagewalker\/index.js$/)){
  // launch with electron
  main();
}
else if(process.argv[1] && process.argv[1].match(/pagewalker$/)){
  // launch with puppeteer
  module.exports = main;
}
else{
  config = Config.create([]);
  const pageWalker = module.exports = require("./lib/page_walker");
  pageWalker.initialize(config);
}
