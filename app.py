from flask import Flask, request, jsonify, render_template
from flask_cors import CORS
import openai
import whisper
import os
from dotenv import load_dotenv
import base64
import tempfile
import time
import requests

load_dotenv()

app = Flask(__name__)
CORS(app)

print("Whisper turbo 모델 로딩 중...")
whisper_model = whisper.load_model("turbo")
print("Whisper 로드 완료")

_openai_key = os.getenv('OPENAI_API_KEY')
openai_client = openai.OpenAI(api_key=_openai_key) if _openai_key else None

GPT_MODEL = 'gpt-5.4-mini'

# UI 언어 코드 → 언어명 (💬 해석 및 📖 단어 설명에 사용)
LANG_NAMES = {
    'ko': '한국어',
    'ja': '日本語',
    'en': 'English',
    'zh': '中文',
    'es': 'Español',
    'fr': 'Français',
    'de': 'Deutsch',
    'pt': 'Português',
    'ru': 'Русский',
    'vi': 'Tiếng Việt',
    'th': 'Thai',
    'ar': 'العربية',
}

# chat 프롬프트: 💬/📖 포맷 지시는 _build_chat_prompt()에서 동적으로 추가
PROMPTS = {
    'japan_gyaru': {
        'chat': """너는 일본 갸루체로 말하는 AI야. 항상 갸루체 일본어로 대화해.
マジ, やばい, 〜じゃん, ウケる, 無理無理, あげ, まじ卍, ちょー, めっちゃ 같은 갸루 표현을 자연스럽게 써.
하이텐션으로 밝고 귀엽게 대화해줘.""",
        'translate': """다음 문장을 일본 갸루체로만 변환해줘.
マジ, やばい, 〜じゃん, ウケる, めっちゃ 같은 갸루 표현을 사용해.
변환된 갸루체 문장만 출력해. 설명, 라벨, 기타 텍스트는 절대 포함하지 마."""
    },
    'korea_mz': {
        'chat': """너는 한국 MZ/인터넷 밈 말투를 쓰는 AI야.
킹받네, 폼 미쳤다, 개웃김, 현타, 억까, 찐, 레전드, 갓생, ㄹㅇ, 극공감, 각이다 같은 표현을 자연스럽게 써.
친한 친구한테 카톡 보내듯 캐주얼하게 대화해.""",
        'translate': """다음 문장을 한국 MZ/인터넷 밈 말투로만 변환해줘.
킹받네, 폼 미쳤다, 개웃김, 찐, 레전드, ㄹㅇ, 각이다 같은 표현을 써.
변환된 MZ체 문장만 출력해. 설명, 라벨, 기타 텍스트는 절대 포함하지 마."""
    },
    'us_casual': {
        'chat': """You are a chill Gen Z American AI. Always respond in casual American slang.
Use: no cap, lowkey, highkey, slay, vibe, bet, fr, rizz, ate, bussin, it's giving, understood the assignment, periodt.
Keep it fun, casual, and positive. If user speaks Korean, still respond in English slang.""",
        'translate': """Convert the following text into casual American Gen Z slang only.
Use expressions like: no cap, lowkey, slay, vibe, bet, fr, rizz, ate, bussin.
Output ONLY the converted slang sentence. No labels, no explanations, no other text."""
    },
    'uk_casual': {
        'chat': """You are a British AI with dry wit and casual British slang.
Use: mate, cheers, bloody, knackered, brilliant, fancy, rubbish, proper, dodgy, gutted, cheeky, innit, bloke.
Be witty, slightly sardonic, authentically British. Respond in English.""",
        'translate': """Convert the following text into casual British slang only.
Use: mate, cheers, bloody, brilliant, proper, dodgy, gutted, cheeky, innit.
Output ONLY the converted slang sentence. No labels, no explanations, no other text."""
    },
    'au_casual': {
        'chat': """You are a laid-back Australian AI. Always speak in casual Aussie slang.
Use: mate, no worries, arvo, brekkie, heaps, reckon, good on ya, strewth, ripper, servo.
Be warm, friendly, relaxed. Respond in English.""",
        'translate': """Convert the following text into Australian casual slang only.
Use: mate, no worries, arvo, brekkie, heaps, reckon, ripper, strewth.
Output ONLY the converted slang sentence. No labels, no explanations, no other text."""
    }
}


def _build_chat_prompt(style, ui_lang):
    """사용자 언어에 맞춘 💬 해석 + 📖 단어 설명 지시를 프롬프트에 추가."""
    lang_name = LANG_NAMES.get(ui_lang, 'English')
    base = PROMPTS[style]['chat']
    return base + f"""

At the end of every response, you MUST follow this exact format:

[your slang response]

💬 [word-for-word translation of YOUR slang response above into plain standard {lang_name} — do NOT summarize, do NOT paraphrase, just translate every sentence directly]

📖
slang_term1 = meaning in {lang_name}
slang_term2 = meaning in {lang_name}
(list only the slang/special terms you actually used, max 4, one per line)

The 💬 and 📖 symbols are required in every single response."""


