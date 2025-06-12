const {page} = require('pagewalker');
const assert = require('assert');

describe("03.Ajax Example", ()=>{

  it("1. Load ajax example page.", async ()=>{
      await page.load("http://localhost:3000");

      await page.waitForPageLoad(async ()=>{
        await page.find("a").haveContent("Ajax").click();
      })
  })
  it("2. Wait for ajax done", async () =>{

    await page.waitForAjaxDone(async ()=>{
      await page.find('button[data-btn-id="1"]').click();
    })
  });

  it("3. Wait for element appearance", async () =>{

    await page.waitForSelector('#ajax-result h4:nth-of-type(2)', async ()=>{
      await page.find('button[data-btn-id="1"]').click();
    })

    assert.equal(await page.find('#ajax-result h4:nth-of-type(1)').content(), 'response of btn1');
  });

  xit("4. Failure wait for element appearance", async () =>{

    try {
      await page.waitForSelector('#ajax-result h4:nth-of-type(4)', async ()=>{
        await page.find('button[data-btn-id="1"]').click();
      })
      assert.fail('Error should raised.')
    }catch(e){
      assert.equal(e.message, 'timeout');
    }
  });

  it("5. Wait for element appearance with Finder", async () =>{

    await page.waitForFinder(page.find('#ajax-result h4').haveContent('response of btn2'), async ()=>{
      await page.find('button[data-btn-id="2"]').click();
    })
    assert(await page.find('#ajax-result h4').haveContent('response of btn2').exist());
  });

  it("6. Failure wait for element appearance with Finder", async () =>{
    try {
      await page.waitForFinder(page.find('#ajax-result h4').haveContent('response of btn3'), async ()=>{
        await page.find('button[data-btn-id="2"]').click();
      })
      assert.fail('Error should raised.')
    }catch(e){
      assert.equal(e.message, 'timeout');
    }
  });

  it("7. Wait for element appearance by POST with Finder", async () =>{

    await page.find('input[name="nickname"]').setValue("papa");
    await page.find('input[name="sex"]').haveValue("male").click();
    const expectedContent = 'response of post { nickname: "papa", sex: "male" }'

    await page.waitForFinder(page.find('#ajax-result h4').haveContent(expectedContent), async ()=>{
      await page.find('#btn-post').click();
    })
    assert(await page.find('#ajax-result h4').haveContent(expectedContent).exist());
  });

  it("8. clear All after reload", async () =>{

    await page.reload();

    assert(await page.find('#ajax-result h4').notExist())
  })
});
