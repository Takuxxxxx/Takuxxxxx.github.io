import json, os, sys
from datetime import datetime

path = os.path.join(os.path.dirname(__file__), "projects.json")

with open(path, encoding="utf-8") as f:
    data = json.load(f)

print("=== 作品を追加 ===\n")

title = input("タイトル: ").strip()
desc = input("説明（1行）: ").strip()
emoji = input("絵文字（🎬 など）: ").strip() or "🎬"
tags_raw = input("タグ（カンマ区切り）: ").strip()
tags = [t.strip() for t in tags_raw.split(",") if t.strip()] if tags_raw else []
link_label = input("リンクのラベル（例: Xで見る）: ").strip()
link_url = input("リンクのURL: ").strip()
detail = input("詳細説明（なければスキップ）: ").strip()

# generate id
n = len([p for p in data["projects"] if p["id"].startswith("video-project-")]) + 1
new_id = f"video-project-{n}"

entry = {
    "id": new_id,
    "title": title,
    "category": "video",
    "emoji": emoji,
    "description": desc,
    "details": detail or desc,
    "tags": tags,
    "date": datetime.now().strftime("%Y-%m"),
    "links": [{"label": link_label, "url": link_url}] if link_label and link_url else [],
}

data["projects"].append(entry)

with open(path, "w", encoding="utf-8") as f:
    json.dump(data, f, ensure_ascii=False, indent=2)

print(f"\n追加完了！ ブラウザをリロードしてください")
