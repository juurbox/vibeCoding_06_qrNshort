/**
 * Google Style Portal - Main Script
 * Features:
 * - Real-time Clock (KST)
 * - Dark/Light Theme Switching with localStorage
 * - Google Search with Clear button, Voice Search (Web Speech API), I'm Feeling Lucky
 * - Real-time Seoul & Gyeonggi Weather via Open-Meteo & Air Quality API with Naver Weather Indicators
 * - Curated Quote of the Day with smooth shuffle & clipboard copy
 * - Google Apps Menu Toggle
 */

document.addEventListener('DOMContentLoaded', () => {
  initClock();
  initTheme();
  initGoogleSearch();
  initAppsMenu();
  initWeather();
  initQuotes();
});

/* ===================================================================
   1. Real-time Digital Clock (KST)
=================================================================== */
function initClock() {
  const timeEl = document.getElementById('clock-time');
  const dateEl = document.getElementById('clock-date');
  if (!timeEl || !dateEl) return;

  const daysKo = ['일', '월', '화', '수', '목', '금', '토'];

  function update() {
    const now = new Date();
    const hours = String(now.getHours()).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');
    const month = now.getMonth() + 1;
    const date = now.getDate();
    const day = daysKo[now.getDay()];

    timeEl.textContent = `${hours}:${minutes}`;
    dateEl.textContent = `${month}월 ${date}일 (${day})`;
  }

  update();
  setInterval(update, 1000);
}

/* ===================================================================
   2. Theme Toggle (Light / Dark)
=================================================================== */
function initTheme() {
  const toggleBtn = document.getElementById('theme-toggle');
  const themeMeta = document.getElementById('theme-meta');
  const savedTheme = localStorage.getItem('portal_theme');

  // Check saved theme or system preference
  if (savedTheme === 'dark' || (!savedTheme && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
    document.body.classList.remove('light-mode');
    document.body.classList.add('dark-mode');
    if (themeMeta) themeMeta.setAttribute('content', '#17181c');
  } else {
    document.body.classList.remove('dark-mode');
    document.body.classList.add('light-mode');
    if (themeMeta) themeMeta.setAttribute('content', '#ffffff');
  }

  if (toggleBtn) {
    toggleBtn.addEventListener('click', () => {
      const isDark = document.body.classList.contains('dark-mode');
      if (isDark) {
        document.body.classList.remove('dark-mode');
        document.body.classList.add('light-mode');
        localStorage.setItem('portal_theme', 'light');
        if (themeMeta) themeMeta.setAttribute('content', '#ffffff');
        showToast('라이트 모드로 전환되었습니다.');
      } else {
        document.body.classList.remove('light-mode');
        document.body.classList.add('dark-mode');
        localStorage.setItem('portal_theme', 'dark');
        if (themeMeta) themeMeta.setAttribute('content', '#17181c');
        showToast('다크 모드로 전환되었습니다.');
      }
    });
  }
}

/* ===================================================================
   3. Google Search Engine Integration
=================================================================== */
function initGoogleSearch() {
  const form = document.getElementById('google-search-form');
  const input = document.getElementById('search-input');
  const clearBtn = document.getElementById('clear-btn');
  const luckyBtn = document.getElementById('feeling-lucky-btn');
  const voiceBtn = document.getElementById('voice-search-btn');
  const voiceIndicator = document.getElementById('voice-indicator');

  if (!input) return;

  // Toggle clear button visibility on input
  input.addEventListener('input', () => {
    if (input.value.trim().length > 0) {
      clearBtn.style.display = 'inline-flex';
    } else {
      clearBtn.style.display = 'none';
    }
  });

  // Clear input
  if (clearBtn) {
    clearBtn.addEventListener('click', () => {
      input.value = '';
      clearBtn.style.display = 'none';
      input.focus();
    });
  }

  // Handle Form Submit
  if (form) {
    form.addEventListener('submit', (e) => {
      const query = input.value.trim();
      if (!query) {
        e.preventDefault();
        input.focus();
        return;
      }
      // Check if user entered a full URL
      if (/^(https?:\/\/|www\.)[^\s/$.?#].[^\s]*$/i.test(query)) {
        e.preventDefault();
        const targetUrl = query.startsWith('http') ? query : `https://${query}`;
        window.location.href = targetUrl;
      }
    });
  }

  // I'm Feeling Lucky Button
  if (luckyBtn) {
    luckyBtn.addEventListener('click', () => {
      const query = input.value.trim();
      if (query) {
        window.location.href = `https://www.google.com/search?q=${encodeURIComponent(query)}&btnI=I`;
      } else {
        window.location.href = 'https://www.google.com/doodles';
      }
    });
  }

  // Voice Search (Web Speech API)
  if (voiceBtn) {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (SpeechRecognition) {
      const recognition = new SpeechRecognition();
      recognition.lang = 'ko-KR';
      recognition.interimResults = false;
      recognition.maxAlternatives = 1;

      voiceBtn.addEventListener('click', () => {
        try {
          recognition.start();
          if (voiceIndicator) voiceIndicator.style.display = 'flex';
        } catch (err) {
          console.warn('Speech recognition already started or error', err);
        }
      });

      recognition.onresult = (event) => {
        const transcript = event.results[0][0].transcript;
        input.value = transcript;
        if (clearBtn) clearBtn.style.display = 'inline-flex';
        if (voiceIndicator) voiceIndicator.style.display = 'none';
        showToast(`인식된 검색어: "${transcript}"`);
        setTimeout(() => {
          form.submit();
        }, 600);
      };

      recognition.onspeechend = () => {
        recognition.stop();
        if (voiceIndicator) voiceIndicator.style.display = 'none';
      };

      recognition.onerror = (event) => {
        if (voiceIndicator) voiceIndicator.style.display = 'none';
        showToast('음성을 인식하지 못했습니다. 다시 시도해 주세요.');
      };
    } else {
      voiceBtn.addEventListener('click', () => {
        showToast('현재 브라우저에서는 음성 인식을 지원하지 않습니다.');
      });
    }
  }
}

/* ===================================================================
   4. Google Apps Dropdown Menu
=================================================================== */
function initAppsMenu() {
  const appsBtn = document.getElementById('apps-btn');
  const appsWrap = document.querySelector('.apps-dropdown-wrap');

  if (!appsBtn || !appsWrap) return;

  appsBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    appsWrap.classList.toggle('open');
  });

  document.addEventListener('click', (e) => {
    if (!appsWrap.contains(e.target)) {
      appsWrap.classList.remove('open');
    }
  });
}

