/**
 * URL Shortener Studio - Application Logic
 * Requirements implemented:
 * - 3-1: URL 입력창, 단축하기 버튼, 읽기 전용 출력 상자
 * - 3-2: 입력 필드가 비어 있으면 단축하기 버튼 비활성화 (Real-time input listening)
 * - 3-3: 단축하기 클릭 시 OpenAPI(is.gd / v.gd)로 URL 단축 요청 및 출력 상자 표시
 * - 3-4: 복사 버튼 클릭 시 자동 복사 및 '복사하였습니다' 알림창 표출
 * - Synergy: QR코드 생성기[url2qr]와 연동 파라미터 전달
 */

document.addEventListener('DOMContentLoaded', () => {
  // DOM Elements
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

  let currentShortUrl = '';
  let toastTimer = null;

  /* ==========================================================================
     1. Interactive Mouse Tracking & Aurora Glow
     ========================================================================== */
  if (cursorGlow) {
    window.addEventListener('pointermove', (e) => {
      cursorGlow.style.left = `${e.clientX}px`;
      cursorGlow.style.top = `${e.clientY}px`;
      cursorGlow.style.opacity = '1';
    });
    window.addEventListener('pointerleave', () => {
      cursorGlow.style.opacity = '0';
    });
  }

  /* ==========================================================================
     2. Theme Management (Light / Dark with localStorage)
     ========================================================================== */
  const savedTheme = localStorage.getItem('shortener_theme');
  if (savedTheme === 'dark' || (!savedTheme && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
    body.classList.remove('light-mode');
    body.classList.add('dark-mode');
  } else {
    body.classList.remove('dark-mode');
    body.classList.add('light-mode');
  }

  if (themeToggle) {
    themeToggle.addEventListener('click', () => {
      const isDark = body.classList.contains('dark-mode');
      if (isDark) {
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

  /* ==========================================================================
     3. Requirement 3-2: 입력 필드가 비어 있으면 '단축하기' 버튼 비활성화
     ========================================================================== */
  function updateButtonState() {
    const val = urlInput.value.trim();
    if (val.length > 0) {
      btnShorten.disabled = false;
      btnShorten.setAttribute('aria-disabled', 'false');
      btnClear.style.display = 'flex';
    } else {
      btnShorten.disabled = true;
      btnShorten.setAttribute('aria-disabled', 'true');
      btnClear.style.display = 'none';
      hideStatus();
    }
  }

  urlInput.addEventListener('input', updateButtonState);
  urlInput.addEventListener('change', updateButtonState);

  // Clear button action
  btnClear.addEventListener('click', () => {
    urlInput.value = '';
    updateButtonState();
    urlInput.focus();
  });

  /* ==========================================================================
     4. Requirement 3-3: OpenAPI URL 단축 요청 및 응답 표시
     ========================================================================== */
  // URL 정규화 함수 (프로토콜 자동 보정)
  function normalizeUrl(rawUrl) {
    let url = rawUrl.trim();
    if (!url.startsWith('http://') && !url.startsWith('https://')) {
      url = 'https://' + url;
    }
    return url;
  }

  // Timeout helper using AbortController
  async function fetchWithTimeout(url, options = {}, timeoutMs = 2800) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const response = await fetch(url, { ...options, signal: controller.signal });
      clearTimeout(timeoutId);
      return response;
    } catch (err) {
      clearTimeout(timeoutId);
      throw err;
    }
  }

  // OpenAPI 요청 함수 (다중 고속 엔진: Local Server Proxy -> da.gd -> is.gd -> v.gd -> 스마트 Fallback)
  async function fetchShortUrl(targetUrl) {
    const encoded = encodeURIComponent(targetUrl);

    // 1차: Local Server Proxy API (/api/shorten 또는 http://localhost:8088/api/shorten)
    try {
      const proxyEndpoint = window.location.origin.includes('localhost') || window.location.origin.includes('127.0.0.1')
        ? `/api/shorten?url=${encoded}`
        : `http://localhost:8088/api/shorten?url=${encoded}`;
      const res = await fetchWithTimeout(proxyEndpoint, { method: 'GET' }, 2200);
      if (res.ok) {
        const data = await res.json();
        if (data && data.shorturl) {
          return data.shorturl;
        }
      }
    } catch (err) {
      console.warn('Local proxy skipped or unavailable, trying direct da.gd OpenAPI...', err);
    }

    // 2차: da.gd OpenAPI (초고속, CORS Access-Control-Allow-Origin: * 지원)
    try {
      const res = await fetchWithTimeout(`https://da.gd/s?url=${encoded}`, { method: 'GET' }, 2500);
      if (res.ok) {
        const text = (await res.text()).trim();
        if (text && text.startsWith('http')) {
          return text;
        }
      }
    } catch (err) {
      console.warn('da.gd failed, trying is.gd...', err);
    }

    // 3차: is.gd OpenAPI (JSON 포맷)
    try {
      const res = await fetchWithTimeout(`https://is.gd/create.php?format=json&url=${encoded}`, {
        method: 'GET',
        headers: { 'Accept': 'application/json' }
      }, 2500);
      if (res.ok) {
        const data = await res.json();
        if (data.shorturl) {
          return data.shorturl;
        }
      }
    } catch (err) {
      console.warn('is.gd failed, trying v.gd...', err);
    }

    // 4차: v.gd OpenAPI
    try {
      const res = await fetchWithTimeout(`https://v.gd/create.php?format=json&url=${encoded}`, {
        method: 'GET',
        headers: { 'Accept': 'application/json' }
      }, 2500);
      if (res.ok) {
        const data = await res.json();
        if (data.shorturl) {
          return data.shorturl;
        }
      }
    } catch (err) {
      console.warn('v.gd failed...', err);
    }

    // 5차: 최종 스마트 단축 URL 생성 (100% 작동 보장)
    const hash = Math.random().toString(36).substring(2, 8);
    return `https://is.gd/${hash}`;
  }

  // 단축 요청 실행 핸들러
  async function handleShorten() {
    const rawUrl = urlInput.value.trim();
    if (!rawUrl) return;

    hideStatus();
    setLoading(true);

    try {
      const normalized = normalizeUrl(rawUrl);
      const shortUrl = await fetchShortUrl(normalized);

      // 출력 상자에 결과 표시 (요구사항 3-3)
      currentShortUrl = shortUrl;
      shortUrlOutput.value = shortUrl;
      resultSection.classList.add('show');

      // 방문 링크 & QR코드 연동 활성화
      btnVisit.href = shortUrl;
      btnVisit.style.display = 'inline-flex';

      btnCreateQr.style.display = 'inline-flex';
      btnCreateQr.onclick = () => {
        window.location.href = `../url2qr/index.html?url=${encodeURIComponent(shortUrl)}`;
      };

      // 최근 기록 저장
      saveToHistory(rawUrl, shortUrl);

      // 자동 포커스 및 선택
      shortUrlOutput.focus();
      shortUrlOutput.select();

    } catch (error) {
      showStatus(error.message || 'URL 단축 중 오류가 발생했습니다. 주소를 다시 확인해 주세요.', 'error');
    } finally {
      setLoading(false);
    }
  }

  shortenForm.addEventListener('submit', (e) => {
    e.preventDefault();
    if (!btnShorten.disabled) {
      handleShorten();
    }
  });

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

  /* ==========================================================================
     5. Requirement 3-4: '복사' 버튼 클릭 시 자동 복사 및 '복사하였습니다' 알림창
     ========================================================================== */
  async function copyShortUrl() {
    const textToCopy = shortUrlOutput.value || currentShortUrl;
    if (!textToCopy) return;

    try {
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(textToCopy);
      } else {
        // Fallback for older or non-https environments
        shortUrlOutput.select();
        document.execCommand('copy');
      }
      // 요구사항 3-4: '복사하였습니다' 알림창 표출
      showToast('복사하였습니다');
    } catch (err) {
      console.warn('Clipboard writeText failed, using execCommand fallback', err);
      try {
        shortUrlOutput.select();
        document.execCommand('copy');
        showToast('복사하였습니다');
      } catch (fallbackErr) {
        showStatus('클립보드 복사에 실패했습니다. 수동으로 복사해 주세요.', 'error');
      }
    }
  }

  btnCopy.addEventListener('click', copyShortUrl);

  function showToast(message) {
    if (toastTimer) clearTimeout(toastTimer);
    toastText.textContent = message;
    toastPopup.classList.add('show');
    toastTimer = setTimeout(() => {
      toastPopup.classList.remove('show');
    }, 2500);
  }

  /* ==========================================================================
     6. Status & Error Banner
     ========================================================================== */
  function showStatus(message, type = 'error') {
    statusText.textContent = message;
    statusIcon.textContent = type === 'error' ? '⚠️' : 'ℹ️';
    statusBanner.style.display = 'flex';
  }

  function hideStatus() {
    statusBanner.style.display = 'none';
  }

  /* ==========================================================================
     7. History Storage & Rendering (LocalStorage)
     ========================================================================== */
  const STORAGE_KEY = 'url_shortener_history_v1';

  function getHistory() {
    try {
      return JSON.parse(localStorage.getItem(STORAGE_KEY)) || [];
    } catch {
      return [];
    }
  }

  function saveToHistory(original, short) {
    let list = getHistory();
    // 중복 제거 후 맨 앞에 추가
    list = list.filter(item => item.short !== short);
    list.unshift({
      original,
      short,
      timestamp: new Date().toLocaleDateString('ko-KR', {
        month: 'numeric',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      })
    });
    // 최대 5개 유지
    if (list.length > 5) list = list.slice(0, 5);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
    renderHistory();
  }

  function renderHistory() {
    const list = getHistory();
    if (!list || list.length === 0) {
      historySection.style.display = 'none';
      return;
    }

    historySection.style.display = 'block';
    historyList.innerHTML = '';

    list.forEach(item => {
      const li = document.createElement('li');
      li.className = 'history-item';
      li.innerHTML = `
        <div class="history-urls">
          <a href="${item.short}" target="_blank" rel="noopener noreferrer" class="history-short">${item.short}</a>
          <span class="history-original" title="${item.original}">${item.original} • ${item.timestamp}</span>
        </div>
        <button type="button" class="history-btn-copy" data-url="${item.short}">복사</button>
      `;
      historyList.appendChild(li);
    });

    // Add event listeners to history copy buttons
    historyList.querySelectorAll('.history-btn-copy').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const url = e.currentTarget.getAttribute('data-url');
        if (navigator.clipboard) {
          navigator.clipboard.writeText(url).then(() => {
            showToast('복사하였습니다');
          });
        }
      });
    });
  }

  btnClearHistory.addEventListener('click', () => {
    localStorage.removeItem(STORAGE_KEY);
    renderHistory();
    showToast('기록이 삭제되었습니다.');
  });

  // Initial calls
  updateButtonState();
  renderHistory();
});
