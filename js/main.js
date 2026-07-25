let data = null;

(function initTheme() {
  const key = 'portfolio_theme';
  let saved;
  try { saved = localStorage.getItem(key); } catch {}
  const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
  const dark = saved ? saved === 'dark' : prefersDark;
  document.documentElement.setAttribute('data-theme', dark ? 'dark' : 'light');
  const btn = document.getElementById('themeToggle');
  if (btn) {
    btn.textContent = dark ? '☀️' : '🌙';
    btn.addEventListener('click', () => {
      const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
      const next = isDark ? 'light' : 'dark';
      document.documentElement.setAttribute('data-theme', next);
      localStorage.setItem(key, next);
      btn.textContent = next === 'dark' ? '☀️' : '🌙';
    });
  }
})();

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
  async function router() {
    const hash = location.hash || '#works';
    const [page, ...rest] = hash.replace('#', '').split('/');
    const app = document.getElementById('app');
    if (!app) return;
    if (loading) loading.style.display = 'none';
    switch (page) {
      case 'works': renderWorks(app); break;
      case 'work': await renderWorkDetail(app, rest[0]); break;
      case 'contact': renderContact(app); break;
      case 'admin': renderAdmin(app); break;
      default: renderNotFound(app);
    }
    updateActiveNav(hash);
    observeFadeIn(app);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }
  window.__router = router;
  window.addEventListener('hashchange', router);

  try {
    const res = await fetch('projects.json?_=' + Date.now());
    if (res.ok) { data = await res.json(); }
  } catch {}
  if (!data) {
    data = {"profile":{"name":"Your Name","tagline":"Video Editor / Creator","bio":"X（Twitter）で動画編集作品を発信中。\nカット編集・色調整・エフェクト・テロップ入れなど、動画全般の編集を手がけています。","email":"yourname@example.com"},"social":{"twitter":"https://x.com/takuch_fortnite","youtube":"https://www.youtube.com/@takuch-777","tiktok":"https://www.tiktok.com/@t4ku_vfx","github":""},"projects":[{"id":"video-project-7","title":"xのテストだよ","category":"video","emoji":"🎬","description":"gegeg","details":"gegeg","tags":[],"date":"2026-07","links":[{"label":"https://x.com/takuch_fortnite/status/2080095556286697875","url":"https://x.com/takuch_fortnite/status/2080095556286697875https://x.com/takuch_fortnite/status/2080095556286697875"}],"videoUrl":"https://x.com/takuch_fortnite/status/2080095556286697875"},{"id":"video-project-8","title":"てすとai","category":"video","emoji":"🎬","description":"てすと","details":"てすと","tags":[],"date":"2026-07","links":[{"label":"YouTubeで見る","url":"https://www.youtube.com/watch?v=AfQzohIx6UA"}],"videoUrl":"https://www.youtube.com/watch?v=AfQzohIx6UA"},{"id":"video-project-9","title":"てーすと","category":"video","emoji":"🎬","description":"てーすと","details":"","tags":[],"date":"2026-07","videoUrl":"https://www.youtube.com/watch?v=mQEU6vvtGQ4","links":[]},{"id":"video-project-11","title":"tesutttt","category":"video","emoji":"🎬","description":"tesutttt","details":"","tags":[],"date":"2026-07","links":[{"label":"https://x.com/takuch_fortnite/status/2079758458505822320","url":"https://x.com/takuch_fortnite/status/2079758458505822320"}]}]};
  }

  const nav = document.getElementById('nav');
  const menuBtn = document.getElementById('menuBtn');
  const loading = document.getElementById('loading');
  if (!nav || !menuBtn) return;
  menuBtn.addEventListener('click', () => nav.classList.toggle('open'));
  document.addEventListener('click', (e) => {
    if (!e.target.closest('.header')) nav.classList.remove('open');
  });
  document.querySelectorAll('[data-nav]').forEach(link => {
    link.addEventListener('click', () => nav.classList.remove('open'));
  });

  function updateActiveNav(hash) {
    const page = hash.replace('#', '').split('/')[0] || 'works';
    document.querySelectorAll('[data-nav]').forEach(link => {
      link.classList.toggle('active', link.getAttribute('href') === `#${page}`);
    });
  }

  router();
})();

function renderWorks(app) {
  const projects = [...data.projects].sort((a, b) => {
    if (a.featured && !b.featured) return -1;
    if (!a.featured && b.featured) return 1;
    return 0;
  });
  const saved = JSON.parse(localStorage.getItem(ADMIN_KEY) || '{}');
  const isAdmin = saved.token && saved.repo;
  app.innerHTML = wrapFadeIn(`
    <div class="container">
      <div class="page-header">
        <h1>Works</h1>
        <p>制作した動画作品一覧</p>
      </div>
      <div class="search-bar-wrap">
        <input class="search-bar" id="searchBar" type="text" placeholder="作品を検索..." autocomplete="off">
        <button class="search-clear" id="searchClear">✕</button>
      </div>
      <div class="works-grid">
        ${projects.map(projectCard).join('')}
      </div>
      <div class="search-none" id="searchNone">該当する作品が見つかりませんでした</div>
      ${isAdmin ? '<button class="fab" onclick="showAddModal()" title="作品を追加">+</button>' : ''}
    </div>
  `);
  setupFilter();
  updateCardThumbnails();
  if (JSON.parse(localStorage.getItem(ADMIN_KEY) || '{}').token) { enableBatchSelect(); enableDragReorder(); }
}

