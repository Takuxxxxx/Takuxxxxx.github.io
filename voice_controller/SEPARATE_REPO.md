# 別リポジトリ分離提案

`voice_controller/` はポートフォリオサイトとは無関係な独立したツールです。以下の理由から別リポジトリに分離することを推奨します。

## 理由

- ポートフォリオサイト (GitHub Pages) のデプロイに不要なファイルが含まれる
- `voice_controller/venv/` のような大規模ディレクトリがリポジトリサイズを圧迫する
- サイトのコミット履歴とツールの開発履歴が混ざる

## 手順

1. `voice_controller/` を新しいリポジトリとして初期化
   ```
   cd voice_controller
   git init
   git remote add origin https://github.com/Takuxxxxx/voice-controller.git
   git add .
   git commit -m "initial commit"
   git push -u origin main
   ```
2. ポートフォリオサイトのリポジトリから `voice_controller/` を削除
   ```
   cd (portfolio-site)
   git rm -r voice_controller/
   git commit -m "remove voice_controller to separate repository"
   ```
3. `.gitignore` に `voice_controller/` を追加済みであれば削除漏れ防止になる

## 注意

- 分離後も `voice_controller/` の履歴はポートフォリオサイトの Git 履歴に残ります
- 必要に応じて `git filter-branch` などで履歴から完全に削除可能ですが、通常は不要です
