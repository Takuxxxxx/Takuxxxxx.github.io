"""
LLM コマンド解釈モジュール

OpenRouter API 経由で LLM に音声認識結果を渡し、
意図を解析して構造化データ（アクション＋パラメータ）を取得します。
"""

import json
import logging
import os
import time

logger = logging.getLogger(__name__)

ACTION_PROMPT = """You are a Windows PC voice control assistant.
Understand the user's intent from their speech and return the appropriate action in JSON.

Available actions:
- launch_app: Launch an application (app_name: app name, e.g. "notepad", "chrome", "excel")
- search_web: Web search (query: search text)
- volume_up: Increase volume (step: amount, default 5)
- volume_down: Decrease volume (step: amount, default 5)
- volume_mute: Toggle mute
- screenshot: Take screenshot
- close_window: Close active window
- minimize_window: Minimize active window
- logout: Log out
- shutdown: Shut down
- restart: Restart PC
- save_note: Save a note (content: note text)
- type_text: Type text (text: text to type)
- unknown: None of the above

Ignore wake words like "パソコン" or "computer" if present.
Only interpret the meaningful command part.

Respond ONLY with JSON:
{"action": "action_name", "params": {"key": "value"}}

Examples:
- "ブラウザを開いて" → {"action": "launch_app", "params": {"app_name": "browser"}}
- "音量を上げて" → {"action": "volume_up", "params": {"step": 5}}
- "明日の天気を調べて" → {"action": "search_web", "params": {"query": "明日の天気"}}
"""


class LLMInterpreter:
    """LLMを使って音声コマンドを解釈する"""

    def __init__(self, config):
        self.api_key = os.environ.get("OPENROUTER_API_KEY", "")
        if not self.api_key:
            self.api_key = config.get("openrouter_api_key", "")
        self.model = config.get("llm_model", "meta-llama/llama-3.2-3b-instruct:free")
        self.enabled = bool(self.api_key)

    def interpret(self, text):
        """音声認識結果をLLMで解釈してアクションを返す（リトライ付き）"""
        if not self.enabled:
            return None

        payload = {
            "model": self.model,
            "messages": [
                {"role": "system", "content": ACTION_PROMPT},
                {"role": "user", "content": text},
            ],
            "temperature": 0.1,
            "max_tokens": 128,
        }

        max_retries = 3
        for attempt in range(max_retries):
            try:
                import requests
                resp = requests.post(
                    "https://openrouter.ai/api/v1/chat/completions",
                    headers={
                        "Authorization": f"Bearer {self.api_key}",
                        "Content-Type": "application/json",
                    },
                    json=payload,
                    timeout=15,
                )

                if resp.status_code == 429 and attempt < max_retries - 1:
                    wait = 2 ** attempt
                    logger.warning(f"レート制限、{wait}秒後にリトライ...")
                    time.sleep(wait)
                    continue

                resp.raise_for_status()
                data = resp.json()
                content = data["choices"][0]["message"]["content"].strip()

                if "```" in content:
                    content = content.split("```")[1]
                    if content.startswith("json"):
                        content = content[4:]
                content = content.strip()

                result = json.loads(content)
                action = result.get("action", "unknown")
                params = result.get("params", {})
                logger.info(f"LLM解釈: {text[:20]} -> {action}")
                return {"action": action, "params": params}

            except ImportError:
                logger.error("requests ライブラリが未インストール")
                return None
            except Exception as e:
                if attempt < max_retries - 1:
                    logger.warning(f"LLM APIエラー、リトライ中: {e}")
                    time.sleep(1)
                    continue
                logger.error(f"LLM APIエラー (リトライ尽き): {e}")
                return None

        return None
