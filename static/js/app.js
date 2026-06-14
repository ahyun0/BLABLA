/* =============================================
   BLABLA — Frontend Logic
   ============================================= */

// ── 브라우저 언어 자동 감지 ───────────────────────
function detectUiLang() {
  const supported = ['ko', 'ja', 'en', 'zh', 'es', 'fr', 'de', 'pt', 'ru'];
  const lang = (navigator.language || navigator.userLanguage || 'ko')
    .split('-')[0].toLowerCase();
  return supported.includes(lang) ? lang : 'ko';
}

// ── State ──────────────────────────────────────
const state = {
  style:          null,
  history:        [],
  recording:      false,
  recorder:       null,
  stopFn:         null,
  chunks:         [],
  uiLang:         detectUiLang(),
  userAvatar:     null,
  prevScreen:     'select',
  currentMission: null,  // 선택된 미션 객체
};

// ── Language & Category constants ──────────────
const LANGUAGES = {
  ko:    { name: '한국어',     flag: '🇰🇷', color: '#845EC2' },
  ja:    { name: '日本語',     flag: '🇯🇵', color: '#FF85A1' },
  en_us: { name: 'English US', flag: '🇺🇸', color: '#00C2A8' },
  zh:    { name: '中文',       flag: '🇨🇳', color: '#FF6B6B' },
};

const CATEGORIES = {
  friend:   { name: '친구',    icon: '🗣️' },
  business: { name: '비즈니스', icon: '💼' },
  travel:   { name: '여행',    icon: '✈️' },
};

// ── 15 Personas ────────────────────────────────
const STYLES = {
  // 한국어
  ko_friend: {
    langKey: 'ko', category: 'friend',
    name: '수현', label: '수현',
    desc: '인터넷 밈 말투',
    greeting: '안뇽~ 폼 미쳤다 진짜ㅋㅋ 잘 부탁해 찐으로',
    greetingInterpretation: '안녕~ 진짜 대단하다ㅋㅋ 잘 부탁해 정말로',
  },
  ko_business: {
    langKey: 'ko', category: 'business',
    name: '준서', label: '준서',
    desc: '자연스러운 직장 한국어',
    greeting: '안녕하세요! 잘 부탁드립니다. 편하게 말씀해 주세요 😊',
    greetingInterpretation: '안녕하세요! 잘 부탁드려요.',
  },
  ko_travel: {
    langKey: 'ko', category: 'travel',
    name: '지아', label: '지아',
    desc: '실용 여행 한국어',
    greeting: '어서 오세요~ 여행 표현 같이 연습해봐요! 뭐든 물어보세요 😊',
    greetingInterpretation: '어서 오세요! 여행 한국어 같이 연습해요.',
  },

  // 일본어
  ja_friend: {
    langKey: 'ja', category: 'friend',
    name: 'ゆい', label: 'ゆい',
    desc: '밝고 귀여운 갸루체',
    greeting: 'こんにちは〜！マジよろしくじゃん！✨',
    greetingInterpretation: '안녕하세요~! 진짜 잘 부탁해요! ✨',
  },
  ja_business: {
    langKey: 'ja', category: 'business',
    name: 'ケンジ', label: 'ケン',
    desc: '자연스러운 비즈니스 경어',
    greeting: 'はじめまして。どうぞよろしくお願いいたします。',
    greetingInterpretation: '처음 뵙겠습니다. 잘 부탁드립니다.',
  },
  ja_travel: {
    langKey: 'ja', category: 'travel',
    name: 'さくら', label: 'さく',
    desc: '실용 여행 일본어',
    greeting: 'こんにちは！旅行で使える日本語、一緒に練習しましょう！✈️',
    greetingInterpretation: '안녕하세요! 여행 일본어 같이 연습해봐요! ✈️',
  },

  // 영어 미국
  en_us_friend: {
    langKey: 'en-us', category: 'friend',
    name: 'Tyler', label: 'TY',
    desc: 'Gen Z 슬랭',
    greeting: "Heyyyy what's good?? No cap, lowkey hyped to chat fr 🔥",
    greetingInterpretation: '야 어때?? 진짜로, 솔직히 설레서 대화하고 싶어! 🔥',
  },
  en_us_business: {
    langKey: 'en-us', category: 'business',
    name: 'Alex', label: 'AL',
    desc: '미국 직장 영어',
    greeting: "Hey! Great to connect. Looking forward to chatting — let me know how I can help! 😊",
    greetingInterpretation: '안녕! 만나서 반가워. 어떻게 도와드릴까요! 😊',
  },
  en_us_travel: {
    langKey: 'en-us', category: 'travel',
    name: 'Zoe', label: 'ZO',
    desc: '실용 여행 영어',
    greeting: "Hey there! Ready to practice some travel English? Ask me anything! ✈️",
    greetingInterpretation: '안녕하세요! 여행 영어 연습할 준비됐나요? 뭐든 물어보세요! ✈️',
  },

  // 중국어
  zh_friend: {
    langKey: 'zh', category: 'friend',
    name: '小美', label: '小美',
    desc: '중국 인터넷 유행어',
    greeting: '哈喽哈喽～今天状态绝绝子！快来聊天吧 ✨',
    greetingInterpretation: '안녕안녕~ 오늘 상태 완전 최고야! 빨리 얘기하자 ✨',
  },
  zh_business: {
    langKey: 'zh', category: 'business',
    name: '明浩', label: '明浩',
    desc: '중국 직장 비즈니스',
    greeting: '您好！很高兴认识您。我们一起练习职场中文吧 😊',
    greetingInterpretation: '안녕하세요! 만나서 반갑습니다. 직장 중국어 같이 연습해봐요 😊',
  },
  zh_travel: {
    langKey: 'zh', category: 'travel',
    name: '晓燕', label: '晓燕',
    desc: '실용 여행 중국어',
    greeting: '你好！准备好练习旅游中文了吗？有什么问题都可以问我！✈️',
    greetingInterpretation: '안녕하세요! 여행 중국어 연습 준비됐나요? 뭐든 물어보세요! ✈️',
  },
};

