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

実行するとブラウザが起動し[デモページ](https://xketanaka.github.io/pagewalker/demo/)を操作する様子が確認できます。

<img src="https://xketanaka.github.io/pagewalker/image/pagewalker_example.gif" width="700px" >


## シナリオの記述

まずは init-pagewalker-project で作成されるサンプル(01_sample_scenario.js)をみてみましょう。

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

pagewalker はテスティングフレームワークとして [mocha](https://mochajs.org/) を採用しています。
describe, it を使ってシナリオを記述していきます。

ブラウザを操作するには`pagewalker`の提供する`page`オブジェクトを利用します。
`page`オブジェクトのメソッドの多くは戻り値として`Promise`を返します。
サンプルのように`async/await`を利用してシナリオを記述していきます。

より実践的なコードサンプルは [example](https://github.com/xketanaka/pagewalker/tree/master/example) にあります。

## APIリファレンス

https://xketanaka.github.io/pagewalker/
