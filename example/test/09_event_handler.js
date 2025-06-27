const assert = require('assert');
const pageWalker = require('pagewalker');
const page = pageWalker.page;

describe("09.Event Handler Example", function(){
  beforeEach(async ()=>{
    await page.load("http://localhost:3000");

    await page.waitForPageLoad(async ()=>{
      await page.find("a").haveContent("Event handler").click();
    })
  })

  it("1. Button click", async function(){
    await page.find("input[type=button]").click();
    assert.strictEqual(await page.find("input[type=button]").closest('section').find('.result-area div').haveContent("Button clicked").count(), 1)
    await page.find("input[type=button]").click();
    assert.strictEqual(await page.find("input[type=button]").closest('section').find('.result-area div').haveContent("Button clicked").count(), 2)
  });

  it("2. Select option", async function(){
    await page.find("select").selectOption("January");
    assert(await page.find("select").closest('section').find('.result-area div').haveText("January selected").exist());
    assert.strictEqual(await page.find("select").closest('section').find('.result-area div').textIncludes("selected").count(), 1)

    await page.find("select").selectOption("February");
    assert(await page.find("select").closest('section').find('.result-area div').haveText("February selected").exist());
    assert.strictEqual(await page.find("select").closest('section').find('.result-area div').textIncludes("selected").count(), 2)
  });

  it("3. Checkbox select", async function(){
    await page.find("input[type=checkbox]").haveValue("Red").check();
    assert(await page.find("input[type=checkbox]").haveValue("Red").closest('section').find('.result-area div').haveText("Red checked").exist());
    assert.strictEqual(await page.find("input[type=checkbox]").first().closest('section').find('.result-area div').textIncludes("checked").count(), 1);

    await page.find("input[type=checkbox]").haveValue("Blue").check();
    assert(await page.find("input[type=checkbox]").haveValue("Blue").closest('section').find('.result-area div').haveText("Blue checked").exist());
    assert.strictEqual(await page.find("input[type=checkbox]").first().closest('section').find('.result-area div').textIncludes("checked").count(), 2)

    await page.find("input[type=checkbox]").haveValue("Red").uncheck();
    assert(await page.find("input[type=checkbox]").haveValue("Red").closest('section').find('.result-area div').haveText("Red unchecked").exist());
    assert.strictEqual(await page.find("input[type=checkbox]").first().closest('section').find('.result-area div').textIncludes("checked").count(), 3)
  });
})