// 📖 단어 설명 섹션 레이블 (UI 언어별)
const VOCAB_LABELS = {
  ko: '📖 표현 설명',
  ja: '📖 表現メモ',
  en: '📖 Vocab',
  zh: '📖 词汇',
  es: '📖 Vocabulario',
  fr: '📖 Vocabulaire',
  de: '📖 Wortschatz',
  pt: '📖 Vocabulário',
  ru: '📖 Словарь',
};

// 피드백 카드 UI 레이블 (언어별)
const FEEDBACK_LABELS = {
  ko: { title: '대화 평가 결과', strengths: '✅ 잘한 점',         improvements: '💡 이렇게 해보세요' },
  ja: { title: '会話評価結果',   strengths: '✅ 良かった点',       improvements: '💡 こうしてみましょう' },
  en: { title: 'Conversation Review', strengths: '✅ What You Did Well', improvements: '💡 Try This Instead' },
  zh: { title: '对话评价结果',   strengths: '✅ 做得好的地方',     improvements: '💡 这样试试' },
  es: { title: 'Evaluación',    strengths: '✅ Lo que hiciste bien', improvements: '💡 Inténtalo así' },
  fr: { title: 'Évaluation',    strengths: '✅ Ce que tu as bien fait', improvements: '💡 Essaie comme ça' },
  de: { title: 'Gesprächsbewertung', strengths: '✅ Was gut war',  improvements: '💡 So geht\'s besser' },
  pt: { title: 'Avaliação',     strengths: '✅ O que você fez bem', improvements: '💡 Tente assim' },
  ru: { title: 'Оценка беседы', strengths: '✅ Что получилось',   improvements: '💡 Попробуйте так' },
};

function getFeedbackLabels() {
  return FEEDBACK_LABELS[state.uiLang] || FEEDBACK_LABELS['ko'];
}

// 카테고리별 헤더 모드 텍스트
const CATEGORY_MODE = {
  friend:   '캐주얼 AI',
  business: '비즈니스 AI',
  travel:   '여행 AI',
};

// ── DOM refs ───────────────────────────────────
const screens = {
  select: document.getElementById('screen-select'),
  chat:   document.getElementById('screen-chat'),
  mypage: document.getElementById('screen-mypage'),
};

// ── Screen navigation ──────────────────────────
function showScreen(id) {
  Object.values(screens).forEach(s => s.classList.remove('active'));
  screens[id].classList.add('active');
  window.scrollTo(0, 0);
}

// ── 2단계 언어 선택 ────────────────────────────
let selectedLang = null;

document.querySelectorAll('.lang-card').forEach(card => {
  card.addEventListener('click', () => {
    selectedLang = card.dataset.lang;
    const langInfo = LANGUAGES[selectedLang];

    // Step 2 헤딩 업데이트
    document.getElementById('step2-heading').textContent =
      `${langInfo.flag} ${langInfo.name} — 어떤 상황에서 연습할까요?`;

    // 카테고리 카드에 페르소나 이름 표시
    ['friend', 'business', 'travel'].forEach(cat => {
      const styleKey = `${selectedLang}_${cat}`;
      const persona = STYLES[styleKey];
      document.getElementById(`persona-${cat}`).textContent = persona ? persona.name : '—';
    });

    document.getElementById('step-language').classList.add('hidden');
    document.getElementById('step-category').classList.remove('hidden');
  });
});

document.getElementById('back-to-lang').addEventListener('click', () => {
  document.getElementById('step-category').classList.add('hidden');
  document.getElementById('step-language').classList.remove('hidden');
  selectedLang = null;
});

// ── 미션 데이터 ────────────────────────────────
const MISSIONS = {
  business: [
    {
      icon: '📊',
      title: '회의에서 아이디어 제안',
      desc: '팀 회의에서 새 프로젝트 아이디어를 동료들에게 제안해보세요',
      prompt: 'The user wants to practice pitching a new idea in a team meeting. You are their colleague. Set up the scene (e.g., weekly team meeting) and ask what idea they want to share.',
    },
    {
      icon: '📋',
      title: '업무 진행상황 보고',
      desc: '진행 중인 프로젝트 현황을 팀장에게 간결하게 보고해보세요',
      prompt: 'The user wants to practice giving a project status update to their manager. You are their manager. Start a check-in and ask them to update you on their project progress.',
    },
    {
      icon: '🤝',
      title: '동료에게 도움 요청',
      desc: '바쁜 동료에게 업무 협조를 자연스럽게 요청해보세요',
      prompt: 'The user wants to practice asking a busy colleague for help with a task. You are the colleague. Set up the scene and have the user approach you for assistance.',
    },
  ],
  friend: [
    {
      icon: '📅',
      title: '주말 계획 잡기',
      desc: '친구에게 주말 약속을 자연스럽게 제안하고 계획을 잡아보세요',
      prompt: 'The user wants to practice making weekend plans with a friend. You are their close friend. Casually ask what they\'re up to this weekend.',
    },
    {
      icon: '😤',
      title: '힘든 하루 털어놓기',
      desc: '힘들었던 하루를 친구에게 편하게 이야기해보세요',
      prompt: 'The user wants to practice venting about a tough day to a friend. You are their supportive friend. Casually ask how their day went.',
    },
    {
      icon: '🎮',
      title: '취미 이야기 나누기',
      desc: '요즘 빠진 취미나 관심사에 대해 신나게 이야기해보세요',
      prompt: 'The user wants to practice talking about hobbies with a friend. You are their enthusiastic friend. Ask what they\'ve been into lately.',
    },
  ],
  travel: [
    {
      icon: '☕',
      title: '카페에서 주문하기',
      desc: '현지 카페에서 음료를 주문하고 바리스타와 소통해보세요',
      prompt: 'The user wants to practice ordering at a local café. You are the barista. Greet them as they walk in and guide them through the ordering process.',
    },
    {
      icon: '🗺️',
      title: '길 물어보기',
      desc: '낯선 곳에서 현지인에게 길을 물어보는 연습을 해보세요',
      prompt: 'The user wants to practice asking for directions. You are a friendly local. They approach you looking lost — wait for them to ask and then help.',
    },
    {
      icon: '🏨',
      title: '호텔 체크인',
      desc: '호텔 프런트에서 체크인 절차를 자연스럽게 진행해보세요',
      prompt: 'The user wants to practice hotel check-in. You are the friendly hotel receptionist. Greet them as they arrive and guide them through check-in.',
    },
  ],
};

