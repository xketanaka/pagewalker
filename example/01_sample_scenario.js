const {page} = require('pagewalker');
const assert = require('assert');

describe('First example', ()=>{

  it('Load page', async ()=>{

    await page.load('https://www.google.com')

    await page.find('input[name=q]').setValue('pagewalker');

    await page.find('input[type=submit]').haveValue('Google 検索').click();

    await page.waitForPageLoad();

    await page.find('a h3').haveText('xketanaka/pagewalker - GitHub').click();

    await page.waitForPageLoad();

    await assert.equal(page.url, 'https://github.com/xketanaka/pagewalker');
  });

});
