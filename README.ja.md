# pagewalker

Pagewalker は JavaScript(Node.js) で E2E テストを実装するためのフレームワークです。

## セットアップ

インストールは至って普通です。npm install します。
※Node.js、NPMは事前にインストールしてあるものとします。

```
$ npm install pagewalker --save
```

以下のコマンドで、pagewalker の実行に必要なファイル・ディレクトリをプロジェクトに配置します。

```
$ ./node_modules/.bin/init-pagewalker-project
```

このコマンドを実行すると、途中でサンプル用のシナリオファイルを作成するか尋ねれます。
初回は y と入力してサンプルファイルを作成しておきます。

```
✔ Do you want to create a sample scenario file?(y/N)  …
```

これで実行するための準備は整いました。npm test でテストを実行します。

```
$ npm test
```

実行するとブラウザが起動し、pagewalkerのGitHubページに遷移する様子が確認できます。

<img src="https://xketanaka.github.io/pagewalker/image/pagewalker_example.png" width="700px" >

## シナリオ作成

init-pagewalker-project コマンドで作成されるサンプルシナリオファイルは以下のようになっています。

```
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
```

pagewalker はテスティングフレームワークとして [mocha](https://mochajs.org/) を採用しています。
describe, it を使ってシナリオを記述していきます。

ブラウザを操作するには page オブジェクトを利用します。
page オブジェクトのメソッドの多くは戻り値として Promise を返却するため、async/await を利用してシナリオを記述していきます。
より実践的なコードサンプルは [example](https://github.com/xketanaka/pagewalker/tree/master/example) にあります。

## APIリファレンス

https://xketanaka.github.io/pagewalker/
