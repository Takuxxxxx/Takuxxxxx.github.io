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
  const saved = JSON.parse(localStorage.getItem(ADMIN_KEY) || '{}');
  const isAdmin = saved.token && saved.repo;
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
        ${isAdmin ? '<button class="fab" onclick="showAddModal()" title="作品を追加">+</button>' : ''}
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
        <div style="display:flex;align-items:center;flex-wrap:wrap;gap:8px">
          <h1 class="work-detail-title" style="margin-bottom:0">${escapeHtml(p.title)}</h1>
          <button class="edit-btn" onclick="showEditModal('${p.id}')">✏️ 編集</button>
        </div>
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

function renderAdmin(app) {
  location.hash = '#works';
}

/* Admin Modal */
const ADMIN_KEY = 'portfolio_admin';

function utf8ToBase64(str) {
  const bytes = new TextEncoder().encode(str);
  let bin = '';
  for (const b of bytes) bin += String.fromCharCode(b);
  return btoa(bin);
}

function closeModal() {
  const el = document.querySelector('.modal-overlay');
  if (el) el.remove();
}

function showModal(html) {
  closeModal();
  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay';
  overlay.innerHTML = `
    <div class="modal">
      <button class="modal-close" onclick="closeModal()">×</button>
      ${html}
    </div>
  `;
  overlay.addEventListener('click', (e) => { if (e.target === overlay) closeModal(); });
  document.body.appendChild(overlay);
}

function showLoginModal() {
  const saved = JSON.parse(localStorage.getItem(ADMIN_KEY) || '{}');
  showModal(`
    <h2>GitHub に接続</h2>
    <div class="admin-form">
      <div class="admin-field">
        <label>リポジトリ（例: username/username.github.io）</label>
        <input type="text" id="adminRepo" class="admin-input" placeholder="owner/repo" value="${escapeHtml(saved.repo || '')}">
      </div>
      <div class="admin-field">
        <label>GitHub Personal Access Token</label>
        <input type="password" id="adminToken" class="admin-input" placeholder="ghp_..." value="${escapeHtml(saved.token || '')}">
        <p style="font-size:0.8rem;color:var(--text-tertiary);margin-top:4px">Settings → Developer settings → Personal access tokens → Fine-grained tokens（repo 書き込み権限）</p>
      </div>
      <button onclick="adminLogin()" class="btn btn-primary" style="width:100%;justify-content:center;margin-top:8px">接続</button>
      <p id="adminStatus" style="text-align:center;margin-top:12px;font-size:0.9rem;color:var(--text-secondary)"></p>
    </div>
  `);
}

