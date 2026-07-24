"""
音声認識モジュール

faster-whisper（オフライン）または Google Speech Recognition（オンライン）を
エンジンとして使用し、マイクからの音声入力をテキストに変換します。
"""

import io
import logging
import wave
import numpy as np
import speech_recognition as sr

logger = logging.getLogger(__name__)


class VoiceRecognizer:
    """音声認識を担当するクラス"""

    def __init__(self, config):
        """
        Args:
            config: 設定辞書（config.yaml の内容）
        """
        self.config = config
        self.lang = config.get("language", "ja")
        self.wake_word = config.get("wake_word", "パソコン")

        # 認識エンジンの設定
        reco_cfg = config.get("recognizer", {})
        self.engine = reco_cfg.get("engine", "faster-whisper")
        self.model_size = reco_cfg.get("model_size", "base")
        self.device = reco_cfg.get("device", "cpu")
        self.compute_type = reco_cfg.get("compute_type", "int8")

        # SpeechRecognition の初期化
        self.recognizer = sr.Recognizer()
        self.recognizer.energy_threshold = config.get("energy_threshold", 300)
        self.recognizer.dynamic_energy_threshold = False
        self.recognizer.pause_threshold = 0.8

        # マイクの初期化
        mic_index = config.get("microphone_index")
        try:
            if mic_index is not None:
                self.mic = sr.Microphone(device_index=mic_index)
            else:
                self.mic = sr.Microphone()
            logger.info(f"マイクを初期化しました (device_index={self.mic.device_index})")
        except Exception as e:
            logger.error(f"マイクの初期化に失敗しました: {e}")
            raise

        # 周囲のノイズに合わせて閾値を調整（1.5倍して誤検出を抑制）
        with self.mic as source:
            self.recognizer.adjust_for_ambient_noise(source, duration=1.0)
            self.recognizer.energy_threshold = max(300, self.recognizer.energy_threshold * 1.5)
            logger.info(f"ノイズ調整完了: energy_threshold={self.recognizer.energy_threshold:.0f}")

        # faster-whisper モデル（遅延ロード）
        self._model = None

    def _load_model(self):
        """faster-whisper モデルをロード（初回呼び出し時のみ）"""
        if self._model is not None:
            return
        try:
            from faster_whisper import WhisperModel
            logger.info(
                f"faster-whisper モデルをロード中... "
                f"(size={self.model_size}, device={self.device})"
            )
            logger.info(
                "初回はモデルのダウンロードに数分かかることがあります。"
            )
            self._model = WhisperModel(
                self.model_size,
                device=self.device,
                compute_type=self.compute_type,
            )
            logger.info("faster-whisper モデルのロードが完了しました")
        except ImportError:
            logger.error(
                "faster-whisper がインストールされていません。"
                "pip install faster-whisper を実行するか、"
                "config.yaml の engine を 'google' に変更してください。"
            )
            raise
        except Exception as e:
            logger.error(f"faster-whisper モデルのロードに失敗しました: {e}")
            raise

    def listen(self, timeout=3, phrase_time_limit=3):
        """
        マイクから音声を取得する。

        Args:
            timeout: 発話開始までの最大待機時間（秒）
            phrase_time_limit: 発話の最大長（秒）

        Returns:
            AudioData オブジェクト、またはタイムアウト時は None
        """
        with self.mic as source:
            try:
                audio = self.recognizer.listen(
                    source,
                    timeout=timeout,
                    phrase_time_limit=phrase_time_limit,
                )
                # 0.3秒未満の短いノイズは無視
                if len(audio.frame_data) < audio.sample_rate * 0.3:
                    return None
                return audio
            except sr.WaitTimeoutError:
                return None
            except Exception as e:
                logger.error(f"音声取得中にエラーが発生しました: {e}")
                return None

    def transcribe(self, audio):
        """
        音声データをテキストに変換する。

        Args:
            audio: speech_recognition.AudioData オブジェクト

        Returns:
            認識されたテキスト文字列（空文字列の場合は認識失敗）
        """
        if self.engine == "faster-whisper":
            return self._transcribe_faster_whisper(audio)
        else:
            return self._transcribe_google(audio)

    def _transcribe_faster_whisper(self, audio):
        """faster-whisper を使用したオフライン文字起こし"""
        self._load_model()

        # AudioData から WAV データを取得し numpy 配列に変換
        wav_data = io.BytesIO(audio.get_wav_data())
        with wave.open(wav_data, "rb") as wav_file:
            frames = wav_file.readframes(wav_file.getnframes())
            sample_rate = wav_file.getframerate()

        audio_array = np.frombuffer(frames, dtype=np.int16).astype(np.float32) / 32768.0

        # faster-whisper で文字起こし（beam_size=1 で最速、vad_filter=False で音声欠落防止）
        segments, info = self._model.transcribe(
            audio_array,
            language=self.lang if self.lang != "en" else "en",
            beam_size=1,
            vad_filter=False,
        )

        text = " ".join(seg.text.strip() for seg in segments)
        if text:
            logger.debug(f"認識結果: {text}")
        return text

    def _transcribe_google(self, audio):
        """
        Google Speech Recognition を使用したオンライン文字起こし。
        クラウドAPIを使用するためインターネット接続が必要。
        """
        try:
            lang_code = "ja-JP" if self.lang == "ja" else "en-US"
            text = self.recognizer.recognize_google(audio, language=lang_code)
            logger.debug(f"認識結果 (Google): {text}")
            return text
        except sr.UnknownValueError:
            logger.debug("音声を認識できませんでした（不明な音声）")
            return ""
        except sr.RequestError as e:
            logger.error(f"Google Speech Recognition リクエストエラー: {e}")
            return ""

    def detect_wake_word(self, text):
        """テキストにウェイクワードが含まれているか判定する"""
        return self.wake_word in text

    def listen_for_wake_word(self, timeout=10):
        """ウェイクワードを検出するまで待機する"""
        audio = self.listen(timeout=timeout)
        if audio is None:
            return False
        text = self.transcribe(audio)
        if text and self.detect_wake_word(text):
            logger.info(f"ウェイクワードを検出しました: {text}")
            return True
        return False

    def has_audio(self):
        """現在マイクに入力があるか簡易チェック"""
        with self.mic as source:
            try:
                self.recognizer.adjust_for_ambient_noise(source, duration=0.1)
                return True
            except Exception:
                return False

    def listen_for_command(self, timeout=5):
        """コマンド発話を取得してテキストを返す"""
        audio = self.listen(timeout=timeout)
        if audio is None:
            return ""
        text = self.transcribe(audio)
        if text:
            logger.info(f"コマンド認識: {text}")
        return text

    def cleanup(self):
        """リソースを解放する"""
        if self._model is not None:
            del self._model
            self._model = None
            logger.info("faster-whisper モデルを解放しました")
