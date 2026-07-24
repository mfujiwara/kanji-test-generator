# kanji-test-generator

小学生向け漢字書き取りテスト作成アプリ。GitHub Pagesでの公開を想定した静的サイト。

## 構成

- ビルド不要の素のHTML/CSS/JS(`index.html` / `style.css` / `script.js` / `data.js`)
- `data.js` に学年(1〜6)ごとの漢字データを配列で保持。各エントリは `{ kanji, grade, words: [{reading, answer}] }`
- テスト形式は「書き取り」のみ(読みを見て紙に鉛筆で漢字を書く想定)。入力フォームは実装しない
- 漢字選択は学年単位ではなく1文字単位。学年フィルタ・検索はあくまで絞り込みUIで、選択状態(`Set`)は学年をまたいで保持される
- 印刷用CSS(`@media print`)で操作パネル(`.no-print`)を隠し、解答一覧は `page-break-before` で別ページにしている

## データ収録方針

- 全1006字ではなく、各学年20字ずつ・計120字の代表的セット(ユーザーの希望により「代表的な問題セットをこちらで作成」を選択)
- 各漢字に単語2つ(訓読み単語+音読み熟語など)を用意。単語は基本的にその漢字のみ(+送り仮名)で完結する語を選び、他の未習漢字への依存を避けている
- 追加する場合は同じスキーマで `data.js` に追記するだけで自動反映される

## 動作確認の方法

- Playwrightがグローバルに入っていない環境。`npm install playwright --no-save --prefix /tmp/pw_env` のようにローカルインストールし `NODE_PATH=/tmp/pw_env/node_modules node script.js` で実行するとブラウザ動作を検証できる
- `chromium-cli` はこの環境には無い

## デプロイ

- git init・GitHubリポジトリ作成・pushは未実施(2026-07-25時点、ユーザーの意向で保留)。手順は `README.md` に記載済み
- 進める際はSettings → Pages → Deploy from branch (main / root) でOK、ビルドステップ不要