// ── 카테고리 선택 → 미션 선택 화면 ────────────
let selectedCategory = null;

document.querySelectorAll('.category-card').forEach(card => {
  card.addEventListener('click', () => {
    selectedCategory = card.dataset.category;
    state.style = `${selectedLang}_${selectedCategory}`;
    showMissionStep(selectedCategory);
  });
});

function showMissionStep(category) {
  const missions = MISSIONS[category] || [];
  const grid = document.getElementById('mission-grid');
  grid.innerHTML = '';

  missions.forEach((mission, i) => {
    const card = document.createElement('div');
    card.className = 'mission-card';
    card.innerHTML = `
      <span class="mission-num">미션 ${i + 1}</span>
      <span class="mission-icon">${mission.icon}</span>
      <span class="mission-title">${mission.title}</span>
      <span class="mission-desc">${mission.desc}</span>
    `;
    card.addEventListener('click', () => startChatWithMission(mission));
    grid.appendChild(card);
  });

  document.getElementById('step-category').classList.add('hidden');
  document.getElementById('step-mission').classList.remove('hidden');
}

document.getElementById('back-to-category').addEventListener('click', () => {
  document.getElementById('step-mission').classList.add('hidden');
  document.getElementById('step-category').classList.remove('hidden');
});

document.getElementById('skip-mission').addEventListener('click', () => {
  state.currentMission = null;
  launchChat();
});

async function startChatWithMission(mission) {
  state.currentMission = mission;

  state.history = [];
  renderChatHeader();
  updateMissionBanner();
  clearMessages();
  // 이전 미션 종료로 비활성화됐을 수 있으므로 재활성화
  chatInput.disabled     = false;
  sendBtn.disabled       = false;
  micBtn.disabled        = false;
  endMissionBtn.disabled = false;
  resetSelectSteps();
  showScreen('chat');
  showTyping();

  try {
    const res = await fetch('/api/mission-start', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({
        style:          state.style,
        ui_lang:        state.uiLang,
        mission_prompt: mission.prompt,
      }),
    });
    const data = await res.json();
    hideTyping();
    if (data.error) throw new Error(data.error);

    addAiBubble(data.ai_slang, data.ai_interpretation, data.ai_vocab);
    state.history = [{ role: 'assistant', content: data.ai_slang }];
    speakText(data.ai_slang);
  } catch (e) {
    hideTyping();
    console.error('Mission start failed:', e);
    addGreeting(); // 실패 시 기본 인사로 폴백
  }
}

function launchChat() {
  state.history      = [];
  state.currentMission = null;
  renderChatHeader();
  updateMissionBanner();
  clearMessages();
  // 입력 재활성화 (이전 미션 종료로 비활성화됐을 수 있음)
  chatInput.disabled = false;
  sendBtn.disabled   = false;
  micBtn.disabled    = false;
  addGreeting();
  showScreen('chat');
  resetSelectSteps();
}

function resetSelectSteps() {
  document.getElementById('step-mission').classList.add('hidden');
  document.getElementById('step-category').classList.add('hidden');
  document.getElementById('step-language').classList.remove('hidden');
  selectedLang = null;
  selectedCategory = null;
}

document.getElementById('back-from-chat').addEventListener('click', () => {
  showScreen('select');
});

// ── 모국어 탭 선택 ─────────────────────────────
document.querySelectorAll('.lang-tab').forEach(tab => {
  tab.addEventListener('click', () => {
    document.querySelectorAll('.lang-tab').forEach(t => t.classList.remove('active'));
    tab.classList.add('active');
    state.uiLang = tab.dataset.lang;
    retranslateAll();
  });
});

