# pagewalker

[日本語](./README.ja.md)

Pagewalker is a tool for implementing E2E tests in JavaScript (Node.js).

## Features

*   Uses Chrome as the browser for test execution (via Puppeteer).
*   Headless execution is possible.
*   Everything can be run in Docker (no need to install Node.js on the host machine).
*   The execution in the Docker container can be monitored in a web browser.
    <img src="https://xketanaka.github.io/pagewalker/image/pagewalker_vnc_github.png" width="700px" >

## Setup

### Running in a Docker environment

To run in a Docker environment, navigate to an empty project directory and retrieve the files with the following command:

```
curl https://raw.githubusercontent.com/xketanaka/pagewalker/master/dist/pagewalker-docker.tar.gz | tar zxvf -
```

When you run this, `Dockerfile` and `docker-compose.yml` will be placed in the directory.
Start the execution environment with `docker compose`.

```
docker compose up -d
```

The `pagewalker` Docker container allows you to view the execution status in a GUI (web browser). It uses port 8010 for this purpose. If you want to change the port number, please edit `docker-compose.yml`.

Once the Docker container is running, execute the `pagewalker` initialization command (`init-pagewalker-project`).

```
docker compose exec app npx --package=pagewalker -- init-pagewalker-project
```

When the initialization command finishes successfully, `package.json` and the necessary directories will be created.
Next, install the npm packages.

```
docker compose exec app npm install
```

Now you are ready to run.
Run the default sample scenario (`01_sample_scenario.js`) with `npm test`.

```
docker compose exec app npm test
```

You can check the operation of `pagewalker` by accessing `http://localhost:8010/vnc.html` in your web browser.

<img src="https://xketanaka.github.io/pagewalker/image/pagewalker_vnc.png" width="700px" >

Click the [Connect] button.

<img src="https://xketanaka.github.io/pagewalker/image/pagewalker_vnc_github.png" width="700px" >

### Running directly on the host environment

It is assumed that Node.js/NPM is installed on the host environment.
Navigate to an empty project directory and execute the initialization command (`init-pagewalker-project`).

```
npx --package=pagewalker -- init-pagewalker-project
```

When the initialization command finishes successfully, `package.json` and the necessary directories will be created.
Next, install the npm packages.

```
npm install
```

Now you are ready to run.
Run the default sample scenario (`01_sample_scenario.js`) with `npm test`.

```
npm test
```

When you run it, you can see the browser start up and operate the [demo page](https://xketanaka.github.io/pagewalker/demo/).

<img src="https://xketanaka.github.io/pagewalker/image/pagewalker_example.gif" width="700px" >

## Writing Scenarios

First, let's look at the sample (`01_sample_scenario.js`) created by `init-pagewalker-project`.

```javascript
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
```

pagewalker uses [mocha](https://mochajs.org/) as its testing framework.
We will write scenarios using `describe` and `it`.

To operate the browser, use the `page` object provided by `pagewalker`.
Many of the methods of the `page` object return a `Promise`.
We will write scenarios using `async/await` as in the sample.

More practical code samples can be found in [example](https://github.com/xketanaka/pagewalker/tree/master/example).

## API Reference

https://xketanaka.github.io/pagewalker/
