const fs = require('fs');
const util = require('util');
const assert = require('assert');
const path = require('path');
const pageWalker = require('pagewalker');
const page = pageWalker.page;
const readdirPromise = util.promisify(fs.readdir);
const unlinkPromise = util.promisify(fs.unlink);

describe("06.File Upload Example", ()=>{
  before(async ()=>{
    files = await readdirPromise(path.join(__dirname, '../app/public/uploads'));
    for(let i = 0; i < files.length; i++) {
      if (files[i] == ".keep") continue;
      await unlinkPromise(path.join(__dirname, `../app/public/uploads/${files[i]}`))
    }
  });
  beforeEach(async ()=>{
    await page.load("http://localhost:3000");

    await page.waitForPageLoad(async ()=>{
      await page.find("a").haveContent("File upload").click();
    })
  })

  it("1. file upload", async ()=>{

    assert.equal(await page.find('h3 + ul > li').count(), 0);

    await page.waitForPageLoad(async ()=>{
      await page.find('input[type=file]').attachFile(path.join(__dirname, './fixtures/upload_file.pdf'));
      await page.find("form button").click();
    })

    assert.equal(await page.find('h3 + ul > li').count(), 1);
    assert.equal(await page.find('h3 + ul > li a').text(), 'upload_file.pdf');
  });
})
