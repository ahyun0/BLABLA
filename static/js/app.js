/* =============================================
   BLABLA — Frontend Logic
   ============================================= */

// ── State ──────────────────────────────────────
const state = {
  style:     null,
  mode:      null,
  history:   [],
  recording: false,
  recorder:  null,
  chunks:    [],
};

// ── Style config ───────────────────────────────
const STYLES = {
  japan_gyaru: {
    name:     '일본 갸루',
    flag:     '🇯🇵',
    desc:     '밝고 귀여운 갸루체',
    greeting: 'こんにちは〜！マジよろしくじゃん！✨',
  },
  korea_mz: {
    name:     '한국 MZ',
    flag:     '🇰🇷',
    desc:     '인터넷 밈 말투',
    greeting: '안뇽~ 폼 미쳤다 진짜ㅋㅋ 잘 부탁해 찐으로',
  },
  us_casual: {
    name:     '미국 캐주얼',
    flag:     '🇺🇸',
    desc:     'Gen Z 슬랭',
    greeting: "Heyyyy what's good?? No cap, lowkey hyped to chat fr 🔥",
  },
  uk_casual: {
    name:     '영국 슬랭',
    flag:     '🇬🇧',
    desc:     '영국식 캐주얼',
    greeting: "Alright mate! Cheers for stopping by. Proper chuffed to meet ya!",
  },
  au_casual: {
    name:     '호주 슬랭',
    flag:     '🇦🇺',
    desc:     '여유로운 호주 말투',
    greeting: "G'day mate! No worries, reckon we'll have a ripper time! 🦘",
  },
};

// ── DOM refs ───────────────────────────────────
const screens = {
  select:    document.getElementById('screen-select'),
  mode:      document.getElementById('screen-mode'),
  chat:      document.getElementById('screen-chat'),
  translate: document.getElementById('screen-translate'),
};

// ── Screen navigation ──────────────────────────
function showScreen(id) {
  Object.values(screens).forEach(s => s.classList.remove('active'));
  screens[id].classList.add('active');
  window.scrollTo(0, 0);
}

// ── Style selection ────────────────────────────
document.querySelectorAll('.style-card').forEach(card => {
  card.addEventListener('click', () => {
    state.style = card.dataset.style;
    renderModeScreen();
    showScreen('mode');
  });
});

function renderModeScreen() {
  const s = STYLES[state.style];
  document.getElementById('mode-flag').textContent  = s.flag;
  document.getElementById('mode-name').textContent  = s.name;
  document.getElementById('mode-desc').textContent  = s.desc;
}

// ── Back buttons ───────────────────────────────
document.getElementById('back-to-select').addEventListener('click', () => showScreen('select'));
document.getElementById('back-from-chat').addEventListener('click', () => showScreen('mode'));
document.getElementById('back-from-translate').addEventListener('click', () => showScreen('mode'));

// ── Mode selection ─────────────────────────────
document.getElementById('btn-chat').addEventListener('click', () => {
  state.mode    = 'chat';
  state.history = [];
  renderChatHeader();
  clearMessages();
  addGreeting();
  showScreen('chat');
});

document.getElementById('btn-translate').addEventListener('click', () => {
  state.mode = 'translate';
  renderTranslateHeader();
  resetTranslateUI();
  showScreen('translate');
});

// ── Switch mode (from header) ──────────────────
document.getElementById('chat-switch-btn').addEventListener('click', () => {
  state.mode = 'translate';
  renderTranslateHeader();
  resetTranslateUI();
  showScreen('translate');
});

document.getElementById('translate-switch-btn').addEventListener('click', () => {
  state.mode    = 'chat';
  state.history = [];
  renderChatHeader();
  clearMessages();
  addGreeting();
  showScreen('chat');
});

// ── Header rendering ───────────────────────────
function renderChatHeader() {
  const s = STYLES[state.style];
  document.getElementById('chat-header-flag').textContent = s.flag;
  document.getElementById('chat-header-name').textContent = s.name;
}

function renderTranslateHeader() {
  const s = STYLES[state.style];
  document.getElementById('translate-header-flag').textContent = s.flag;
  document.getElementById('translate-header-name').textContent = s.name;
}

// ── Chat UI ────────────────────────────────────
const chatMessages  = document.getElementById('chat-messages');
const typingEl      = document.getElementById('typing-indicator');
const chatInput     = document.getElementById('chat-input');
const micBtn        = document.getElementById('mic-btn');
const sendBtn       = document.getElementById('send-btn');

function clearMessages() {
  chatMessages.innerHTML = '';
  chatMessages.appendChild(typingEl);
}

function addGreeting() {
  const s = STYLES[state.style];
  addMessage('ai', s.greeting);
  state.history = [{ role: 'assistant', content: s.greeting }];
}

