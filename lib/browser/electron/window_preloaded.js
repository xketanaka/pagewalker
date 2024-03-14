//window.nodeRequire = require;
//window.browserSocket = require('electron').ipcRenderer;

const { contextBridge, ipcRenderer} = require("electron");
contextBridge.exposeInMainWorld("nodeRequire", require);
contextBridge.exposeInMainWorld("browserSocket", ipcRenderer);
