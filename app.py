from flask import Flask, request, jsonify, render_template
from flask_cors import CORS
import openai
import whisper
import numpy as np
import subprocess
import os
from dotenv import load_dotenv
import base64
import time
import requests
import json

load_dotenv()

app = Flask(__name__)
CORS(app)

_whisper_model = None

def get_whisper_model():
    global _whisper_model
    if _whisper_model is None:
        print("Whisper turbo 모델 로딩 중...")
        _whisper_model = whisper.load_model("turbo")
        print("Whisper 로드 완료")
    return _whisper_model

get_whisper_model()  # 서버 시작 시 즉시 로드


def _audio_to_array(data: bytes) -> np.ndarray:
    """WebM/OGG 바이트를 디스크 없이 FFmpeg 파이프로 float32 16kHz 배열로 변환."""
    proc = subprocess.Popen(
        [
            'ffmpeg', '-nostdin', '-loglevel', 'error',
            '-i', 'pipe:0',
            '-ac', '1', '-ar', '16000', '-f', 'f32le', 'pipe:1',
        ],
        stdin=subprocess.PIPE,
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE,
    )
    out, err = proc.communicate(input=data)
    if proc.returncode != 0:
        raise RuntimeError(f'ffmpeg 변환 실패: {err.decode()}')
    return np.frombuffer(out, dtype=np.float32).copy()

_openai_key = os.getenv('OPENAI_API_KEY')
openai_client = openai.OpenAI(api_key=_openai_key) if _openai_key else None

GPT_MODEL = 'gpt-4o-mini'

# UI 언어 코드 → 언어명
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

# 스타일 언어 키 → 타겟 언어명 (연습 중인 언어)
TARGET_LANG_NAMES = {
    'ko':    '한국어',
    'ja':    '日本語',
    'en_us': 'English',
    'zh':    '中文',
}

# 카테고리별 📖 레이블
CATEGORY_VOCAB_LABEL = {
    'friend':   'slang/casual expressions',
    'business': 'business expressions',
    'travel':   'travel phrases',
}

# 🎯 코칭 예시 문구 (언어별)
COACHING_EXAMPLES = {
    'ko': '"~라고 하면 더 자연스러워요" or "~표현이 더 적절해요"',
    'ja': '"~と言うとより自然です" or "~という表現がより適切です"',
    'en': '"Saying ~ sounds more natural" or "~ is a more appropriate expression"',
    'zh': '"说~更自然" or "~的表达更合适"',
    'es': '"Decir ~ suena más natural" or "~ es una expresión más apropiada"',
    'fr': '"Dire ~ est plus naturel" or "~ est une expression plus appropriée"',
    'de': '"~ klingt natürlicher" or "~ ist ein passenderer Ausdruck"',
    'pt': '"Dizer ~ soa mais natural" or "~ é uma expressão mais apropriada"',
    'ru': '"Сказать ~ звучит более естественно" or "~ — более подходящее выражение"',
    'vi': '"Nói ~ tự nhiên hơn" or "~ là cách diễn đạt phù hợp hơn"',
    'th': '"พูดว่า~ ฟังดูเป็นธรรมชาติกว่า" or "~ เป็นสำนวนที่เหมาะสมกว่า"',
    'ar': '"قول ~ يبدو أكثر طبيعية" or "~ تعبير أكثر ملاءمة"',
}

