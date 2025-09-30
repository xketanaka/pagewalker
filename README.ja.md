# pagewalker

[English](./README.md)

Pagewalker は JavaScript(Node.js) で E2E テストを実装するためのツールです。

## 特徴

* テスト実行するブラウザとしてはChromeを利用する(Puppeteerを経由する)
* ヘッドレス実行が可能
* Dockerですべてを実行可能（ホストマシンにはNode.jsのインストールも不要）
* Dockerコンテナで実行する様子をWebブラウザで確認可能
  <img src="https://xketanaka.github.io/pagewalker/image/pagewalker_vnc_github.png" width="700px" >

## セットアップ

### Docker環境で動かす場合

Docker環境で動かすには、
空のプロジェクトディレクトリに移動し、以下のコマンドでファイルを取得します。

```
curl https://raw.githubusercontent.com/xketanaka/pagewalker/master/dist/pagewalker-docker.tar.gz | tar zxvf -
```

実行すると`Dockerfile`、`docker-compose.yml`が配置されます。
`docker compose` で実行環境を起動します。

```
docker compose up -d
```

`pagewalker`のDockerコンテナは実行状況をGUI(Webブラウザ)で閲覧できます。このために8010ポートを利用します。
ポート番号を変更する場合は`docker-compose.yml`を編集してください。

Dockerコンテナが起動したら、`pagewalker`の初期化コマンド(`init-pagewalker-project`)を実行します。

```
docker compose exec app npx --package=pagewalker -- init-pagewalker-project
```

初期化コマンドが正常に終了すると`package.json`、および必要なディレクトリが出来上がります。
つづいてnpmパッケージをインストールします。

```
docker compose exec app npm install
```

これで実行準備が整いました。
`npm test`でデフォルトのサンプルシナリオ(`01_sample_scenario.js`)を実行します。

```
docker compose exec app npm test
```

Webブラウザで`http://localhost:8010/vnc.html`にアクセスすると`pagewalker`の動作が確認できます。

<img src="https://xketanaka.github.io/pagewalker/image/pagewalker_vnc.png" width="700px" >

[接続]ボタンをクリックします

<img src="https://xketanaka.github.io/pagewalker/image/pagewalker_vnc_github.png" width="700px" >


### ホスト環境で直接動かす場合

ホスト環境にNode.js/NPMがインストールされていることが前提となります。
空のプロジェクトディレクトリに移動し、初期化コマンド(`init-pagewalker-project`)を実行します。

```
npx --package=pagewalker -- init-pagewalker-project
```

初期化コマンドが正常に終了すると`package.json`、および必要なディレクトリが出来上がります。
つづいてnpmパッケージ群をインストールします。

```
npm install
```

これで実行準備が整いました。
`npm test`でデフォルトのサンプルシナリオ(`01_sample_scenario.js`)を実行します。

```
npm test
```

実行するとブラウザが起動し`pagewalker`の`GitHub`ページに遷移する様子が確認できます。

<img src="https://xketanaka.github.io/pagewalker/image/pagewalker_example.png" width="700px" >


## シナリオの記述

まずは init-pagewalker-project で作成されるサンプル(01_sample_scenario.js)をみてみましょう。

```
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
```

pagewalker はテスティングフレームワークとして [mocha](https://mochajs.org/) を採用しています。
describe, it を使ってシナリオを記述していきます。

ブラウザを操作するには`pagewalker`の提供する`page`オブジェクトを利用します。
`page`オブジェクトのメソッドの多くは戻り値として`Promise`を返します。
サンプルのように`async/await`を利用してシナリオを記述していきます。

より実践的なコードサンプルは [example](https://github.com/xketanaka/pagewalker/tree/master/example) にあります。

## APIリファレンス

https://xketanaka.github.io/pagewalker/