function addMessage(role, text) {
  const s = STYLES[state.style];

  const wrap = document.createElement('div');
  wrap.className = `message ${role}`;

  const label = document.createElement('div');
  label.className = 'msg-label';
  label.textContent = role === 'user' ? '나' : s.name;

  const bubble = document.createElement('div');
  bubble.className = 'msg-bubble';
  bubble.textContent = text;

  wrap.appendChild(label);
  wrap.appendChild(bubble);

  if (role === 'ai') {
    const actions = document.createElement('div');
    actions.className = 'msg-actions';

    const listenBtn = document.createElement('button');
    listenBtn.className = 'msg-action-btn';
    listenBtn.innerHTML = '🔊 듣기';
    listenBtn.onclick = () => speakText(text);

    const copyBtn = document.createElement('button');
    copyBtn.className = 'msg-action-btn';
    copyBtn.innerHTML = '📋 복사';
    copyBtn.onclick = () => copyText(text);

    actions.appendChild(listenBtn);
    actions.appendChild(copyBtn);
    wrap.appendChild(actions);
  }

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

// ── Send chat message ──────────────────────────
sendBtn.addEventListener('click', sendChatMessage);
chatInput.addEventListener('keydown', e => {
  if (e.key === 'Enter' && !e.shiftKey) {
    e.preventDefault();
    sendChatMessage();
  }
});

async function sendChatMessage() {
  if (sendBtn.disabled) return;   // 중복 실행 방지
  sendBtn.disabled = true;

  const text = chatInput.value.trim();
  if (!text) { sendBtn.disabled = false; return; }

  chatInput.value = '';
  autoResizeTextarea(chatInput);

  addMessage('user', text);
  state.history.push({ role: 'user', content: text });

  showTyping();

  try {
    const res = await fetch('/api/chat', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ style: state.style, messages: state.history }),
    });
    const data = await res.json();
    if (data.error) throw new Error(data.error);

    hideTyping();
    addMessage('ai', data.response);
    state.history.push({ role: 'assistant', content: data.response });

    // Auto-play TTS
    speakText(data.response);
  } catch (err) {
    hideTyping();
    addMessage('ai', '⚠️ 오류가 발생했어요. 다시 시도해주세요.');
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
  if (!state.recording) {
    await startRecording();
  } else {
    stopRecording();
  }
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
  // OpenAI TTS 시도
  try {
    const res = await fetch('/api/tts', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ text, style: state.style }),
    });
    if (!res.ok) throw new Error('TTS API error');
    const data = await res.json();
    if (data.error) throw new Error(data.error);

    const audio = new Audio('data:audio/mp3;base64,' + data.audio);
    audio.play();
    return;
  } catch (_) {
    // OpenAI TTS 실패 시 브라우저 내장 음성으로 폴백
    browserSpeak(text);
  }
}

function browserSpeak(text) {
  if (!('speechSynthesis' in window)) return;
  window.speechSynthesis.cancel();

  const utter = new SpeechSynthesisUtterance(text);
  utter.lang = LANG_MAP[state.style] || 'en-US';
  utter.rate = 1.0;

  // 해당 언어 목소리 찾기
  const voices = window.speechSynthesis.getVoices();
  const match  = voices.find(v => v.lang.startsWith(utter.lang.split('-')[0]));
  if (match) utter.voice = match;

  window.speechSynthesis.speak(utter);
}

// ── Translate ──────────────────────────────────
const translateInput  = document.getElementById('translate-input');
const translateBtn    = document.getElementById('translate-btn');
const translateResult = document.getElementById('translate-result');

function resetTranslateUI() {
  translateInput.value  = '';
  translateResult.textContent = '여기에 변환 결과가 표시됩니다.';
  translateResult.classList.add('empty');
}

translateBtn.addEventListener('click', doTranslate);
translateInput.addEventListener('keydown', e => {
  if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) doTranslate();
});

async function doTranslate() {
  const text = translateInput.value.trim();
  if (!text) { showToast('번역할 문장을 입력해주세요'); return; }

  translateBtn.disabled = true;
  translateBtn.innerHTML = '<span class="spinner"></span>';

  try {
    const res  = await fetch('/api/translate', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ text, style: state.style }),
    });
    const data = await res.json();
    if (data.error) throw new Error(data.error);

    translateResult.textContent = data.translation;
    translateResult.classList.remove('empty');
  } catch (err) {
    translateResult.textContent = '⚠️ 오류가 발생했어요. 다시 시도해주세요.';
    translateResult.classList.remove('empty');
    console.error(err);
  } finally {
    translateBtn.disabled = false;
    translateBtn.textContent = '변환하기 →';
  }
}

document.getElementById('translate-listen-btn').addEventListener('click', () => {
  const text = translateResult.textContent;
  if (text && !translateResult.classList.contains('empty')) speakText(text);
});

document.getElementById('translate-copy-btn').addEventListener('click', () => {
  const text = translateResult.textContent;
  if (text && !translateResult.classList.contains('empty')) copyText(text);
});

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
