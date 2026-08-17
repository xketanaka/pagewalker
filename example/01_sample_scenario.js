const {page} = require('pagewalker');
const assert = require('assert');

describe('First example', ()=>{

  it('Visit Github and Inspect code', async function(){

    await page.load('https://github.com/xketanaka/pagewalker');

    await assert.strictEqual(page.url, 'https://github.com/xketanaka/pagewalker');

    await page.waitForFinder(page.find('button').haveAttribute("aria-label", "Search or jump to, type / to search"));
    await page.find('button').haveAttribute("aria-label", "Search or jump to, type / to search").click();

    await page.waitForFinder(page.find('input').haveAttribute("aria-label", "Search or jump to"));

    await page.find('input').haveAttribute("aria-label", "Search or jump to").fillIn("repo:xketanaka/pagewalker 01_sample_scenario.js");

    await page.find('input').haveAttribute("aria-label", "Search or jump to").keydown({ key: 'Enter' });
    await page.find('input').haveAttribute("aria-label", "Search or jump to").keydown({ key: 'Enter' });

    await page.waitForFinder(page.find('li[data-component="ActionList.Item"] a').textIncludes("Issues"));
    await page.find('li[data-component="ActionList.Item"] a').textIncludes("Issues").click();

    await page.waitForFinder(page.find('a').textIncludes("Updating 01_sample_scenario"))
    await page.find('a').textIncludes("Updating 01_sample_scenario").click();

    await page.waitForPageLoad();

    await page.waitForFinder(page.find("h1").textIncludes("Updating 01_sample_scenario.js"));

    await page.find("div#issue-body-viewer a").haveText("01_sample_scenario").click();

    await page.waitForSelector("textarea#read-only-cursor-text-area");

    const expected = 'We have verified that this text exists.';
    assert(await page.find("textarea#read-only-cursor-text-area").textIncludes(expected).exist());
  });

});