async function adminLogin() {
  const repo = document.getElementById('adminRepo').value.trim();
  const token = document.getElementById('adminToken').value.trim();
  const status = document.getElementById('adminStatus');
  if (!repo || !token) { status.textContent = 'すべて入力してください'; return; }
  status.textContent = '接続中...';
  try {
    const r = await fetch(`https://api.github.com/repos/${repo}/contents/projects.json`, {
      headers: { Authorization: `token ${token}` },
    });
    if (r.status === 404) {
      const initR = await fetch(`https://api.github.com/repos/${repo}/contents/projects.json`, {
        method: 'PUT',
        headers: { Authorization: `token ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: 'initial commit', content: utf8ToBase64(JSON.stringify(data, null, 2)) }),
      });
      if (!initR.ok) { const err = await initR.text(); status.textContent = `初期化失敗 (${initR.status})`; return; }
    } else if (!r.ok) { status.textContent = `エラー (${r.status})`; return; }
    localStorage.setItem(ADMIN_KEY, JSON.stringify({ token, repo }));
    closeModal();
  } catch (e) { status.textContent = '通信エラー: ' + e.message; }
}

function getNextProjectId() {
  const maxNum = data.projects.reduce((m, p) => {
    const n = parseInt(p.id.replace('video-project-', ''));
    return n > m ? n : m;
  }, 0);
  return `video-project-${maxNum + 1}`;
}

function showAddModal() {
  const saved = JSON.parse(localStorage.getItem(ADMIN_KEY) || '{}');
  if (!saved.token || !saved.repo) { showLoginModal(); return; }

  showModal(`
    <h2>作品を追加</h2>
    <div class="admin-form">
      <div class="admin-field">
        <label>タイトル *</label>
        <input type="text" id="aTitle" class="admin-input" placeholder="作品タイトル">
      </div>
      <div class="admin-field">
        <label>リンクURL</label>
        <input type="text" id="aLinkUrl" class="admin-input" placeholder="https://x.com/...">
      </div>
      <div class="admin-field">
        <label>リンクラベル</label>
        <input type="text" id="aLinkLabel" class="admin-input" placeholder="Xで見る">
      </div>
      <button onclick="adminSubmit()" class="btn btn-primary" style="width:100%;justify-content:center;margin-top:8px">GitHub に追加</button>
      <p id="adminStatus" style="text-align:center;margin-top:12px;font-size:0.9rem;color:var(--text-secondary)"></p>
    </div>
    <div style="text-align:center;margin-top:16px">
      <a href="#" onclick="showLoginModal();return false" style="color:var(--text-tertiary);font-size:0.85rem">接続先を変更</a>
    </div>
  `);
  setTimeout(() => document.getElementById('aTitle')?.focus(), 100);
}

function showEditModal(id) {
  const saved = JSON.parse(localStorage.getItem(ADMIN_KEY) || '{}');
  if (!saved.token || !saved.repo) { showLoginModal(); return; }

  const p = data.projects.find(proj => proj.id === id);
  if (!p) return;

  showModal(`
    <h2>作品を編集</h2>
    <div class="admin-form">
      <div class="admin-field">
        <label>タイトル *</label>
        <input type="text" id="aTitle" class="admin-input" value="${escapeHtml(p.title)}">
      </div>
      <div class="admin-field">
        <label>説明（1行） *</label>
        <input type="text" id="aDesc" class="admin-input" value="${escapeHtml(p.description)}">
      </div>
      <div class="admin-row">
        <div class="admin-field" style="flex:1">
          <label>絵文字</label>
          <input type="text" id="aEmoji" class="admin-input" value="${escapeHtml(p.emoji || '🎬')}" style="text-align:center;font-size:1.5rem">
        </div>
        <div class="admin-field" style="flex:2">
          <label>日付</label>
          <input type="text" id="aDate" class="admin-input" value="${escapeHtml(p.date || '')}">
        </div>
      </div>
      <div class="admin-field">
        <label>タグ（カンマ区切り）</label>
        <input type="text" id="aTags" class="admin-input" value="${escapeHtml((p.tags || []).join(', '))}">
      </div>
      <div class="admin-field">
        <label>詳細説明</label>
        <textarea id="aDetail" class="admin-input admin-textarea">${escapeHtml(p.details || p.description)}</textarea>
      </div>
      <div class="admin-field">
        <label>リンク先URL</label>
        <input type="text" id="aLinkUrl" class="admin-input" value="${escapeHtml((p.links && p.links[0]) ? p.links[0].url : '')}">
      </div>
      <div class="admin-field">
        <label>リンクラベル</label>
        <input type="text" id="aLinkLabel" class="admin-input" value="${escapeHtml((p.links && p.links[0]) ? p.links[0].label : '')}">
      </div>
      <button onclick="adminSubmitEdit('${id}')" class="btn btn-primary" style="width:100%;justify-content:center;margin-top:8px">保存</button>
      <p id="adminStatus" style="text-align:center;margin-top:12px;font-size:0.9rem;color:var(--text-secondary)"></p>
    </div>
  `);
}

function adminLogout() {
  localStorage.removeItem(ADMIN_KEY);
  location.reload();
}

async function adminCommit(updateFn) {
  const saved = JSON.parse(localStorage.getItem(ADMIN_KEY) || '{}');
  const { token, repo } = saved;
  const status = document.getElementById('adminStatus');
  status.textContent = '送信中...';

  try {
    const getR = await fetch(`https://api.github.com/repos/${repo}/contents/projects.json`, {
      headers: { Authorization: `token ${token}` },
    });
    if (!getR.ok) throw new Error('Fetch failed');
    const file = await getR.json();
    const raw = atob(file.content.replace(/\n/g, ''));
    const bytes = new Uint8Array(raw.length);
    for (let i = 0; i < raw.length; i++) bytes[i] = raw.charCodeAt(i);
    const currentData = JSON.parse(new TextDecoder().decode(bytes));

    updateFn(currentData);

    const newContent = utf8ToBase64(JSON.stringify(currentData, null, 2));
    const putR = await fetch(`https://api.github.com/repos/${repo}/contents/projects.json`, {
      method: 'PUT',
      headers: { Authorization: `token ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: 'update projects.json', content: newContent, sha: file.sha }),
    });
    if (!putR.ok) throw new Error('Commit failed');

    status.textContent = '完了！ 数分後に反映されます。';
    status.style.color = 'var(--accent)';
    setTimeout(closeModal, 2000);
  } catch (e) {
    status.textContent = 'エラーが発生しました。トークンとリポジトリ設定を確認してください。';
    status.style.color = '#e53e3e';
  }
}

async function adminSubmit() {
  const title = document.getElementById('aTitle').value.trim();
  const linkUrl = document.getElementById('aLinkUrl').value.trim();
  const linkLabel = document.getElementById('aLinkLabel').value.trim();
  if (!title) { alert('タイトルは必須です'); return; }
  const links = (linkUrl && linkLabel) ? [{ label: linkLabel, url: linkUrl }] : [];

  adminCommit((currentData) => {
    currentData.projects.push({
      id: getNextProjectId(), title, category: 'video',
      emoji: '🎬', description: title,
      details: '', tags: [], date: new Date().toISOString().slice(0, 7),
      links,
    });
  });
}

async function adminSubmitEdit(id) {
  const title = document.getElementById('aTitle').value.trim();
  const desc = document.getElementById('aDesc').value.trim();
  const emoji = document.getElementById('aEmoji').value.trim() || '🎬';
  const date = document.getElementById('aDate').value.trim();
  const tagsRaw = document.getElementById('aTags').value.trim();
  const detail = document.getElementById('aDetail').value.trim() || desc;
  const linkUrl = document.getElementById('aLinkUrl').value.trim();
  const linkLabel = document.getElementById('aLinkLabel').value.trim();
  if (!title || !desc) { alert('タイトルと説明は必須です'); return; }
  const tags = tagsRaw ? tagsRaw.split(',').map(t => t.trim()).filter(Boolean) : [];
  const links = (linkUrl && linkLabel) ? [{ label: linkLabel, url: linkUrl }] : [];

  adminCommit((currentData) => {
    const idx = currentData.projects.findIndex(p => p.id === id);
    if (idx === -1) return;
    currentData.projects[idx] = { ...currentData.projects[idx], title, description: desc, emoji, date, tags, details: detail, links };
  });
}
