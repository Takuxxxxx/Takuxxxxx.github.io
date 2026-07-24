# VoiceOS Controller

Windows PC を音声で操作できる常駐ツールです。ウェイクワードを検知してからコマンドを認識する方式で、誤動作を防止します。

## 特徴

- **オフライン動作**: 音声認識エンジンに `faster-whisper` を使用し、インターネット接続不要
- **タスクトレイ常駐**: システムトレイに常駐し、開始/停止をワンクリックで切替
- **拡張可能**: コマンド定義を YAML で管理し、自由に追加・編集可能
- **日本語対応**: 日本語の音声コマンドを認識

## 必要環境

- OS: Windows 10 / 11（64bit）
- Python: 3.10 以上（3.11 推奨）
- マイク（内蔵または外付け）

## インストール手順

### 1. マイクのアクセス許可を確認

Windows の設定からマイクアクセスを有効にしてください。

1. 「設定」→「プライバシーとセキュリティ」→「マイク」
2. 「マイクアクセス」を「オン」
3. 「アプリがマイクにアクセスできるようにする」を「オン」

### 2. セットアップスクリプトを実行

```
setup.bat
```

このスクリプトは以下を自動で行います。
- Python バージョンの確認
- 仮想環境 (venv) の作成
- 必要なライブラリのインストール

### 3. 手動セットアップ（上記が失敗した場合）

```
python -m venv venv
venv\Scripts\activate
pip install --upgrade pip
pip install pyaudio  # 失敗した場合: pip install pipwin && pipwin install pyaudio
pip install -r requirements.txt
```

## 起動方法

```
venv\Scripts\activate
python main.py
```

タスクトレイにアイコンが表示されたら、右クリックメニューから「開始」を選択してください。

## 使い方

1. タスクトレイのアイコンを右クリック → 「開始」を選択
2. ウェイクワード **「パソコン」** と発話
3. ビープ音が鳴ったら、続けてコマンドを発話
4. コマンドが実行され、確認音が鳴ります

### 使用例

| 発話例 | 動作 |
|--------|------|
| 「パソコン、ブラウザを開いて」 | 既定のブラウザで Google を開く |
| 「パソコン、メモ帳を開いて」 | メモ帳を起動 |
| 「パソコン、音量を上げて」 | 音量を 5% 上げる |
| 「パソコン、音量を下げて」 | 音量を 5% 下げる |
| 「パソコン、スクリーンショットを撮って」 | 画面キャプチャを保存 |
| 「パソコン、閉じて」 | アクティブウィンドウを閉じる |
| 「パソコン、最小化して」 | アクティブウィンドウを最小化 |

## コマンドの追加方法

`commands.yaml` を編集して、好きなコマンドを追加できます。

```yaml
commands:
  - phrases: ["電卓を開いて", "電卓開いて"]
    action: launch
    params:
      target: "calc"
    description: "電卓を起動"
```

### 利用可能なアクション一覧

| アクション | パラメータ | 説明 |
|-----------|-----------|------|
| `launch` | `target` (URL または 実行ファイル名) | アプリ/URL を起動 |
| `volume_up` | `step` (1-100, デフォルト5) | 音量を上げる |
| `volume_down` | `step` (1-100, デフォルト5) | 音量を下げる |
| `volume_mute` | なし | ミュート切替 |
| `screenshot` | `save_dir` (保存先) | スクリーンショット撮影 |
| `close_window` | なし | アクティブウィンドウを閉じる |
| `minimize_window` | なし | アクティブウィンドウを最小化 |
| `logout` | なし | ログアウト |

## 設定

`config.yaml` で以下の設定を変更できます。

| 項目 | デフォルト | 説明 |
|------|-----------|------|
| `wake_word` | `"パソコン"` | ウェイクワード |
| `language` | `"ja"` | 認識言語 (ja / en) |
| `microphone_index` | `null` | マイクデバイス（null=既定） |
| `recognizer.engine` | `"faster-whisper"` | 認識エンジン (faster-whisper / google) |
| `recognizer.model_size` | `"base"` | モデルサイズ (tiny/base/small/medium/large) |
| `tts.enabled` | `true` | 音声フィードバックの有効/無効 |

### 認識エンジンの選択

- **faster-whisper**（デフォルト）: オフラインで動作、プライバシー保護。初回起動時にモデルダウンロードあり。
- **google**: Google の音声認識APIを使用（オンライン必須）。ライトな環境向け。

## ファイル構成

```
voice_controller/
├── main.py                  # エントリーポイント（タスクトレイ常駐）
├── voice_recognizer.py      # 音声認識モジュール
├── command_executor.py      # コマンド実行モジュール
├── config.yaml              # 設定ファイル
├── commands.yaml            # コマンド定義ファイル
├── requirements.txt         # 依存ライブラリ一覧
├── setup.bat                # 環境構築スクリプト
└── README.md                # このファイル
```

## 注意事項

- 初回起動時、faster-whisper のモデルダウンロードに数分かかることがあります
- 音声データは外部に送信されません（faster-whisper 使用時）
- マイクが認識されない場合は、`config.yaml` の `microphone_index` を調整してください
- 多数のマイクがある環境では、インデックスを指定することで使用するマイクを選択できます

## ライセンス

MIT
