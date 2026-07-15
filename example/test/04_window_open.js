const pageWalker = require('pagewalker');
const page = pageWalker.page;

describe("04.Window Open Example", ()=>{
  beforeEach(async ()=>{
    await page.load("http://localhost:3000");

    await page.waitForPageLoad(async ()=>{
      await page.find("a").haveContent("Window open").click();
    })
  })

  it("window open example 1", async ()=>{

    let window = await page.waitForNewWindow(async ()=>{
      await page.find("div.content a").indexOf(0).click();
    })

    await window.page.find('div.content a').click();
  });

  it("window open example 2", async ()=>{

    let window = await page.waitForNewWindow(async ()=>{
      await page.find("div.content a").indexOf(1).click();
    })

    await window.page.find('div.content a').click();
  })

  it("window open example 3", async ()=>{

    let window = await page.waitForNewWindow(async ()=>{
      await page.find("div.content a").indexOf(2).click();
    })

    await window.page.find('div.content a').click();
  })

  it("window open example 4", async ()=>{

    let window = await page.waitForNewWindow(async ()=>{
      await page.find("div.content a").indexOf(3).click();
    })

    await window.page.find('div.content a').click();
  })
})
