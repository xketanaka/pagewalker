const fs = require("fs");
const os = require("os");
const net = require("net");
const http = require("http");
const path = require("path");
const inspector = require("inspector");
const { spawn } = require("child_process");

// Give up waiting for DevTools to connect after this, not to wait forever when it is not shown.
const CONNECTION_TIMEOUT_MSEC = 60 * 1000;
const POLLING_INTERVAL_MSEC = 200;
// A "debugger" statement which took this long means that the execution was paused there.
const PAUSED_MSEC = 500;

/**
 * Debug execution, enabled by config.debug (or the "--debug" command line option).
 *
 * It activates the V8 inspector of the pagewalker process, and launches another browser
 * which shows the DevTools connected to it. The execution is paused before the scenario starts,
 * so that you can set breakpoints in your scenario and step through it,
 * while the browser under test is operated by the scenario as usual.
 *
 * The browser showing DevTools is a separate one from the browser under test.
 *
 * Note that DevTools can not be opened by its own "devtools://" URL: Chrome rejects that URL
 * when it is given from the outside, either by CDP or by the command line. Instead, a browser
 * launched with "--remote-debugging-port" serves the same DevTools over that port as an
 * ordinary http:// page, and this class opens it with the "ws" parameter pointing at the
 * inspector of this process.
 */
