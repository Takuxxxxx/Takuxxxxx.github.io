"""
VoiceOS Controller - メインエントリーポイント

タスクトレイに常駐し、音声操作機能を提供します。
ウェイクワード検出 → コマンド認識 → 実行 の流れを管理します。
"""

import logging
import sys
import threading
import time
from pathlib import Path

import yaml
from PIL import Image, ImageDraw

from voice_recognizer import VoiceRecognizer
from command_executor import CommandExecutor
from llm_interpreter import LLMInterpreter

# 設定ファイルのパス（このファイルと同じディレクトリ）
BASE_DIR = Path(__file__).parent
CONFIG_PATH = BASE_DIR / "config.yaml"
COMMANDS_PATH = BASE_DIR / "commands.yaml"

logger = logging.getLogger(__name__)


class VoiceController:
    """メインコントローラークラス"""

    def __init__(self):
        self.config = self._load_config()
        self._setup_logging()

        self.running = False
        self._stop_event = threading.Event()
        self._recognizer_thread = None

        # サブモジュールの初期化
        try:
            self.executor = CommandExecutor(str(COMMANDS_PATH))
            self.recognizer = VoiceRecognizer(self.config)
            self.llm = LLMInterpreter(self.config)
            if self.llm.enabled:
                logger.info("LLMコマンド解釈が有効です")
            else:
                logger.info("LLMコマンド解釈は無効です（OPENROUTER_API_KEY未設定）")
            logger.info("VoiceOS Controller の初期化が完了しました")
        except Exception as e:
            logger.critical(f"初期化に失敗しました: {e}")
            sys.exit(1)

    def _load_config(self):
        """config.yaml を読み込む"""
        try:
            with open(CONFIG_PATH, "r", encoding="utf-8") as f:
                return yaml.safe_load(f)
        except FileNotFoundError:
            logger.error(f"設定ファイルが見つかりません: {CONFIG_PATH}")

    def _setup_logging(self):
        """ログ設定"""
        log_cfg = self.config.get("log", {})
        level_name = log_cfg.get("level", "INFO").upper()
        level = getattr(logging, level_name, logging.INFO)
        log_file = log_cfg.get("file", "voice_controller.log")

        logging.basicConfig(
            level=level,
            format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
            handlers=[
                logging.FileHandler(BASE_DIR / log_file, encoding="utf-8"),
                logging.StreamHandler(),
            ],
        )

    def start(self):
        """音声認識ループを開始する"""
        if self.running:
            logger.info("既に動作中です")
            return

        # 事前にモデルをロード（初回は時間がかかる）
        print("音声認識モデルを準備中...")
        try:
            self.recognizer._load_model()
            print("モデル準備完了。ウェイクワード待機中...")
        except Exception as e:
            logger.error(f"モデルのロードに失敗しました: {e}")
            print(f"モデルのロードに失敗しました: {e}")
            return

        self.running = True
        self._stop_event.clear()
        self._recognizer_thread = threading.Thread(
            target=self._recognition_loop,
            daemon=True,
            name="RecognitionLoop",
        )
        self._recognizer_thread.start()
        logger.info("音声認識を開始しました（ウェイクワード待機中）")

    def stop(self):
        """音声認識ループを停止する"""
        self.running = False
        self._stop_event.set()
        logger.info("音声認識を停止しました")

    def _recognition_loop(self):
        """
        メインの認識ループ。

        1. ウェイクワードを検出するまで待機
        2. 検出後、同じ発話内にコマンドがないか確認
        3. なければ続けてコマンド発話を待つ
        4. 実行して1に戻る
        """
        logger.info("=== 認識ループを開始 ===")
        print("ウェイクワード待機中...「パソコン」と話しかけてください")
        while not self._stop_event.is_set():
            try:
                audio = self.recognizer.listen(timeout=1)
                if audio is None:
                    continue

                text = self.recognizer.transcribe(audio)
                if not text:
                    continue

                print(f"[認識] {text}")

                if self.recognizer.detect_wake_word(text):
                    logger.info(f"ウェイクワードを検出: {text}")
                    self._play_feedback("wake")
                    print("ウェイクワード検出！コマンドを認識中...")

                    # 同じ発話内にコマンドが含まれているか確認
                    success = self.executor.execute(text, llm=self.llm)
                    if success:
                        self._play_feedback("success")
                        print("コマンドを実行しました")
                    else:
                        # なければ続けて発話を待つ
                        print("コマンドをどうぞ...")
                        cmd_text = self.recognizer.listen_for_command(timeout=4)
                        if cmd_text:
                            print(f"[コマンド] {cmd_text}")
                            success = self.executor.execute(cmd_text, llm=self.llm)
                            if success:
                                self._play_feedback("success")
                                print("コマンドを実行しました")
                            else:
                                self._play_feedback("error")
                                print("コマンドを認識できませんでした")
                        else:
                            self._play_feedback("error")
                            print("発話が聞き取れませんでした")

            except Exception as e:
                logger.error(f"認識ループでエラー: {e}", exc_info=True)
                time.sleep(0.5)

        logger.info("=== 認識ループを終了 ===")

    def _play_feedback(self, kind):
        """
        フィードバック音または TTS を再生する。

        Args:
            kind: "wake" / "success" / "error"
        """
        tts_enabled = self.config.get("tts", {}).get("enabled", True)

        if kind == "wake":
            self._beep(800, 120)
            if tts_enabled:
                self._speak("はい")
        elif kind == "success":
            self._beep(1000, 120)
        elif kind == "error":
            self._beep(300, 200)
            if tts_enabled:
                self._speak("すみません、もう一度お願いします")

    def _beep(self, freq, duration):
        """ビープ音を鳴らす"""
        try:
            import winsound
            winsound.Beep(freq, duration)
        except Exception:
            pass

    def _speak(self, text):
        """TTS（音声合成）で発話する"""
        try:
            import pyttsx3
            engine = pyttsx3.init()
            engine.say(text)
            engine.runAndWait()
        except Exception as e:
            logger.debug(f"TTS の再生に失敗しました: {e}")

    def cleanup(self):
        """終了処理"""
        self.stop()
        if hasattr(self, "recognizer"):
            self.recognizer.cleanup()
        logger.info("VoiceOS Controller を終了しました")