PROMPTS = {
    # ══ 한국어 ════════════════════════════════════
    'ko_friend': {
        'chat': """너는 수현이야. 한국 MZ/인터넷 밈 말투를 쓰는 친구 같은 AI야.
킹받네, 폼 미쳤다, 개웃김, 현타, 억까, 찐, 레전드, 갓생, ㄹㅇ, 극공감, 각이다 같은 표현을 자연스럽게 써.
친한 친구한테 카톡 보내듯 캐주얼하게 대화해.""",
        'translate': """다음 문장을 한국 MZ 말투로 자연스럽게 변환해줘.
규칙:
- MZ 슬랭은 1~2개만, 문맥에 딱 맞는 것만 사용해
- 원문 길이에 비례하게, 짧은 입력은 짧게 변환해
- 슬랭을 억지로 여러 개 끼워 넣지 마 — 과장하지 말고 자연스럽게
- 변환된 문장만 출력해. 설명, 라벨, 기타 텍스트는 절대 포함하지 마."""
    },
    'ko_business': {
        'chat': """너는 준서야. 한국 직장에서 자연스럽게 쓰이는 비즈니스 말투로 대화하는 AI야.
교과서식 격식체가 아닌, 실제 한국 직장인들이 쓰는 자연스러운 존댓말과 표현을 사용해.
예: "말씀하신 부분 제가 검토해볼게요.", "혹시 불편하신 점 있으신가요?", "바로 확인하겠습니다." """,
        'translate': """다음 문장을 한국 직장에서 자연스럽게 쓰이는 비즈니스 말투로 변환해줘.
너무 딱딱하지 않은 자연스러운 직장 존댓말만 출력해. 설명, 라벨, 기타 텍스트는 절대 포함하지 마."""
    },
    'ko_travel': {
        'chat': """너는 지아야. 한국 여행에서 쓰이는 실용적인 표현을 알려주는 AI야.
식당, 관광지, 교통, 쇼핑 등 여행 상황에서 자연스럽게 쓰이는 한국어 표현을 사용해.
예: "이거 얼마예요?", "어디서 탈 수 있어요?", "여기서 사진 찍어도 돼요?" """,
        'translate': """다음 문장을 한국 여행에서 쓰이는 실용 표현으로 변환해줘.
자연스러운 여행 한국어 문장만 출력해. 설명, 라벨, 기타 텍스트는 절대 포함하지 마."""
    },

    # ══ 일본어 ════════════════════════════════════
    'ja_friend': {
        'chat': """あなたはゆいです。日本のギャル語で話すAIです。
マジ、やばい、〜じゃん、ウケる、無理無理、あげ、まじ卍、ちょー、めっちゃ などのギャル表現を自然に使ってください。
ハイテンションで明るく可愛い話し方で会話してください。""",
        'translate': """다음 문장을 일본 갸루체로 자연스럽게 변환해줘.
규칙:
- 갸루 표현은 1~2개만, 문맥에 자연스러운 것만 사용해
- 원문 길이에 비례하게, 짧은 입력은 짧게 변환해
- 억지로 여러 표현을 끼워 넣지 마 — 과장하지 말고 자연스럽게
- 변환된 문장만 출력해. 설명, 라벨, 기타 텍스트는 절대 포함하지 마."""
    },
    'ja_business': {
        'chat': """あなたはケンジです。自然なビジネス敬語で話すAIです。
よろしくお願いいたします、承知いたしました、ご確認ください、お疲れ様です、ご検討のほどよろしくお願いいたします など、
実際の日本の職場で使われる自然な敬語を使ってください。丁寧ですが堅苦しすぎない話し方で。""",
        'translate': """다음 문장을 일본 비즈니스 경어(ビジネス敬語)로 변환해줘.
자연스러운 직장 일본어만 출력해. 설명, 라벨, 기타 텍스트는 절대 포함하지 마."""
    },
    'ja_travel': {
        'chat': """あなたはさくらです。旅行者のための実用的な日本語で話すAIです。
すみません、〜はどこですか？、〜をください、いくらですか？、ありがとうございます など、
旅行でよく使われる自然な日本語表現を使ってください。""",
        'translate': """다음 문장을 여행 일본어 실용 표현으로 변환해줘.
자연스러운 여행 일본어 문장만 출력해. 설명, 라벨, 기타 텍스트는 절대 포함하지 마."""
    },

    # ══ 영어 미국 ══════════════════════════════════
    'en_us_friend': {
        'chat': """You are Tyler, a chill Gen Z American AI. Always respond in casual American slang.
Use: no cap, lowkey, highkey, slay, vibe, bet, fr, rizz, ate, bussin, it's giving, understood the assignment, periodt.
Keep it fun, casual, and positive.""",
        'translate': """Convert the following text into casual American Gen Z slang naturally.
Rules:
- Use only 1-2 slang terms that genuinely fit the context
- Keep the length proportional to the original — short input stays short
- Do NOT cram multiple slang words together — keep it natural, not exaggerated
- Output ONLY the converted sentence. No labels, no explanations, no other text."""
    },
    'en_us_business': {
        'chat': """You are Alex, an AI using natural American professional English.
Not textbook formal — how real US professionals talk: "Let me circle back on that", "Can we sync up?",
"I'll loop you in", "Let's take this offline", "That's a great point", "I'll follow up on this".
Friendly, direct, collaborative American office tone.""",
        'translate': """Convert the following text into natural American professional English.
Friendly but professional, like a real US office worker.
Output ONLY the converted sentence. No labels, no explanations."""
    },
    'en_us_travel': {
        'chat': """You are Zoe, an AI using practical American English for travelers.
Use natural travel phrases: "Excuse me, how do I get to...?", "Can I get the check please?",
"What do you recommend?", "Do you take credit cards?", "Is there a restroom nearby?".
Friendly, helpful American travel communication.""",
        'translate': """Convert the following text into practical American travel English.
Natural travel phrases, not formal.
Output ONLY the converted sentence. No labels, no explanations."""
    },

    # ══ 중국어 ════════════════════════════════════
    'zh_friend': {
        'chat': """你是小美，一个使用中国网络用语的AI朋友。
自然地使用中国年轻人的流行语：yyds（永远的神）、绝绝子、芭比Q了、破防了、整活、摆烂、内卷、狠狠地、好家伙、冲冲冲。
就像中国年轻人发微博、微信时的语气，活泼有趣有梗。""",
        'translate': """将以下文字自然地转换成中国网络流行语风格。
规则：
- 只使用1~2个最贴切的网络用语，不要堆砌多个
- 输出长度与原文保持相近，短句保持简短
- 不要过度夸张，保持自然
- 只输出转换后的句子，不要包含任何说明或标签。"""
    },
    'zh_business': {
        'chat': """你是明浩，一个使用中国职场商务语言的AI。
使用自然的职场表达：请问这件事如何处理？、辛苦了、好的我来跟进、麻烦您了、这个方案挺不错的、稍等我确认一下。
专业但不过于正式，就像真实中国职场环境中的沟通。""",
        'translate': """将以下文字转换成中国职场商务语气。
自然专业，像真实职场中文。只输出转换后的句子，不要包含任何说明或标签。"""
    },
    'zh_travel': {
        'chat': """你是晓燕，一个帮助旅行者用中文沟通的AI。
使用实用的旅游中文表达：这个多少钱？、请问洗手间在哪里？、谢谢！、我想要...、能帮我照张相吗？、请问怎么去...？
自然友好，就像在中国旅游时当地人的交流方式。""",
        'translate': """将以下文字转换成实用旅游中文。
自然的旅游用语。只输出转换后的句子，不要包含任何说明或标签。"""
    },
}


