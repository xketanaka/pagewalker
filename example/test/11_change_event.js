const {page} = require('pagewalker');
const assert = require('assert');

describe('11.Change Event', ()=>{

  it('1. Load page', async ()=> {
    await page.load("http://localhost:3000");
    await page.waitForPageLoad(async ()=> {
      await page.find("a").haveContent("Change event").click();
    });
  });

  it('2. trigger change with setValue', async ()=> {
    await page.find("#test-input").setValue("new value");
    const statusText = await page.find("#event-status").text();
    assert.strictEqual(statusText, "changed");
  });
});
