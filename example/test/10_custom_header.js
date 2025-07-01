const assert = require('assert');
const {page} = require('pagewalker');

describe("10.Custom Header Example", function(){
  beforeEach(async ()=>{
    await page.load("http://localhost:3000");

    await page.waitForPageLoad(async ()=>{
      await page.find("a").haveContent("Custom header").click();
    })
  })

  it("1. Normal access", async function(){
    await page.find("input[type=button]").click();
    await page.waitForPageLoad();

    assert.strictEqual(await page.find(".result-area").text(), "");
  });
  it("2. Access with Custom header", async function(){
    page.setExtraHTTPHeaders({ "X-Custom-Header": "CustomValue"});
    await page.find("input[type=button]").click();
    await page.waitForPageLoad();

    assert.strictEqual(await page.find(".result-area").text(), "x-custom-header: CustomValue");
  });
  it("3. Access without Custom header", async function(){
    page.setExtraHTTPHeaders({ });
    await page.find("input[type=button]").click();
    await page.waitForPageLoad();

    assert.strictEqual(await page.find(".result-area").text(), "");
  });

})