def _build_chat_prompt(style, ui_lang, mission_prompt=''):
    lang_name = LANG_NAMES.get(ui_lang, 'English')
    base = PROMPTS[style]['chat']
    category = style.split('_')[-1]
    vocab_label = CATEGORY_VOCAB_LABEL.get(category, 'expressions')
    coaching_examples = COACHING_EXAMPLES.get(ui_lang, COACHING_EXAMPLES['en'])
    # 타겟 언어 (연습 중인 언어) — style에서 추출
    lang_key = '_'.join(style.split('_')[:-1])  # ko / ja / en_us / zh
    target_lang = TARGET_LANG_NAMES.get(lang_key, 'English')

    scenario_block = ''
    if mission_prompt:
        scenario_block = f"\n\nSCENARIO: {mission_prompt}\nKeep this scenario context throughout the entire conversation.\n"

    return base + scenario_block + f"""

RESPONSE RULES:
- Stay in character at all times.
- NEVER correct or mention the user's language in "reply" — all feedback goes ONLY in "coaching".
- Always end "reply" with a question to keep the conversation going.

You MUST return a valid JSON object with EXACTLY these four fields (no markdown fences, no extra text):
{{
  "reply": "<your character's natural response — end with a question>",
  "translation": "<translate YOUR reply into {lang_name}, sentence by sentence>",
  "vocab": [
    {{"term": "<word/phrase from your reply>", "meaning": "<meaning in {lang_name}>"}},
    {{"term": "<word/phrase from your reply>", "meaning": "<meaning in {lang_name}>"}}
  ],
  "coaching": "<feedback on the USER's {target_lang} — explanation text in {lang_name}, quoted expressions in {target_lang} — e.g. {coaching_examples}>"
}}

Field rules (ALL fields are mandatory — never omit any):
- "reply": in-character, natural, end with a question, NEVER mention user language errors
- "translation": translate YOUR reply into {lang_name} only — NOT any previous AI message
- "vocab": 1–4 {vocab_label} from your reply; meanings MUST be in {lang_name}; NEVER an empty array
- "coaching" — about the USER'S message ONLY (strictly enforced):
  • Look at the user's LAST message only — ignore AI responses entirely
  • Pick ONE specific word or phrase the user actually typed and comment on its naturalness
  • If natural: praise exactly that word/phrase
  • If unnatural: suggest a better {target_lang} alternative for that specific word/phrase
  • NEVER comment on grammar structure, topic, or content — only word/phrase naturalness
  • NEVER mention capitalization or punctuation
  • Language rules:
    - All explanatory text MUST be in {lang_name} — ZERO {target_lang} words in explanation sentences
    - User's original word/phrase → quote exactly as typed, wrapped in 「」 (keep in {target_lang})
    - Better alternative → write in {target_lang}, wrapped in 「」
    - Structure: [explanation in {lang_name}] 「[user's word in {target_lang}]」 [explanation in {lang_name}] 「[better word in {target_lang}]」"""