// 언어 변경 시 기존 AI 말풍선 해석 + 코칭 팁 + 피드백 카드 일괄 재번역
async function retranslateAll() {
  const aiBubbles    = document.querySelectorAll('.message.ai[data-slang]');
  const coachingRows = document.querySelectorAll('.coaching-row[data-coaching]');
  const feedbackCards = document.querySelectorAll('.feedback-card[data-feedback]');

  // 피드백 카드 재번역
  for (const cardEl of feedbackCards) {
    let stored;
    try { stored = JSON.parse(cardEl.dataset.feedback); } catch { continue; }

    // 로딩 표시
    const body = cardEl.querySelector('.feedback-body');
    if (body) { body.style.opacity = '0.45'; body.style.pointerEvents = 'none'; }

    try {
      const res = await fetch('/api/translate-feedback', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ feedback: stored, ui_lang: state.uiLang }),
      });
      const translated = await res.json();
      if (translated.error) throw new Error(translated.error);

      // data-feedback을 번역본으로 갱신
      cardEl.dataset.feedback = JSON.stringify(translated);

      // 카드 본문 재렌더링
      rerenderFeedbackBody(cardEl, translated);
    } catch (e) {
      console.error('feedback retranslate failed:', e);
    } finally {
      if (body) { body.style.opacity = ''; body.style.pointerEvents = ''; }
    }
  }

  // 코칭 팁 재번역
  for (const rowEl of coachingRows) {
    const coaching = rowEl.dataset.coaching;
    const tipEl    = rowEl.querySelector('.bubble-coaching-user');
    if (tipEl) { tipEl.textContent = '💡 ...'; tipEl.style.opacity = '0.45'; }

    try {
      const res = await fetch('/api/translate', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ text: coaching, ui_lang: state.uiLang }),
      });
      const data = await res.json();
      if (tipEl) {
        tipEl.textContent = '💡 ' + (data.text || coaching);
        tipEl.style.opacity = '';
      }
    } catch (e) {
      if (tipEl) { tipEl.textContent = '💡 ' + coaching; tipEl.style.opacity = ''; }
      console.error('coaching retranslate failed:', e);
    }
  }

  // AI 말풍선 해석 재번역
  for (const msgEl of aiBubbles) {
    const slang    = msgEl.dataset.slang;
    const interpEl  = msgEl.querySelector('.bubble-interpretation');
    const vocabWrap = msgEl.querySelector('.bubble-vocab');

    if (interpEl) { interpEl.textContent = '...'; interpEl.style.opacity = '0.45'; }

    try {
      const res = await fetch('/api/interpret', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ text: slang, ui_lang: state.uiLang }),
      });
      const data = await res.json();

      if (interpEl) {
        interpEl.textContent = data.interpretation ? '💬 ' + data.interpretation : '';
        interpEl.style.opacity = '';
      }
      if (vocabWrap && data.vocab) {
        renderVocabBlock(vocabWrap, data.vocab, state.uiLang);
      }
    } catch (e) {
      if (interpEl) interpEl.style.opacity = '';
      console.error('retranslate failed:', e);
    }
  }
}

// ── 미션 배너 ──────────────────────────────
const missionBanner      = document.getElementById('mission-banner');
const missionBannerTitle = document.getElementById('mission-banner-title');
const endMissionBtn      = document.getElementById('end-mission-btn');

function updateMissionBanner() {
  if (state.currentMission) {
    missionBannerTitle.textContent = state.currentMission.title;
    missionBanner.classList.remove('hidden');
  } else {
    missionBanner.classList.add('hidden');
  }
}

endMissionBtn.addEventListener('click', endMission);

async function endMission() {
  if (endMissionBtn.disabled) return;
  endMissionBtn.disabled = true;
  chatInput.disabled     = true;
  sendBtn.disabled       = true;
  micBtn.disabled        = true;

  showTyping();

  try {
    const res = await fetch('/api/mission-feedback', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({
        style:         state.style,
        history:       state.history,
        ui_lang:       state.uiLang,
        mission_title: state.currentMission?.title || '',
      }),
    });
    const data = await res.json();
    hideTyping();
    if (data.error) throw new Error(data.error);
    addFeedbackCard(data);
  } catch (e) {
    hideTyping();
    console.error('Mission feedback failed:', e);
    showToast('평가를 불러오지 못했어요. 다시 시도해주세요.');
    endMissionBtn.disabled = false;
    chatInput.disabled     = false;
    sendBtn.disabled       = false;
    micBtn.disabled        = false;
  }

  missionBanner.classList.add('hidden');
}

function addFeedbackCard(data) {
  const missionTitle = state.currentMission?.title || '';
  // 미션 제목을 번역 가능하도록 JSON에 포함
  const stored = { ...data, missionTitle };

  const card = document.createElement('div');
  card.className = 'feedback-card';
  card.dataset.feedback = JSON.stringify(stored);

  const lbl = getFeedbackLabels();

  // 헤더
  const header = document.createElement('div');
  header.className = 'feedback-header';
  const iconEl = document.createElement('span');
  iconEl.className = 'feedback-header-icon';
  iconEl.textContent = '📊';
  const textWrap = document.createElement('div');
  textWrap.className = 'feedback-header-text';
  const titleEl = document.createElement('div');
  titleEl.className = 'feedback-title';
  titleEl.textContent = lbl.title;
  const missionEl = document.createElement('div');
  missionEl.className = 'feedback-mission';
  missionEl.textContent = missionTitle;
  textWrap.appendChild(titleEl);
  textWrap.appendChild(missionEl);
  header.appendChild(iconEl);
  header.appendChild(textWrap);

  // 본문
  const body = document.createElement('div');
  body.className = 'feedback-body';

  if (data.strengths?.length) {
    const sec = document.createElement('div');
    const secTitle = document.createElement('div');
    secTitle.className = 'feedback-section-title';
    secTitle.textContent = lbl.strengths;
    const list = document.createElement('div');
    list.className = 'feedback-list';
    data.strengths.forEach(s => {
      const item = document.createElement('div');
      item.className = 'feedback-item';
      item.innerHTML = `<span class="feedback-item-dot">•</span><span>${s}</span>`;
      list.appendChild(item);
    });
    sec.appendChild(secTitle);
    sec.appendChild(list);
    body.appendChild(sec);
  }

  if (data.improvements?.length) {
    const sec = document.createElement('div');
    const secTitle = document.createElement('div');
    secTitle.className = 'feedback-section-title';
    secTitle.textContent = lbl.improvements;
    const list = document.createElement('div');
    list.className = 'feedback-list';
    data.improvements.forEach(imp => {
      const item = document.createElement('div');
      item.className = 'feedback-improvement';
      const point = document.createElement('div');
      point.className = 'imp-point';
      point.textContent = imp.point;
      item.appendChild(point);
      if (imp.original || imp.better) {
        const example = document.createElement('div');
        example.className = 'imp-example';
        example.innerHTML =
          `<span class="orig">${imp.original || ''}</span>` +
          `<span class="arrow"> → </span>` +
          `<span class="better">${imp.better || ''}</span>`;
        item.appendChild(example);
      }
      list.appendChild(item);
    });
    sec.appendChild(secTitle);
    sec.appendChild(list);
    body.appendChild(sec);
  }

  if (data.encouragement) {
    const enc = document.createElement('div');
    enc.className = 'feedback-encouragement';
    enc.textContent = '🌟 ' + data.encouragement;
    body.appendChild(enc);
  }

  card.appendChild(header);
  card.appendChild(body);
  chatMessages.insertBefore(card, typingEl);
  scrollToBottom();
}

