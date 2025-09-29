const {page} = require('pagewalker');
const assert = require('assert');

describe('First example', ()=>{

  it('Visit Github and Inspect code', async function(){

    await page.load('https://github.com/xketanaka/pagewalker');

    await assert.strictEqual(page.url, 'https://github.com/xketanaka/pagewalker');

    await page.find('div.search-input-container button').click();

    await page.find('input#query-builder-test').fillIn("repo:xketanaka/pagewalker 01_sample_scenario.js");

    await page.find('input#query-builder-test').submit();

    await page.waitForFinder(page.find("h2#search-filters-title").haveText("Filter by"));

    await page.find('a').textIncludes("Updating 01_sample_scenario").click();

    await page.waitForFinder(page.find("h1").textIncludes("Updating 01_sample_scenario.js"));

    await page.find("div#issue-body-viewer a").haveText("01_sample_scenario").click();

    await page.waitForSelector("textarea#read-only-cursor-text-area");

    const expected = 'We have verified that this text exists.';
    assert(await page.find("textarea#read-only-cursor-text-area").textIncludes(expected).exist());
  });

});