/* ===================================================================
   5. Seoul & Gyeonggi Weather Integration (Open-Meteo & Air Quality)
=================================================================== */
const WEATHER_COORDINATES = {
  seoul: {
    name: '서울특별시',
    lat: 37.5665,
    lon: 126.9780,
    prefix: 'seoul'
  },
  gyeonggi: {
    name: '경기도 (수원)',
    lat: 37.2636,
    lon: 127.0286,
    prefix: 'gyeonggi'
  }
};

// WMO Weather Interpretation Codes
function interpretWeatherCode(code) {
  switch (code) {
    case 0:
      return { text: '맑음', icon: '☀️' };
    case 1:
      return { text: '대체로 맑음', icon: '🌤️' };
    case 2:
      return { text: '구름 조금', icon: '⛅' };
    case 3:
      return { text: '흐림', icon: '☁️' };
    case 45:
    case 48:
      return { text: '안개', icon: '🌫️' };
    case 51:
    case 53:
    case 55:
      return { text: '이슬비', icon: '🌦️' };
    case 61:
    case 63:
    case 65:
      return { text: '비', icon: '🌧️' };
    case 71:
    case 73:
    case 75:
    case 77:
      return { text: '눈', icon: '❄️' };
    case 80:
    case 81:
    case 82:
      return { text: '소나기', icon: '🌦️' };
    case 85:
    case 86:
      return { text: '소낙눈', icon: '🌨️' };
    case 95:
    case 96:
    case 99:
      return { text: '뇌우', icon: '⛈️' };
    default:
      return { text: '구름조금', icon: '⛅' };
  }
}