# ------------------------------------------------------------------
# タスクトレイアイコン関連
# ------------------------------------------------------------------

def _create_icon_image():
    """タスクトレイ用のマイクアイコン画像を生成する"""
    size = 64
    img = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    draw = ImageDraw.Draw(img)

    # マイク本体（楕円 + 矩形で代用）
    draw.ellipse([22, 10, 42, 34], fill=(0, 120, 215))
    draw.rectangle([24, 30, 40, 42], fill=(0, 120, 215))
    # スタンド
    draw.rectangle([29, 38, 35, 48], fill=(0, 120, 215))
    # 土台
    draw.rectangle([20, 46, 44, 52], fill=(0, 120, 215))

    return img


def _toggle_start_stop(icon, item, controller):
    """開始/停止を切り替える（メニューコールバック）"""
    if controller.running:
        controller.stop()
    else:
        controller.start()


def _on_quit(icon, controller):
    """終了処理（メニューコールバック）"""
    controller.cleanup()
    icon.stop()


def main():
    """エントリーポイント"""
    controller = VoiceController()

    # タスクトレイモードを試行
    try:
        import pystray
        from PIL import Image, ImageDraw

        icon_image = _create_icon_image()
        menu = pystray.Menu(
            pystray.MenuItem(
                "開始/停止",
                lambda icon, item: _toggle_start_stop(icon, item, controller),
            ),
            pystray.Menu.SEPARATOR,
            pystray.MenuItem(
                "終了",
                lambda icon, item: _on_quit(icon, controller),
            ),
        )

        icon = pystray.Icon("voice_controller", icon_image, "VoiceOS Controller", menu)
        print("VoiceOS Controller を起動しました。コンソールで操作するか、タスクトレイから操作してください。")
        print("  [Enter] 開始/停止   [Q] 終了")
        print()

        import threading
        def console_listener():
            while True:
                try:
                    cmd = input().strip().lower()
                    if cmd == 'q':
                        _on_quit(icon, controller)
                        break
                    else:
                        _toggle_start_stop(icon, None, controller)
                except (EOFError, KeyboardInterrupt):
                    _on_quit(icon, controller)
                    break

        t = threading.Thread(target=console_listener, daemon=True)
        t.start()
        icon.run()

    except Exception:
        # タスクトレイ非対応環境 → コンソール専用モード
        print("VoiceOS Controller (コンソールモード)")
        print("  [Enter] 開始/停止   [Q] 終了")
        print()
        while True:
            try:
                cmd = input().strip().lower()
                if cmd == 'q':
                    break
                elif cmd == '' or cmd == 's':
                    if controller.running:
                        controller.stop()
                        print("停止しました")
                    else:
                        controller.start()
                        print("開始しました")
            except (EOFError, KeyboardInterrupt):
                break
        controller.cleanup()


if __name__ == "__main__":
    main()
