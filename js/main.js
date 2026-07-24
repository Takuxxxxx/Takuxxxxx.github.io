let data = null;

function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

function observeFadeIn(container) {
  const els = container.querySelectorAll('.fade-in');
  if (!els.length) return;
  const obs = new IntersectionObserver((entries) => {
    entries.forEach(e => {
      if (e.isIntersecting) { e.target.classList.add('visible'); obs.unobserve(e.target); }
    });
  }, { threshold: 0.1, rootMargin: '0px 0px -40px 0px' });
  els.forEach(el => obs.observe(el));
}

function wrapFadeIn(html) {
  const div = document.createElement('div');
  div.innerHTML = html;
  div.querySelectorAll('.page-header, .work-card, .contact-link, .work-detail-glass, .hero-content').forEach(el => {
    if (!el.classList.contains('fade-in')) el.classList.add('fade-in');
  });
  return div.innerHTML;
}

(async function init() {
  try {
    const res = await fetch('projects.json');
    data = await res.json();
  } catch {
    document.getElementById('app').innerHTML = '<div class="loading" style="color:var(--text-secondary);padding:80px 24px;text-align:center;">Failed to load data.</div>';
    return;
  }

  const nav = document.getElementById('nav');
  const menuBtn = document.getElementById('menuBtn');
  const loading = document.getElementById('loading');

  menuBtn.addEventListener('click', () => nav.classList.toggle('open'));
  document.addEventListener('click', (e) => {
    if (!e.target.closest('.header')) nav.classList.remove('open');
  });
  document.querySelectorAll('[data-nav]').forEach(link => {
    link.addEventListener('click', () => nav.classList.remove('open'));
  });

  function updateActiveNav(hash) {
    const page = hash.replace('#', '').split('/')[0] || 'home';
    document.querySelectorAll('[data-nav]').forEach(link => {
      link.classList.toggle('active', link.getAttribute('href') === `#${page}`);
    });
  }

  function router() {
    const hash = location.hash || '#home';
    updateActiveNav(hash);
    const [page, ...rest] = hash.replace('#', '').split('/');
    const app = document.getElementById('app');

    if (loading) loading.style.display = 'none';

    switch (page) {
      case 'home': renderHome(app); break;
      case 'works': renderWorks(app); break;
      case 'work': renderWorkDetail(app, rest[0]); break;
      case 'contact': renderContact(app); break;
      case 'admin': renderAdmin(app); break;
      default: renderNotFound(app);
    }

    observeFadeIn(app);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  window.addEventListener('hashchange', router);
  router();
})();

function renderHome(app) {
  const p = data.profile;
  app.innerHTML = wrapFadeIn(`
    <section class="hero">
      <div class="hero-glow hero-glow-1"></div>
      <div class="hero-glow hero-glow-2"></div>
      <div class="hero-content">
        <div class="hero-badge">Portfolio</div>
        <h1 class="hero-name">
          <span class="gradient">${escapeHtml(p.name)}</span>
        </h1>
        <p class="hero-sub">${escapeHtml(p.tagline)}</p>
        <p class="hero-desc">${escapeHtml(p.bio).replace(/\n/g, '<br>')}</p>
        <div class="hero-btns">
          <a href="#works" class="btn btn-primary">作品を見る</a>
          <a href="#contact" class="btn btn-outline">SNS</a>
        </div>
      </div>
    </section>
  `);
}

function renderWorks(app) {
  const projects = data.projects;
  app.innerHTML = wrapFadeIn(`
    <div class="container">
      <div class="page-header">
        <h1>Works</h1>
        <p>制作した動画作品一覧</p>
      </div>
      <div class="works-grid">
        ${projects.map(projectCard).join('')}
      </div>
    </div>
  `);
}

function projectCard(p) {
  return `
    <a href="#work/${encodeURIComponent(p.id)}" class="work-card">
      <div class="work-card-thumb">
        <span class="emoji">${p.emoji || '🎬'}</span>
      </div>
      <div class="work-card-body">
        <div class="work-card-cat">${escapeHtml(p.category)}</div>
        <div class="work-card-title">${escapeHtml(p.title)}</div>
        <div class="work-card-desc">${escapeHtml(p.description)}</div>
        <div class="work-card-tags">
          ${(p.tags || []).map(t => `<span class="tag">${escapeHtml(t)}</span>`).join('')}
        </div>
      </div>
    </a>
  `;
}

function renderWorkDetail(app, id) {
  const p = data.projects.find(proj => proj.id === id);
  if (!p) return renderNotFound(app);

  app.innerHTML = wrapFadeIn(`
    <div class="work-detail">
      <a href="#works" class="work-detail-back">← Back to Works</a>
      <div class="work-detail-header">
        <div class="work-detail-cat">${escapeHtml(p.category)}</div>
        <h1 class="work-detail-title">${escapeHtml(p.title)}</h1>
        <div class="work-detail-meta">${p.date || ''}</div>
      </div>
      <div class="work-detail-thumb">
        <span>${p.emoji || '🎬'}</span>
      </div>
      <div class="work-detail-glass">
        <div class="work-detail-section">
          <h2>About</h2>
          <p>${escapeHtml(p.details || p.description).replace(/\n/g, '<br>')}</p>
        </div>
        <div class="work-detail-section">
          <h2>Tags</h2>
          <div class="work-card-tags">
            ${(p.tags || []).map(t => `<span class="tag">${escapeHtml(t)}</span>`).join('')}
          </div>
        </div>
        ${p.links && p.links.length ? `
        <div class="work-detail-section">
          <h2>Links</h2>
          <div class="work-detail-links">
            ${p.links.map(l =>
              `<a href="${escapeHtml(l.url)}" target="_blank" rel="noopener" class="btn btn-primary">${escapeHtml(l.label)}</a>`
            ).join('')}
          </div>
        </div>` : ''}
      </div>
    </div>
  `);
}

function renderContact(app) {
  const s = data.social || {};
  const links = [];
  if (s.twitter) links.push({ label: 'X (Twitter)', url: s.twitter, icon: '𝕏' });
  if (s.youtube) links.push({ label: 'YouTube', url: s.youtube, icon: '▶️' });
  if (s.tiktok) links.push({ label: 'TikTok', url: s.tiktok, icon: '♪' });

  app.innerHTML = wrapFadeIn(`
    <div class="container">
      <div class="page-header">
        <h1>SNS</h1>
        <p>各種SNSで作品を公開中</p>
      </div>
      <div class="contact-section">
        <div class="contact-icon-wrap">◎</div>
        <p>作品のフォロー・シェア・DMなどお気軽にどうぞ。</p>
        <div class="contact-links">
          ${links.map(l =>
            `<a href="${escapeHtml(l.url)}" target="_blank" rel="noopener" class="contact-link">
              <span>${l.icon}</span> ${escapeHtml(l.label)}
            </a>`
          ).join('')}
        </div>
      </div>
    </div>
  `);
}

function renderNotFound(app) {
  app.innerHTML = wrapFadeIn(`
    <div class="not-found">
      <h2>404</h2>
      <p>お探しのページは見つかりませんでした</p>
      <a href="#home" class="btn btn-primary">Homeに戻る</a>
    </div>
  `);
}

/* Admin */
const ADMIN_KEY = 'portfolio_admin';

function renderAdmin(app) {
  const saved = JSON.parse(localStorage.getItem(ADMIN_KEY) || '{}');

  if (!saved.token || !saved.repo) {
    app.innerHTML = wrapFadeIn(`
      <div class="container" style="max-width:480px">
        <div class="page-header">
          <h1>Admin</h1>
          <p>GitHub に接続して作品を追加</p>
        </div>
        <div class="admin-form">
          <div class="admin-field">
            <label>リポジトリ（例: username/username.github.io）</label>
            <input type="text" id="adminRepo" class="admin-input" placeholder="owner/repo" value="${escapeHtml(saved.repo || '')}">
          </div>
          <div class="admin-field">
            <label>GitHub Personal Access Token</label>
            <input type="password" id="adminToken" class="admin-input" placeholder="ghp_..." value="${escapeHtml(saved.token || '')}">
            <p style="font-size:0.8rem;color:var(--text-tertiary);margin-top:4px">設定 → Developer settings → Personal access tokens → Fine-grained tokens（repo の書き込み権限が必要）</p>
          </div>
          <button onclick="adminLogin()" class="btn btn-primary" style="width:100%;justify-content:center;margin-top:8px">接続</button>
        </div>
      </div>
    `);
    return;
  }

  renderAdminForm(app, saved);
}

function utf8ToBase64(str) {
  const bytes = new TextEncoder().encode(str);
  let bin = '';
  for (const b of bytes) bin += String.fromCharCode(b);
  return btoa(bin);
}

async function adminLogin() {
  const repo = document.getElementById('adminRepo').value.trim();
  const token = document.getElementById('adminToken').value.trim();
  if (!repo || !token) return;

  try {
    const r = await fetch(`https://api.github.com/repos/${repo}/contents/projects.json`, {
      headers: { Authorization: `token ${token}` },
    });
    if (r.status === 404) {
      // empty repo -> create initial projects.json
      const initR = await fetch(`https://api.github.com/repos/${repo}/contents/projects.json`, {
        method: 'PUT',
        headers: { Authorization: `token ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: 'initial commit',
          content: utf8ToBase64(JSON.stringify(data, null, 2)),
        }),
      });
      if (!initR.ok) {
        const err = await initR.text();
        alert(`初期化失敗 (${initR.status}): ${err.slice(0, 200)}`);
        return;
      }
    } else if (!r.ok) {
      const errText = await r.text();
      alert(`エラー (${r.status}): ${errText.slice(0, 200)}`);
      return;
    }
    localStorage.setItem(ADMIN_KEY, JSON.stringify({ token, repo }));
    location.hash = '#admin';
    location.reload();
  } catch (e) {
    alert('通信エラー: ' + e.message);
  }
}

function renderAdminForm(app, saved) {
  app.innerHTML = wrapFadeIn(`
    <div class="container" style="max-width:560px">
      <div class="page-header">
        <h1>Admin</h1>
        <p>新規作品を追加</p>
      </div>
      <div class="admin-form">
        <div class="admin-field">
          <label>タイトル *</label>
          <input type="text" id="aTitle" class="admin-input" placeholder="作品タイトル">
        </div>
        <div class="admin-field">
          <label>説明（1行） *</label>
          <input type="text" id="aDesc" class="admin-input" placeholder="短い説明文">
        </div>
        <div class="admin-row">
          <div class="admin-field" style="flex:1">
            <label>絵文字</label>
            <input type="text" id="aEmoji" class="admin-input" placeholder="🎬" style="text-align:center;font-size:1.5rem">
          </div>
          <div class="admin-field" style="flex:2">
            <label>日付</label>
            <input type="text" id="aDate" class="admin-input" placeholder="${new Date().toISOString().slice(0,7)}">
          </div>
        </div>
        <div class="admin-field">
          <label>タグ（カンマ区切り）</label>
          <input type="text" id="aTags" class="admin-input" placeholder="Premiere Pro, After Effects, カット編集">
        </div>
        <div class="admin-field">
          <label>詳細説明</label>
          <textarea id="aDetail" class="admin-input admin-textarea" placeholder="作品の詳細な説明"></textarea>
        </div>
        <div class="admin-field">
          <label>リンク先URL</label>
          <input type="text" id="aLinkUrl" class="admin-input" placeholder="https://x.com/...">
        </div>
        <div class="admin-field">
          <label>リンクラベル</label>
          <input type="text" id="aLinkLabel" class="admin-input" placeholder="Xで見る">
        </div>
        <button onclick="adminSubmit()" class="btn btn-primary" style="width:100%;justify-content:center;margin-top:8px">
          GitHub に追加する
        </button>
        <p id="adminStatus" style="text-align:center;margin-top:12px;font-size:0.9rem;color:var(--text-secondary)"></p>
      </div>
      <div style="text-align:center;margin-top:24px">
        <a href="#admin" onclick="adminLogout()" style="color:var(--text-tertiary);font-size:0.85rem">接続を解除</a>
      </div>
    </div>
  `);
}

function adminLogout() {
  localStorage.removeItem(ADMIN_KEY);
  location.reload();
}

async function adminSubmit() {
  const title = document.getElementById('aTitle').value.trim();
  const desc = document.getElementById('aDesc').value.trim();
  const emoji = document.getElementById('aEmoji').value.trim() || '🎬';
  const date = document.getElementById('aDate').value.trim() || new Date().toISOString().slice(0,7);
  const tagsRaw = document.getElementById('aTags').value.trim();
  const detail = document.getElementById('aDetail').value.trim() || desc;
  const linkUrl = document.getElementById('aLinkUrl').value.trim();
  const linkLabel = document.getElementById('aLinkLabel').value.trim();

  if (!title || !desc) { alert('タイトルと説明は必須です'); return; }

  const tags = tagsRaw ? tagsRaw.split(',').map(t => t.trim()).filter(Boolean) : [];
  const links = (linkUrl && linkLabel) ? [{ label: linkLabel, url: linkUrl }] : [];
  const n = data.projects.length + 1;
  const newId = `video-project-${n}`;

  const status = document.getElementById('adminStatus');
  status.textContent = '送信中...';

  const saved = JSON.parse(localStorage.getItem(ADMIN_KEY) || '{}');
  const { token, repo } = saved;

  try {
    // fetch current file
    const getR = await fetch(`https://api.github.com/repos/${repo}/contents/projects.json`, {
      headers: { Authorization: `token ${token}` },
    });
    if (!getR.ok) throw new Error('Fetch failed');
    const file = await getR.json();
    const raw = atob(file.content.replace(/\n/g, ''));
    const bytes = new Uint8Array(raw.length);
    for (let i = 0; i < raw.length; i++) bytes[i] = raw.charCodeAt(i);
    const currentData = JSON.parse(new TextDecoder().decode(bytes));

    // add new project
    currentData.projects.push({
      id: newId, title, category: 'video', emoji, description: desc,
      details: detail, tags, date, links,
    });

    // commit
    const newContent = utf8ToBase64(JSON.stringify(currentData, null, 2));
    const putR = await fetch(`https://api.github.com/repos/${repo}/contents/projects.json`, {
      method: 'PUT',
      headers: { Authorization: `token ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message: `add: ${title}`,
        content: newContent,
        sha: file.sha,
      }),
    });
    if (!putR.ok) throw new Error('Commit failed');

    status.textContent = '追加完了！ 数分後にサイトに反映されます。';
    status.style.color = 'var(--accent)';
    document.getElementById('aTitle').value = '';
    document.getElementById('aDesc').value = '';
    document.getElementById('aEmoji').value = '';
    document.getElementById('aTags').value = '';
    document.getElementById('aDetail').value = '';
    document.getElementById('aLinkUrl').value = '';
    document.getElementById('aLinkLabel').value = '';
  } catch (e) {
    status.textContent = 'エラーが発生しました。トークンとリポジトリ設定を確認してください。';
    status.style.color = '#e53e3e';
  }
}