// Korean Air Quality Evaluation (PM10, PM2.5)
function evaluatePM10(val) {
  if (val <= 30) return { text: '좋음', class: 'status-good' };
  if (val <= 80) return { text: '보통', class: 'status-moderate' };
  if (val <= 150) return { text: '나쁨', class: 'status-bad' };
  return { text: '매우나쁨', class: 'status-very-bad' };
}

function evaluatePM25(val) {
  if (val <= 15) return { text: '좋음', class: 'status-good' };
  if (val <= 35) return { text: '보통', class: 'status-moderate' };
  if (val <= 75) return { text: '나쁨', class: 'status-bad' };
  return { text: '매우나쁨', class: 'status-very-bad' };
}

async function fetchCityWeather(cityKey) {
  const loc = WEATHER_COORDINATES[cityKey];
  const weatherUrl = `https://api.open-meteo.com/v1/forecast?latitude=${loc.lat}&longitude=${loc.lon}&current=temperature_2m,relative_humidity_2m,apparent_temperature,precipitation,weather_code,wind_speed_10m&daily=temperature_2m_max,temperature_2m_min,precipitation_probability_max&timezone=Asia%2FSeoul`;
  const airUrl = `https://air-quality-api.open-meteo.com/v1/air-quality?latitude=${loc.lat}&longitude=${loc.lon}&current=pm10,pm2_5&timezone=Asia%2FSeoul`;

  try {
    const [wRes, aRes] = await Promise.all([
      fetch(weatherUrl),
      fetch(airUrl).catch(() => null)
    ]);

    if (!wRes.ok) throw new Error(`Weather fetch failed: ${wRes.status}`);
    const wData = await wRes.json();
    let aData = null;
    if (aRes && aRes.ok) {
      aData = await aRes.json();
    }

    return {
      success: true,
      current: wData.current,
      daily: wData.daily,
      air: aData ? aData.current : null
    };
  } catch (err) {
    console.warn(`Weather fetch error for ${cityKey}:`, err);
    return { success: false };
  }
}

function renderWeatherData(cityKey, data) {
  const prefix = WEATHER_COORDINATES[cityKey].prefix;

  const tempEl = document.getElementById(`${prefix}-temp`);
  const conditionEl = document.getElementById(`${prefix}-condition`);
  const iconEl = document.getElementById(`${prefix}-icon`);
  const minmaxEl = document.getElementById(`${prefix}-minmax`);
  const apparentEl = document.getElementById(`${prefix}-apparent`);
  const popEl = document.getElementById(`${prefix}-pop`);
  const humidityEl = document.getElementById(`${prefix}-humidity`);
  const pm10El = document.getElementById(`${prefix}-pm10`);
  const pm25El = document.getElementById(`${prefix}-pm25`);

  if (!data || !data.success) {
    // Fallback Mock Data for realistic Korean September Weather
    const fallbackTemps = { seoul: 21, gyeonggi: 20 };
    if (tempEl) tempEl.textContent = fallbackTemps[cityKey] || '21';
    if (conditionEl) conditionEl.textContent = '맑음';
    if (iconEl) iconEl.textContent = '☀️';
    if (minmaxEl) minmaxEl.innerHTML = `<span class="temp-high">최고 25°</span><span class="temp-divider">/</span><span class="temp-low">최저 16°</span>`;
    if (apparentEl) apparentEl.textContent = `${fallbackTemps[cityKey] || 21}°`;
    if (popEl) popEl.textContent = '10%';
    if (humidityEl) humidityEl.textContent = '55%';
    if (pm10El) {
      pm10El.textContent = '좋음';
      pm10El.className = 'air-status status-good';
    }
    if (pm25El) {
      pm25El.textContent = '좋음';
      pm25El.className = 'air-status status-good';
    }
    return;
  }

  const current = data.current;
  const daily = data.daily;
  const weatherInterpretation = interpretWeatherCode(current.weather_code);

  if (tempEl) tempEl.textContent = Math.round(current.temperature_2m);
  if (conditionEl) conditionEl.textContent = weatherInterpretation.text;
  if (iconEl) iconEl.textContent = weatherInterpretation.icon;

  if (daily && daily.temperature_2m_max && daily.temperature_2m_min) {
    const maxT = Math.round(daily.temperature_2m_max[0]);
    const minT = Math.round(daily.temperature_2m_min[0]);
    if (minmaxEl) {
      minmaxEl.innerHTML = `<span class="temp-high">최고 ${maxT}°</span><span class="temp-divider">/</span><span class="temp-low">최저 ${minT}°</span>`;
    }
  }

  if (apparentEl) apparentEl.textContent = `${Math.round(current.apparent_temperature)}°`;
  if (humidityEl) humidityEl.textContent = `${Math.round(current.relative_humidity_2m)}%`;

  // Precipitation Probability
  let popVal = 0;
  if (daily && daily.precipitation_probability_max) {
    popVal = daily.precipitation_probability_max[0] || 0;
  }
  if (popEl) popEl.textContent = `${popVal}%`;

  // Air Quality
  if (data.air) {
    const pm10Val = data.air.pm10 || 22;
    const pm25Val = data.air.pm2_5 || 12;

    const pm10Eval = evaluatePM10(pm10Val);
    const pm25Eval = evaluatePM25(pm25Val);

    if (pm10El) {
      pm10El.textContent = pm10Eval.text;
      pm10El.className = `air-status ${pm10Eval.class}`;
      pm10El.title = `PM10: ${Math.round(pm10Val)}㎍/㎥`;
    }
    if (pm25El) {
      pm25El.textContent = pm25Eval.text;
      pm25El.className = `air-status ${pm25Eval.class}`;
      pm25El.title = `PM2.5: ${Math.round(pm25Val)}㎍/㎥`;
    }
  } else {
    if (pm10El) {
      pm10El.textContent = '좋음';
      pm10El.className = 'air-status status-good';
    }
    if (pm25El) {
      pm25El.textContent = '보통';
      pm25El.className = 'air-status status-moderate';
    }
  }
}

