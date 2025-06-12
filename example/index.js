#!/usr/bin/env node
const app = require('./app');
const spawn = require("child_process").spawn;

let args = process.argv.slice(2);

if(args.every(v => v != "--app-only")){

  var childProcess = spawn("npm", ["test", "--"].concat(args))
  childProcess.stdout.setEncoding("utf-8");
  childProcess.stderr.setEncoding("utf-8");
  childProcess.stdout.on("data", (data)=>{ process.stdout.write(data) });
  childProcess.stderr.on("data", (data)=>{ process.stderr.write(data) });

  childProcess.on("exit", (code, signal)=>{
    if(code == 0){
      process.exit();
    }else{
      console.log("[FAIL] child_process abort!, code:", code)
      process.exit(1);
    }
  });
}

app.setup(process.env);
app.start();
