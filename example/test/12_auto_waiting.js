const pageWalker = require('pagewalker');
const {page} = pageWalker;
const assert = require('assert');

describe("12.Auto Waiting", ()=>{

  before(()=>{ pageWalker.config.autoWaiting.enabled = true });
  after(()=>{ pageWalker.config.autoWaiting.enabled = false });

  beforeEach(async ()=>{
    await page.load("http://localhost:3000");
  })

  it("1. clicks a button which becomes enabled later", async ()=>{
    await page.executeJs(`{
      const b = document.createElement('button');
      b.id = 'aw-button'; b.textContent = 'aw'; b.disabled = true;
      b.addEventListener('click', ()=>{ b.dataset.clicked = '1' });
      document.body.appendChild(b);
      setTimeout(()=>{ b.disabled = false }, ${fixtures.delayMsec});
    }`);
    await page.find('#aw-button').click();
    assert.strictEqual(await page.find('#aw-button').attribute('data-clicked'), '1');
  });

  it("2. fills in an input which appears later", async ()=>{
    await page.executeJs(`setTimeout(()=>{
      const i = document.createElement('input');
      i.id = 'aw-input';
      document.body.appendChild(i);
    }, ${fixtures.delayMsec})`);
    await page.find('#aw-input').fillIn('hello');
    assert.strictEqual(await page.find('#aw-input').value(), 'hello');
  });

  it("3. clicks a button which becomes visible later", async ()=>{
    await page.executeJs(`{
      const b = document.createElement('button');
      b.id = 'aw-hidden'; b.textContent = 'aw'; b.style.display = 'none';
      b.addEventListener('click', ()=>{ b.dataset.clicked = '1' });
      document.body.appendChild(b);
      setTimeout(()=>{ b.style.display = '' }, ${fixtures.delayMsec});
    }`);
    await page.find('#aw-hidden').click();
    assert.strictEqual(await page.find('#aw-hidden').attribute('data-clicked'), '1');
  });

  it("4. selectOption works while auto-waiting is enabled", async ()=>{
    await page.waitForPageLoad(async ()=>{
      await page.find("a").haveContent("Form input").click();
    })
    await page.find("select[name=job]").selectOption("engineer");
    assert.strictEqual(await page.find("select[name=job] option").beSelected().content(), "engineer");
  });

  it("5. fails after timeout when the element never appears", async ()=>{
    const start = Date.now();
    try {
      await page.find('#aw-never-exists').waitTimeout(600).click();
      assert.fail("Should throw error, but not thrown.");
    } catch(e) {
      assert(e.message.includes("not actionable"), e.message);
      assert(Date.now() - start >= 600);
    }
  });

  it("6. noWait() fails immediately", async ()=>{
    const start = Date.now();
    try {
      await page.find('#aw-never-exists').noWait().click();
      assert.fail("Should throw error, but not thrown.");
    } catch(e) {
      assert(e.message.includes("Element not found"), e.message);
      assert(Date.now() - start < 3000);
    }
  });
});

// 遅延出現・遅延有効化までの時間(msec)
const fixtures = { delayMsec: 800 };