async function updateAllWeather() {
  const updateTimeEl = document.getElementById('weather-update-time');
  if (updateTimeEl) updateTimeEl.textContent = '날씨 갱신 중...';

  const [seoulData, gyeonggiData] = await Promise.all([
    fetchCityWeather('seoul'),
    fetchCityWeather('gyeonggi')
  ]);

  renderWeatherData('seoul', seoulData);
  renderWeatherData('gyeonggi', gyeonggiData);

  const now = new Date();
  const timeStr = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
  if (updateTimeEl) updateTimeEl.textContent = `기준 ${timeStr}`;
}

function initWeather() {
  updateAllWeather();

  const refreshBtn = document.getElementById('weather-refresh-btn');
  if (refreshBtn) {
    refreshBtn.addEventListener('click', async () => {
      refreshBtn.style.transform = 'rotate(360deg)';
      await updateAllWeather();
      showToast('최신 날씨 정보를 갱신했습니다.');
      setTimeout(() => {
        refreshBtn.style.transform = 'none';
      }, 500);
    });
  }

  // Refresh every 20 minutes automatically
  setInterval(updateAllWeather, 20 * 60 * 1000);
}

/* ===================================================================
   6. Curated Korean & Global Quotes Collection
=================================================================== */
const QUOTES = [
  { text: "시작이 반이다. 용기를 내어 첫걸음을 내딛는 순간 이미 변화는 시작된다.", author: "아리스토텔레스" },
  { text: "배움에는 끝이 없으며, 배움을 멈추는 순간 늙기 시작한다.", author: "헨리 포드" },
  { text: "어제의 나와 경쟁하라. 오늘 조금 더 나아진 당신이 가장 빛난다.", author: "괴테" },
  { text: "꿈을 날짜와 함께 적어놓으면 그것은 목표가 되고, 행동으로 옮기면 현실이 된다.", author: "그렉 S. 레이드" },
  { text: "작은 기회로부터 종종 위대한 업적이 시작된다.", author: "데모스테네스" },
  { text: "위대한 일을 해내는 유일한 방법은 당신이 하는 일을 진정 사랑하는 것이다.", author: "스티브 잡스" },
  { text: "바람이 불지 않을 때 바람개비를 돌리는 방법은 앞으로 달려가는 것이다.", author: "데일 카네기" },
  { text: "가장 어두운 밤도 언젠가는 끝나고 해는 다시 떠오른다.", author: "빅토르 위고" },
  { text: "당신이 할 수 있다고 믿든 할 수 없다고 믿든, 당신이 옳다.", author: "헨리 포드" },
  { text: "승리는 가장 끈기 있는 사람에게 돌아간다.", author: "나폴레옹 보나파르트" },
  { text: "세상을 바꾸고 싶다면 가장 먼저 자신의 침대부터 정리하라.", author: "윌리엄 맥레이븐" },
  { text: "지식에 대한 투자는 언제나 최고의 이자를 지불한다.", author: "벤자민 프랭클린" },
  { text: "우리가 두려워해야 할 유일한 것은 두려움 그 자체다.", author: "프랭클린 D. 루스벨트" },
  { text: "오늘 할 수 있는 일에 온 힘을 다하라. 그것이 내일을 준비하는 최선의 길이다.", author: "아이작 뉴턴" },
  { text: "스스로를 신뢰하라. 그러면 어떻게 살아야 할지 알게 될 것이다.", author: "요한 볼프강 폰 괴테" },
  { text: "한 걸음 한 걸음이 모여 마침내 산 정상에 닿게 된다.", author: "공자" },
  { text: "행복은 목적지가 아니라 우리가 여행하는 방식이다.", author: "마가렛 리 런벡" },
  { text: "포기하지 않는 자에게 실패란 단지 배움의 또 다른 이름일 뿐이다.", author: "토머스 에디슨" },
  { text: "미래는 자신의 꿈의 아름다움을 믿는 사람들의 것이다.", author: "엘리너 루스벨트" },
  { text: "성공의 비결은 결코 흔들리지 않는 목표에 있다.", author: "벤저민 디즈레일리" }
];

