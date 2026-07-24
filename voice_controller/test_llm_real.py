import sys, os, yaml, time
sys.stdout.reconfigure(encoding='utf-8')

key = os.environ.get('OPENROUTER_API_KEY')
if not key:
    print('OPENROUTER_API_KEY not set')
    sys.exit(1)
print(f'API Key: {key[:10]}...{key[-4:]}')

with open('config.yaml', encoding='utf-8') as f:
    cfg = yaml.safe_load(f)

from command_executor import CommandExecutor
from llm_interpreter import LLMInterpreter

ce = CommandExecutor('commands.yaml')
llm = LLMInterpreter(cfg)
print(f'LLM enabled: {llm.enabled}')
print(f'Model: {llm.model}')
print()

# 定義済みコマンド（LLM不要）
print('=== 定義済みコマンド（LLM不要）===')
for text in ['音量上げて', '閉じて', 'スクリーンショット']:
    t0 = time.time()
    result = ce.execute(text)
    print(f'  "{text}" -> {result} ({time.time()-t0:.1f}s)')

# 汎用パターン（LLM不要）
print('\n=== 汎用パターンマッチ（LLM不要）===')
for text in ['エクセル開いて', '今日の天気調べて']:
    t0 = time.time()
    result = ce.execute(text)
    print(f'  "{text}" -> {result} ({time.time()-t0:.1f}s)')

# LLMが必要なケース
print('\n=== LLM解釈が必要なケース ===')
tests = [
    'PythonでHello Worldって入力して',
    '明日の会議の資料を作っておいて',
]
for text in tests:
    t0 = time.time()
    result = ce.execute(text, llm=llm)
    print(f'  "{text}" -> {result} ({time.time()-t0:.1f}s)')

print('\nDone')
