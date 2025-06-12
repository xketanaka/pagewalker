const fs = require('fs');
const util = require('util');
const assert = require('assert');
const path = require('path');
const pageWalker = require('pagewalker');
const page = pageWalker.page;

describe("07.Iframe Example", ()=>{

  it("1. load iframe example page", async ()=>{
    await page.load("http://localhost:3000");
    await page.waitForPageLoad(async ()=>{
      await page.find("a").haveContent("Iframe").click();
    })

    const iframePage = page.inIframe(page.find('iframe').first());
    await iframePage.waitForPageLoad();
  })

  it("2. Inspect iframe", async ()=>{
    const iframePage = page.inIframe(page.find('iframe').first());

    await iframePage.waitForPageLoad(async ()=>{
      await iframePage.find("input[name=field]").setValue("some value one");
      await iframePage.find("textarea[name=area]").setContent("some content two")
      await iframePage.find("form button").click();
    })

    assert.strictEqual(await iframePage.find("input[name=field]").value(), 'some value one')
    assert.strictEqual(await iframePage.find("textarea[name=area]").content(), 'some content two')
  });

  it("3. Inspect iframe through finder", async ()=>{
    const iframeFinder = page.find('iframe').first();

    assert.strictEqual(await page.inIframe(iframeFinder).find("input[name=field]").find(elm => elm.disabled == true).count(), 1);
    assert.strictEqual(await page.inIframe(iframeFinder).find("textarea[name=area]").find(elm => elm.disabled == true).count(), 1);

    assert.strictEqual(await page.inIframe(iframeFinder).find("input[name=field]").haveAttribute('disabled').count(), 1);
    assert.strictEqual(await page.inIframe(iframeFinder).find("textarea[name=area]").haveAttribute('disabled').count(), 1);

    assert.strictEqual(await page.inIframe(iframeFinder).find("input[name=field]").haveAttribute('disabled', '').count(), 1);
    assert.strictEqual(await page.inIframe(iframeFinder).find("textarea[name=area]").haveAttribute('disabled', '').count(), 1);

    await page.inIframe(iframeFinder).waitForPageLoad(async ()=>{
      await page.inIframe(iframeFinder).find("a").haveText('back').click();
    })

    assert.strictEqual(await page.inIframe(iframeFinder).find("input[name=field]").find(elm => elm.disabled == true).count(), 0);
    assert.strictEqual(await page.inIframe(iframeFinder).find("textarea[name=area]").find(elm => elm.disabled == true).count(), 0);

    assert.strictEqual(await page.inIframe(iframeFinder).find("input[name=field]").notHaveAttribute('disabled', '').count(), 2);
    assert.strictEqual(await page.inIframe(iframeFinder).find("textarea[name=area]").notHaveAttribute('disabled', '').count(), 1);

    assert.strictEqual(await page.inIframe(iframeFinder).find("input[name=field]").notHaveAttribute('disabled').count(), 2);
    assert.strictEqual(await page.inIframe(iframeFinder).find("textarea[name=area]").notHaveAttribute('disabled').count(), 1);
  });

  it("4. Ajax in iframe", async ()=>{
    const iframePage = await page.inIframe(page.find('iframe').first())

    await iframePage.waitForAjaxDone(async ()=>{
      await iframePage.find("input[name=field]").setValue("input value");
      await iframePage.find("#submit-on-ajax").click();
    })

    let responseText = await iframePage.find("pre").content();
    assert(responseText.includes("OK: INPUT VALUE"));
  });
})
