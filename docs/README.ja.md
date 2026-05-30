# Swarms Marketplace CLI

![Swarms CLI 画像](../img.png)

[![npm version](https://img.shields.io/npm/v/swarms-market.svg)](https://www.npmjs.com/package/swarms-market)
[![node](https://img.shields.io/node/v/swarms-market.svg)](https://nodejs.org)
[![license](https://img.shields.io/npm/l/swarms-market.svg)](../LICENSE)

[Swarms Marketplace](https://swarms.world) の公式コマンドラインインターフェースです。エージェント、プロンプト、トークンの公開、カタログの閲覧、トークン化された製品からのクリエイター手数料の受け取りまで、ターミナルだけで完結します。スクリプト化、CI/CD、ヘッドレス環境を第一級でサポートします。

> 🌐 他言語版: [English](../README.md) · [中文](./README.zh-CN.md) · [हिन्दी](./README.hi.md) · [Deutsch](./README.de.md) · [Polski](./README.pl.md) · [Português (BR)](./README.pt-BR.md) · [Français](./README.fr.md)

---

## 概要

`swarms` は Swarms Marketplace HTTP API のフルスクリプタブルなクライアントです。マーケットプレイス事業を駆動する操作に直接マッピングされています:

- **大量に製品を公開。** 単一のコマンド、JSON マニフェスト、または CI 上のマニフェストディレクトリから、エージェント、プロンプト、ツールをマーケットプレイスにプッシュできます。ブラウザも手動フォームも不要。
- **オンチェーントークンの発行。** ティッカー、クォート通貨、画像、手数料モードを含め、エージェントを 1 回の呼び出しでトークン化できます。発行トランザクションは実行時に与えるウォレットキーで署名されます。
- **クリエイター手数料を単発または一括で回収。** 単一トークン、自分が持つ全トークン、またはマーケットプレイス全体のトークン化 mint をすべて一括で sweep し、失敗時も継続する semantics で受け取れます。
- **カタログの監査。** 公開済み製品を構造化ツリーとしてレンダリングし、トークン化のみでフィルタし、ダウンストリームのダッシュボード向けに JSON を出力。
- **マーケットプレイスの探索。** すべてのトークン化製品をページングして閲覧(API キー不要)。フラットなリスト形式でも JSON でも出力でき、インデックス化、ミラーリング、分析に向きます。
- **すべてを自動化。** 適切な環境変数を設定すれば全コマンドがノンインタラクティブとなり、標準的な終了コードを返し、TTY 外や `$CI` 下ではアニメーション / プロンプトを自動無効化します。

### 機能一覧

| 機能                                | コマンド                                          | 認証要否                    |
| ----------------------------------- | ------------------------------------------------- | --------------------------- |
| API キーページを開く                | `swarms api-key`                                  | 不要                        |
| 環境認証の検証                      | `swarms login` · `swarms whoami`                  | API キー                    |
| エージェントの公開                  | `swarms launch agent`                             | API キー                    |
| プロンプトの公開                    | `swarms launch prompt`                            | API キー                    |
| エージェントのオンチェーン発行      | `swarms launch token`                             | API キー + ウォレットキー   |
| 公開済み製品の一覧                  | `swarms list`                                     | API キー                    |
| 全トークン化製品の閲覧              | `swarms list-tokenized`(別名 `swarms tokens`)   | 不要                        |
| 製品リスティングページを開く        | `swarms open <id\|ca>`                            | 不要                        |
| 単一 mint の手数料受取              | `swarms claim --ca <mint>`                        | ウォレットキー              |
| 一括で手数料受取                    | `swarms claim-all`                                | ウォレットキー              |
| 読み取りコマンドの JSON 出力        | `--json` フラグ                                   | 親コマンドと同じ            |

## 互換性

| 要件          | 対応範囲                                                                 |
| ------------- | ------------------------------------------------------------------------ |
| Node.js       | ≥ 18(ネイティブ `fetch` を使用)                                        |
| パッケージマネージャ | `npm`、`pnpm`、`yarn`、`bun`                                      |
| OS            | macOS、Linux、Windows(PowerShell + WSL);macOS / Linux が主             |
| ターミナル    | VT100 互換ターミナル全般;Unicode ブロック文字が必要                     |
| CI ランナー   | GitHub Actions、GitLab CI、CircleCI、Buildkite、Jenkins 等               |

## インストール

```bash
# グローバルインストール(日常・シェル利用に推奨)
npm install -g swarms-market

# インストールなしで実行(CI 向け)
npx swarms-market@latest --help

# CI で特定バージョンに固定
npm install -g swarms-market@0.1.0
```

インストール後に確認:

```bash
swarms --version
swarms --help
```

> **注意:** npm 上のパッケージ名は `swarms-market` ですが、インストールされるバイナリ名は `swarms` です。Python 版 `swarms`(同名バイナリを提供)を既にインストールしている場合、`PATH` 上で互いを上書きします。`which swarms` でどちらが有効か確認し、不要な方をアンインストールするか、`npx swarms-market <command>` で直接呼び出してください。

### アンインストール

```bash
npm uninstall -g swarms-market
```

## クイックスタート

```bash
# 1. API キーを取得(https://swarms.world/platform/api-keys を開く)
swarms api-key

# 2. エクスポート
export SWARMS_API_KEY="sk-…"
export SWARMS_USERNAME="your-username"   # 任意。多くのコマンドで --user を省略可能に

# 3. 認証検証
swarms login

# 4. マニフェストから最初のエージェントを公開
swarms launch agent \
  --name "Hello Agent" \
  --description "Says hi" \
  --code-file ./agent.py \
  --free

# 5. 公開したものを確認
swarms list

# 6. マーケットプレイスを閲覧
swarms list-tokenized
```

## 認証

<https://swarms.world/platform/api-keys> でキーを取得します(または `swarms api-key` を実行)。キーは同ページで作成、命名、失効が可能です。

```bash
export SWARMS_API_KEY="sk-…"
swarms whoami      # キーが読み込まれているか確認。先頭・末尾 4 文字を表示
```

アカウントを変更しない読み取り専用コマンド(特に `list-tokenized` と `api-key` オープナー)は API キーなしで動作します。それ以外のコマンドはすべて必須です。

## 設定

設定はすべて環境変数で行います。CLI は設定ファイルを一切読み書きしません。

| 変数                          | 用途                                                                                       | 既定値                  |
| ----------------------------- | ------------------------------------------------------------------------------------------ | ----------------------- |
| `SWARMS_API_KEY`              | マーケットプレイス API 用の Bearer トークン(公開・一覧・アカウント範囲の読み取り)。       | _認証に必須_            |
| `SWARMS_USERNAME`             | `list` の既定 `--user`。`swarms list` を引数なしで実行可能に。                               | _(--user で指定)_      |
| `SWARMS_WALLET_PRIVATE_KEY`   | オンチェーン操作用のウォレット秘密鍵(base58)。メモリ上にのみ保持。                          | _(未設定なら入力要求)_ |
| `PRIVATE_KEY`                 | `SWARMS_WALLET_PRIVATE_KEY` の別名。一般的な `.env` 慣例との互換用。                         | _(未設定なら入力要求)_ |
| `SWARMS_NO_ANIM`              | 任意の値を設定するとインタラクティブターミナルでもウェルカムアニメを無効化。                  | _(TTY ならアニメ)_     |
| `CI`                          | 設定時はウェルカムアニメを自動無効化(主要 CI が自動設定)。                                 | _(自動検出)_           |
| `TERM=dumb`                   | これもアニメを無効化。                                                                      | _(自動検出)_           |
| `NO_COLOR`                    | `chalk` が尊重します — 設定で ANSI カラーを完全に無効化。一部の CI ログビューアに有用。       | _(既定で色付き)_       |

## コマンドリファレンス

```
swarms api-key                ブラウザで API キーページを開く
swarms login                  SWARMS_API_KEY の設定を検証
swarms whoami                 アクティブなキー(マスク済み)と base URL を表示

swarms launch agent           エージェントを公開
swarms launch prompt          プロンプトを公開
swarms launch token           オンチェーンでエージェントをトークン化

swarms list                   公開済み製品を赤/白のツリーで表示
swarms list-tokenized         マーケットプレイスの全トークン化製品
                              (別名: swarms tokens)
swarms open <id|ca>           製品リスティングページをブラウザで開く

swarms claim                  単一トークン化製品の手数料を受取(トークン mint 指定)
swarms claim-all              複数製品の手数料を一括で受取
```

`swarms <command> --help` でいつでも正規のフラグ一覧を確認できます。サブコマンドのヘルプ(`swarms launch --help`、`swarms list-tokenized --help` など)も同じレンダリングを使用します。

サブコマンドの詳細、マニフェスト形式、ワークフロー例については[英語版 README](../README.md#command-reference) を参照してください。

## セキュリティモデル

CLI は、資格情報が監査可能かつ再現可能でなければならない環境向けに設計されています。

**認証。**
API キーは `$SWARMS_API_KEY` からのみ読み取られ、HTTPS 上で `Authorization: Bearer <key>` として送信されます。CLI はディスク上のどこにも API キーを書き込みません、キャッシュしません、永続化しません。キーは <https://swarms.world/platform/api-keys> で管理し、いつでも失効できます。

**ウォレット秘密鍵の取り扱い。**
`claim`、`claim-all`、`launch token` が必要とするウォレット秘密鍵は、次の順で取得されます:明示的な `--private-key` フラグ → `$SWARMS_WALLET_PRIVATE_KEY` → `$PRIVATE_KEY` → インタラクティブ入力(エコーなし、履歴非保存)。鍵は 1 コマンドの実行期間中だけプロセスメモリに保持され、ディスクへの書き込み、ログ出力、キャッシュは**一切**行われません。「ウォレットを記憶する」モードはありません。

**通信。**
すべてのリクエストは HTTPS で `https://swarms.world` に対して行われます。ホスト名はハードコードされており、環境変数による上書きはできません — 誤ったシェル変数で Bearer キーやウォレット秘密鍵が他ホストへリダイレクトされることはありません。いかなるフラグでも TLS 検証は無効化されません。

**テレメトリ。**
CLI はいかなる形式のテレメトリも送信しません。ネットワーク呼び出しは、それを必要とするコマンドが呼ばれた時に限り、[コマンドリファレンス](../README.md#command-reference) に列挙されたマーケットプレイス API エンドポイントへのみ行われます。

## 終了コード

| コード | 意味                                                                  |
| ------ | --------------------------------------------------------------------- |
| 0      | 成功                                                                  |
| 1      | コマンドエラー — 無効入力、検証失敗、API の非 2xx 応答                |
| 130    | SIGINT(Ctrl-C)による中断;終了時にカーソルは復元される               |

`claim-all` は個別の受取が 1 つでも失敗すると 1 を返します(他が成功していても)。各 mint のステータスは出力末尾のサマリ行で確認してください。

## ライセンス

Apache License 2.0。[LICENSE](../LICENSE) を参照。
