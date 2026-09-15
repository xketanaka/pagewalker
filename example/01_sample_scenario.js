const {page} = require('pagewalker');
const assert = require('assert');

describe('First example', ()=>{

  it('Fill in the form and check the result', async function(){

    await page.load('https://xketanaka.github.io/pagewalker/demo/');

    assert.strictEqual(await page.find('h1').text(), 'pagewalker demo');

    await page.find('input[name=username]').fillIn('pagewalker');

    await page.find('select[name=plan]').selectOption('Standard');

    await page.find('input[name=newsletter]').check();

    await page.waitForPageLoad(async ()=>{
      await page.find('button').haveText('Sign up').click();
    });

    await page.waitForSelector('table#result');

    assert.strictEqual(await page.find('td').haveAttribute('data-field', 'username').text(), 'pagewalker');
    assert.strictEqual(await page.find('td').haveAttribute('data-field', 'plan').text(), 'Standard');
    assert(await page.find('td').haveAttribute('data-field', 'newsletter').haveText('yes').exist());
  });

});
