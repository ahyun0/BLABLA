# BLABLA 🗣️

> 현지인처럼 말하는 글로벌 AI 회화 서비스

**BLABLA**는 원하는 언어와 상황을 선택해 AI 페르소나와 실제 대화를 나누며 현지 말투를 자연스럽게 익히는 conversational AI 서비스입니다.  
슬랭·비즈니스·여행 등 실생활 상황에서 쓰이는 표현을 AI와 연습하고, 내 입력에 즉각 피드백을 받을 수 있습니다.

---

## 주요 기능

| 기능 | 설명 |
|---|---|
| **언어 선택** | 한국어 · 日本語 · English US · 中文 |
| **상황 선택** | 친구(슬랭) · 비즈니스 · 여행 |
| **AI 페르소나** | 상황별 고유 캐릭터 (수현, Tyler, ゆい 등 총 12개) |
| **미션 모드** | 카테고리별 3개 시나리오 중 선택 → AI가 상황을 설정하고 대화 유도 |
| **스타일 변환** | 사용자 입력을 선택한 말투로 변환해 말풍선에 함께 표시 |
| **실시간 해석** | AI 응답에 모국어 해석(💬) + 표현 설명(📖) 자동 제공 |
| **코칭 피드백** | 사용자 말풍선 아래에 더 자연스러운 표현 제안 (💡) |
| **음성 입력** | 마이크 녹음 → Whisper로 언어 자동 감지 + 문장 단위 실시간 인식 |
| **TTS 출력** | AI 응답을 Typecast → OpenAI TTS → 브라우저 TTS 순으로 음성 재생 |
| **다국어 해석** | 해석 언어 탭으로 한국어·日本語·中文·English 전환 |

---

## 페르소나 목록

| | 친구 | 비즈니스 | 여행 |
|---|---|---|---|
| 🇰🇷 한국어 | 수현 | 준서 | 지아 |
| 🇯🇵 日本語 | ゆい | ケンジ | さくら |
| 🇺🇸 English US | Tyler | Alex | Zoe |
| 🇨🇳 中文 | 小美 | 明浩 | 晓燕 |

---

## 기술 스택

| 레이어 | 사용 기술 |
|---|---|
| **Backend** | Python · Flask · Flask-CORS |
| **STT** | OpenAI Whisper (local, `turbo` 모델) |
| **LLM** | OpenAI GPT-4o-mini |
| **TTS** | Typecast API · OpenAI TTS · 브라우저 SpeechSynthesis |
| **Frontend** | Vanilla JS · HTML · CSS |

---

## 시작하기

### 1. 사전 요구사항

- Python 3.9 이상
- `ffmpeg` (Whisper 음성 처리에 필요)

```bash
# macOS
brew install ffmpeg

# Ubuntu/Debian
sudo apt install ffmpeg
```

### 2. 설치

```bash
git clone <repository-url>
cd BLABLA

pip install -r requirements.txt
```

### 3. 환경변수 설정

프로젝트 루트에 `.env` 파일을 생성합니다.

```env
# 필수
OPENAI_API_KEY=sk-...

# 선택 (없으면 OpenAI TTS → 브라우저 TTS로 자동 폴백)
TYPECAST_API_KEY=...

# Typecast 보이스 ID (선택, 기본값 사용 가능)
VOICE_KOREA=tc_...
VOICE_JAPAN=tc_...
VOICE_US=tc_...
VOICE_ZH=tc_...
```

### 4. 실행

```bash
python app.py
```

브라우저에서 `http://localhost:5000` 접속

> **Note:** 첫 실행 시 Whisper `turbo` 모델을 자동 다운로드합니다 (약 1.5GB, 첫 음성 입력 시 로딩).

---

## 사용 방법

```
1. 언어 선택     →  한국어 / 日本語 / English US / 中文
2. 상황 선택     →  친구(슬랭) / 비즈니스 / 여행
3. 미션 선택     →  오늘의 미션 3가지 중 선택 (또는 자유 대화)
4. 대화 시작     →  텍스트 입력 or 🎤 마이크 버튼
```


### 음성 입력 사용법

1. 🎤 버튼 클릭 → 녹음 시작
2. 말하는 동안 Whisper가 문장 단위로 인식 → 텍스트가 입력창에 표시됨
3. 3초 침묵 시 자동 종료 + 자동 전송
4. ⏹ 버튼으로 수동 종료 가능

---

## 프로젝트 구조

```
BLABLA/
├── app.py              # Flask 서버 (API 엔드포인트, 프롬프트 관리)
├── requirements.txt
├── .env                # API 키 (gitignore 처리)
├── templates/
│   └── index.html      # 단일 페이지 앱
└── static/
    ├── css/style.css   # 스타일
    ├── js/app.js       # 프론트엔드 로직
    └── images/         # 페르소나 이미지
```

### API 엔드포인트

| 엔드포인트 | 메서드 | 설명 |
|---|---|---|
| `/api/message` | POST | 채팅 메시지 처리 (스타일 변환 + AI 응답 + 코칭) |
| `/api/mission-start` | POST | 미션 선택 후 AI 오프닝 생성 |
| `/api/transcribe` | POST | 음성 → 텍스트 (Whisper STT) |
| `/api/tts` | POST | 텍스트 → 음성 (TTS) |
| `/api/interpret` | POST | 슬랭 텍스트 → 모국어 재번역 |

---

## 라이선스

MIT
