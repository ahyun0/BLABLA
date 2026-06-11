/* =============================================
   BLABLA — Frontend Logic
   ============================================= */

// ── State ──────────────────────────────────────
const state = {
  style:      null,
  history:    [],
  recording:  false,
  recorder:   null,
  chunks:     [],
  uiLang:     'ko',
  userAvatar: null,
  prevScreen: 'select',
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

// ── Style config ───────────────────────────────
const STYLES = {
  japan_gyaru: {
    name:    '일본 갸루',
    label:   'JP',
    desc:    '밝고 귀여운 갸루체',
    greeting: 'こんにちは〜！マジよろしくじゃん！✨',
    greetingInterpretation: '안녕하세요~! 진짜 잘 부탁해요! ✨',
  },
  korea_mz: {
    name:    '한국 MZ',
    label:   'MZ',
    desc:    '인터넷 밈 말투',
    greeting: '안뇽~ 폼 미쳤다 진짜ㅋㅋ 잘 부탁해 찐으로',
    greetingInterpretation: '안녕~ 진짜 대단하다ㅋㅋ 잘 부탁해 정말로',
  },
  us_casual: {
    name:    '미국 캐주얼',
    label:   'US',
    desc:    'Gen Z 슬랭',
    greeting: "Heyyyy what's good?? No cap, lowkey hyped to chat fr 🔥",
    greetingInterpretation: '야 어때?? 진짜로, 솔직히 설레서 대화하고 싶어! 🔥',
  },
  uk_casual: {
    name:    '영국 슬랭',
    label:   'UK',
    desc:    '영국식 캐주얼',
    greeting: "Alright mate! Cheers for stopping by. Proper chuffed to meet ya!",
    greetingInterpretation: '안녕 친구! 들러줘서 고마워. 만나서 진짜 반가워!',
  },
  au_casual: {
    name:    '호주 슬랭',
    label:   'AU',
    desc:    '여유로운 호주 말투',
    greeting: "G'day mate! No worries, reckon we'll have a ripper time! 🦘",
    greetingInterpretation: '안녕 친구! 걱정 마, 진짜 재밌는 시간 보낼 것 같아! 🦘',
  },
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

// ── Style selection → 채팅 화면 ────────────────
document.querySelectorAll('.style-card').forEach(card => {
  card.addEventListener('click', () => {
    state.style   = card.dataset.style;
    state.history = [];
    renderChatHeader();
    clearMessages();
    addGreeting();
    showScreen('chat');
  });
});

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

// 언어 변경 시 기존 AI 말풍선 해석 일괄 재번역
async function retranslateAll() {
  const aiBubbles = document.querySelectorAll('.message.ai[data-slang]');
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

// ── Header rendering ───────────────────────────
function renderChatHeader() {
  const s = STYLES[state.style];
  document.getElementById('chat-header-name').textContent = s.name;

  // 헤더 AI 아바타
  const aiWrap  = document.getElementById('chat-header-ai-avatar-wrap');
  const aiImg   = document.getElementById('chat-header-ai-img');
  const aiLabel = document.getElementById('chat-header-ai-label');
  aiLabel.textContent = s.label;
  aiWrap.className = `header-ai-avatar av-${state.style.split('_')[0]}`;
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

// 사용자 말풍선: 원문 + 슬랭
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

  const divider = document.createElement('div');
  divider.className = 'bubble-divider';

  const slangEl = document.createElement('div');
  slangEl.className = 'bubble-slang';
  if (slang) {
    slangEl.textContent = slang;
  } else {
    slangEl.textContent = '변환 중...';
    slangEl.classList.add('loading');
  }

  bubble.appendChild(originalEl);
  bubble.appendChild(divider);
  bubble.appendChild(slangEl);
  body.appendChild(label);
  body.appendChild(bubble);

  wrap.appendChild(makeUserAvatar());
  wrap.appendChild(body);

  chatMessages.insertBefore(wrap, typingEl);
  scrollToBottom();
  return slangEl;
}

// 단어 설명 블록 렌더링 (addAiBubble / retranslateAll 공용)
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

// AI 말풍선: 슬랭 응답 + 해석 + 📖 단어 설명
function addAiBubble(slang, interpretation, vocab = []) {
  const s          = STYLES[state.style];
  const styleKey   = state.style;
  const stylePrefix = styleKey.split('_')[0];

  const wrap = document.createElement('div');
  wrap.className = 'message ai';
  wrap.dataset.slang = slang;

  // AI 아바타
  const avatarDiv = document.createElement('div');
  avatarDiv.className = `msg-avatar av-${stylePrefix}`;
  const avatarImg = document.createElement('img');
  avatarImg.className = 'avatar-photo hidden';
  avatarImg.src = `/static/images/${styleKey}.png`;
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

  const slangEl = addUserBubble(text, null);
  showTyping();

  try {
    const res = await fetch('/api/message', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({
        style:    state.style,
        text:     text,
        history:  state.history,
        ui_lang:  state.uiLang,
      }),
    });
    const data = await res.json();
    if (data.error) throw new Error(data.error);

    slangEl.textContent = data.user_slang;
    slangEl.classList.remove('loading');

    state.history.push({ role: 'user', content: data.user_slang });

    hideTyping();
    addAiBubble(data.ai_slang, data.ai_interpretation, data.ai_vocab);
    state.history.push({ role: 'assistant', content: data.ai_slang });

    speakText(data.ai_slang);
  } catch (err) {
    slangEl.textContent = text;
    slangEl.classList.remove('loading');
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

// ── Mic recording ──────────────────────────────
micBtn.addEventListener('click', toggleRecording);

async function toggleRecording() {
  if (!state.recording) await startRecording();
  else stopRecording();
}

async function startRecording() {
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    state.chunks   = [];
    state.recorder = new MediaRecorder(stream);

    state.recorder.ondataavailable = e => {
      if (e.data.size > 0) state.chunks.push(e.data);
    };

    state.recorder.onstop = async () => {
      const blob = new Blob(state.chunks, { type: 'audio/webm' });
      stream.getTracks().forEach(t => t.stop());
      await transcribeAudio(blob);
    };

    state.recorder.start();
    state.recording = true;
    micBtn.classList.add('recording');
    micBtn.textContent = '⏹';
  } catch (err) {
    showToast('마이크 권한이 필요합니다');
    console.error(err);
  }
}

function stopRecording() {
  if (state.recorder && state.recorder.state !== 'inactive') {
    state.recorder.stop();
  }
  state.recording = false;
  micBtn.classList.remove('recording');
  micBtn.textContent = '🎤';
}

async function transcribeAudio(blob) {
  showToast('음성 인식 중...');
  const form = new FormData();
  form.append('audio', blob, 'recording.webm');

  try {
    const res  = await fetch('/api/transcribe', { method: 'POST', body: form });
    const data = await res.json();
    if (data.error) throw new Error(data.error);

    if (data.language) state.uiLang = data.language;
    chatInput.value = data.text;
    autoResizeTextarea(chatInput);
    chatInput.focus();
  } catch (err) {
    showToast('음성 인식 실패');
    console.error(err);
  }
}

// ── TTS ────────────────────────────────────────
const LANG_MAP = {
  japan_gyaru: 'ja-JP',
  korea_mz:    'ko-KR',
  us_casual:   'en-US',
  uk_casual:   'en-GB',
  au_casual:   'en-AU',
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

// 모든 유저 아바타 동기화
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

// 선택 화면 카드 이미지 로드 처리
document.querySelectorAll('.card-avatar-img').forEach(img => {
  img.onload  = () => img.classList.add('loaded');
  img.onerror = () => {};
});

// 저장된 아바타 불러오기 (초기화)
(function init() {
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