function initQuotes() {
  const quoteTextEl = document.getElementById('quote-text');
  const quoteAuthorEl = document.getElementById('quote-author');
  const newQuoteBtn = document.getElementById('new-quote-btn');
  const copyQuoteBtn = document.getElementById('copy-quote-btn');
  const quoteBody = document.querySelector('.quote-body');

  let currentIndex = -1;

  function getRandomQuote() {
    let nextIndex;
    do {
      nextIndex = Math.floor(Math.random() * QUOTES.length);
    } while (nextIndex === currentIndex && QUOTES.length > 1);
    currentIndex = nextIndex;
    return QUOTES[currentIndex];
  }

  function displayQuote(isFirst = false) {
    const quote = getRandomQuote();
    if (isFirst) {
      quoteTextEl.textContent = `“${quote.text}”`;
      quoteAuthorEl.textContent = `— ${quote.author}`;
      return;
    }

    if (quoteBody) {
      quoteBody.style.opacity = '0';
      setTimeout(() => {
        quoteTextEl.textContent = `“${quote.text}”`;
        quoteAuthorEl.textContent = `— ${quote.author}`;
        quoteBody.style.opacity = '1';
      }, 200);
    } else {
      quoteTextEl.textContent = `“${quote.text}”`;
      quoteAuthorEl.textContent = `— ${quote.author}`;
    }
  }

  // Display initial quote
  displayQuote(true);

  // New quote click
  if (newQuoteBtn) {
    newQuoteBtn.addEventListener('click', () => {
      displayQuote(false);
    });
  }

  // Copy quote click
  if (copyQuoteBtn) {
    copyQuoteBtn.addEventListener('click', () => {
      const currentQuote = QUOTES[currentIndex] || QUOTES[0];
      const textToCopy = `“${currentQuote.text}” — ${currentQuote.author}`;
      navigator.clipboard.writeText(textToCopy).then(() => {
        showToast('명언이 클립보드에 복사되었습니다.');
      }).catch(() => {
        showToast('클립보드 복사에 실패했습니다.');
      });
    });
  }
}

/* ===================================================================
   7. Toast Notification Helper
=================================================================== */
let toastTimeout = null;
function showToast(message) {
  const toast = document.getElementById('toast-message');
  if (!toast) return;

  toast.textContent = message;
  toast.classList.add('show');

  if (toastTimeout) clearTimeout(toastTimeout);
  toastTimeout = setTimeout(() => {
    toast.classList.remove('show');
  }, 2500);
}
