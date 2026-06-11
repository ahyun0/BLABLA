from flask import Flask, request, jsonify, render_template
from flask_cors import CORS
import openai
import whisper
from google import genai
from google.genai import types as genai_types
import os
from dotenv import load_dotenv
import base64
import tempfile
import time
import requests

load_dotenv()

app = Flask(__name__)
CORS(app)

# Whisper 로컬 모델 — 서버 시작 시 한 번만 로드
print("Whisper turbo 모델 로딩 중...")
whisper_model = whisper.load_model("turbo")
print("Whisper 로드 완료")

# OpenAI — TTS 전용 (키 없으면 브라우저 TTS로 폴백)
_openai_key = os.getenv('OPENAI_API_KEY')
openai_client = openai.OpenAI(api_key=_openai_key) if _openai_key else None

# Google Gemini — LLM 전용
gemini_client = genai.Client(api_key=os.getenv('GEMINI_API_KEY'))

PROMPTS = {
    'japan_gyaru': {
        'chat': """너는 일본 갸루체로 말하는 AI야. 항상 갸루체 일본어로 대화해.
マジ, やばい, 〜じゃん, ウケる, 無理無理, あげ, まじ卍, ちょー, めっちゃ 같은 갸루 표현을 자연스럽게 써.
하이텐션으로 밝고 귀엽게 대화해줘.
답변 마지막에 줄바꿈 후 「(해설: 한국어로 짧게)」 형식으로 해석을 달아줘.""",
        'translate': """다음 문장을 일본 갸루체로 변환해줘.
マジ, やばい, 〜じゃん, ウケる, めっちゃ 같은 갸루 표현을 섞어.
형식(반드시 지켜줘):
갸루체: [변환된 문장]
해설: [간단한 한국어 설명]"""
    },
    'korea_mz': {
        'chat': """너는 한국 MZ/인터넷 밈 말투를 쓰는 AI야.
킹받네, 폼 미쳤다, 개웃김, 현타, 억까, 찐, 레전드, 갓생, ㄹㅇ, 극공감, 각이다 같은 표현을 자연스럽게 써.
친한 친구한테 카톡 보내듯 캐주얼하게 대화해.""",
        'translate': """다음 문장을 한국 MZ/인터넷 밈 말투로 변환해줘.
킹받네, 폼 미쳤다, 개웃김, 찐, 레전드, ㄹㅇ, 각이다 같은 표현을 써.
형식(반드시 지켜줘):
MZ체: [변환된 문장]
해설: [어떤 표현을 사용했는지 간단히]"""
    },
    'us_casual': {
        'chat': """You are a chill Gen Z American AI. Always respond in casual American slang.
Use: no cap, lowkey, highkey, slay, vibe, bet, fr, rizz, ate, bussin, it's giving, understood the assignment, periodt.
Keep it fun, casual, and positive. If user speaks Korean, still respond in English slang.""",
        'translate': """Convert the following text into casual American Gen Z slang.
Use expressions like: no cap, lowkey, slay, vibe, bet, fr, rizz, ate, bussin.
Format (strictly follow):
Slang: [converted text]
해설: [간단한 한국어 설명]"""
    },
    'uk_casual': {
        'chat': """You are a British AI with dry wit and casual British slang.
Use: mate, cheers, bloody, knackered, brilliant, fancy, rubbish, proper, dodgy, gutted, cheeky, innit, bloke.
Be witty, slightly sardonic, authentically British. Respond in English.""",
        'translate': """Convert the following text into casual British slang.
Use: mate, cheers, bloody, brilliant, proper, dodgy, gutted, cheeky, innit.
Format (strictly follow):
Slang: [converted text]
해설: [간단한 한국어 설명]"""
    },
    'au_casual': {
        'chat': """You are a laid-back Australian AI. Always speak in casual Aussie slang.
Use: mate, no worries, arvo, brekkie, heaps, reckon, good on ya, strewth, ripper, servo.
Be warm, friendly, relaxed. Respond in English.""",
        'translate': """Convert the following text into Australian casual slang.
Use: mate, no worries, arvo, brekkie, heaps, reckon, ripper, strewth.
Format (strictly follow):
Slang: [converted text]
해설: [간단한 한국어 설명]"""
    }
}