# 각 스타일별 Typecast 보이스 설정
VOICE_CONFIG = {
    'ko_friend':      {'voice_id': os.getenv('VOICE_KOREA', 'tc_699d27ef573c4c4d91aa411d'), 'lang': 'kor', 'pitch': 0,  'tempo': 1.05},
    'ko_business':    {'voice_id': os.getenv('VOICE_KOREA', 'tc_68257f68bc6e3c161ab5078d'), 'lang': 'kor', 'pitch': -1, 'tempo': 0.95},
    'ko_travel':      {'voice_id': os.getenv('VOICE_KOREA', 'tc_6788847e9939d48aeb8642d2'), 'lang': 'kor', 'pitch': 0,  'tempo': 1.0},
    'ja_friend':      {'voice_id': os.getenv('VOICE_JAPAN', 'tc_68d49c1e02c83f1fd4cdeaae'), 'lang': 'jpn', 'pitch': 0,  'tempo': 1.0},
    'ja_business':    {'voice_id': os.getenv('VOICE_JAPAN', 'tc_629fe972013e90b4db213fd8'), 'lang': 'jpn', 'pitch': -1, 'tempo': 0.92},
    'ja_travel':      {'voice_id': os.getenv('VOICE_JAPAN', 'tc_62baac31e1c614d37b9160e3'), 'lang': 'jpn', 'pitch': 0,  'tempo': 1.0},
    'en_us_friend':   {'voice_id': os.getenv('VOICE_US', 'tc_67d237f1782cabcc6155272f'),   'lang': 'eng', 'pitch': 0,  'tempo': 1.0},
    'en_us_business': {'voice_id': os.getenv('VOICE_US', 'tc_67c90d1c45897c4a74a51a8d'),   'lang': 'eng', 'pitch': -1, 'tempo': 0.95},
    'en_us_travel':   {'voice_id': os.getenv('VOICE_US', 'tc_67edd95eafe0d80b072ad31e'),   'lang': 'eng', 'pitch': 0,  'tempo': 1.0},
    'zh_friend':      {'voice_id': os.getenv('VOICE_ZH', 'tc_68d49c2db4c8a308c4030245'),                              'lang': 'cmn', 'pitch': 0,  'tempo': 1.0},
    'zh_business':    {'voice_id': os.getenv('VOICE_ZH', 'tc_65681f1157abc7266fd4f350'),                              'lang': 'cmn', 'pitch': -1, 'tempo': 0.95},
    'zh_travel':      {'voice_id': os.getenv('VOICE_ZH', 'tc_65681f1157abc7266fd4f350'),                              'lang': 'cmn', 'pitch': 0,  'tempo': 1.0},
}

# OpenAI TTS 폴백용 보이스 매핑
OPENAI_VOICE_MAP = {
    'ko_friend':      'nova',
    'ko_business':    'onyx',
    'ko_travel':      'nova',
    'ja_friend':      'nova',
    'ja_business':    'onyx',
    'ja_travel':      'shimmer',
    'en_us_friend':   'alloy',
    'en_us_business': 'onyx',
    'en_us_travel':   'alloy',
    'zh_friend':      'nova',
    'zh_business':    'onyx',
    'zh_travel':      'shimmer',
}

DEFAULT_STYLE = 'en_us_friend'


