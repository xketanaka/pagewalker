# CLAUDE.md

このファイルは、Claude Code (claude.ai/code) がこのリポジトリで作業する際のガイダンスを提供します。

## What is pagewalker

Pagewalker は Node.js 向けの E2E ブラウザテストフレームワークです。ユーザーは mocha のシナリオ（`describe`/`it`）を書き、pagewalker の `page` API（`const {page} = require('pagewalker')`）を通じて実際のブラウザを操作します。ブラウザバックエンドとして Puppeteer（デフォルト）と Electron の2つを共通の抽象化レイヤーの背後でサポートしています。npm に `pagewalker` として公開されており、Docker 配布版（`dist/`）では Xvfb 上でヘッドレス実行しつつ、その様子をポート 8010 の noVNC で閲覧できます。

## Setup Command

フレームワーク自体のユニットテストはありません。`example/` ディレクトリが事実上の統合テスト環境です: Express アプリと、全機能（フォーム、ダイアログ、ajax、iframe、アップロード/ダウンロードなど）を検証する `example/test/` 配下のシナリオで構成されています。CI（`.github/workflows`）はまさにこれを実行します。

```bash
npm install                 # リポジトリルートで実行（example/ は "file:../../pagewalker" に依存しているため、lib/ への変更は直接反映される）

cd example
npm install
npm start                   # Express アプリを起動し、全シナリオをそれに対して実行（CI が実行するのはこれ）
npm start -- --silent       # ヘッドレス、dot レポーター、即時終了
npm run app                 # Express アプリのみ起動（シナリオは別途実行する）
npm test                    # シナリオのみ実行（アプリが起動済みであること）
npm test -- test/01_form_input.js   # 単一のシナリオファイルを実行
npm run debug               # DEBUG_LOG=app 付きの npm start 相当
```

その他のルートのスクリプト: `npm run docs` は API ドキュメント（JSDoc + docdash テーマ、設定は `jsdoc.json`）を `docs/` に再生成します（https://xketanaka.github.io/pagewalker/ で公開）。`docs/` は生成物なので手で編集しないでください。ただし `docs/image/pagewalker_*.png` の3枚は README.ja.md が直リンクする手動管理のスクリーンショットなので、docs/ を作り直すときも消さないでください。lint ツールはありません。

デバッグログ（log4js）は環境変数 `DEBUG_LOG` で制御され、カテゴリは `query` と `app` です（例: `DEBUG_LOG=query,app`）。

## Architecture

### エントリーポイントと起動モード

`bin/pagewalker` は設定を読み込み、`config.browser` で分岐します: `electron` の場合は Electron バイナリ配下で `index.js` を実行するよう自分自身を再 spawn し、`puppeteer` の場合は `index.js` がエクスポートする `main` を同一プロセス内で呼び出します。一方、シナリオから `require('pagewalker')` として読み込まれた場合、`index.js` は実行を開始せずに `PageWalker` シングルトン（`lib/page_walker.js`）を初期化してエクスポートします。`electron` と `puppeteer` はどちらも `optionalDependencies` なので、どちらか一方だけインストールされていれば動作します。

### テストランナー（`lib/walker/walker.js`）

mocha をラップします: `scenarioDir`（デフォルト `test/`、`ignoreDir`（デフォルト `supports/`）はスキップ）から `.js` ファイルを収集するか、明示的な `scenarioFile` 引数を使います。`loadFiles()` の間、`describe`/`xdescribe`/`describe.only` をオーバーライドしてスイートの登録を全ファイル読み込み後まで*遅延*させます — スイート登録が想定外の挙動をする場合はこの仕組みに注意してください。

### ブラウザ抽象化

`lib/browser/interface/` が契約（`Browser`、`BrowserPage`、`BrowserSocket`）を定義し、`lib/browser/puppeteer/` と `lib/browser/electron/` がそれを実装します。`PageWalker.initialize()` が `require('./browser/' + config.browser)` で実装を動的に選択します。`Browser` の実装は `Ready`/`NewWindow`/`Closed` イベントを発火し、`PageWalker` はそれを使ってウィンドウ（`lib/page/window.js`）を UUID で管理します。各バックエンドには `*_finder_extention.js` もあり、バックエンド固有の finder アクション（例: `attachFile`）を追加します。

### Page / Finder API（`lib/page/`）

`Page`（`page.js`）がユーザー向けのオブジェクトで、`page.find(selector)` は `Finder` を返します — これは遅延評価されるチェーン可能なクエリ（`finder_base.js`）で、mixin により `FinderAction`（click、fillIn、submit など）と `FinderFilter`（haveText、textIncludes など）から合成されます。フィルターは蓄積され、アクションはブラウザ内で実行されて Promise を返します。`assert.js` は pixelmatch/ssim.js を使ったスクリーンショット比較アサーションを追加し、`screenshots/expected/` と `screenshots/actual/` を比較します（しきい値は `config.assertion` 配下）。mixin の仕組みは `lib/utils/mixin.js` です。

### 設定（`lib/utils/config.js`）

レイヤー化されたマージ: `DEFAULT_CONFIG` ← `config.json` ← `config.json.local` ← コマンドライン引数。どの設定キーも CLI から `--key value` の形式で、ドット区切りパス付きで指定できます（例: `--mocha.timeout 10000`）。`-s`/`--silent` はヘッドレス + `exitImmediately` + dot レポーターに切り替えます。位置引数はファイルかディレクトリかに応じて `scenarioFile`/`scenarioDir` になります。注意: `Config` はプロセス全体のシングルトン（`Config.config`）であり、`lib/page/page.js` はモジュール読み込み時にこれを参照します。

`exitImmediately: false`（デフォルト）で失敗した場合、終了せずにブラウザウィンドウが devtools 付きで開いたまま残り、調査できるようになっています — CI やスクリプト実行では `exitImmediately: true` か `--silent` が必要です。

### Docker 配布（`dist/`）

`dist/Dockerfile` + `docker-compose.yml`（`pagewalker-docker.tar.gz` としてパッケージ）は、supervisord 配下で Xvfb + openbox + x11vnc + noVNC を動かす Node 22 イメージをビルドし、非ヘッドレスのブラウザを `http://localhost:8010/vnc.html` で観察できるようにします。`docker-compose.override.yml` はリポジトリの親ディレクトリをマウントします — こちらはコンテナ内で pagewalker 自体を開発するためのものです。`bin/init-pagewalker-project` は新しいユーザープロジェクト（package.json、設定、サンプルシナリオ）の雛形を作成します。

## 補足

- README.ja.md（日本語）が実質的な README で、README.md はスタブに過ぎません。ユーザー向けの変更では README.ja.md を更新してください。
- `lib/` の公開 API メソッドには JSDoc コメントが付いており、公開 API リファレンスの生成元になっています — 新しい API メソッドにも同様にドキュメントを書いてください。JSDoc はコメントのないクラス・メソッドをリファレンスに載せないので、公開 API には必ずコメントを付けてください。
