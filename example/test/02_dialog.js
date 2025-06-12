const {page} = require('pagewalker');
const assert = require('assert');

describe("02.Dialog Example", ()=>{

  it("1. Load dialog example page.", async ()=>{
    await page.load("http://localhost:3000");

    await page.waitForPageLoad(async ()=>{
      await page.find("a").haveContent("Dialog").click();
    })
  })

  it("2. Popup alert dialog.", async () =>{
    await page.waitForAlert({ message: 'This is a message.' }, async ()=>{
      await page.find("input[type=button]").haveValue("alert(1)").click();
    })
  });

  xit("3. Timeout alert dialog (message is different).", async () =>{
    try{
      await page.waitForAlert({ message: 'This is another message.' }, async ()=>{
        await page.find("input[type=button]").haveValue("alert(1)").click();
      })
      assert.fail('Error should raised.')
    }catch(e){
      assert.equal(e.message, 'timeout');
    }
  });

  it("4. Popup alert dialog, and submit.", async () =>{
    await page.waitForPageLoad(async ()=>{
      await page.waitForAlert({ message: 'This is a message.' }, async ()=>{
        await page.find("input[type=submit]").haveValue("alert(2)").click();
      })
    })

    assert(await page.find("div.message").haveText('Submitted by "alert" button clicked.').exist());
  });

  it("5. Popup confirm dialog, Cancel.", async () =>{
    await page.waitForConfirm({ message: 'Are you OK?', isClickOK: false }, async ()=>{
      await page.find("input[type=button]").haveValue("confirm(1)").click();
    });

     assert.equal(await page.find("div#clicked-button-result").text(), 'Cancel');
  });

  it("6. Popup confirm dialog, OK.", async () =>{
    await page.waitForConfirm({ message: 'Are you OK?', isClickOK: true }, async ()=>{
      await page.find("input[type=button]").haveValue("confirm(1)").click();
    });

     assert.equal(await page.find("div#clicked-button-result").text(), 'OK');
  });

  xit("7. Timeout confirm dialog (message is different).", async () =>{
    try{
      await page.waitForConfirm({ message: 'Are you ready?', isClickOK: false }, async ()=>{
        await page.find("input[type=button]").haveValue("confirm(1)").click();
      });
      assert.fail('Error should raised.')
    }catch(e){
      assert.equal(e.message, 'timeout');
    }
  });

  it("8. Popup confirm dialog, and submit.", async () =>{
    await page.waitForPageLoad(async ()=>{
      await page.waitForConfirm({ message: 'Are you OK?', isClickOK: true }, async ()=>{
        await page.find("input[type=submit]").haveValue("confirm(2)").click();
      });
    });

    assert(await page.find("div.message").haveText('Submitted by "confirm" button clicked.').exist());
  });


});