// 피드백 카드 본문만 교체 (헤더는 유지)
function rerenderFeedbackBody(cardEl, data) {
  const lbl = getFeedbackLabels();

  // 헤더 텍스트도 갱신 (제목 + 미션 제목)
  const titleEl   = cardEl.querySelector('.feedback-title');
  const missionEl = cardEl.querySelector('.feedback-mission');
  if (titleEl)   titleEl.textContent   = lbl.title;
  if (missionEl) missionEl.textContent = data.missionTitle || '';

  const oldBody = cardEl.querySelector('.feedback-body');
  if (!oldBody) return;

  const body = document.createElement('div');
  body.className = 'feedback-body';

  if (data.strengths?.length) {
    const sec = document.createElement('div');
    const secTitle = document.createElement('div');
    secTitle.className = 'feedback-section-title';
    secTitle.textContent = lbl.strengths;
    const list = document.createElement('div');
    list.className = 'feedback-list';
    data.strengths.forEach(s => {
      const item = document.createElement('div');
      item.className = 'feedback-item';
      item.innerHTML = `<span class="feedback-item-dot">•</span><span>${s}</span>`;
      list.appendChild(item);
    });
    sec.appendChild(secTitle);
    sec.appendChild(list);
    body.appendChild(sec);
  }

  if (data.improvements?.length) {
    const sec = document.createElement('div');
    const secTitle = document.createElement('div');
    secTitle.className = 'feedback-section-title';
    secTitle.textContent = lbl.improvements;
    const list = document.createElement('div');
    list.className = 'feedback-list';
    data.improvements.forEach(imp => {
      const item = document.createElement('div');
      item.className = 'feedback-improvement';
      const point = document.createElement('div');
      point.className = 'imp-point';
      point.textContent = imp.point;
      item.appendChild(point);
      if (imp.original || imp.better) {
        const example = document.createElement('div');
        example.className = 'imp-example';
        example.innerHTML =
          `<span class="orig">${imp.original || ''}</span>` +
          `<span class="arrow"> → </span>` +
          `<span class="better">${imp.better || ''}</span>`;
        item.appendChild(example);
      }
      list.appendChild(item);
    });
    sec.appendChild(secTitle);
    sec.appendChild(list);
    body.appendChild(sec);
  }

  if (data.encouragement) {
    const enc = document.createElement('div');
    enc.className = 'feedback-encouragement';
    enc.textContent = '🌟 ' + data.encouragement;
    body.appendChild(enc);
  }

  cardEl.replaceChild(body, oldBody);
}

// ── Header rendering ───────────────────────────
function renderChatHeader() {
  const s = STYLES[state.style];
  document.getElementById('chat-header-name').textContent = s.name;
  document.getElementById('chat-header-mode').textContent =
    (CATEGORY_MODE[s.category] || 'AI') + ' · 온라인';

  const aiWrap  = document.getElementById('chat-header-ai-avatar-wrap');
  const aiImg   = document.getElementById('chat-header-ai-img');
  const aiLabel = document.getElementById('chat-header-ai-label');
  aiLabel.textContent = s.label;
  aiWrap.className = `header-ai-avatar av-${s.langKey}`;
  aiImg.src = `/static/images/${state.style}.png`;
  aiImg.onload  = () => aiImg.classList.remove('hidden');
  aiImg.onerror = () => aiImg.classList.add('hidden');

  updateAllUserAvatars();
}

// ── Chat UI ────────────────────────────────────
const chatMessages = document.getElementById('chat-messages');
const typingEl     = document.getElementById('typing-indicator');
const chatInput    = document.getElementById('chat-input');
const micBtn       = document.getElementById('mic-btn');
const sendBtn      = document.getElementById('send-btn');

function clearMessages() {
  chatMessages.innerHTML = '';
  chatMessages.appendChild(typingEl);
}

function addGreeting() {
  const s = STYLES[state.style];
  addAiBubble(s.greeting, s.greetingInterpretation);
  state.history = [{ role: 'assistant', content: s.greeting }];
  speakText(s.greeting);
}

// 사용자 아바타 생성 헬퍼
function makeUserAvatar() {
  const avatarDiv = document.createElement('div');
  avatarDiv.className = 'msg-avatar av-user';
  if (state.userAvatar) {
    const img = document.createElement('img');
    img.className = 'avatar-photo';
    img.src = state.userAvatar;
    avatarDiv.appendChild(img);
  } else {
    const fb = document.createElement('span');
    fb.className = 'avatar-fallback';
    fb.textContent = '👤';
    avatarDiv.appendChild(fb);
  }
  return avatarDiv;
}

// 사용자 말풍선: 원문 + 변환
function addUserBubble(original, slang) {
  const wrap = document.createElement('div');
  wrap.className = 'message user';

  const body = document.createElement('div');
  body.className = 'msg-body';

  const label = document.createElement('div');
  label.className = 'msg-label';
  label.textContent = '나';

  const bubble = document.createElement('div');
  bubble.className = 'msg-bubble';

  const originalEl = document.createElement('div');
  originalEl.className = 'bubble-original';
  originalEl.textContent = original;

  bubble.appendChild(originalEl);
  body.appendChild(label);
  body.appendChild(bubble);

  wrap.appendChild(makeUserAvatar());
  wrap.appendChild(body);

  chatMessages.insertBefore(wrap, typingEl);
  scrollToBottom();
  return { wrap };
}