function setupFilter() {
  const input = document.getElementById('searchBar');
  const clear = document.getElementById('searchClear');
  const none = document.getElementById('searchNone');
  if (!input) return;

  function filter() {
    const q = input.value.toLowerCase().trim();
    const cards = document.querySelectorAll('.work-card');
    let visible = 0;
    cards.forEach(card => {
      if (!q) { card.style.display = ''; visible++; return; }
      let text = card.dataset.searchText;
      if (!text) {
        const title = card.querySelector('.work-card-title')?.textContent || '';
        const desc = card.querySelector('.work-card-desc')?.textContent || '';
        const tags = Array.from(card.querySelectorAll('.tag')).map(t => t.textContent);
        text = [title, desc, ...tags].join(' ').toLowerCase();
        card.dataset.searchText = text;
      }
      const match = text.includes(q);
      card.style.display = match ? '' : 'none';
      if (match) visible++;
    });
    none.style.display = (q && !visible) ? '' : 'none';
    clear.style.display = q ? '' : 'none';
  }

  input.addEventListener('input', filter);
  clear.addEventListener('click', () => { input.value = ''; filter(); input.focus(); });

  // Tag click → filter by tag
  document.addEventListener('click', (e) => {
    const tag = e.target.closest('.work-card .tag');
    if (!tag || !document.querySelector('.works-grid')) return;
    e.preventDefault();
    e.stopPropagation();
    input.value = tag.textContent;
    filter();
  });
}