def _typecast_tts(text, cfg):
    payload = {
        'voice_id': cfg['voice_id'],
        'text':     text,
        'model':    'ssfm-v30',
        'output': {
            'volume':       100,
            'audio_pitch':  cfg['pitch'],
            'audio_tempo':  cfg['tempo'],
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


def _gpt_chat(messages, temperature=0.7, max_tokens=300, retries=3, json_mode=False):
    last_err = None
    for attempt in range(retries):
        try:
            kwargs = dict(
                model=GPT_MODEL,
                messages=messages,
                temperature=temperature,
                max_completion_tokens=max_tokens,
            )
            if json_mode:
                kwargs['response_format'] = {'type': 'json_object'}
            resp = openai_client.chat.completions.create(**kwargs)
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
    """JSON 형식 파싱 (chat endpoint). 실패 시 이모지 형식 폴백."""
    raw = raw.strip()
    # markdown 코드펜스 제거
    clean = raw
    if clean.startswith('```'):
        clean = clean[clean.find('\n')+1:] if '\n' in clean else clean[3:]
        clean = clean.removesuffix('```').strip()
    try:
        data = json.loads(clean)
        slang          = str(data.get('reply', '')).strip() or raw
        interpretation = str(data.get('translation', '')).strip()
        coaching       = str(data.get('coaching', '')).strip()
        vocab_raw      = data.get('vocab', [])
        vocab = [
            {'term': str(v.get('term', '')).strip(), 'meaning': str(v.get('meaning', '')).strip()}
            for v in (vocab_raw if isinstance(vocab_raw, list) else [])
            if v.get('term') and v.get('meaning')
        ]
        return slang, interpretation, vocab, coaching
    except (json.JSONDecodeError, AttributeError, TypeError):
        return _parse_ai_response_legacy(raw)


_VOCAB_SEPS = [' = ', ' → ', ' — ', ' – ', ' : ', ': ', ' - ']

def _split_vocab_line(line):
    line = line.lstrip('-•*·· ').strip()
    for sep in _VOCAB_SEPS:
        if sep in line:
            term, meaning = line.split(sep, 1)
            return term.strip(' "\'「」'), meaning.strip(' "\'「」')
    return None, None

def _is_label_line(line):
    SKIP = ('표현 설명', '표현설명', 'vocab', 'expressions', 'phrases', '词汇', '表現', '단어')
    low = line.lower()
    return any(low.startswith(s.lower()) for s in SKIP) or len(line) < 2

def _parse_ai_response_legacy(raw):
    """이모지 형식 파싱 폴백 (/api/interpret 등에서 사용)."""
    slang, interpretation, vocab, coaching = raw, '', [], ''
    if '💬' not in raw:
        return slang, interpretation, vocab, coaching
    parts = raw.split('💬', 1)
    slang = parts[0].strip()
    rest  = parts[1].strip()
    if '📖' in rest:
        sub = rest.split('📖', 1)
        interpretation = sub[0].strip()
        vocab_block    = sub[1].strip()
        if '🎯' in vocab_block:
            vocab_part, coaching_part = vocab_block.split('🎯', 1)
            coaching = coaching_part.strip()
        else:
            vocab_part = vocab_block
        prev_term = None
        for line in vocab_part.strip().splitlines():
            line = line.strip()
            if not line or _is_label_line(line):
                continue
            term, meaning = _split_vocab_line(line)
            if term and meaning:
                vocab.append({'term': term, 'meaning': meaning})
                prev_term = None
            elif prev_term is not None:
                vocab.append({'term': prev_term, 'meaning': line.strip(' "\'「」')})
                prev_term = None
            else:
                prev_term = line.strip(' "\'「」')
    else:
        if '🎯' in rest:
            interp_part, coaching_part = rest.split('🎯', 1)
            interpretation = interp_part.strip()
            coaching = coaching_part.strip()
        else:
            interpretation = rest
    return slang, interpretation, vocab, coaching


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
    audio_bytes = request.files['audio'].read()
    lang_hint   = request.form.get('lang') or None
    try:
        audio_arr = _audio_to_array(audio_bytes)
        result = get_whisper_model().transcribe(
            audio_arr,
            language=lang_hint,
            beam_size=1,              # greedy 디코딩 — beam_size=5 대비 최대 5× 빠름
            temperature=0,            # 확률 샘플링 없이 결정론적 디코딩
            condition_on_previous_text=False,  # 세그먼트 간 컨텍스트 전파 생략
            fp16=False,               # CPU에서는 fp16 미지원, 명시 비활성화
        )
        return jsonify({
            'text':     result['text'].strip(),
            'language': result.get('language', lang_hint or 'ko'),
        })
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@app.route('/api/interpret', methods=['POST'])
def interpret():
    data      = request.json
    text      = data.get('text', '')
    ui_lang   = data.get('ui_lang', 'ko')
    lang_name = LANG_NAMES.get(ui_lang, 'English')

    prompt = f"""Translate the following text into plain standard {lang_name}.
Rules:
- Word-for-word translation, preserve every sentence
- Do NOT summarize or paraphrase
- In the 📖 section: the LEFT side (term) stays in the original language; the RIGHT side (meaning) MUST be written ONLY in {lang_name} — never in any other language
- Use this exact output format:

💬 [plain {lang_name} translation]

📖
expression1 = meaning written in {lang_name}
expression2 = meaning written in {lang_name}
(only terms actually in the text, max 4, one per line; meanings MUST be in {lang_name})

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
        _, interpretation, vocab, _ = _parse_ai_response(f'_ {raw}')
        return jsonify({'interpretation': interpretation, 'vocab': vocab})
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@app.route('/api/message', methods=['POST'])
def message():
    data    = request.json
    style   = data.get('style', DEFAULT_STYLE)
    text    = data.get('text', '')
    history = data.get('history', [])
    ui_lang = data.get('ui_lang', 'ko')

    mission_prompt = data.get('mission_prompt', '')
    system = _build_chat_prompt(style, ui_lang, mission_prompt)

    # 히스토리를 최근 8개(4회 대화)로 제한 — 컨텍스트 과부하 방지
    trimmed_history = history[-8:] if len(history) > 8 else history

    messages = [{'role': 'system', 'content': system}]
    for m in trimmed_history:
        role = 'assistant' if m['role'] == 'assistant' else 'user'
        messages.append({'role': role, 'content': m['content']})
    messages.append({'role': 'user', 'content': text})

    try:
        ai_text = _gpt_chat(messages, temperature=0.85, max_tokens=1000, json_mode=True)
        ai_slang, ai_interpretation, ai_vocab, ai_coaching = _parse_ai_response(ai_text)
    except Exception as e:
        return jsonify({'error': str(e)}), 500

    return jsonify({
        'ai_slang':          ai_slang,
        'ai_interpretation': ai_interpretation,
        'ai_vocab':          ai_vocab,
        'ai_coaching':       ai_coaching,
    })


@app.route('/api/mission-start', methods=['POST'])
def mission_start():
    """미션 선택 후 AI가 해당 상황을 설정하며 대화를 유도하는 첫 메시지 생성."""
    data          = request.json
    style         = data.get('style', DEFAULT_STYLE)
    ui_lang       = data.get('ui_lang', 'ko')
    mission_prompt = data.get('mission_prompt', '')

    system = _build_chat_prompt(style, ui_lang, mission_prompt)
    system += """

IMPORTANT: This is the START of the conversation.
- Briefly describe the scenario in 1 sentence (in your character's style)
- Then ask the user their first question to begin the role-play
- Do NOT wait — you initiate the conversation"""

    messages = [
        {'role': 'system', 'content': system},
        {'role': 'user',   'content': '__START__'},
    ]

    try:
        ai_text = _gpt_chat(messages, temperature=0.9, max_tokens=800, json_mode=True)
        ai_slang, ai_interpretation, ai_vocab, _ = _parse_ai_response(ai_text)
        return jsonify({
            'ai_slang':          ai_slang,
            'ai_interpretation': ai_interpretation,
            'ai_vocab':          ai_vocab,
        })
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@app.route('/api/mission-feedback', methods=['POST'])
def mission_feedback():
    data          = request.json
    history       = data.get('history', [])
    style         = data.get('style', DEFAULT_STYLE)
    ui_lang       = data.get('ui_lang', 'ko')
    mission_title = data.get('mission_title', '')
    lang_name     = LANG_NAMES.get(ui_lang, 'English')

    user_messages = [m['content'] for m in history if m['role'] == 'user']
    if not user_messages:
        return jsonify({'error': 'No user messages to evaluate'}), 400

    # 타겟 언어 추출 (ko_friend → ko)
    lang_key    = style.rsplit('_', 1)[0] if '_' in style else style
    target_lang = LANG_NAMES.get(lang_key, 'English')
    category    = style.split('_')[-1]
    vocab_label = CATEGORY_VOCAB_LABEL.get(category, 'expressions')

    convo_text = '\n'.join(
        f"{'[User]' if m['role'] == 'user' else '[AI]'}: {m['content']}"
        for m in history
    )

    prompt = f"""You are an encouraging language coach reviewing a student's {target_lang} conversation practice.

Mission: "{mission_title}"
Focus area: {vocab_label}

Conversation transcript:
{convo_text}

Evaluate ONLY the [User]'s messages.
Return ONLY a valid JSON object with exactly this structure — no markdown, no extra text:
{{
  "strengths": ["<strength>", "<strength>"],
  "improvements": [
    {{
      "point": "<issue description>",
      "original": "<user's actual phrase>",
      "better": "<better {target_lang} alternative>"
    }}
  ],
  "encouragement": "<closing message>"
}}

CRITICAL LANGUAGE RULES — follow exactly:
- "strengths" items: write ENTIRELY in {lang_name}. ZERO words from {target_lang} or any other language.
- "improvements[].point": write ENTIRELY in {lang_name}. ZERO mixing.
- "improvements[].original": keep in the original language the user typed it in.
- "improvements[].better": write in {target_lang} only.
- "encouragement": write ENTIRELY in {lang_name}. ZERO words from {target_lang} or any other language.
- If you want to reference a target-language expression inside strengths/point/encouragement, wrap it in 「」 but keep all surrounding text in {lang_name}.

Content rules:
- strengths: 1-2 items — cite the EXACT word or phrase the user typed (in 「」) and explain WHY it was correct or natural. NO vague emotional praise like "showed confidence" or "great attitude". Concrete only.
- improvements: 1-3 items; only include real issues
- encouragement: 1-2 sentences, warm and motivating"""

    try:
        raw = _gpt_chat(
            messages=[{'role': 'user', 'content': prompt}],
            temperature=0.4,
            max_tokens=600,
        )
        clean = raw.strip().removeprefix('```json').removeprefix('```').removesuffix('```').strip()
        feedback = json.loads(clean)
        return jsonify(feedback)
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@app.route('/api/translate-feedback', methods=['POST'])
def translate_feedback():
    data      = request.json
    feedback  = data.get('feedback', {})
    ui_lang   = data.get('ui_lang', 'ko')
    lang_name = LANG_NAMES.get(ui_lang, 'English')

    prompt = f"""Translate the language learning feedback below into {lang_name}.
Return ONLY valid JSON with the same structure — no markdown, no extra text.

CRITICAL rules:
- Translate ENTIRELY into {lang_name}: "missionTitle", "strengths" items, "improvements[].point", "encouragement"
- These fields must contain ZERO words from any other language — pure {lang_name} only
- Exception: expressions inside 「」 may stay in their original language; keep all surrounding text in {lang_name}
- Do NOT translate at all: "improvements[].original", "improvements[].better" — copy them verbatim

Input:
{json.dumps(feedback, ensure_ascii=False)}"""

    try:
        raw   = _gpt_chat(
            messages=[{'role': 'user', 'content': prompt}],
            temperature=0.2,
            max_tokens=600,
        )
        clean = raw.strip().removeprefix('```json').removeprefix('```').removesuffix('```').strip()
        return jsonify(json.loads(clean))
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@app.route('/api/translate', methods=['POST'])
def translate():
    data = request.json
    text = data.get('text', '')
    ui_lang = data.get('ui_lang', 'ko')
    lang_name = LANG_NAMES.get(ui_lang, 'English')

    prompt = f"""Translate the following coaching feedback into {lang_name}.
Critical rules:
- Translate ONLY the surrounding explanation text into {lang_name}
- NEVER translate expressions inside 「」 or quotation marks — keep them EXACTLY as-is in their original language
- Output ONLY the translated result. No labels, no extra text.

Text: {text}"""

    try:
        raw = _gpt_chat(
            messages=[{'role': 'user', 'content': prompt}],
            temperature=0.2,
            max_tokens=200,
        )
        return jsonify({'text': raw.strip()})
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@app.route('/api/tts', methods=['POST'])
def tts():
    data  = request.json
    text  = data.get('text', '')
    style = data.get('style', DEFAULT_STYLE)
    cfg   = VOICE_CONFIG.get(style, VOICE_CONFIG[DEFAULT_STYLE])

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

    return jsonify({'fallback': True})


if __name__ == '__main__':
    # threaded=True: 전사 중에도 다른 요청 처리 가능
    # use_reloader=False: 리로더가 Whisper 모델을 2번 로드하는 것 방지
    app.run(debug=True, port=5001, threaded=True, use_reloader=False)