// 사용자 말풍선 아래에 코칭 팁 추가
function addCoachingRow(afterEl, coaching) {
  if (!coaching) return;
  const row = document.createElement('div');
  row.className = 'coaching-row';
  row.dataset.coaching = coaching;
  const tip = document.createElement('div');
  tip.className = 'bubble-coaching-user';
  tip.textContent = '💡 ' + coaching;
  row.appendChild(tip);
  afterEl.insertAdjacentElement('afterend', row);
  scrollToBottom();
}

// 단어 설명 블록 렌더링
function renderVocabBlock(vocabWrap, vocab, uiLang) {
  vocabWrap.innerHTML = '';
  const label = document.createElement('div');
  label.className = 'vocab-label';
  label.textContent = VOCAB_LABELS[uiLang] || '📖 Vocab';
  vocabWrap.appendChild(label);

  vocab.forEach(item => {
    const vocabItem = document.createElement('div');
    vocabItem.className = 'vocab-item';
    const termEl = document.createElement('span');
    termEl.className = 'vocab-term';
    termEl.textContent = item.term;
    const meaningEl = document.createElement('span');
    meaningEl.className = 'vocab-meaning';
    meaningEl.textContent = item.meaning;
    vocabItem.appendChild(termEl);
    vocabItem.appendChild(meaningEl);
    vocabWrap.appendChild(vocabItem);
  });
}

// AI 말풍선: 응답 + 해석 + 📖 표현 설명
function addAiBubble(slang, interpretation, vocab = []) {
  const s = STYLES[state.style];

  const wrap = document.createElement('div');
  wrap.className = 'message ai';
  wrap.dataset.slang = slang;

  // AI 아바타
  const avatarDiv = document.createElement('div');
  avatarDiv.className = `msg-avatar av-${s.langKey}`;
  const avatarImg = document.createElement('img');
  avatarImg.className = 'avatar-photo hidden';
  avatarImg.src = `/static/images/${state.style}.png`;
  avatarImg.onload  = () => avatarImg.classList.remove('hidden');
  avatarImg.onerror = () => {};
  const avatarFb = document.createElement('span');
  avatarFb.className = 'avatar-fallback';
  avatarFb.textContent = s.label;
  avatarDiv.appendChild(avatarImg);
  avatarDiv.appendChild(avatarFb);

  // 메시지 본문
  const body = document.createElement('div');
  body.className = 'msg-body';

  const label = document.createElement('div');
  label.className = 'msg-label';
  label.textContent = s.name;

  const bubble = document.createElement('div');
  bubble.className = 'msg-bubble';

  const slangEl = document.createElement('div');
  slangEl.className = 'bubble-slang-ai';
  slangEl.textContent = slang;
  bubble.appendChild(slangEl);

  if (interpretation) {
    const divider = document.createElement('div');
    divider.className = 'bubble-divider ai-divider';
    const interpEl = document.createElement('div');
    interpEl.className = 'bubble-interpretation';
    interpEl.textContent = '💬 ' + interpretation;
    bubble.appendChild(divider);
    bubble.appendChild(interpEl);
  }

  if (vocab && vocab.length > 0) {
    const vocabWrap = document.createElement('div');
    vocabWrap.className = 'bubble-vocab';
    renderVocabBlock(vocabWrap, vocab, state.uiLang);
    bubble.appendChild(vocabWrap);
  }

  const actions = document.createElement('div');
  actions.className = 'msg-actions';

  const listenBtn = document.createElement('button');
  listenBtn.className = 'msg-action-btn';
  listenBtn.innerHTML = '🔊 듣기';
  listenBtn.onclick = () => speakText(slang);

  const copyBtn = document.createElement('button');
  copyBtn.className = 'msg-action-btn';
  copyBtn.innerHTML = '📋 복사';
  copyBtn.onclick = () => copyText(slang);

  actions.appendChild(listenBtn);
  actions.appendChild(copyBtn);

  body.appendChild(label);
  body.appendChild(bubble);
  body.appendChild(actions);

  wrap.appendChild(avatarDiv);
  wrap.appendChild(body);

  chatMessages.insertBefore(wrap, typingEl);
  scrollToBottom();
}

function scrollToBottom() {
  chatMessages.scrollTop = chatMessages.scrollHeight;
}

function showTyping() {
  typingEl.classList.add('visible');
  scrollToBottom();
}

function hideTyping() {
  typingEl.classList.remove('visible');
}

// ── Send message ───────────────────────────────
sendBtn.addEventListener('click', sendChatMessage);
chatInput.addEventListener('keydown', e => {
  if (e.key === 'Enter' && !e.shiftKey) {
    e.preventDefault();
    sendChatMessage();
  }
});

async function sendChatMessage() {
  if (sendBtn.disabled) return;
  sendBtn.disabled = true;

  const text = chatInput.value.trim();
  if (!text) { sendBtn.disabled = false; return; }

  chatInput.value = '';
  autoResizeTextarea(chatInput);

  const { wrap: userWrap } = addUserBubble(text, null);
  showTyping();

  try {
    const res = await fetch('/api/message', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({
        style:          state.style,
        text:           text,
        history:        state.history,
        ui_lang:        state.uiLang,
        mission_prompt: state.currentMission?.prompt || '',
      }),
    });
    const data = await res.json();
    if (data.error) throw new Error(data.error);

    // 코칭 팁을 사용자 말풍선 바로 아래에 표시
    addCoachingRow(userWrap, data.ai_coaching);

    state.history.push({ role: 'user', content: text });

    hideTyping();
    addAiBubble(data.ai_slang, data.ai_interpretation, data.ai_vocab);
    state.history.push({ role: 'assistant', content: data.ai_slang });

    speakText(data.ai_slang);
  } catch (err) {
    hideTyping();
    addAiBubble('⚠️ 오류가 발생했어요. 다시 시도해주세요.', '');
    console.error(err);
  } finally {
    sendBtn.disabled = false;
  }
}