function enableBatchSelect() {
  if (window._batchSelectInited) return;
  window._batchSelectInited = true;

  let startX, startY, isDragging = false, _selectionLocked = false;
  const selBox = document.createElement('div');
  selBox.className = 'sel-rect';
  const bar = document.createElement('div');
  bar.className = 'sel-bar';
  bar.innerHTML = '<span class="sel-bar-count"></span><input class="sel-bar-tags" placeholder="タグ(カンマ区切り)"><button class="sel-bar-tag-btn btn btn-outline" style="margin:0">タグ追加</button><button class="sel-bar-feat-btn btn btn-outline" style="margin:0">⭐ おすすめ</button><button class="sel-bar-del btn btn-primary" style="margin:0">まとめて削除</button>';
  bar.querySelector('.sel-bar-del').onclick = () => {
    const ids = Array.from(document.querySelectorAll('.work-card.selected')).map(c => c.getAttribute('href')?.replace('#work/', '')).filter(Boolean);
    if (!ids.length || !confirm(`選択した${ids.length}件をすべて削除しますか？`)) return;
    adminCommit((currentData) => { currentData.projects = currentData.projects.filter(p => !ids.includes(p.id)); });
    clearSelection();
  };
  bar.querySelector('.sel-bar-tag-btn').onclick = () => {
    const input = bar.querySelector('.sel-bar-tags');
    const raw = input.value.trim();
    if (!raw) return;
    const newTags = raw.split(',').map(t => t.trim()).filter(Boolean);
    if (!newTags.length) return;
    const ids = Array.from(document.querySelectorAll('.work-card.selected')).map(c => c.getAttribute('href')?.replace('#work/', '')).filter(Boolean);
    if (!ids.length) return;
    input.value = '';
    adminCommit((currentData) => {
      ids.forEach(id => {
        const p = currentData.projects.find(proj => proj.id === id);
        if (!p) return;
        const existing = new Set(p.tags || []);
        newTags.forEach(t => existing.add(t));
        p.tags = Array.from(existing);
      });
    });
    clearSelection();
  };
  bar.querySelector('.sel-bar-feat-btn').onclick = () => {
    const ids = Array.from(document.querySelectorAll('.work-card.selected')).map(c => c.getAttribute('href')?.replace('#work/', '')).filter(Boolean);
    if (!ids.length) return;
    adminCommit((currentData) => {
      ids.forEach(id => {
        const p = currentData.projects.find(proj => proj.id === id);
        if (!p) return;
        p.featured = !p.featured;
      });
    });
    clearSelection();
  };

  function updateBar() {
    const n = document.querySelectorAll('.work-card.selected').length;
    if (n) { bar.querySelector('.sel-bar-count').textContent = `${n}件選択中`; document.body.appendChild(bar); }
    else if (bar.parentNode) bar.parentNode.removeChild(bar);
  }

  function clearSelection() {
    document.querySelectorAll('.work-card.selected').forEach(c => c.classList.remove('selected'));
    updateBar();
    _selectionLocked = false;
  }

  function isOnCard(el) { return !!el.closest('.work-card'); }

  document.addEventListener('mousedown', (e) => {
    if (e.button !== 0 || document.querySelector('.modal-overlay')) return;
    if (!document.querySelector('.works-grid')) return;
    if (e.target.closest('.search-bar-wrap, .search-clear, .sel-bar, .drag-handle, .upload-btn, .upload-row')) return;
    if (isOnCard(e.target) && !e.target.closest('.card-del-btn')) {
      if (document.querySelector('.work-card.selected')) clearSelection();
      return;
    }
    clearSelection();
    e.preventDefault();
    startX = e.clientX; startY = e.clientY;
    isDragging = false;
    selBox.style.left = startX + 'px'; selBox.style.top = startY + 'px';
    selBox.style.width = '0'; selBox.style.height = '0';
    document.body.appendChild(selBox);
    document.body.classList.add('sel-active');
    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup', onUp);
  });

  function onMove(e) {
    const cx = e.clientX, cy = e.clientY;
    const dx = cx - startX, dy = cy - startY;
    if (!isDragging && (Math.abs(dx) > 5 || Math.abs(dy) > 5)) isDragging = true;
    if (!isDragging) return;
    selBox.style.left = Math.min(startX, cx) + 'px';
    selBox.style.top = Math.min(startY, cy) + 'px';
    selBox.style.width = Math.abs(dx) + 'px';
    selBox.style.height = Math.abs(dy) + 'px';
    const sr = selBox.getBoundingClientRect();
    document.querySelectorAll('.work-card').forEach(c => {
      const cr = c.getBoundingClientRect();
      c.classList.toggle('selected', cr.right > sr.left && cr.left < sr.right && cr.bottom > sr.top && cr.top < sr.bottom);
    });
    updateBar();
  }

  function onUp() {
    document.removeEventListener('mousemove', onMove);
    document.removeEventListener('mouseup', onUp);
    document.body.classList.remove('sel-active');
    if (selBox.parentNode) selBox.parentNode.removeChild(selBox);
    if (!document.querySelector('.works-grid')) { isDragging = false; return; }
    if (isDragging) {
      _selectionLocked = true;
      updateBar();
    } else {
      clearSelection();
    }
    isDragging = false;
  }

  document.addEventListener('click', (e) => {
    if (document.querySelector('.modal-overlay') || !document.querySelector('.works-grid')) return;
    if (_selectionLocked) { _selectionLocked = false; return; }
    if (!isOnCard(e.target) && !e.target.closest('.card-del-btn') && !e.target.closest('.sel-bar')) {
      clearSelection();
    }
  });

  document.addEventListener('dragstart', (e) => {
    if (document.querySelector('.works-grid') && !document.querySelector('.modal-overlay')) e.preventDefault();
  });

  document.addEventListener('keydown', (e) => {
    if (e.key !== 'Delete' && e.key !== 'Backspace') return;
    if (document.querySelector('.modal-overlay')) return;
    const sel = document.querySelectorAll('.work-card.selected');
    if (!sel.length) return;
    e.preventDefault();
    const ids = Array.from(sel).map(c => c.getAttribute('href')?.replace('#work/', '')).filter(Boolean);
    if (!ids.length || !confirm(`選択した${ids.length}件を削除しますか？`)) return;
    adminCommit((currentData) => { currentData.projects = currentData.projects.filter(p => !ids.includes(p.id)); });
    clearSelection();
  });

  document.addEventListener('contextmenu', (e) => {
    if (document.body.classList.contains('sel-active')) e.preventDefault();
  });
}