# .env에서 Typecast actor ID 관리
VOICE_MAP = {
    'japan_gyaru': os.getenv('VOICE_JAPAN', 'tc_68d49c1e02c83f1fd4cdeaae'),
    'korea_mz':    os.getenv('VOICE_KOREA', 'tc_6731b292d944a485bc406efb'),
    'us_casual':   os.getenv('VOICE_US',    ''),
    'uk_casual':   os.getenv('VOICE_UK',    ''),
    'au_casual':   os.getenv('VOICE_AU',    ''),
}


def _typecast_tts(text, actor_id):
    api_key = os.getenv('TYPECAST_API_KEY')
    headers = {'Authorization': f'Bearer {api_key}'}

    # 1. 합성 요청
    resp = requests.post(
        'https://typecast.ai/api/speak',
        headers=headers,
        json={
            'text': text,
            'lang': 'auto',
            'actor_id': actor_id,
            'xfade': 0.1,
            'tempo': 1.0,
            'volume': 100,
            'pitch': 0,
        },
        timeout=10
    )
    resp.raise_for_status()
    speak_url = resp.json()['result']['speak_v2_url']

    # 2. 완료될 때까지 폴링 (최대 30초)
    for _ in range(30):
        time.sleep(1)
        poll = requests.get(speak_url, headers=headers, timeout=10)
        poll.raise_for_status()
        result = poll.json()['result']
        if result['status'] == 'done':
            audio_resp = requests.get(result['audio_download_url'], timeout=15)
            audio_resp.raise_for_status()
            return audio_resp.content

    raise TimeoutError('Typecast TTS timeout')


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
        return jsonify({'text': result['text'].strip()})
    except Exception as e:
        return jsonify({'error': str(e)}), 500
    finally:
        if os.path.exists(tmp_path):
            os.unlink(tmp_path)


@app.route('/api/chat', methods=['POST'])
def chat():
    data = request.json
    style = data.get('style', 'us_casual')
    messages = data.get('messages', [])

    system = PROMPTS.get(style, PROMPTS['us_casual'])['chat']

    try:
        # 시스템 프롬프트를 첫 번째 메시지에 주입
        contents = []
        for i, m in enumerate(messages):
            role = 'user' if m['role'] == 'user' else 'model'
            text_content = f"{system}\n\n---\n\n{m['content']}" if i == 0 else m['content']
            contents.append({'role': role, 'parts': [{'text': text_content}]})

        response = gemini_client.models.generate_content(
            model='models/gemini-2.5-flash',
            contents=contents,
            config=genai_types.GenerateContentConfig(
                temperature=0.85,
                max_output_tokens=500,
            )
        )
        return jsonify({'response': response.text})
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@app.route('/api/translate', methods=['POST'])
def translate():
    data = request.json
    text = data.get('text', '')
    style = data.get('style', 'us_casual')

    system = PROMPTS.get(style, PROMPTS['us_casual'])['translate']

    try:
        response = gemini_client.models.generate_content(
            model='models/gemini-2.5-flash',
            contents=f"{system}\n\n---\n\n{text}",
            config=genai_types.GenerateContentConfig(
                temperature=0.7,
                max_output_tokens=400,
            )
        )
        return jsonify({'translation': response.text})
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@app.route('/api/tts', methods=['POST'])
def tts():
    data = request.json
    text = data.get('text', '')
    style = data.get('style', 'us_casual')

    actor_id = VOICE_MAP.get(style, '')

    # Typecast actor ID가 있으면 Typecast 사용
    if actor_id and os.getenv('TYPECAST_API_KEY'):
        try:
            audio_bytes = _typecast_tts(text[:2000], actor_id)
            audio_b64 = base64.b64encode(audio_bytes).decode('utf-8')
            return jsonify({'audio': audio_b64})
        except Exception as e:
            return jsonify({'error': str(e)}), 500

    # fallback: OpenAI TTS
    if not openai_client:
        return jsonify({'error': 'No TTS key configured'}), 503

    openai_voice_map = {'us_casual': 'alloy', 'uk_casual': 'onyx', 'au_casual': 'echo'}
    voice = openai_voice_map.get(style, 'alloy')
    try:
        response = openai_client.audio.speech.create(
            model='tts-1', voice=voice, input=text[:4096]
        )
        audio_b64 = base64.b64encode(response.content).decode('utf-8')
        return jsonify({'audio': audio_b64})
    except Exception as e:
        return jsonify({'error': str(e)}), 500


if __name__ == '__main__':
    app.run(debug=True, port=5000)
