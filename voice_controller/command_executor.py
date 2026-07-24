"""
コマンド実行モジュール

commands.yaml に定義されたコマンドに従って、
Windows PC の操作（アプリ起動、音量調整、ウィンドウ操作など）を実行します。
"""

import logging
import os
import subprocess
import time
from pathlib import Path

logger = logging.getLogger(__name__)


class CommandExecutor:
    """コマンドの実行を担当するクラス"""

    def __init__(self, commands_path):
        """
        Args:
            commands_path: commands.yaml のパス
        """
        self.commands = self._load_commands(commands_path)
        logger.info(f"コマンド定義を読み込みました: {len(self.commands)}件")

    def _load_commands(self, path):
        """YAML ファイルからコマンド定義を読み込む"""
        import yaml
        try:
            with open(path, "r", encoding="utf-8") as f:
                data = yaml.safe_load(f)
            return data.get("commands", [])
        except Exception as e:
            logger.error(f"コマンド定義の読み込みに失敗しました: {e}")
            return []

    def match_command(self, text):
        """
        認識テキストに一致するコマンドを検索する。
        1. フレーズの部分一致（優先）
        2. キーワード一致（フォールバック）
        """
        text = text.strip()
        # 1. フレーズの部分一致
        for cmd in self.commands:
            for phrase in cmd["phrases"]:
                if phrase in text:
                    logger.info(f"コマンド一致: \"{phrase}\" → {cmd['action']}")
                    return cmd
        # 2. キーワードフォールバック（全てのキーワードが含まれる場合）
        for cmd in self.commands:
            keywords = cmd.get("keywords")
            if keywords:
                matched = sum(1 for kw in keywords if kw in text)
                ratio = matched / len(keywords)
                if ratio >= 0.5:
                    logger.info(f"コマンド一致(キーワード): {keywords} → {cmd['action']}")
                    return cmd
        return None

    def _match_generic(self, text):
        """
        汎用パターンマッチング。
        決められたコマンド以外にも柔軟に対応する。
        """
        import re

        # 「XXX開いて」「XXXを開いて」「XXX起動」「XXX起動して」
        m = re.search(r'(.+?)(?:を)?(?:開いて|起動(?:して)?|立ち上げて|出して)', text)
        if m:
            app = m.group(1)
            self._launch_generic(app)
            return True

        # 「XXXで検索して」「XXXを検索」「XXX調べて」
        m = re.search(r'(.+?)(?:を)?(?:検索(?:して)?|調べ(?:て)?|教えて|探して)', text)
        if m:
            query = m.group(1)
            self._search_web(query)
            return True

        # 「メモしといて」「メモして」「書き留めて」+ 内容
        if any(kw in text for kw in ['メモし', 'メモしと', '書き留め']):
            note = re.sub(r'(?:メモし(?:とお)?(?:て)?|書き留め(?:て)?)', '', text).strip()
            self._save_note(note if note else '(メモ)')
            return True

        return False

    def _launch_generic(self, name):
        """アプリ名/サービス名から推測して起動"""
        name = name.strip().lower()

        # Webサービス名→URL
        web_services = {
            'youtube': 'https://youtube.com',
            'youtube music': 'https://music.youtube.com',
            'twitter': 'https://twitter.com',
            'x': 'https://x.com',
            'github': 'https://github.com',
            'gmail': 'https://mail.google.com',
            'google': 'https://google.com',
            'maps': 'https://maps.google.com',
            'カレンダー': 'https://calendar.google.com',
            'drive': 'https://drive.google.com',
            'amazon': 'https://amazon.co.jp',
            'yahoo': 'https://yahoo.co.jp',
            'wikipedia': 'https://wikipedia.org',
            'chat gpt': 'https://chat.openai.com',
            'chatgpt': 'https://chat.openai.com',
            'claude': 'https://claude.ai',
            'copilot': 'https://copilot.microsoft.com',
            'spotify': 'https://open.spotify.com',
            'discord': 'https://discord.com/app',
            'slack': 'https://slack.com',
            'notion': 'https://notion.so',
            'figma': 'https://figma.com',
            'stack overflow': 'https://stackoverflow.com',
            'reddit': 'https://reddit.com',
        }

        # 既知のアプリ名→実行ファイル/コマンド
        known_apps = {
            'ブラウザ': 'https://google.com',
            'browser': 'https://google.com',
            'メモ帳': 'notepad',
            'notepad': 'notepad',
            '電卓': 'calc',
            'calculator': 'calc',
            'エクスプローラー': 'explorer',
            'explorer': 'explorer',
            'エクセル': 'excel',
            'excel': 'excel',
            'ワード': 'winword',
            'word': 'winword',
            'パワポ': 'powerpnt',
            'パワーポイント': 'powerpnt',
            'powerpoint': 'powerpnt',
            'アウトルック': 'outlook',
            'outlook': 'outlook',
            '設定': 'ms-settings:',
            'settings': 'ms-settings:',
            'コントロールパネル': 'control',
            'control panel': 'control',
            'タスクマネージャー': 'taskmgr',
            'task manager': 'taskmgr',
            'cmd': 'cmd',
            'コマンドプロンプト': 'cmd',
            'powershell': 'powershell',
            'ペイント': 'mspaint',
            'paint': 'mspaint',
            'フォト': 'ms-photos:',
            'カメラ': 'ms-camera:',
            'ストア': 'ms-windows-store:',
            '電卓': 'calc',
            '時計': 'ms-clock:',
            'ライン': 'line',
            'line': 'line',
            'スカイプ': 'skype',
            'skype': 'skype',
            'steam': 'steam',
            'discord': 'discord',
            'slack': 'slack',
            'vscode': 'code',
            'code': 'code',
            'visual studio code': 'code',
            'chrome': 'chrome',
            'edge': 'msedge',
            'firefox': 'firefox',
        }

        target = (web_services.get(name) or known_apps.get(name) or name)

        try:
            import subprocess
            import os

            if target.startswith("http://") or target.startswith("https://"):
                os.startfile(target)
                logger.info(f"Webページを開きました: {target}")
            elif target.startswith("ms-"):
                subprocess.Popen(["start", target], shell=True)
                logger.info(f"設定を開きました: {target}")
            else:
                subprocess.Popen(target, shell=True)
                logger.info(f"アプリを起動: {target}")
        except Exception as e:
            logger.error(f"起動失敗: {e}")
            # 最終手段: Web検索
            self._search_web(f"open {name}")

    def _search_web(self, query):
        """Web検索（文字列またはdictを受け付ける）"""
        if isinstance(query, dict):
            query = query.get("query", str(query))
        import urllib.parse
        encoded = urllib.parse.quote(query)
        url = f"https://www.google.com/search?q={encoded}"
        logger.info(f"検索: {query}")
        try:
            import os
            os.startfile(url)
        except Exception as e:
            logger.error(f"検索失敗: {e}")

    def _save_note(self, params):
        """メモを保存（dictまたは文字列を受け付ける）"""
        if isinstance(params, dict):
            content = params.get("content", "")
        else:
            content = str(params)

        from datetime import datetime
        import os
        from pathlib import Path

        notes_dir = Path.home() / "Documents" / "VoiceNotes"
        notes_dir.mkdir(parents=True, exist_ok=True)

        filename = f"memo_{datetime.now().strftime('%Y%m%d_%H%M%S')}.txt"
        filepath = notes_dir / filename
        try:
            with open(filepath, 'w', encoding='utf-8') as f:
                f.write(content)
            logger.info(f"メモを保存しました: {filepath}")
        except Exception as e:
            logger.error(f"メモ保存失敗: {e}")

    def execute(self, text, llm=None):
        """
        テキストを解析し、対応するコマンドを実行する。

        Args:
            text: 認識されたテキスト
            llm: LLMInterpreter（省略時はLLM解釈なし）

        Returns:
            コマンドの実行に成功したかどうか (bool)
        """
        if not text:
            return False

        cmd = self.match_command(text)
        if cmd is None:
            # 汎用パターンマッチング
            generic = self._match_generic(text)
            if generic:
                logger.info(f"汎用コマンド一致: {generic}")
                return True
            # LLM解釈（フォールバック）
            if llm and llm.enabled:
                logger.info(f"LLM解釈を試行: \"{text}\"")
                result = llm.interpret(text)
                if result:
                    return self._execute_llm_action(result)
            logger.info(f"未登録のコマンドです: \"{text}\"")
            return False

        action = cmd["action"]
        params = cmd.get("params", {})

        handler_name = f"_{action}"
        handler = getattr(self, handler_name, None)
        if handler is None:
            logger.warning(f"未実装のアクションです: {action}")
            return False

        try:
            handler(params)
            logger.info(f"コマンド実行完了: {action}")
            return True
        except Exception as e:
            logger.error(f"コマンド \"{action}\" の実行中にエラーが発生しました: {e}")
            return False

    def _execute_llm_action(self, result):
        """LLMが返したアクションを実行する"""
        action = result.get("action", "unknown")
        params = result.get("params", {})

        # LLMのアクション名をハンドラ名にマッピング
        mapping = {
            "launch_app": "_launch_generic_from_llm",
            "search_web": "_search_web",
            "volume_up": "_volume_up",
            "volume_down": "_volume_down",
            "volume_mute": "_volume_mute",
            "screenshot": "_screenshot",
            "close_window": "_close_window",
            "minimize_window": "_minimize_window",
            "logout": "_logout",
            "shutdown": "_shutdown",
            "restart": "_restart",
            "save_note": "_save_note",
            "type_text": "_type_text",
        }

        handler_name = mapping.get(action)
        if handler_name is None:
            logger.warning(f"LLMが未知のアクションを返しました: {action}")
            return False

        handler = getattr(self, handler_name, None)
        if handler is None:
            logger.warning(f"ハンドラ未実装: {handler_name}")
            return False

        try:
            handler(params)
            logger.info(f"LLMコマンド実行完了: {action}")
            return True
        except Exception as e:
            logger.error(f"LLMコマンド実行エラー ({action}): {e}")
            return False

    def _launch_generic_from_llm(self, params):
        """LLMの launch_app を実行"""
        app_name = params.get("app_name", "")
        if app_name:
            self._launch_generic(app_name)

    def _type_text(self, params):
        """テキストをキー入力として送る"""
        text = params.get("text", "")
        if text:
            try:
                import keyboard
                keyboard.write(text)
                logger.info(f"テキスト入力: {text}")
            except ImportError:
                import pyautogui
                pyautogui.write(text)
                logger.info(f"テキスト入力(pyautogui): {text}")

    # ------------------------------------------------------------------
    # 各アクションのハンドラ
    # ------------------------------------------------------------------

    def _launch(self, params):
        """アプリケーションまたは URL を起動する"""
        target = params.get("target", "")
        if not target:
            logger.warning("起動ターゲットが指定されていません")
            return

        if target.startswith(("http://", "https://")):
            # URL は既定のブラウザで開く
            os.startfile(target)
            logger.info(f"ブラウザで開きました: {target}")
        else:
            # 実行可能ファイルを起動
            subprocess.Popen(target, shell=True)
            logger.info(f"アプリケーションを起動しました: {target}")

    def _volume_up(self, params):
        """音量を上げる（メディアキーをシミュレート）"""
        step = params.get("step", 5)
        self._change_volume("volume up", step)

    def _volume_down(self, params):
        """音量を下げる（メディアキーをシミュレート）"""
        step = params.get("step", 5)
        self._change_volume("volume down", step)

    def _change_volume(self, key, step):
        """
        音量変更キーを指定回数押す。
        各キー押下で約2%ずつ変化するため、step/2 回押す。
        """
        presses = max(1, abs(step) // 2)
        try:
            import keyboard
            for _ in range(presses):
                keyboard.press_and_release(key)
                time.sleep(0.05)
            logger.info(f"音量を変更しました (key={key}, presses={presses})")
        except ImportError:
            logger.error("keyboard ライブラリがインストールされていません")
        except Exception as e:
            logger.error(f"音量変更に失敗しました: {e}")

    def _volume_mute(self, params):
        """ミュート状態を切り替える"""
        try:
            import keyboard
            keyboard.press_and_release("volume mute")
            logger.info("ミュートを切り替えました")
        except ImportError:
            logger.error("keyboard ライブラリがインストールされていません")
        except Exception as e:
            logger.error(f"ミュート切替に失敗しました: {e}")

    def _screenshot(self, params):
        """スクリーンショットを撮影して保存する"""
        try:
            import pyautogui
        except ImportError:
            logger.error("pyautogui がインストールされていません")
            return

        save_dir = params.get(
            "save_dir",
            str(Path.home() / "Pictures" / "Screenshots"),
        )
        os.makedirs(save_dir, exist_ok=True)

        from datetime import datetime
        filename = f"voice_screenshot_{datetime.now().strftime('%Y%m%d_%H%M%S')}.png"
        filepath = os.path.join(save_dir, filename)

        try:
            screenshot = pyautogui.screenshot()
            screenshot.save(filepath)
            logger.info(f"スクリーンショットを保存しました: {filepath}")
        except Exception as e:
            logger.error(f"スクリーンショットの撮影に失敗しました: {e}")

    def _close_window(self, params):
        """アクティブウィンドウを閉じる（Alt+F4）"""
        try:
            import pyautogui
            pyautogui.hotkey("alt", "f4")
            logger.info("アクティブウィンドウを閉じました")
        except ImportError:
            logger.error("pyautogui がインストールされていません")

    def _minimize_window(self, params):
        """アクティブウィンドウを最小化する"""
        try:
            import win32gui
            import win32con
            hwnd = win32gui.GetForegroundWindow()
            win32gui.ShowWindow(hwnd, win32con.SW_MINIMIZE)
            logger.info("アクティブウィンドウを最小化しました")
        except ImportError:
            # pywin32 がない場合は Alt+Space からのキー操作で代用
            logger.warning("pywin32 がないためキー操作で最小化を試みます")
            try:
                import pyautogui
                pyautogui.hotkey("alt", "space")
                time.sleep(0.1)
                pyautogui.press("n")
                logger.info("キー操作でウィンドウを最小化しました")
            except ImportError:
                logger.error("pyautogui もインストールされていません")
        except Exception as e:
            logger.error(f"ウィンドウの最小化に失敗しました: {e}")

    def _sleep(self, params):
        """PC をスリープ状態にする"""
        logger.info("スリープを実行します...")
        try:
            subprocess.run(["rundll32.exe", "powrprof.dll,SetSuspendState", "0", "1", "0"], check=True)
        except Exception as e:
            logger.error(f"スリープに失敗しました: {e}")

    def _shutdown(self, params):
        """PC をシャットダウンする"""
        logger.info("シャットダウンを実行します...")
        try:
            subprocess.run(["shutdown", "/s", "/t", "3"], check=True)
        except subprocess.CalledProcessError as e:
            logger.error(f"シャットダウンに失敗しました: {e}")

    def _restart(self, params):
        """PC を再起動する"""
        logger.info("再起動を実行します...")
        try:
            subprocess.run(["shutdown", "/r", "/t", "3"], check=True)
        except subprocess.CalledProcessError as e:
            logger.error(f"再起動に失敗しました: {e}")

    def _logout(self, params):
        """Windows からログアウトする"""
        logger.info("ログアウトを実行します...")
        try:
            subprocess.run(["shutdown", "/l"], check=True)
        except subprocess.CalledProcessError as e:
            logger.error(f"ログアウトに失敗しました: {e}")
