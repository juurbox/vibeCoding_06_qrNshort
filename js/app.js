/**
 * Link & QR Studio - Main Hub Script
 * Interactive enhancements & Theme Switching
 */

document.addEventListener('DOMContentLoaded', () => {
  const body = document.body;
  const themeToggle = document.getElementById('theme-toggle');
  const cursorGlow = document.getElementById('cursor-glow');
  const hubToast = document.getElementById('hub-toast');

  let toastTimer = null;

  /* 1. Theme Management */
  const savedTheme = localStorage.getItem('hub_theme');
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
        localStorage.setItem('hub_theme', 'light');
        showToast('라이트 모드로 전환되었습니다.');
      } else {
        body.classList.remove('light-mode');
        body.classList.add('dark-mode');
        localStorage.setItem('hub_theme', 'dark');
        showToast('다크 모드로 전환되었습니다.');
      }
    });
  }

  /* 2. Interactive Cursor Glow */
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

  /* 3. Toast Helper */
  function showToast(message) {
    if (toastTimer) clearTimeout(toastTimer);
    hubToast.textContent = message;
    hubToast.classList.add('show');
    toastTimer = setTimeout(() => {
      hubToast.classList.remove('show');
    }, 2400);
  }
});