function enableDragReorder() {
  const grid = document.querySelector('.works-grid');
  if (!grid || grid.dataset.dragInit) return;
  grid.dataset.dragInit = '1';

  let draggedId = null;

  grid.addEventListener('dragstart', (e) => {
    const handle = e.target.closest('.drag-handle');
    if (!handle) { e.preventDefault(); return; }
    const card = handle.closest('.work-card');
    if (!card) { e.preventDefault(); return; }
    draggedId = card.getAttribute('href')?.replace('#work/', '');
    if (!draggedId) { e.preventDefault(); return; }
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', draggedId);
    card.classList.add('dragging');
  });

  grid.addEventListener('dragend', () => {
    document.querySelectorAll('.work-card').forEach(c => c.classList.remove('dragging', 'drag-over'));
    draggedId = null;
  });

  grid.addEventListener('dragover', (e) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    const card = e.target.closest('.work-card');
    if (!card) return;
    document.querySelectorAll('.work-card').forEach(c => c.classList.remove('drag-over'));
    card.classList.add('drag-over');
  });

  grid.addEventListener('drop', async (e) => {
    e.preventDefault();
    document.querySelectorAll('.work-card').forEach(c => c.classList.remove('dragging', 'drag-over'));
    if (!draggedId) return;
    const targetCard = e.target.closest('.work-card');
    if (!targetCard) return;
    const targetId = targetCard.getAttribute('href')?.replace('#work/', '');
    if (!targetId || targetId === draggedId) return;

    const projects = data.projects;
    const fromIdx = projects.findIndex(p => p.id === draggedId);
    const toIdx = projects.findIndex(p => p.id === targetId);
    if (fromIdx === -1 || toIdx === -1) return;

    const [moved] = projects.splice(fromIdx, 1);
    const adjustedTo = toIdx > fromIdx ? toIdx - 1 : toIdx;
    projects.splice(adjustedTo, 0, moved);

    // Save new order to GitHub via adminCommit
    let loadingEl = document.getElementById('dragLoading');
    if (!loadingEl) {
      loadingEl = document.createElement('div');
      loadingEl.id = 'dragLoading';
      loadingEl.textContent = '保存中...';
      document.body.appendChild(loadingEl);
    } else {
      loadingEl.style.display = '';
    }

    try {
      await adminCommit((currentData) => {
        const orderMap = new Map(data.projects.map((p, i) => [p.id, i]));
        currentData.projects.sort((a, b) => (orderMap.get(a.id) || 0) - (orderMap.get(b.id) || 0));
      });
    } finally {
      if (loadingEl) loadingEl.style.display = 'none';
    }
  });
}

async function updateCardThumbnails() {
  for (const p of data.projects) {
    if (p.thumbnail || autoThumb(p)) continue;
    const url = p.links && p.links[0] ? p.links[0].url : '';
    const xMatch = url.match(/(?:x\.com|twitter\.com)\/(\w+)\/status\/(\d+)/i);
    if (!xMatch) continue;
    try {
      const r = await fetch(`https://api.vxtwitter.com/${xMatch[1]}/status/${xMatch[2]}`);
      if (r.ok) {
        const tweet = await r.json();
        const thumbUrl = tweet.media_extended?.[0]?.thumbnail_url;
        if (thumbUrl) {
          const thumb = document.querySelector(`.work-card[href="#work/${encodeURIComponent(p.id)}"] .work-card-thumb`);
          if (!thumb) continue;
          const existingImg = thumb.querySelector('img');
          if (existingImg) { existingImg.src = thumbUrl; continue; }
          const emoji = thumb.querySelector('.emoji');
          if (emoji) emoji.remove();
          const img = document.createElement('img');
          img.src = thumbUrl;
          img.alt = p.title || '';
          img.loading = 'lazy';
          img.onerror = function() { ytThumbFallback(this); };
          img.style.cssText = 'width:100%;height:100%;object-fit:cover;position:absolute;inset:0';
          const delBtn = thumb.querySelector('.card-del-btn');
          if (delBtn) thumb.insertBefore(img, delBtn);
          else thumb.insertBefore(img, thumb.firstChild);
        }
      }
    } catch {}
  }
}

function autoThumb(p) {
  const url = p.videoUrl || (p.links && p.links[0] ? p.links[0].url : '');
  if (!url) return '';
  const yt = url.match(/(?:youtube\.com\/(?:watch\?v=|embed\/)|youtu\.be\/)([a-zA-Z0-9_-]+)/);
  if (yt) return `https://img.youtube.com/vi/${yt[1]}/maxresdefault.jpg`;
  return '';
}

function ytThumbFallback(img) {
  const src = img.src;
  if (src.includes('maxresdefault')) { img.src = src.replace('maxresdefault', 'hqdefault'); return; }
  if (src.includes('hqdefault')) { img.src = src.replace('hqdefault', 'mqdefault'); return; }
  img.onerror = null;
}

function projectCard(p) {
  const thumbUrl = p.thumbnail || autoThumb(p);
  const thumb = thumbUrl ? `<img src="${escapeHtml(thumbUrl)}" alt="${escapeHtml(p.title)}" loading="lazy" onerror="ytThumbFallback(this)" style="width:100%;height:100%;object-fit:cover;position:absolute;inset:0">` : '';
  const saved = JSON.parse(localStorage.getItem(ADMIN_KEY) || '{}');
  const isAdmin = saved.token && saved.repo;
  return `
    <a href="#work/${encodeURIComponent(p.id)}" class="work-card" ${isAdmin ? 'draggable="false"' : ''}>
      <div class="work-card-thumb">
        ${thumb || `<span class="emoji">${p.emoji || '🎬'}</span>`}
        ${isAdmin ? `<span class="drag-handle" draggable="true" title="並び替え">⠿</span>` : ''}
        ${isAdmin ? `<button class="card-del-btn" data-id="${escapeHtml(p.id)}" title="削除">🗑</button>` : ''}
      </div>
      <div class="work-card-body">
        ${p.featured ? '<span class="featured-badge">⭐ おすすめ</span>' : ''}
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

function videoEmbed(url) {
  if (!url) return '';
  const ytMatch = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([a-zA-Z0-9_-]+)/);
  if (ytMatch) {
    return `<div class="video-wrapper"><iframe src="https://www.youtube.com/embed/${ytMatch[1]}" frameborder="0" allowfullscreen></iframe></div>`;
  }
  if (url.match(/\.(mp4|webm|ogg)(\?|$)/i)) {
    return `<div class="video-wrapper"><video src="${escapeHtml(url)}" controls playsinline style="width:100%;border-radius:var(--radius-md)"></video></div>`;
  }
  const xMatch = url.match(/(?:x\.com|twitter\.com)\/(\w+)\/status\/(\d+)/i);
  if (xMatch) {
    return { type: 'x', username: xMatch[1], id: xMatch[2], url: `https://twitter.com/${xMatch[1]}/status/${xMatch[2]}` };
  }
  return '';
}