# 각 스타일별 Typecast 보이스 설정
VOICE_CONFIG = {
    'japan_gyaru': {
        'voice_id': os.getenv('VOICE_JAPAN', 'tc_68d49c1e02c83f1fd4cdeaae'),
        'lang':     'jpn',
        'pitch':    0,
        'tempo':    1.0,
    },
    'korea_mz': {
        'voice_id': os.getenv('VOICE_KOREA', 'tc_699d27ef573c4c4d91aa411d'),
        'lang':     'kor',
        'pitch':    0,
        'tempo':    1.05,
    },
    'us_casual': {
        'voice_id': os.getenv('VOICE_US', 'tc_67d237f1782cabcc6155272f'),
        'lang':     'eng',
        'pitch':    0,
        'tempo':    1.0,
    },
    'uk_casual': {
        'voice_id': os.getenv('VOICE_UK', 'tc_67d237f1782cabcc6155272f'),
        'lang':     'eng',
        'pitch':    -1,
        'tempo':    0.95,
    },
    'au_casual': {
        'voice_id': os.getenv('VOICE_AU', 'tc_67d237f1782cabcc6155272f'),
        'lang':     'eng',
        'pitch':    0,
        'tempo':    0.98,
    },
}

# OpenAI TTS 폴백용 보이스 매핑
OPENAI_VOICE_MAP = {
    'japan_gyaru': 'nova',
    'korea_mz':    'nova',
    'us_casual':   'alloy',
    'uk_casual':   'onyx',
    'au_casual':   'echo',
}


def _typecast_tts(text, cfg):
    """Typecast v1 API (api.typecast.ai) — 동기 응답, X-API-KEY 인증."""
    payload = {
        'voice_id': cfg['voice_id'],
        'text':     text,
        'model':    'ssfm-v30',
        'output': {
            'volume':      100,
            'audio_pitch': cfg['pitch'],
            'audio_tempo': cfg['tempo'],
            'audio_format': 'mp3',
        },
    }
    if cfg.get('lang'):
        payload['language'] = cfg['lang']

    resp = requests.post(
        'https://api.typecast.ai/v1/text-to-speech',
        headers={
            'X-API-KEY':    os.getenv('TYPECAST_API_KEY'),
            'Content-Type': 'application/json',
        },
        json=payload,
        timeout=30
    )
    if not resp.ok:
        raise requests.HTTPError(
            f'{resp.status_code} {resp.reason} — {resp.text[:400]}',
            response=resp
        )
    content_type = resp.headers.get('Content-Type', '')
    if 'audio' not in content_type:
        raise ValueError(f'Expected audio, got {content_type}: {resp.text[:200]}')
    return resp.content


def _gpt_chat(messages, temperature=0.7, max_tokens=300, retries=3):
    """OpenAI Chat Completions 호출 with retry."""
    last_err = None
    for attempt in range(retries):
        try:
            resp = openai_client.chat.completions.create(
                model=GPT_MODEL,
                messages=messages,
                temperature=temperature,
                max_completion_tokens=max_tokens,
            )
            return resp.choices[0].message.content
        except Exception as e:
            last_err = e
            err_str = str(e)
            if '429' in err_str or 'rate_limit' in err_str.lower():
                time.sleep(2 ** attempt)
                continue
            raise
    raise last_err


def _parse_ai_response(raw):
    """AI 응답을 슬랭 / 💬 해석 / 📖 단어 목록으로 분리."""
    raw = raw.strip()
    slang, interpretation, vocab = raw, '', []

    if '💬' in raw:
        parts = raw.split('💬', 1)
        slang = parts[0].strip()
        rest  = parts[1].strip()
        if '📖' in rest:
            sub = rest.split('📖', 1)
            interpretation = sub[0].strip()
            for line in sub[1].strip().splitlines():
                line = line.strip()
                if '=' in line:
                    term, meaning = line.split('=', 1)
                    vocab.append({'term': term.strip(), 'meaning': meaning.strip()})
        else:
            interpretation = rest

    return slang, interpretation, vocab


def _clean_slang(raw):
    raw = raw.strip()
    for prefix in ['갸루체:', 'MZ체:', 'Slang:', '슬랭:', '변환:', 'Result:']:
        if raw.lower().startswith(prefix.lower()):
            raw = raw[len(prefix):].strip()
            break
    return raw


@app.route('/')
def index():
    return render_template('index.html')


