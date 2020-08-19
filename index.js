global.Promise = require('bluebird');
global.Promise.config({ longStackTraces: true });

function main(config){
  if(!config){
    const Config = require("./lib/utils/config");
    config = Config.create(process.argv.slice(2));
  }

  const pageWalker = module.exports = require("./lib/page_walker");
  pageWalker.start(config);
}

if(process.argv[1].match(/\/pagewalker\/index.js$/)){
  // launch with electron
  main();
}

module.exports = main;