async function renderWorkDetail(app, id) {
  const p = data.projects.find(proj => proj.id === id);
  if (!p) return renderNotFound(app);

  const previewUrl = p.videoUrl || '';
  const linkUrl = p.links && p.links[0] ? p.links[0].url : '';
  const thumbUrl = p.thumbnail || autoThumb(p);
  const saved = JSON.parse(localStorage.getItem(ADMIN_KEY) || '{}');
  const isDetailAdmin = saved.token && saved.repo;

  const ve = videoEmbed(previewUrl) || videoEmbed(linkUrl);

  let previewHtml;
  if (typeof ve === 'string') {
    previewHtml = ve;
  } else if (ve && ve.type === 'x') {
    previewHtml = `<div class="work-detail-thumb" id="xPreview"><span>${p.emoji || '🎬'}</span></div>`;
  } else if (thumbUrl) {
    previewHtml = `<div class="work-detail-thumb" style="overflow:hidden"><img src="${escapeHtml(thumbUrl)}" alt="${escapeHtml(p.title)}" loading="lazy" style="width:100%;height:100%;object-fit:cover"></div>`;
  } else {
    previewHtml = `<div class="work-detail-thumb"><span>${p.emoji || '🎬'}</span></div>`;
  }

  const idx = data.projects.findIndex(proj => proj.id === id);
  const prev = idx > 0 ? data.projects[idx - 1] : null;
  const next = idx < data.projects.length - 1 ? data.projects[idx + 1] : null;
  const prevNextHtml = (prev || next) ? `
    <div class="work-detail-nav">
      ${prev ? `<a href="#work/${encodeURIComponent(prev.id)}" class="work-detail-nav-link prev">← 前の作品<br><span>${escapeHtml(prev.title)}</span></a>` : '<div></div>'}
      ${next ? `<a href="#work/${encodeURIComponent(next.id)}" class="work-detail-nav-link next">次の作品 →<br><span>${escapeHtml(next.title)}</span></a>` : ''}
    </div>` : '';

  app.innerHTML = wrapFadeIn(`
    <div class="work-detail">
      <a href="#works" class="work-detail-back">← Back to Works</a>
      <div class="work-detail-header">
        <div class="work-detail-cat">${escapeHtml(p.category)}</div>
        <div style="display:flex;align-items:center;flex-wrap:wrap;gap:8px">
          <h1 class="work-detail-title" style="margin-bottom:0">${escapeHtml(p.title)}</h1>
          ${isDetailAdmin ? '<button class="edit-btn" onclick="showEditModal(\''+p.id+'\')">✏️ 編集</button>' : ''}
        </div>
        <div class="work-detail-meta">${p.date || ''}</div>
      </div>
      ${previewHtml}
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
            ${p.links.map(l => {
              let label = l.label;
              if (l.url.match(/(?:x\.com|twitter\.com)/i)) label = 'X（Twitter）で見る';
              else if (l.url.match(/youtube/)) label = 'YouTubeで見る';
              return `<a href="${escapeHtml(l.url)}" target="_blank" rel="noopener" class="btn btn-primary">▶ ${escapeHtml(label)}</a>`;
            }).join('')}
          </div>
        </div>` : ''}
        ${prevNextHtml}
      </div>
    </div>
  `);

  if (ve && ve.type === 'x') {
    const el = document.getElementById('xPreview');
    try {
      const r = await fetch(`https://api.vxtwitter.com/${ve.username}/status/${ve.id}`);
      if (r.ok) {
        const tweet = await r.json();
        if (tweet.media_extended && tweet.media_extended.length) {
          const media = tweet.media_extended[0];
          let html;
          if (media.type === 'video' || media.type === 'gif') {
            html = `<div class="video-wrapper"><video src="${escapeHtml(media.url)}" controls playsinline style="width:100%;border-radius:var(--radius-md)" poster="${escapeHtml(media.thumbnail_url || '')}"></video></div>`;
          } else if (media.thumbnail_url) {
            html = `<div class="work-detail-thumb" style="overflow:hidden"><img src="${escapeHtml(media.thumbnail_url)}" alt="${escapeHtml(p.title)}" loading="lazy" style="width:100%;height:100%;object-fit:cover"></div>`;
          }
          if (html && el) el.outerHTML = html;
        }
      }
    } catch {}
    if (el && !el.querySelector('video, img')) {
      el.outerHTML = `<a href="${escapeHtml(linkUrl)}" target="_blank" rel="noopener" class="btn btn-primary" style="display:flex;justify-content:center;padding:20px 24px;font-size:1.1rem;border-radius:var(--radius-md);text-decoration:none">X（Twitter）で見る</a>`;
    }
  }
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
      <a href="#works" class="btn btn-primary">Worksに戻る</a>
    </div>
  `);
}

function renderAdmin(app) {
  showLoginModal();
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
  document.removeEventListener('keydown', _modalKeyHandler);
}

let _modalKeyHandler = null;

function showModal(html) {
  closeModal();
  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay';
  overlay.innerHTML = `
    <div class="modal" role="dialog" aria-modal="true">
      <button class="modal-close" onclick="closeModal()" aria-label="閉じる">×</button>
      ${html}
    </div>
  `;
  overlay.addEventListener('click', (e) => { if (e.target === overlay) closeModal(); });

  _modalKeyHandler = (e) => {
    if (e.key === 'Escape') { closeModal(); return; }
    if (e.key === 'Tab') {
      const modal = overlay.querySelector('.modal');
      const focusable = modal.querySelectorAll('input, button, textarea, select, a[href], [tabindex]:not([tabindex="-1"])');
      if (!focusable.length) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    }
  };
  document.addEventListener('keydown', _modalKeyHandler);

  document.body.appendChild(overlay);
  const firstInput = overlay.querySelector('input, button:not(.modal-close), textarea');
  if (firstInput) setTimeout(() => firstInput.focus(), 100);
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

function getNextProjectId(sourceData) {
  const projects = sourceData || data;
  const maxNum = projects.projects.reduce((m, p) => {
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
        <label>サムネイル画像</label>
        <div class="upload-row">
          <input type="text" id="aThumb" class="admin-input" placeholder="https://...">
          <input type="file" accept="image/*" class="upload-btn" onchange="handleFileUpload(this, 'aThumb', 'uploadStatusThumb')">
        </div>
        <p id="uploadStatusThumb" style="font-size:0.8rem;color:var(--text-tertiary);margin-top:2px"></p>
      </div>
      <div class="admin-field">
        <label>動画URL（YouTube / mp4）</label>
        <div class="upload-row">
          <input type="text" id="aVideoUrl" class="admin-input" placeholder="https://youtube.com/watch?v=...">
          <input type="file" accept="video/*,image/*" class="upload-btn" onchange="handleFileUpload(this, 'aVideoUrl', 'uploadStatusVideo')">
        </div>
        <p id="uploadStatusVideo" style="font-size:0.8rem;color:var(--text-tertiary);margin-top:2px"></p>
      </div>
      <div class="admin-field">
        <label>リンクURL</label>
        <input type="text" id="aLinkUrl" class="admin-input" placeholder="https://x.com/...">
      </div>
      <div class="admin-field">
        <label>リンクラベル</label>
        <input type="text" id="aLinkLabel" class="admin-input" placeholder="Xで見る">
      </div>
      <div class="admin-field">
        <label>タグ（カンマ区切り）</label>
        <input type="text" id="aAddTags" class="admin-input" placeholder="例: FPS, 編集, 実況">
      </div>
      <button onclick="adminSubmit()" id="submitBtn" class="btn btn-primary" style="width:100%;justify-content:center;margin-top:8px">GitHub に追加</button>
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
          <label>サムネイル画像</label>
          <div class="upload-row">
            <input type="text" id="aThumb" class="admin-input" value="${escapeHtml(p.thumbnail || '')}" placeholder="https://...">
            <input type="file" accept="image/*" class="upload-btn" onchange="handleFileUpload(this, 'aThumb', 'editUploadStatusThumb')">
          </div>
          <p id="editUploadStatusThumb" style="font-size:0.8rem;color:var(--text-tertiary);margin-top:2px"></p>
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
        <label>動画URL</label>
        <div class="upload-row">
          <input type="text" id="aVideoUrl" class="admin-input" value="${escapeHtml(p.videoUrl || '')}" placeholder="https://youtube.com/watch?v=...">
          <input type="file" accept="video/*,image/*" class="upload-btn" onchange="handleFileUpload(this, 'aVideoUrl', 'editUploadStatusVideo')">
        </div>
        <p id="editUploadStatusVideo" style="font-size:0.8rem;color:var(--text-tertiary);margin-top:2px"></p>
      </div>
      <div class="admin-field">
        <label>リンク先URL</label>
        <input type="text" id="aLinkUrl" class="admin-input" value="${escapeHtml((p.links && p.links[0]) ? p.links[0].url : '')}">
      </div>
      <div class="admin-field">
        <label>リンクラベル</label>
        <input type="text" id="aLinkLabel" class="admin-input" value="${escapeHtml((p.links && p.links[0]) ? p.links[0].label : '')}">
      </div>
      <div class="admin-field" style="flex-direction:row;align-items:center;gap:8px">
        <input type="checkbox" id="aFeatured" ${p.featured ? 'checked' : ''} style="width:18px;height:18px;accent-color:var(--accent)">
        <label for="aFeatured" style="margin:0;cursor:pointer">おすすめに固定する</label>
      </div>
      <button onclick="adminSubmitEdit('${id}')" id="submitBtn" class="btn btn-primary" style="width:100%;justify-content:center;margin-top:8px">保存</button>
      <p id="adminStatus" style="text-align:center;margin-top:12px;font-size:0.9rem;color:var(--text-secondary)"></p>
      <div style="text-align:center;margin-top:16px;padding-top:16px;border-top:1px solid rgba(0,0,0,0.06)">
        <button onclick="adminDeleteProject('${escapeHtml(id)}')" style="background:none;border:none;color:#e53e3e;cursor:pointer;font-size:0.85rem;padding:8px">この作品を削除する</button>
      </div>
    </div>
  `);
}

