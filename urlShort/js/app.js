/**
 * URL Shortener Studio — URLVanish integration for GitHub Pages.
 * Replaces unavailable is.gd/TinyURL/local-server API calls only.
 * Preserves theme, cursor effects, copy, QR link, and local history.
 */
document.addEventListener('DOMContentLoaded', () => {
  const body = document.body;
  const urlInput = document.getElementById('url-input');
  const btnClear = document.getElementById('btn-clear');
  const btnShorten = document.getElementById('btn-shorten');
  const btnLoading = btnShorten.querySelector('.btn-loading');
  const btnContent = btnShorten.querySelector('.btn-content');
  const shortenForm = document.getElementById('shorten-form');
  const resultSection = document.getElementById('result-section');
  const shortUrlOutput = document.getElementById('short-url-output');
  const btnCopy = document.getElementById('btn-copy');
  const btnVisit = document.getElementById('btn-visit');
  const btnCreateQr = document.getElementById('btn-create-qr');
  const statusBanner = document.getElementById('status-banner');
  const statusIcon = document.getElementById('status-icon');
  const statusText = document.getElementById('status-text');
  const toastPopup = document.getElementById('toast-popup');
  const toastText = document.getElementById('toast-text');
  const themeToggle = document.getElementById('theme-toggle');
  const historySection = document.getElementById('history-section');
  const historyList = document.getElementById('history-list');
  const btnClearHistory = document.getElementById('btn-clear-history');
  const cursorGlow = document.getElementById('cursor-glow');
  const STORAGE_KEY = 'url_shortener_history_v1';
  let currentShortUrl = '';
  let toastTimer = null;

  // Keep original pointer glow.
  if (cursorGlow) {
    window.addEventListener('pointermove', (event) => {
      cursorGlow.style.left = `${event.clientX}px`;
      cursorGlow.style.top = `${event.clientY}px`;
      cursorGlow.style.opacity = '1';
    });
    window.addEventListener('pointerleave', () => {
      cursorGlow.style.opacity = '0';
    });
  }

  // Keep original light/dark theme, including stored preference.
  const savedTheme = localStorage.getItem('shortener_theme');
  if (savedTheme === 'dark' || (!savedTheme && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
    body.classList.remove('light-mode');
    body.classList.add('dark-mode');
  } else {
    body.classList.remove('dark-mode');
    body.classList.add('light-mode');
  }

  function showStatus(message, type = 'error') {
    statusText.textContent = message;
    statusIcon.textContent = type === 'error' ? '⚠️' : 'ℹ️';
    statusBanner.style.display = 'flex';
  }
  function hideStatus() {
    statusBanner.style.display = 'none';
  }
  function showToast(message) {
    if (toastTimer) clearTimeout(toastTimer);
    toastText.textContent = message;
    toastPopup.classList.add('show');
    toastTimer = setTimeout(() => toastPopup.classList.remove('show'), 2500);
  }

  if (themeToggle) {
    themeToggle.addEventListener('click', () => {
      if (body.classList.contains('dark-mode')) {
        body.classList.remove('dark-mode');
        body.classList.add('light-mode');
        localStorage.setItem('shortener_theme', 'light');
        showToast('라이트 모드로 전환되었습니다.');
      } else {
        body.classList.remove('light-mode');
        body.classList.add('dark-mode');
        localStorage.setItem('shortener_theme', 'dark');
        showToast('다크 모드로 전환되었습니다.');
      }
    });
  }

  function updateButtonState() {
    const hasInput = urlInput.value.trim().length > 0;
    btnShorten.disabled = !hasInput;
    btnShorten.setAttribute('aria-disabled', String(!hasInput));
    btnClear.style.display = hasInput ? 'flex' : 'none';
    if (!hasInput) hideStatus();
  }
  urlInput.addEventListener('input', updateButtonState);
  urlInput.addEventListener('change', updateButtonState);
  btnClear.addEventListener('click', () => {
    urlInput.value = '';
    updateButtonState();
    urlInput.focus();
  });

  function normalizeUrl(rawUrl) {
    let candidate = rawUrl.trim();
    if (!/^https?:\/\//i.test(candidate)) {
      if (/^[a-z][a-z0-9+.-]*:/i.test(candidate)) {
        throw new Error('http:// 또는 https:// 주소만 단축할 수 있습니다.');
      }
      candidate = 'https://' + candidate;
    }
    let parsed;
    try {
      parsed = new URL(candidate);
    } catch (_) {
      throw new Error('유효한 웹사이트 주소를 입력해 주세요. (예: https://www.sdu.ac.kr/)');
    }
    if (!['http:', 'https:'].includes(parsed.protocol) || !parsed.hostname.includes('.')) {
      throw new Error('유효한 공개 웹사이트 주소를 입력해 주세요.');
    }
    return parsed.href;
  }

  // Browser-accessible API verified by the user from their GitHub Pages origin.
  // This service's availability, rate limits and redirect behavior are outside this app's control.
  async function fetchShortUrl(targetUrl) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 12000);
    try {
      const endpoint = 'https://urlvanish.com/api/shorten?url=' + encodeURIComponent(targetUrl);
      const response = await fetch(endpoint, {
        method: 'GET',
        headers: { Accept: 'application/json' },
        signal: controller.signal
      });
      if (!response.ok) {
        throw new Error('URLVanish 서버 응답 오류 (HTTP ' + response.status + ')');
      }
      let data;
      try {
        data = await response.json();
      } catch (_) {
        throw new Error('URLVanish 응답을 읽을 수 없습니다.');
      }
      if (!data || typeof data.shorturl !== 'string') {
        throw new Error((data && (data.error || data.message)) || '단축 주소가 반환되지 않았습니다.');
      }
      let shortUrl;
      try {
        shortUrl = new URL(data.shorturl.trim());
      } catch (_) {
        throw new Error('단축 서비스가 올바르지 않은 링크를 반환했습니다.');
      }
      const host = shortUrl.hostname.toLowerCase();
      if (shortUrl.protocol !== 'https:' || !['urlvanish.com', 'www.urlvanish.com'].includes(host) || shortUrl.pathname.length < 2) {
        throw new Error('단축 서비스의 결과 주소를 확인할 수 없습니다.');
      }
      return shortUrl.href;
    } catch (error) {
      if (error && error.name === 'AbortError') {
        throw new Error('URLVanish 응답 시간이 초과됐습니다. 잠시 후 다시 시도해 주세요.');
      }
      if (error && error.name === 'TypeError') {
        throw new Error('URLVanish에 연결할 수 없습니다. 인터넷 연결 또는 CORS 정책을 확인해 주세요.');
      }
      throw error;
    } finally {
      clearTimeout(timer);
    }
  }

  function setLoading(isLoading) {
    if (isLoading) {
      btnShorten.disabled = true;
      btnContent.style.display = 'none';
      btnLoading.style.display = 'inline-flex';
    } else {
      btnContent.style.display = 'inline-flex';
      btnLoading.style.display = 'none';
      updateButtonState();
    }
  }

  async function handleShorten() {
    const rawUrl = urlInput.value.trim();
    if (!rawUrl) return;
    hideStatus();
    currentShortUrl = '';
    shortUrlOutput.value = '';
    resultSection.classList.remove('show');
    btnVisit.style.display = 'none';
    btnCreateQr.style.display = 'none';
    setLoading(true);
    try {
      const normalized = normalizeUrl(rawUrl);
      const shortUrl = await fetchShortUrl(normalized);
      currentShortUrl = shortUrl;
      shortUrlOutput.value = shortUrl;
      resultSection.classList.add('show');
      btnVisit.href = shortUrl;
      btnVisit.style.display = 'inline-flex';
      btnCreateQr.style.display = 'inline-flex';
      btnCreateQr.onclick = () => {
        window.location.href = '../url2qr/index.html?url=' + encodeURIComponent(shortUrl);
      };
      saveToHistory(rawUrl, shortUrl);
      shortUrlOutput.focus();
      shortUrlOutput.select();
    } catch (error) {
      showStatus(error && error.message ? error.message : 'URL 단축 중 오류가 발생했습니다.', 'error');
    } finally {
      setLoading(false);
    }
  }

  shortenForm.addEventListener('submit', (event) => {
    event.preventDefault();
    if (!btnShorten.disabled) handleShorten();
  });

  async function copyText(text) {
    if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(text);
      return;
    }
    shortUrlOutput.value = text;
    shortUrlOutput.select();
    if (!document.execCommand('copy')) throw new Error('Clipboard copy unavailable');
  }
  btnCopy.addEventListener('click', async () => {
    const text = shortUrlOutput.value || currentShortUrl;
    if (!text) return;
    try {
      await copyText(text);
      showToast('복사하였습니다');
    } catch (_) {
      showStatus('클립보드 복사에 실패했습니다. 주소를 직접 복사해 주세요.', 'error');
    }
  });

  function getHistory() {
    try {
      const list = JSON.parse(localStorage.getItem(STORAGE_KEY));
      return Array.isArray(list) ? list : [];
    } catch (_) {
      return [];
    }
  }
  function saveToHistory(original, short) {
    const history = getHistory().filter((item) => item.short !== short);
    history.unshift({
      original,
      short,
      timestamp: new Date().toLocaleDateString('ko-KR', {
        month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit'
      })
    });
    localStorage.setItem(STORAGE_KEY, JSON.stringify(history.slice(0, 5)));
    renderHistory();
  }
  function renderHistory() {
    const history = getHistory();
    if (!history.length) {
      historySection.style.display = 'none';
      return;
    }
    historySection.style.display = 'block';
    historyList.replaceChildren();
    history.forEach((item) => {
      const li = document.createElement('li');
      li.className = 'history-item';
      const urls = document.createElement('div');
      urls.className = 'history-urls';
      const link = document.createElement('a');
      link.href = item.short;
      link.target = '_blank';
      link.rel = 'noopener noreferrer';
      link.className = 'history-short';
      link.textContent = item.short;
      const originalText = document.createElement('span');
      originalText.className = 'history-original';
      originalText.title = item.original;
      originalText.textContent = item.original + ' • ' + item.timestamp;
      const copy = document.createElement('button');
      copy.type = 'button';
      copy.className = 'history-btn-copy';
      copy.textContent = '복사';
      copy.addEventListener('click', async () => {
        try {
          await copyText(item.short);
          showToast('복사하였습니다');
        } catch (_) {
          showStatus('클립보드 복사에 실패했습니다.', 'error');
        }
      });
      urls.append(link, originalText);
      li.append(urls, copy);
      historyList.appendChild(li);
    });
  }
  btnClearHistory.addEventListener('click', () => {
    localStorage.removeItem(STORAGE_KEY);
    renderHistory();
    showToast('기록이 삭제되었습니다.');
  });
  updateButtonState();
  renderHistory();
});