@app.route('/api/transcribe', methods=['POST'])
def transcribe():
    if 'audio' not in request.files:
        return jsonify({'error': 'No audio file provided'}), 400
    audio_file = request.files['audio']
    with tempfile.NamedTemporaryFile(suffix='.webm', delete=False) as tmp:
        audio_file.save(tmp.name)
        tmp_path = tmp.name
    try:
        result = whisper_model.transcribe(tmp_path)
        return jsonify({
            'text':     result['text'].strip(),
            'language': result.get('language', 'ko'),
        })
    except Exception as e:
        return jsonify({'error': str(e)}), 500
    finally:
        if os.path.exists(tmp_path):
            os.unlink(tmp_path)


@app.route('/api/interpret', methods=['POST'])
def interpret():
    """기존 AI 슬랭 응답을 다른 언어로 재번역 (언어 탭 변경 시 사용)."""
    data      = request.json
    text      = data.get('text', '')
    ui_lang   = data.get('ui_lang', 'ko')
    lang_name = LANG_NAMES.get(ui_lang, 'English')

    prompt = f"""Translate the following slang text into plain standard {lang_name}.
Rules:
- Word-for-word translation, preserve every sentence
- Do NOT summarize or paraphrase
- Use this exact output format:

💬 [plain {lang_name} translation]

📖
slang_term1 = meaning in {lang_name}
slang_term2 = meaning in {lang_name}
(only terms actually in the text, max 4, one per line)

Text:
{text}"""

    try:
        raw = _gpt_chat(
            messages=[{'role': 'user', 'content': prompt}],
            temperature=0.2,
            max_tokens=300,
        )
        if '💬' not in raw:
            raw = f'💬 {raw}'
        _, interpretation, vocab = _parse_ai_response(f'_ {raw}')
        return jsonify({'interpretation': interpretation, 'vocab': vocab})
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@app.route('/api/message', methods=['POST'])
def message():
    """사용자 입력 → 슬랭 변환 + AI 응답(해석 + 단어 설명)을 한 번에 처리."""
    data    = request.json
    style   = data.get('style', 'us_casual')
    text    = data.get('text', '')
    history = data.get('history', [])
    ui_lang = data.get('ui_lang', 'ko')

    prompts = PROMPTS.get(style, PROMPTS['us_casual'])

    # 1단계: 사용자 입력을 슬랭으로 변환
    try:
        raw_slang = _gpt_chat(
            messages=[{'role': 'user', 'content': f"{prompts['translate']}\n\n---\n\n{text}"}],
            temperature=0.7,
            max_tokens=200,
        )
        user_slang = _clean_slang(raw_slang)
    except Exception:
        user_slang = text

    # 2단계: 슬랭 버전을 AI에게 전달하여 응답 생성
    system = _build_chat_prompt(style, ui_lang)
    messages = [{'role': 'system', 'content': system}]
    for m in history:
        role = 'assistant' if m['role'] == 'assistant' else 'user'
        messages.append({'role': role, 'content': m['content']})
    messages.append({'role': 'user', 'content': user_slang})

    try:
        ai_text = _gpt_chat(messages, temperature=0.85, max_tokens=600)
        ai_slang, ai_interpretation, ai_vocab = _parse_ai_response(ai_text)
    except Exception as e:
        return jsonify({'error': str(e)}), 500

    return jsonify({
        'user_slang':        user_slang,
        'ai_slang':          ai_slang,
        'ai_interpretation': ai_interpretation,
        'ai_vocab':          ai_vocab,
    })


@app.route('/api/tts', methods=['POST'])
def tts():
    data  = request.json
    text  = data.get('text', '')
    style = data.get('style', 'us_casual')
    cfg   = VOICE_CONFIG.get(style, VOICE_CONFIG['us_casual'])

    # 1순위: Typecast
    if cfg['voice_id'] and os.getenv('TYPECAST_API_KEY'):
        try:
            audio_bytes = _typecast_tts(text[:2000], cfg)
            audio_b64 = base64.b64encode(audio_bytes).decode('utf-8')
            return jsonify({'audio': audio_b64})
        except Exception as e:
            app.logger.warning(f'Typecast TTS failed ({style}): {e}')

    # 2순위: OpenAI TTS
    if openai_client:
        voice = OPENAI_VOICE_MAP.get(style, 'alloy')
        try:
            response = openai_client.audio.speech.create(
                model='tts-1', voice=voice, input=text[:4096]
            )
            audio_b64 = base64.b64encode(response.content).decode('utf-8')
            return jsonify({'audio': audio_b64})
        except Exception as e:
            app.logger.warning(f'OpenAI TTS failed ({style}): {e}')

    # 둘 다 실패 시 브라우저 TTS 폴백 (503 대신 200)
    return jsonify({'fallback': True})


if __name__ == '__main__':
    app.run(debug=True, port=5000)