// ── Auto-resize textarea ───────────────────────
chatInput.addEventListener('input', () => autoResizeTextarea(chatInput));

function autoResizeTextarea(el) {
  el.style.height = 'auto';
  el.style.height = Math.min(el.scrollHeight, 120) + 'px';
}

// ── Mic recording — 문장 단위 스트리밍 Whisper ──────────────────
// MediaRecorder를 500ms 타임슬라이스로 구동해 청크를 쌓고,
// WebAudio로 1초 침묵 감지 시 Whisper 전송 → textarea append.
// 5초 침묵이면 녹음 종료 → 자동 전송.

const SILENCE_THRESHOLD    = 12;   // 0-255, 미만이면 침묵
const PHRASE_SILENCE_MS    = 1000; // 1초 침묵 → 문장 경계
const UTTERANCE_SILENCE_MS = 2000; // 3초 침묵 → 완전 종료
const CHUNK_INTERVAL_MS    = 500;  // MediaRecorder 청크 간격

const RECORDING_PLACEHOLDER = '🎙️ 듣고 있어요… 문장이 끝나면 텍스트가 나타납니다';
const DEFAULT_PLACEHOLDER   = '메시지를 입력하거나 🎤 를 눌러 말하세요…';

micBtn.addEventListener('click', toggleRecording);

function toggleRecording() {
  if (state.recording) stopRecording();
  else startRecording();
}

function stopRecording() {
  if (state.stopFn) state.stopFn();
}

async function startRecording() {
  let stream;
  try {
    stream = await navigator.mediaDevices.getUserMedia({ audio: true });
  } catch {
    showToast('마이크 권한이 필요합니다');
    return;
  }

  // WebAudio 분석기
  const audioCtx = new AudioContext();
  const analyser  = audioCtx.createAnalyser();
  analyser.fftSize = 512;
  audioCtx.createMediaStreamSource(stream).connect(analyser);
  const freqBuf = new Uint8Array(analyser.frequencyBinCount);

  // 청크 버퍼
  // headerChunk: 첫 청크(WebM 헤더 포함) — 매 phrase blob에 앞에 붙여야 Whisper가 디코딩 가능
  let headerChunk      = null;
  let phraseChunks     = [];
  let silenceStart     = null;
  let phraseFlushed    = false; // 현재 침묵 구간에서 이미 전송했는지
  let sending          = false;
  let ended            = false;
  let rafId            = null;
  let lastFlushPromise = Promise.resolve();

  const recorder = new MediaRecorder(stream);
  state.recorder = recorder;

  recorder.ondataavailable = e => {
    if (e.data.size === 0) return;
    if (!headerChunk) {
      headerChunk = e.data; // 첫 청크는 헤더로만 보존 (phraseChunks에는 추가 안 함)
      return;               // ← 없으면 blob에 첫 500ms가 두 번 들어가는 버그 발생
    }
    phraseChunks.push(e.data);
  };

  // 현재까지 쌓인 청크를 Whisper로 전송 → textarea에 append
  const flushPhrase = async () => {
    if (sending || !headerChunk || phraseChunks.length === 0) return;
    sending = true;
    const blob = new Blob([headerChunk, ...phraseChunks], { type: 'audio/webm' });
    phraseChunks = []; // 버퍼 초기화 (헤더는 유지)
    await appendPhraseTranscript(blob);
    sending = false;
  };

  // 녹음 완전 종료 (침묵 자동 종료 or ⏹ 클릭)
  // flushOnStop=true: 수동 종료 시 남은 청크도 전사
  // flushOnStop=false: 침묵 자동 종료 시 이미 flush됐으므로 재전송 생략
  const end = async (flushOnStop = false) => {
    if (ended) return;
    ended = true;
    state.stopFn = null;
    cancelAnimationFrame(rafId);

    if (recorder.state !== 'inactive') {
      recorder.onstop = async () => {
        audioCtx.close().catch(() => {});
        stream.getTracks().forEach(t => t.stop());

        await lastFlushPromise; // 진행 중인 전사 완료 대기
        if (flushOnStop) await flushPhrase(); // 수동 종료 시만 남은 청크 처리

        state.recording = false;
        micBtn.classList.remove('recording');
        micBtn.textContent = '🎤';
        chatInput.placeholder = DEFAULT_PLACEHOLDER;

        if (chatInput.value.trim()) sendChatMessage();
      };
      recorder.stop();
    }
  };

  // 매 프레임 음량 체크
  const checkSilence = () => {
    if (ended) return;
    analyser.getByteFrequencyData(freqBuf);
    const avg = freqBuf.reduce((a, b) => a + b, 0) / freqBuf.length;

    if (avg < SILENCE_THRESHOLD) {
      if (!silenceStart) { silenceStart = Date.now(); phraseFlushed = false; }
      const elapsed = Date.now() - silenceStart;

      if (elapsed >= UTTERANCE_SILENCE_MS) {
        end(); return;
      }
      // 1초 침묵 → 문장 경계: 한 번만 전송
      if (elapsed >= PHRASE_SILENCE_MS && !phraseFlushed && !sending) {
        phraseFlushed = true;
        lastFlushPromise = flushPhrase();
      }
    } else {
      silenceStart  = null;
      phraseFlushed = false;
    }
    rafId = requestAnimationFrame(checkSilence);
  };

  // 녹음 시작
  state.recording = true;
  state.stopFn    = () => end(true); // 수동 종료: 남은 청크도 flush
  micBtn.classList.add('recording');
  micBtn.textContent = '⏹';
  chatInput.value = '';
  chatInput.placeholder = RECORDING_PLACEHOLDER;
  autoResizeTextarea(chatInput);

  recorder.start(CHUNK_INTERVAL_MS);
  rafId = requestAnimationFrame(checkSilence);
}

