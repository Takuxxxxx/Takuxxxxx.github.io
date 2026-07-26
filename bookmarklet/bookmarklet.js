(async function() {
  // ---- helpers ----
  function utf8ToBase64(str) {
    var bytes = new TextEncoder().encode(str);
    var bin = '';
    for (var i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]);
    return btoa(bin);
  }

  function getNextId(projects) {
    var max = 0;
    for (var i = 0; i < projects.length; i++) {
      var n = parseInt(projects[i].id.replace('video-project-', ''));
      if (n > max) max = n;
    }
    return 'video-project-' + (max + 1);
  }

  // ---- 1. check we are on a YouTube video page ----
  var host = location.hostname;
  if (host !== 'www.youtube.com' && host !== 'youtube.com' && host !== 'youtu.be') {
    alert('YouTubeの動画ページで実行してください');
    return;
  }

  // extract video id
  var videoId = '';
  var m = location.pathname.match(/^\/(?:watch\?.*v=|embed\/|v\/)?([a-zA-Z0-9_-]{11})/);
  if (!m) m = location.search.match(/[?&]v=([a-zA-Z0-9_-]{11})/);
  if (m) videoId = m[1];
  if (host === 'youtu.be') {
    var ym = location.pathname.match(/^\/([a-zA-Z0-9_-]{11})/);
    if (ym) videoId = ym[1];
  }
  if (!videoId) {
    alert('動画IDが見つかりませんでした');
    return;
  }

  // clean URL: keep only v= param
  var cleanUrl = 'https://www.youtube.com/watch?v=' + videoId;

  // thumbnail
  var thumbUrl = 'https://img.youtube.com/vi/' + videoId + '/maxresdefault.jpg';

  // ---- 2. get title ----
  var rawTitle = document.title.replace(/ - YouTube$/, '').trim();
  var title = prompt('ポートフォリオに追加するタイトルを確認・編集してください：', rawTitle);
  if (title === null) return; // cancelled
  title = title.trim();
  if (!title) {
    alert('タイトルが空のため中断しました');
    return;
  }

  // ---- 3. confirm ----
  if (!confirm('「' + title + '」 をポートフォリオに追加しますか？')) return;

  // ---- 4. load credentials ----
  var STORAGE_KEY = 'portfolio_bookmarklet_admin';
  var saved;
  try { saved = JSON.parse(localStorage.getItem(STORAGE_KEY)); } catch (e) {}
  var token, repo;
  if (saved && saved.token && saved.repo) {
    token = saved.token;
    repo = saved.repo;
  } else {
    repo = prompt('GitHubリポジトリを入力してください（例: owner/repo）：');
    if (!repo) { alert('中断しました'); return; }
    token = prompt('GitHub Personal Access Tokenを入力してください：');
    if (!token) { alert('中断しました'); return; }
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify({ token: token, repo: repo })); } catch (e) {}
  }

  // ---- 5. GitHub API: fetch -> add -> save ----
  var today = new Date();
  var dateStr = today.getFullYear() + '-' + String(today.getMonth() + 1).padStart(2, '0');

  var newProject = {
    id: '',
    title: title,
    category: 'video',
    emoji: '🎬',
    description: title,
    details: '',
    tags: [],
    date: dateStr,
    videoUrl: cleanUrl,
    thumbnail: thumbUrl,
    links: [
      { label: 'YouTubeで見る', url: cleanUrl }
    ]
  };

  var lastError;
  for (var attempt = 0; attempt < 3; attempt++) {
    try {
      var getR = await fetch('https://api.github.com/repos/' + repo + '/contents/projects.json', {
        headers: { Authorization: 'token ' + token }
      });
      if (!getR.ok) throw new Error('FETCH ' + getR.status);
      var file = await getR.json();
      var raw = atob(file.content.replace(/\s/g, ''));
      var bytes = new Uint8Array(raw.length);
      for (var i = 0; i < raw.length; i++) bytes[i] = raw.charCodeAt(i);
      var currentData = JSON.parse(new TextDecoder().decode(bytes));

      newProject.id = getNextId(currentData.projects);
      currentData.projects.push(newProject);

      var newContent = utf8ToBase64(JSON.stringify(currentData, null, 2));
      var putR = await fetch('https://api.github.com/repos/' + repo + '/contents/projects.json', {
        method: 'PUT',
        headers: { Authorization: 'token ' + token, 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: 'add ' + title + ' via bookmarklet', content: newContent, sha: file.sha })
      });
      if (putR.status === 409) { lastError = 'Conflict'; continue; }
      if (!putR.ok) throw new Error('PUT ' + putR.status);

      alert('「' + title + '」 を追加しました！');
      return;
    } catch (e) {
      lastError = e.message;
      if (attempt < 2) continue;
      break;
    }
  }
  alert('保存に失敗しました。トークン・リポジトリの設定を確認してください。\n' + (lastError || ''));
})();
