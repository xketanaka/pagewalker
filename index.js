const Config = require("./lib/utils/config");

function main(config){
  if(!config){
    config = Config.create(process.argv.slice(2));
  }

  const pageWalker = module.exports = require("./lib/page_walker");
  pageWalker.start(config);
}

if(process.argv[1] && process.argv[1].match(/pagewalker$/)){
  // launched with bin/pagewalker
  module.exports = main;
}
else{
  // required as a library from scenario files
  const config = Config.create([]);
  const pageWalker = module.exports = require("./lib/page_walker");
  pageWalker.initialize(config);
}