// 스타일 키 → Whisper 언어 힌트 (연습 언어 기준)
function styleToWhisperLang(style) {
  if (!style) return null;
  if (style.startsWith('ko'))    return 'ko';
  if (style.startsWith('ja'))    return 'ja';
  if (style.startsWith('en_us')) return 'en';
  if (style.startsWith('zh'))    return 'zh';
  return null;
}

// 문장 blob → Whisper → textarea에 누적 append
async function appendPhraseTranscript(blob) {
  const form = new FormData();
  form.append('audio', blob, 'recording.webm');
  // 언어 힌트를 보내면 Whisper가 언어 자동 감지를 건너뜀 → 1~2s 단축
  const langHint = styleToWhisperLang(state.style);
  if (langHint) form.append('lang', langHint);
  try {
    const res  = await fetch('/api/transcribe', { method: 'POST', body: form });
    const data = await res.json();
    if (!data.text?.trim()) return;

    // 이전 텍스트에 이어붙이기
    const prev = chatInput.value;
    chatInput.value = prev ? prev + ' ' + data.text.trim() : data.text.trim();
    autoResizeTextarea(chatInput);

    // Whisper 감지 언어로 uiLang 업데이트
    if (data.language && data.language !== state.uiLang) {
      state.uiLang = data.language;
      document.querySelectorAll('.lang-tab').forEach(t => {
        t.classList.toggle('active', t.dataset.lang === state.uiLang);
      });
    }
  } catch (err) {
    console.error('Phrase transcription failed:', err);
  }
}

// ── TTS ────────────────────────────────────────
const LANG_MAP = {
  ko_friend:      'ko-KR',
  ko_business:    'ko-KR',
  ko_travel:      'ko-KR',
  ja_friend:      'ja-JP',
  ja_business:    'ja-JP',
  ja_travel:      'ja-JP',
  en_us_friend:   'en-US',
  en_us_business: 'en-US',
  en_us_travel:   'en-US',
  zh_friend:      'zh-CN',
  zh_business:    'zh-CN',
  zh_travel:      'zh-CN',
};

async function speakText(text) {
  try {
    const res = await fetch('/api/tts', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ text, style: state.style }),
    });
    if (!res.ok) throw new Error('TTS API error');
    const data = await res.json();
    if (data.fallback) { browserSpeak(text); return; }
    if (data.error) throw new Error(data.error);
    const audio = new Audio('data:audio/mp3;base64,' + data.audio);
    audio.play();
  } catch (_) {
    browserSpeak(text);
  }
}

function browserSpeak(text) {
  if (!('speechSynthesis' in window)) return;
  window.speechSynthesis.cancel();
  const utter = new SpeechSynthesisUtterance(text);
  utter.lang = LANG_MAP[state.style] || 'en-US';
  utter.rate = 1.0;
  const voices = window.speechSynthesis.getVoices();
  const match  = voices.find(v => v.lang.startsWith(utter.lang.split('-')[0]));
  if (match) utter.voice = match;
  window.speechSynthesis.speak(utter);
}

// ── My Page ─────────────────────────────────────

function updateAllUserAvatars() {
  const src = state.userAvatar;
  const targets = [
    { img: document.getElementById('select-user-avatar-img'),  wrap: document.getElementById('select-user-avatar-wrap') },
    { img: document.getElementById('chat-header-user-img'),    wrap: document.getElementById('chat-header-user-wrap') },
    { img: document.getElementById('mypage-avatar-img'),       wrap: document.querySelector('.mypage-avatar-wrap') },
  ];
  targets.forEach(({ img, wrap }) => {
    if (!img) return;
    if (src) {
      img.src = src;
      img.classList.remove('hidden');
      const fb = wrap ? wrap.querySelector('.avatar-fallback') : null;
      if (fb) fb.style.display = 'none';
    } else {
      img.src = '';
      img.classList.add('hidden');
      const fb = wrap ? wrap.querySelector('.avatar-fallback') : null;
      if (fb) fb.style.display = '';
    }
  });
}

document.getElementById('open-mypage-select').addEventListener('click', () => {
  state.prevScreen = 'select';
  showScreen('mypage');
});

document.getElementById('open-mypage-chat').addEventListener('click', () => {
  state.prevScreen = 'chat';
  showScreen('mypage');
});

document.getElementById('back-from-mypage').addEventListener('click', () => {
  showScreen(state.prevScreen || 'select');
});

// 아바타 파일 업로드
document.getElementById('avatar-file-input').addEventListener('change', e => {
  const file = e.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = ev => {
    state.userAvatar = ev.target.result;
    localStorage.setItem('blabla_userAvatar', state.userAvatar);
    updateAllUserAvatars();
    showToast('프로필 사진이 바뀌었어요 ✨');
  };
  reader.readAsDataURL(file);
});

// 아바타 삭제
document.getElementById('delete-avatar-btn').addEventListener('click', () => {
  state.userAvatar = null;
  localStorage.removeItem('blabla_userAvatar');
  document.getElementById('avatar-file-input').value = '';
  updateAllUserAvatars();
  showToast('프로필 사진이 삭제됐어요');
});

// 저장된 아바타 불러오기 + 브라우저 감지 언어로 탭 초기화
(function init() {
  // 감지된 uiLang에 맞게 언어 탭 활성화
  document.querySelectorAll('.lang-tab').forEach(tab => {
    tab.classList.toggle('active', tab.dataset.lang === state.uiLang);
  });

  const saved = localStorage.getItem('blabla_userAvatar');
  if (saved) {
    state.userAvatar = saved;
    updateAllUserAvatars();
  }
})();

// ── Utilities ──────────────────────────────────
function copyText(text) {
  navigator.clipboard.writeText(text).then(() => showToast('클립보드에 복사됐어요'));
}

let toastTimer = null;
function showToast(msg) {
  const el = document.getElementById('toast');
  el.textContent = msg;
  el.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.classList.remove('show'), 2000);
}
