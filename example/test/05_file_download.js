const fs = require('fs');
const util = require('util');
const assert = require('assert');
const path = require('path');
const pageWalker = require('pagewalker');
const page = pageWalker.page;
const config = pageWalker.config;
const fileReadPromise = util.promisify(fs.readFile);

describe("05.File Download Example", ()=>{
  beforeEach(async ()=>{
    await page.load("http://localhost:3000");

    await page.waitForPageLoad(async ()=>{
      await page.find("a").haveContent("File download").click();
    })
  })

  it("1. file download jpg, attachment", async ()=>{

    let file = await page.waitForDownload(async ()=>{
      await page.find("#jpg-form button").click();
    })

    assert.equal(file.filename, "default.jpg");
    assert.equal(Buffer.compare(
      await fileReadPromise(file.savedFilePath),
      await fileReadPromise(path.join(__dirname, '../app/views/file_download_example/download_file.jpg'))
    ), 0);
  });

  it("2. file download jpg, inline", async ()=>{

    await page.find("#jpg-form input[type=radio]").haveValue("inline").check();

    let file = await page.waitForDownload(async ()=>{
      await page.find("#jpg-form button").click();
    })

    assert.equal(file.filename, "default.jpg");
    if (config.browser != "electron") {
      assert.equal(Buffer.compare(
        await fileReadPromise(file.savedFilePath),
        await fileReadPromise(path.join(__dirname, '../app/views/file_download_example/download_file.jpg'))
      ), 0);
    }
    else {
      // wait
      await new Promise((resolve) => { setTimeout(resolve, 100) });
    }
  });

  it("3. file download jpg, other tab", async ()=>{

    await page.find("#jpg-form input[type=radio]").haveValue("other-inline").check();
    const newWin = await page.waitForNewWindow(async ()=>{

      await page.find("#jpg-form button").click();
    })

    await newWin.close();
  });

  it("4. file download pdf, attachment", async ()=>{

    let file = await page.waitForDownload(async ()=>{
      await page.find("#pdf-form button").click();
    })

    assert.equal(file.filename, "default.pdf");
    assert.equal(Buffer.compare(
      await fileReadPromise(file.savedFilePath),
      await fileReadPromise(path.join(__dirname, '../app/views/file_download_example/download_file.pdf'))
    ), 0);
  });

  xit("5. file download pdf, inline", async ()=>{

    await page.find("#pdf-form input[type=radio]").haveValue("inline").check();

    let file = await page.waitForDownload(async ()=>{
      await page.find("#pdf-form button").click();
    })

    if (config.browser != "electron") {
      assert.equal(file.filename, "default.pdf");
      assert(!file.savedFilePath);
      await new Promise((resolve) => { setTimeout(resolve, 1000) });
    }
    else {
      // wait
      await new Promise((resolve) => { setTimeout(resolve, 100) });
    }
  });

  xit("6. file download pdf, other tab", async ()=>{

    await page.find("#pdf-form input[type=radio]").haveValue("other-inline").check();
    const newWin = await page.waitForNewWindow(async ()=>{

      await page.find("#pdf-form button").click();
    })

    await newWin.close();
  });
})
