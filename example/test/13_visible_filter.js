const {page} = require('pagewalker');
const assert = require('assert');

// beVisible フィルタ: checkVisibility で可視要素に絞る。<option> は親 <select> の可視性で判定する。
describe("13.Visible Filter", ()=>{

  beforeEach(async ()=>{
    await page.load("http://localhost:3000");
    await page.executeJs(`{
      const c = document.createElement('div'); c.id = 'bv-area';
      c.innerHTML =
        '<button class="btn">shown</button>' +
        '<button class="btn" style="display:none">hidden</button>' +
        '<select id="vsel"><option class="opt">a</option><option class="opt">b</option></select>' +
        '<select id="hsel" style="display:none"><option class="opt">c</option></select>';
      document.body.appendChild(c);
    }`);
  })

  it("1. beVisible() narrows down to visible elements", async ()=>{
    assert.strictEqual(await page.find('#bv-area button.btn').count(), 2);
    assert.strictEqual(await page.find('#bv-area button.btn').beVisible().count(), 1);
    assert.strictEqual(await page.find('#bv-area button.btn').beVisible().text(), 'shown');
  });

  it("2. an option is judged by the visibility of its parent select", async ()=>{
    assert.strictEqual(await page.find('#bv-area option.opt').count(), 3);
    assert.strictEqual(await page.find('#bv-area option.opt').beVisible().count(), 2);
  });

  it("3. beVisible() can be combined with other filters and exist()", async ()=>{
    assert.strictEqual(await page.find('#bv-area button.btn').haveText('hidden').beVisible().exist(), false);
    assert.strictEqual(await page.find('#bv-area button.btn').haveText('shown').beVisible().exist(), true);
  });
});
