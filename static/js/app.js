(function() {
  'use strict';
  
  // Plugin is served under /api/v1/jsplugin/lxmusic/
  // API routes are relative to this base
  const API_BASE = '/api/v1/jsplugin/lxmusic';
  let currentPage = 1;
  let searchKeyword = '';
  let importQueue = [];

  // DOM refs
  const $ = (sel) => document.querySelector(sel);
  const $$ = (sel) => document.querySelectorAll(sel);

  // Toast
  function showToast(msg, type = '') {
    const toast = $('#toast');
    toast.textContent = msg;
    toast.className = 'toast' + (type ? ' ' + type : '');
    clearTimeout(toast._timer);
    toast._timer = setTimeout(() => toast.className = 'toast hidden', 3000);
  }

  // API call
  async function api(path, options = {}) {
    try {
      const url = path.startsWith('/') ? API_BASE + path : path;
      const resp = await fetch(url, {
        headers: { 'Content-Type': 'application/json' },
        ...options,
      });
      const data = await resp.json();
      return data;
    } catch (err) {
      showToast('Network error: ' + err.message, 'error');
      throw err;
    }
  }

  // Tab switching
  $$('.tab').forEach(tab => {
    tab.addEventListener('click', () => {
      $$('.tab').forEach(t => t.classList.remove('active'));
      $$('.tab-panel').forEach(p => p.classList.remove('active'));
      tab.classList.add('active');
      $(`#tab-${tab.dataset.tab}`).classList.add('active');
      
      if (tab.dataset.tab === 'sources') loadSources();
    });
  });

  // Search
  async function doSearch(page = 1) {
    const keyword = $('#search-keyword').value.trim();
    if (!keyword) return;
    
    searchKeyword = keyword;
    currentPage = page;
    
    const sourceId = $('#search-source').value;
    const quality = $('#search-quality').value;
    
    $('#search-results').innerHTML = '<div class="loading">搜索中...</div>';
    
    try {
      const params = new URLSearchParams();
      params.append('keyword', keyword);
      if (sourceId) params.append('source_id', sourceId);
      if (quality !== '320k') params.append('quality', quality);
      params.append('page', String(page));
      params.append('page_size', '30');
      const data = await api('/api/search?' + params.toString());
      
      if (data.results && data.results.length > 0) {
        renderSearchResults(data.results);
      } else {
        $('#search-results').innerHTML = '<div class="empty-hint">未找到结果</div>';
      }
    } catch (err) {
      $('#search-results').innerHTML = '<div class="empty-hint">搜索出错</div>';
    }
  }

  function renderSearchResults(results) {
    const html = results.map((item, idx) => `
      <div class="result-item">
        <img class="result-cover" src="${item.cover_url || ''}" onerror="this.style.display='none'" alt="">
        <div class="result-info">
          <div class="result-title">${escapeHtml(item.title)}</div>
          <div class="result-artist">${escapeHtml(item.artist)} ${item.album ? '· ' + escapeHtml(item.album) : ''}</div>
          <div class="result-meta">${formatDuration(item.duration)}</div>
        </div>
        <div class="result-actions">
          <button class="btn btn-sm btn-primary" onclick="app.addToImport(${idx})">导入</button>
        </div>
      </div>
    `).join('');
    $('#search-results').innerHTML = html;
    
    // Store results for import
    window._searchResults = results;
  }

  // Import queue
  function addToImport(idx) {
    const item = window._searchResults?.[idx];
    if (!item) return;
    
    if (importQueue.find(q => q.title === item.title && q.artist === item.artist)) {
      showToast('已在导入队列中', 'error');
      return;
    }
    
    importQueue.push(item);
    updateImportQueue();
    showToast('已添加到导入队列', 'success');
  }

  function updateImportQueue() {
    const container = $('#import-queue');
    if (importQueue.length === 0) {
      container.innerHTML = '<p class="empty-hint">从搜索结果中点击"导入"按钮添加歌曲</p>';
      $('#import-all-btn').disabled = true;
      return;
    }
    
    $('#import-all-btn').disabled = false;
    container.innerHTML = importQueue.map((item, idx) => `
      <div class="import-item">
        <div class="result-info">
          <div class="result-title">${escapeHtml(item.title)}</div>
          <div class="result-artist">${escapeHtml(item.artist)}</div>
        </div>
        <button class="btn btn-sm btn-danger" onclick="app.removeFromImport(${idx})">移除</button>
      </div>
    `).join('');
  }

  function removeFromImport(idx) {
    importQueue.splice(idx, 1);
    updateImportQueue();
  }

  async function importAll() {
    if (importQueue.length === 0) return;
    
    $('#import-all-btn').disabled = true;
    $('#import-results').innerHTML = '<div class="loading">导入中...</div>';
    
    try {
      const data = await api('/api/songs/import', {
        method: 'POST',
        body: JSON.stringify({ songs: importQueue }),
      });
      
      const successCount = (data.data || []).filter(r => r.success).length;
      const failCount = importQueue.length - successCount;
      
      let msg = `导入完成: ${successCount} 成功`;
      if (failCount > 0) msg += `, ${failCount} 失败`;
      
      showToast(msg, failCount > 0 ? 'error' : 'success');
      $('#import-results').innerHTML = `<div class="empty-hint">${msg}</div>`;
      
      importQueue = [];
      updateImportQueue();
    } catch (err) {
      showToast('导入失败', 'error');
      $('#import-results').innerHTML = '';
    }
    
    $('#import-all-btn').disabled = false;
  }

  // Sources
  async function loadSources() {
    try {
      const data = await api('/api/sources');
      renderSources(data.data?.sources || []);
      
      if (data.data?.batch?.loading) {
        renderBatchStatus(data.data.batch);
      }
    } catch (err) {
      $('#sources-list').innerHTML = '<div class="empty-hint">加载失败</div>';
    }
  }

  function renderSources(sources) {
    if (sources.length === 0) {
      $('#sources-list').innerHTML = '<div class="empty-hint">暂无音源，请导入 .js 音源文件</div>';
      return;
    }
    
    const html = sources.map(s => `
      <div class="source-item">
        <div class="source-info">
          <div class="source-name">${escapeHtml(s.name)}</div>
          <div class="source-meta">
            ${s.version ? 'v' + escapeHtml(s.version) : ''} 
            ${s.author ? '· ' + escapeHtml(s.author) : ''}
            ${s.error ? '<br><span style="color:var(--error)">' + escapeHtml(s.error) + '</span>' : ''}
          </div>
        </div>
        <span class="source-status ${s.enabled ? (s.loading ? 'loading' : (s.error ? 'error' : 'enabled')) : 'disabled'}">
          ${s.loading ? '加载中...' : (s.enabled ? '已启用' : (s.error ? '错误' : '已禁用'))}
        </span>
        <label class="toggle">
          <input type="checkbox" ${s.enabled ? 'checked' : ''} onchange="app.toggleSource('${s.id}', this.checked)">
          <span class="toggle-slider"></span>
        </label>
        <button class="btn btn-sm btn-danger" onclick="app.deleteSource('${s.id}')">删除</button>
      </div>
    `).join('');
    
    $('#sources-list').innerHTML = html;
  }

  function renderBatchStatus(batch) {
    const el = $('#batch-status');
    el.classList.remove('hidden');
    const pct = batch.batch_total > 0 ? (batch.batch_completed / batch.batch_total * 100) : 0;
    el.innerHTML = `
      <div>批量导入中: ${batch.batch_completed}/${batch.batch_total}</div>
      <div class="batch-progress"><div class="batch-progress-bar" style="width:${pct}%"></div></div>
      ${batch.batch_errors.length > 0 ? '<div style="color:var(--error);margin-top:8px">' + batch.batch_errors.map(e => escapeHtml(e.error)).join('<br>') + '</div>' : ''}
    `;
  }

  async function toggleSource(id, enabled) {
    try {
      await api('/api/sources/toggle?id=' + encodeURIComponent(id) + '&enabled=' + enabled);
      showToast(enabled ? '已启用' : '已禁用', 'success');
      loadSources();
    } catch (err) {
      showToast('操作失败', 'error');
    }
  }

  async function deleteSource(id) {
    if (!confirm('确定删除此音源？')) return;
    try {
      await api('/api/sources?id=' + encodeURIComponent(id), { method: 'DELETE' });
      showToast('已删除', 'success');
      loadSources();
    } catch (err) {
      showToast('删除失败', 'error');
    }
  }

  // Import from URL
  async function importFromUrl() {
    const url = prompt('请输入音源脚本URL:');
    if (!url) return;
    
    try {
      const data = await api('/api/sources/import-url?url=' + encodeURIComponent(url));
      
      if (data.code === 0) {
        showToast('导入成功: ' + (data.data?.name || ''), 'success');
        loadSources();
      } else {
        showToast('导入失败: ' + (data.msg || ''), 'error');
      }
    } catch (err) {
      showToast('导入失败', 'error');
    }
  }

  // Import from file
  async function importFiles(files) {
    for (const file of files) {
      try {
        const text = await file.text();
        const params = new URLSearchParams();
        params.append('script', text);
        params.append('filename', file.name);
        const data = await api('/api/sources/import?' + params.toString());
        
        if (data.code === 0) {
          showToast('导入成功: ' + (data.data?.name || file.name), 'success');
        } else {
          showToast('导入失败: ' + (data.msg || ''), 'error');
        }
      } catch (err) {
        showToast('导入失败: ' + file.name, 'error');
      }
    }
    loadSources();
  }

  // Load platforms for search filter
  async function loadPlatforms() {
    try {
      const data = await api('/api/platforms');
      const select = $('#search-source');
      (data.data || []).forEach(p => {
        const opt = document.createElement('option');
        opt.value = p.id;
        opt.textContent = p.name;
        select.appendChild(opt);
      });
    } catch (err) {
      // ignore
    }
  }

  // Helpers
  function escapeHtml(str) {
    if (!str) return '';
    return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  function formatDuration(seconds) {
    if (!seconds) return '--:--';
    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60);
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  }

  // Event bindings
  $('#search-btn').addEventListener('click', () => doSearch(1));
  $('#search-keyword').addEventListener('keydown', (e) => { if (e.key === 'Enter') doSearch(1); });
  $('#import-all-btn').addEventListener('click', importAll);
  $('#clear-queue-btn').addEventListener('click', () => { importQueue = []; updateImportQueue(); });
  $('#import-url-btn').addEventListener('click', importFromUrl);
  $('#refresh-sources-btn').addEventListener('click', loadSources);
  $('#import-file-input').addEventListener('change', (e) => { importFiles(e.target.files); e.target.value = ''; });

  // Expose to global for inline handlers
  window.app = {
    addToImport,
    removeFromImport,
    toggleSource,
    deleteSource,
  };

  // Init
  loadPlatforms();
})();