class DebugSession {
  /**
   * Create a session and start preparing it. The returned session does nothing when
   * config.debug is false, so that the caller does not have to care whether it is enabled.
   * @param {Config} config
   * @return {DebugSession}
   */
  static create(config){
    const session = new DebugSession(config);
    if(config.debug) session.start();
    return session;
  }
  constructor(config){
    this.config = config;
  }
  /**
   * Activate the V8 inspector of this process, and launch the browser showing DevTools.
   * @private
   */
  start(){
    const port = Number(this.config.debugPort);
    // open the inspector before the scenario files are loaded, so that they are shown in DevTools
    inspector.open(port, '127.0.0.1', false);
    if(!inspector.url()){
      // inspector.open() does not throw, it just reports the failure to stderr
      throw new Error(`Failed to open the inspector on the port ${port}. Is the port already in use?`);
    }
    // launch it here, so that it starts up while the browser under test does
    this.launched = this.launchBrowser();
    this.launched.catch(()=>{});  // the rejection is reported in waitUntilResumed()
  }
  /**
   * Pause the execution until it is resumed on DevTools, so that you can set breakpoints
   * in your scenario before it runs. It does nothing when debug mode is disabled.
   * @return {Promise} resolved when the execution is resumed
   */
  waitUntilResumed(){
    if(!this.config.debug) return Promise.resolve();

    return this.launched
    .then(()=>{
      console.log(`[pagewalker] Debug mode: the execution is paused once DevTools is connected.`);
      console.log(`[pagewalker] Open your scenario file on DevTools, set breakpoints and resume it.`);
      console.log(`[pagewalker] If DevTools is not shown, open "${this.frontendUrl}" by yourself.`);

      return this.pauseWhenConnected(Date.now() + CONNECTION_TIMEOUT_MSEC);
    })
    .catch((err)=>{
      console.log(`[pagewalker] Failed to start the debug session: ${err.message}`);
      process.exit(1);
    });
  }
  /**
   * Pause the execution once DevTools is connected.
   *
   * A "debugger" statement is just ignored while no debugger is connected, so it can be tried
   * again and again until DevTools connects. inspector.waitForDebugger() is not used for this,
   * because it blocks the event loop: once it is called, a failure of DevTools can not be
   * noticed any more, and the process just freezes without even accepting Ctrl-C.
   * @private
   * @return {Promise} resolved when the execution is resumed on DevTools
   */
  pauseWhenConnected(deadline){
    const startedAt = Date.now();
    debugger;  // eslint-disable-line no-debugger

    // it took a while here, which means the execution was paused and you have resumed it
    if(Date.now() - startedAt >= PAUSED_MSEC) return Promise.resolve();

    if(Date.now() > deadline){
      throw new Error(`DevTools did not connect. Open "${this.frontendUrl}" to debug the scenario.`);
    }
    return new Promise((resolve)=> setTimeout(resolve, POLLING_INTERVAL_MSEC))
    .then(()=> this.pauseWhenConnected(deadline));
  }
  /**
   * Launch a browser which shows the DevTools connected to this process.
   * @private
   * @return {Promise} resolved when the browser is launched (not when DevTools is connected)
   */
  launchBrowser(){
    return Promise.all([
      DebugSession.findBrowserPath(this.config),
      DebugSession.findFreePort(Number(this.config.debugPort) + 1)
    ])
    .then(([executablePath, port])=>{
      const commonArgs = [
        `--user-data-dir=${fs.mkdtempSync(path.join(os.tmpdir(), 'pagewalker-devtools-'))}`,
        // without these, the first run page takes the place of the url given below
        '--no-first-run',
        '--no-default-browser-check',
        '--no-sandbox',
        '--window-size=1280,900',
      ];
      // launch it without any window for now: DevTools is shown after it starts serving.
      this.browserProcess = spawn(executablePath,
        commonArgs.concat([`--remote-debugging-port=${port}`, '--no-startup-window']), { stdio: 'ignore' });
      process.on('exit', ()=>{ this.close() });
      process.on('SIGINT', ()=>{ this.close(); process.exit(130) });

      // Wait for the browser while the event loop is running. waitUntilResumed() blocks it,
      // and a failure of the browser would never be noticed once it is blocked.
      return DebugSession.waitForBrowser(this.browserProcess, port)
      .then(()=>{
        // "v8only" tells DevTools that the target is node, not a browser. Without it, DevTools is
        // built as the one for a browser and shows nothing. These parameters are the ones which
        // node itself advertises as "devtoolsFrontendUrl" on http://<inspector>/json/list .
        const params = `experiments=true&v8only=true&ws=${inspector.url().replace(/^ws:\/\//, '')}`;
        this.frontendUrl = `http://127.0.0.1:${port}/devtools/js_app.html?${params}`;
        // Show DevTools by another invocation with the same user-data-dir, which just passes
        // the url to the browser launched above.
        spawn(executablePath, commonArgs.concat([this.frontendUrl]), { stdio: 'ignore' });
      });
    });
  }
  /**
   * Wait until the browser starts serving DevTools over the given port.
   * @private
   * @return {Promise} rejected if the browser does not start
   */
  static waitForBrowser(browserProcess, port, timeout = 30000){
    const deadline = Date.now() + timeout;
    let isGone = false;
    browserProcess.on('error', ()=>{ isGone = true });
    browserProcess.on('exit', ()=>{ isGone = true });

    const isServing = ()=> new Promise((resolve)=>{
      const request = http.get({ host: '127.0.0.1', port: port, path: '/json/version' }, (response)=>{
        response.resume();
        resolve(response.statusCode == 200);
      });
      request.on('error', ()=>{ resolve(false) });
    });
    const loop = ()=> isServing().then((serving)=>{
      if(serving) return;
      if(isGone || Date.now() > deadline){
        throw new Error('The browser showing DevTools did not start. Note that it needs a display, because it is not headless.');
      }
      return new Promise((resolve)=> setTimeout(resolve, 300)).then(loop);
    });
    return loop();
  }
  /**
   * Close the browser showing DevTools and deactivate the inspector.
   * Node can not exit while DevTools is connected ("Waiting for the debugger to disconnect..."),
   * so this must be called before exiting.
   * @private
   */
  close(){
    if(!this.config.debug) return;
    if(this.browserProcess) this.browserProcess.kill();
    inspector.close();
  }
  /**
   * Find a port which is not used, to be given to the browser showing DevTools.
   * @private
   * @return {Promise} resolved with the port number
   */
  static findFreePort(startPort, port = startPort){
    return new Promise((resolve)=>{
      const server = net.createServer();
      server.on('error', ()=>{ resolve(undefined) });
      server.listen(port, '127.0.0.1', ()=>{ server.close(()=>{ resolve(port) }) });
    })
    .then((freePort)=>{
      if(freePort) return freePort;
      if(port - startPort >= 20){
        throw new Error(`No free port for the browser showing DevTools (tried ${startPort}-${port}).`);
      }
      return this.findFreePort(startPort, port + 1);
    });
  }
  /**
   * Find a chromium based browser which shows DevTools. It prefers the backend in use,
   * because that one is surely installed.
   * @private
   * @return {Promise} resolved with the executable path
   */
  static findBrowserPath(config){
    const fromPuppeteer = ()=> Promise.resolve()
      .then(()=> require('puppeteer').executablePath())  // it returns a Promise on puppeteer >= 24
      .then((found)=> /firefox/i.test(found) ? undefined : found);  // config.puppeteer.browser can be firefox
    const fromPlaywright = ()=> Promise.resolve()
      .then(()=> require('playwright').chromium.executablePath());

    const finders = config.browser == 'playwright' ? [fromPlaywright, fromPuppeteer] : [fromPuppeteer, fromPlaywright];
    return finders.reduce((promise, finder)=>{
      return promise.then((found)=>{
        if(found) return found;
        return finder().then((found)=> found && fs.existsSync(found) ? found : undefined).catch(()=> undefined);
      });
    }, Promise.resolve(undefined))
    .then((found)=>{
      if(!found){
        throw new Error('Could not find a chromium based browser which shows DevTools. Install puppeteer or playwright chromium.');
      }
      return found;
    });
  }
}

module.exports = DebugSession;