function adminLogout() {
  localStorage.removeItem(ADMIN_KEY);
  location.reload();
}

async function handleFileUpload(fileInput, targetInputId, statusId) {
  const file = fileInput.files?.[0];
  if (!file) return;
  const statusEl = document.getElementById(statusId);
  const url = await adminUploadFile(file, statusEl);
  if (url) {
    document.getElementById(targetInputId).value = url;
  }
  fileInput.value = '';
}

async function adminUploadFile(file, statusEl) {
  const saved = JSON.parse(localStorage.getItem(ADMIN_KEY) || '{}');
  const { token, repo } = saved;
  if (!token || !repo) { alert('未ログインです'); return ''; }

  const maxSize = 100 * 1024 * 1024; // ~100MB (GitHub API limit)
  if (file.size > maxSize) {
    if (statusEl) statusEl.textContent = 'ファイルサイズが大きすぎます（上限約100MB）';
    return '';
  }

  if (statusEl) statusEl.textContent = 'アップロード中...';

  const ext = file.name.split('.').pop();
  const filename = `${Date.now()}-${Math.random().toString(36).slice(2, 6)}.${ext}`;
  const path = `uploads/${filename}`;

  try {
    const reader = new FileReader();
    const base64 = await new Promise((resolve, reject) => {
      reader.onload = () => resolve(reader.result.split(',')[1]);
      reader.onerror = () => reject(reader.error);
      reader.readAsDataURL(file);
    });

    const putR = await fetch(`https://api.github.com/repos/${repo}/contents/${path}`, {
      method: 'PUT',
      headers: { Authorization: `token ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: `upload ${filename}`, content: base64 }),
    });
    if (!putR.ok) {
      const errText = await putR.text();
      if (statusEl) statusEl.textContent = `アップロード失敗 (${putR.status})`;
      return '';
    }

    const rawUrl = `https://raw.githubusercontent.com/${repo}/main/${path}`;
    if (statusEl) statusEl.textContent = `アップロード完了 ✓`;
    return rawUrl;
  } catch (e) {
    if (statusEl) statusEl.textContent = `エラー: ${e.message}`;
    return '';
  }
}

async function adminCommit(updateFn) {
  const saved = JSON.parse(localStorage.getItem(ADMIN_KEY) || '{}');
  const { token, repo } = saved;
  const status = document.getElementById('adminStatus');
  const btn = document.getElementById('submitBtn');
  if (btn) { btn.disabled = true; btn.style.cursor = 'wait'; }
  if (status) status.textContent = '送信中...';

  let lastError;
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const getR = await fetch(`https://api.github.com/repos/${repo}/contents/projects.json`, {
        headers: { Authorization: `token ${token}` },
      });
      if (!getR.ok) throw new Error(`FETCH ${getR.status}`);
      const file = await getR.json();
      const raw = atob(file.content.replace(/\s/g, ''));
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
      if (putR.status === 409) { lastError = 'Conflict'; continue; }
      if (!putR.ok) throw new Error(`PUT ${putR.status}`);

      data = currentData;
      closeModal();
      if (window.__router) window.__router();
      if (btn) { btn.disabled = false; btn.style.cursor = ''; }
      return;
    } catch (e) {
      lastError = e.message;
      if (attempt < 2 && status) { status.textContent = `リトライ中... (${attempt + 2}/3)`; continue; }
      break;
    }
  }
  if (btn) { btn.disabled = false; btn.style.cursor = ''; }
  const detail = lastError ? ` (${lastError})` : '';
  if (status) { status.textContent = `保存に失敗しました。設定を確認してください。${detail}`; status.style.color = '#e53e3e'; }
  else { alert(`保存に失敗しました。設定を確認してください。\n${detail}`); }
}

let _adminSubmitting = false;

async function adminSubmit() {
  if (_adminSubmitting) return;
  const title = document.getElementById('aTitle').value.trim();
  const linkUrl = document.getElementById('aLinkUrl').value.trim();
  const linkLabel = document.getElementById('aLinkLabel').value.trim();
  const videoUrl = document.getElementById('aVideoUrl').value.trim();
  const thumbnail = document.getElementById('aThumb')?.value.trim() || '';
  const tagsRaw = document.getElementById('aAddTags').value.trim();
  if (!title) { alert('タイトルは必須です'); return; }
  const links = (linkUrl && linkLabel) ? [{ label: linkLabel, url: linkUrl }] : [];
  const tags = tagsRaw ? tagsRaw.split(',').map(t => t.trim()).filter(Boolean) : [];

  const newId = getNextProjectId(data);
  _adminSubmitting = true;
  try {
    await adminCommit((currentData) => {
      if (currentData.projects.some(p => p.id === newId)) return;
      currentData.projects.push({
        id: newId, title, category: 'video',
        emoji: '🎬', description: title,
        details: '', tags, date: new Date().toISOString().slice(0, 7),
        videoUrl: videoUrl || undefined, thumbnail: thumbnail || undefined, links,
      });
    });
  } finally {
    _adminSubmitting = false;
  }
}

async function adminSubmitEdit(id) {
  if (_adminSubmitting) return;
  const title = document.getElementById('aTitle').value.trim();
  const desc = document.getElementById('aDesc').value.trim();
  const emoji = document.getElementById('aEmoji').value.trim() || '🎬';
  const date = document.getElementById('aDate').value.trim();
  const tagsRaw = document.getElementById('aTags').value.trim();
  const detail = document.getElementById('aDetail').value.trim() || desc;
  const linkUrl = document.getElementById('aLinkUrl').value.trim();
  const linkLabel = document.getElementById('aLinkLabel').value.trim();
  const videoUrl = document.getElementById('aVideoUrl').value.trim();
  const thumbnail = document.getElementById('aThumb').value.trim();
  const featured = document.getElementById('aFeatured')?.checked || false;
  if (!title || !desc) { alert('タイトルと説明は必須です'); return; }
  const tags = tagsRaw ? tagsRaw.split(',').map(t => t.trim()).filter(Boolean) : [];
  const links = (linkUrl && linkLabel) ? [{ label: linkLabel, url: linkUrl }] : [];

  _adminSubmitting = true;
  try {
    await adminCommit((currentData) => {
      const idx = currentData.projects.findIndex(p => p.id === id);
      if (idx === -1) return;
      currentData.projects[idx] = { ...currentData.projects[idx], title, description: desc, emoji, date, tags, details: detail, links, videoUrl: videoUrl || undefined, thumbnail: thumbnail || undefined, featured };
    });
  } finally {
    _adminSubmitting = false;
  }
}

async function adminDeleteProject(id) {
  const p = data?.projects?.find(proj => proj.id === id);
  if (!confirm(`「${p?.title || id}」を削除しますか？`)) return;
  const saved = JSON.parse(localStorage.getItem(ADMIN_KEY) || '{}');
  const { token, repo } = saved;
  if (!token || !repo) { alert('未ログインです'); return; }

  try {
    const getR = await fetch(`https://api.github.com/repos/${repo}/contents/projects.json`, {
      headers: { Authorization: `token ${token}` },
    });
    if (!getR.ok) { alert(`GitHub読み取り失敗: ${getR.status}`); return; }
    const file = await getR.json();
    const raw = atob(file.content.replace(/\s/g, ''));
    const bytes = new Uint8Array(raw.length);
    for (let i = 0; i < raw.length; i++) bytes[i] = raw.charCodeAt(i);
    const currentData = JSON.parse(new TextDecoder().decode(bytes));

    currentData.projects = currentData.projects.filter(p => p.id !== id);

    const newContent = utf8ToBase64(JSON.stringify(currentData, null, 2));
    const putR = await fetch(`https://api.github.com/repos/${repo}/contents/projects.json`, {
      method: 'PUT',
      headers: { Authorization: `token ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: 'delete project', content: newContent, sha: file.sha }),
    });
    if (putR.status === 409) { alert('競合が発生しました。ページを再読み込みしてください。'); return; }
    if (!putR.ok) { alert(`GitHub書き込み失敗: ${putR.status}`); return; }

    data = currentData;
    closeModal();
    if (window.__router) window.__router();
  } catch (e) {
    alert(`エラー: ${e.message}`);
  }
}

// Card delete button delegation
document.addEventListener('click', (e) => {
  const btn = e.target.closest('.card-del-btn');
  if (!btn) return;
  e.preventDefault();
  const id = btn.getAttribute('data-id');
  if (id) adminDeleteProject(id);
});
