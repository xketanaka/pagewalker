const {page} = require('pagewalker');
const assert = require('assert');

// fillIn はネイティブ入力なので、実ユーザーの入力と同じイベントが起こることを確認する。
// input の発火回数はバックエンドによって異なる(puppeteer は1文字ごと、playwright は一括で1回)ため、
// ここでは回数ではなく「発火すること」を検証する。
describe("14.FillIn Events", ()=>{

  beforeEach(async ()=>{
    await page.load("http://localhost:3000");
    await page.waitForPageLoad(async ()=>{
      await page.find("a").haveContent("Form input").click();
    })
    await page.executeJs(`{
      window.__events = { input: 0, change: 0 };
      const el = document.querySelector('input[name=email]');
      el.value = '';
      el.addEventListener('input', ()=>{ window.__events.input++ });
      el.addEventListener('change', ()=>{ window.__events.change++ });
    }`);
  })

  const events = ()=> page.executeJs(`window.__events`);

  it("1. fires an input event", async ()=>{
    await page.find("input[name=email]").fillIn("abc");
    assert((await events()).input >= 1);
  });

  it("2. fires a change event when the focus leaves, as a real user input does", async ()=>{
    await page.find("input[name=email]").fillIn("abc");
    // ネイティブ入力なので、入力しただけでは change は発生しない
    assert.strictEqual((await events()).change, 0);

    // 別の要素を操作するとフォーカスが移り、そこで change が発生する
    await page.find("input[name=name]").fillIn("x");
    assert.strictEqual((await events()).change, 1);
  });

  it("3. does not fire an extra input event to clear an already empty field", async ()=>{
    // beforeEach で空にしてあるので、クリアのための余計な input は起きない
    await page.find("input[name=email]").fillIn("ab");
    assert((await events()).input <= "ab".length);
  });

  it("4. replaces the existing value, not appends", async ()=>{
    await page.find("input[name=email]").fillIn("first@example.com");
    await page.find("input[name=email]").fillIn("second@example.com");
    assert.strictEqual(await page.find("input[name=email]").value(), "second@example.com");
  });

  it("5. fills a newline into textarea as it is", async ()=>{
    await page.find("textarea[name=selfIntroduction]").fillIn("line1\nline2");
    assert.strictEqual(await page.find("textarea[name=selfIntroduction]").value(), "line1\nline2");
  });
});
