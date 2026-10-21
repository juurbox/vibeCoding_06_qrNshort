/**
 * URL2QR - QR Code Generator & JPG Downloader
 * Features:
 * - Dynamic Interactive Cursor-Driven Gradient Physics (Lerp smoothed)
 * - Transitions from Center to Bottom
 * - High-Definition (1000x1000) Pure White Background JPG Export
 * - URL Formatting and Toast Notifications
 */

document.addEventListener('DOMContentLoaded', () => {
  // DOM Elements
  const body = document.body;
  const root = document.documentElement;
  const urlForm = document.getElementById('url-form');
  const urlInput = document.getElementById('url-input');
  const btnClear = document.getElementById('btn-clear');
  const btnSubmit = document.getElementById('btn-submit');
  const qrFrame = document.getElementById('qr-interactive-frame');
  const qrCanvasContainer = document.getElementById('qrcode-canvas-container');
  const qrTargetUrlText = document.getElementById('qr-target-url-text');
  const btnCopyUrl = document.getElementById('btn-copy-url');
  const btnDownloadAction = document.getElementById('btn-download-action');
  const btnResetView = document.getElementById('btn-reset-view');
  const logoWrapper = document.getElementById('logo-wrapper');
  const themeToggle = document.getElementById('theme-toggle');
  const toast = document.getElementById('toast');
  const toastMessage = document.getElementById('toast-message');

  const cursorGlow = document.getElementById('cursor-glow');
  const orb1 = document.getElementById('aurora-orb-1');
  const orb2 = document.getElementById('aurora-orb-2');
  const orb3 = document.getElementById('aurora-orb-3');

  let currentQrInstance = null;
  let currentActiveUrl = '';

  /* --------------------------------------------------------------------------
     1. Interactive Mouse-Driven Dynamic Gradient Engine (60fps Smooth Lerp)
     -------------------------------------------------------------------------- */
  let targetX = window.innerWidth / 2;
  let targetY = window.innerHeight / 2;
  let currentX = targetX;
  let currentY = targetY;

  let targetHue1 = 38;
  let targetHue2 = 48;
  let currentHue1 = 38;
  let currentHue2 = 48;

  let targetAngle = 135;
  let currentAngle = 135;

  let isHoveringWindow = false;

  // Track cursor position
  window.addEventListener('pointermove', (e) => {
    isHoveringWindow = true;
    targetX = e.clientX;
    targetY = e.clientY;

    const ratioX = targetX / window.innerWidth;
    const ratioY = targetY / window.innerHeight;

    // Shift Hue across warm peach (32deg) -> golden amber (38deg) -> sunflower yellow (52deg)
    // Perfectly tuned to match the warm yellow logo
    targetHue1 = 32 + ratioX * 16 + (1 - ratioY) * 6; // Range: 32 ~ 54
    targetHue2 = 42 + ratioY * 12 + ratioX * 6;       // Range: 42 ~ 60

    // Smooth gradient angle rotation based on cursor quadrant
    targetAngle = 110 + ratioX * 50 + ratioY * 25;
  });

  // Window resize handler
  window.addEventListener('resize', () => {
    if (!isHoveringWindow) {
      targetX = window.innerWidth / 2;
      targetY = window.innerHeight / 2;
    }
  });

  // 60FPS Physics Animation Loop
  function animateGradientPhysics() {
    // Linear Interpolation (Lerp) for creamy liquid-smooth motion
    const ease = 0.075;
    currentX += (targetX - currentX) * ease;
    currentY += (targetY - currentY) * ease;

    currentHue1 += (targetHue1 - currentHue1) * ease;
    currentHue2 += (targetHue2 - currentHue2) * ease;
    currentAngle += (targetAngle - currentAngle) * ease;

    // Update CSS Custom Properties
    root.style.setProperty('--mouse-x', `${currentX.toFixed(1)}px`);
    root.style.setProperty('--mouse-y', `${currentY.toFixed(1)}px`);
    root.style.setProperty('--dynamic-hue-1', currentHue1.toFixed(1));
    root.style.setProperty('--dynamic-hue-2', currentHue2.toFixed(1));
    root.style.setProperty('--dynamic-angle', `${currentAngle.toFixed(1)}deg`);

    // Subtle parallax shift for background aurora orbs
    const offsetX = (currentX - window.innerWidth / 2) * 0.035;
    const offsetY = (currentY - window.innerHeight / 2) * 0.035;

    if (orb1) orb1.style.transform = `translate(${offsetX * 0.7}px, ${offsetY * 0.7}px)`;
    if (orb2) orb2.style.transform = `translate(${-offsetX * 0.9}px, ${-offsetY * 0.9}px)`;
    if (orb3) orb3.style.transform = `translate(${offsetX * 0.5}px, ${-offsetY * 0.5}px)`;

    requestAnimationFrame(animateGradientPhysics);
  }

  animateGradientPhysics();

  /* --------------------------------------------------------------------------
     2. Input Form Handling & Interactive Transitions
     -------------------------------------------------------------------------- */
  urlInput.addEventListener('input', () => {
    if (urlInput.value.trim().length > 0) {
      btnClear.classList.add('active');
    } else {
      btnClear.classList.remove('active');
    }
  });

  btnClear.addEventListener('click', () => {
    urlInput.value = '';
    btnClear.classList.remove('active');
    urlInput.focus();
  });

  urlForm.addEventListener('submit', (e) => {
    e.preventDefault();
    generateQrFromInput();
  });

  function normalizeUrl(input) {
    let raw = input.trim();
    if (!raw) return '';

    // If string has a dot and doesn't start with protocol, prepend https://
    if (!/^[a-zA-Z][a-zA-Z0-9+.-]*:\/\//.test(raw)) {
      if (raw.includes('.') && !raw.startsWith('http')) {
        raw = 'https://' + raw;
      }
    }
    return raw;
  }

  function generateQrFromInput() {
    const rawVal = urlInput.value.trim();
    if (!rawVal) {
      showToast('URL 또는 텍스트를 입력해주세요.');
      shakeInput();
      urlInput.focus();
      return;
    }

    const finalUrl = normalizeUrl(rawVal);
    currentActiveUrl = finalUrl;

    // Smooth transition: URL input slides to bottom, QR card fades in at center
    body.classList.add('state-generated');

    // Update target URL display chip
    qrTargetUrlText.textContent = finalUrl;
    qrTargetUrlText.setAttribute('title', finalUrl);

    // Clear previous QR instance
    qrCanvasContainer.innerHTML = '';

    // Generate high quality QR code
    try {
      currentQrInstance = new QRCode(qrCanvasContainer, {
        text: finalUrl,
        width: 256,
        height: 256,
        colorDark: '#0f172a',
        colorLight: '#ffffff',
        correctLevel: QRCode.CorrectLevel.H
      });
      showToast('QR 코드가 성공적으로 생성되었습니다!');
    } catch (err) {
      console.error('QR creation error:', err);
      showToast('QR 코드 생성 중 오류가 발생했습니다.');
    }
  }

  function shakeInput() {
    const wrapper = document.querySelector('.input-glow-wrapper');
    wrapper.style.animation = 'none';
    wrapper.offsetHeight; // trigger reflow
    wrapper.style.animation = 'shake 0.4s ease';
    setTimeout(() => {
      wrapper.style.animation = '';
    }, 450);
  }

  /* --------------------------------------------------------------------------
     3. High-Definition JPG Export Mechanism (Click on QR Code)
     -------------------------------------------------------------------------- */
  function downloadQrAsJpg() {
    if (!currentActiveUrl) {
      showToast('생성된 QR 코드가 없습니다.');
      return;
    }

    const canvas = qrCanvasContainer.querySelector('canvas');
    const img = qrCanvasContainer.querySelector('img');

    if (!canvas && !img) {
      showToast('QR 코드 이미지를 찾을 수 없습니다.');
      return;
    }

    // 1000x1000 Ultra-crisp export canvas for high-quality printing & scanning
    const exportSize = 1000;
    const padding = 100;
    const qrSize = exportSize - padding * 2;

    const exportCanvas = document.createElement('canvas');
    exportCanvas.width = exportSize;
    exportCanvas.height = exportSize;
    const ctx = exportCanvas.getContext('2d');

    // Solid Crisp White Background (Prevents transparency glitch in JPEG format)
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(0, 0, exportSize, exportSize);

    const finalizeAndDownload = (sourceDrawable) => {
      ctx.imageSmoothingEnabled = false; // preserve sharp vector-like QR blocks
      ctx.drawImage(sourceDrawable, padding, padding, qrSize, qrSize);

      // High-quality JPEG output
      const jpgDataUrl = exportCanvas.toDataURL('image/jpeg', 0.96);

      // Construct clean, descriptive filename
      let domain = 'qrcode';
      try {
        const parsed = new URL(currentActiveUrl);
        domain = parsed.hostname.replace(/[^a-zA-Z0-9]/g, '_');
      } catch {
        domain = currentActiveUrl.slice(0, 20).replace(/[^a-zA-Z0-9]/g, '_') || 'qrcode';
      }
      const timestamp = new Date().toISOString().slice(0, 10).replace(/-/g, '');
      const filename = `${domain}_${timestamp}.jpg`;

      // Trigger download
      const downloadLink = document.createElement('a');
      downloadLink.href = jpgDataUrl;
      downloadLink.download = filename;
      document.body.appendChild(downloadLink);
      downloadLink.click();
      document.body.removeChild(downloadLink);

      showToast(`JPG 파일이 다운로드되었습니다 (${filename})`);
    };

    if (canvas) {
      finalizeAndDownload(canvas);
    } else if (img) {
      if (img.complete) {
        finalizeAndDownload(img);
      } else {
        img.onload = () => finalizeAndDownload(img);
      }
    }
  }

  // Requirement: Click QR code directly to download JPG
  qrFrame.addEventListener('click', downloadQrAsJpg);
  btnDownloadAction.addEventListener('click', (e) => {
    e.stopPropagation();
    downloadQrAsJpg();
  });

  /* --------------------------------------------------------------------------
     4. Copy URL to Clipboard
     -------------------------------------------------------------------------- */
  btnCopyUrl.addEventListener('click', async (e) => {
    e.stopPropagation();
    if (!currentActiveUrl) return;

    try {
      await navigator.clipboard.writeText(currentActiveUrl);
      showToast('URL이 클립보드에 복사되었습니다.');
    } catch {
      const tempInput = document.createElement('input');
      tempInput.value = currentActiveUrl;
      document.body.appendChild(tempInput);
      tempInput.select();
      document.execCommand('copy');
      document.body.removeChild(tempInput);
      showToast('URL이 클립보드에 복사되었습니다.');
    }
  });

  /* --------------------------------------------------------------------------
     5. Reset to Center Input (Initial View)
     -------------------------------------------------------------------------- */
  function resetToInitial() {
    body.classList.remove('state-generated');
    urlInput.focus();
    urlInput.select();
  }

  btnResetView.addEventListener('click', resetToInitial);
  logoWrapper.addEventListener('click', (e) => {
    e.preventDefault();
    resetToInitial();
  });

  /* --------------------------------------------------------------------------
     6. Toast Feedback Notification
     -------------------------------------------------------------------------- */
  let toastTimer = null;
  function showToast(message) {
    if (toastTimer) clearTimeout(toastTimer);
    toastMessage.textContent = message;
    toast.classList.add('show');
    toastTimer = setTimeout(() => {
      toast.classList.remove('show');
    }, 2800);
  }

  // Focus input automatically on initial load or auto-generate if query param exists
  setTimeout(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const initialUrl = urlParams.get('url');
    if (initialUrl) {
      urlInput.value = initialUrl;
      handleFormSubmit();
      showToast('단축된 URL의 QR코드가 생성되었습니다!');
    } else {
      urlInput.focus();
    }
  }, 250);
});
