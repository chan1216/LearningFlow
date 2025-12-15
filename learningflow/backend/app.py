from flask import Flask, request, jsonify, send_from_directory
from flask_cors import CORS
from flask_bcrypt import Bcrypt
from flask_jwt_extended import JWTManager, create_access_token, jwt_required, get_jwt_identity
import os
from werkzeug.utils import secure_filename
import PyPDF2
import google.generativeai as genai
from dotenv import load_dotenv
import json
import re
from models import db, User, LearningSession
from datetime import timedelta
from reportlab.lib.pagesizes import letter, A4
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import inch
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, PageBreak
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.lib.enums import TA_LEFT, TA_CENTER
from io import BytesIO

# .env 파일에서 환경 변수 로드
load_dotenv()

app = Flask(__name__)
CORS(app)

# 데이터베이스 설정
mysql_user = os.getenv('MYSQL_USER', 'root')
mysql_password = os.getenv('MYSQL_PASSWORD', '')
mysql_host = os.getenv('MYSQL_HOST', 'localhost')
mysql_port = os.getenv('MYSQL_PORT', '3306')
mysql_database = os.getenv('MYSQL_DATABASE', 'learningflow')

app.config['SQLALCHEMY_DATABASE_URI'] = f'mysql+pymysql://{mysql_user}:{mysql_password}@{mysql_host}:{mysql_port}/{mysql_database}'
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
app.config['JWT_SECRET_KEY'] = os.getenv('JWT_SECRET_KEY', 'your-secret-key-change-this')
app.config['JWT_ACCESS_TOKEN_EXPIRES'] = timedelta(hours=24)
app.config['JWT_COOKIE_CSRF_PROTECT'] = False  # CSRF 보호 비활성화

# 확장 기능 초기화
db.init_app(app)
bcrypt = Bcrypt(app)
jwt = JWTManager(app)

# Gemini API 설정
api_key = os.getenv("GEMINI_API_KEY")
if api_key and api_key != "YOUR_API_KEY_HERE":
    try:
        genai.configure(api_key=api_key)
        print("✅ Gemini API 키가 설정되었습니다.")
    except Exception as e:
        print(f"⚠️  API 키 설정 중 오류 발생: {e}")
        print("📝 모의 데이터 모드로 실행됩니다.")
else:
    print("⚠️  Gemini API 키가 설정되지 않았습니다.")
    print("📝 모의 데이터 모드로 실행됩니다.")

# 설정
UPLOAD_FOLDER = 'uploads'
ALLOWED_EXTENSIONS = {'txt', 'pdf'}
MAX_FILE_SIZE = 50 * 1024 * 1024  # 50MB

app.config['UPLOAD_FOLDER'] = UPLOAD_FOLDER
app.config['MAX_CONTENT_LENGTH'] = MAX_FILE_SIZE

# uploads 디렉토리 생성
os.makedirs(UPLOAD_FOLDER, exist_ok=True)

def allowed_file(filename):
    return '.' in filename and \
           filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS

def extract_text_from_pdf(file_path):
    """PDF에서 텍스트 추출"""
    try:
        with open(file_path, 'rb') as file:
            pdf_reader = PyPDF2.PdfReader(file)
            text = ""
            for page in pdf_reader.pages:
                page_text = page.extract_text()
                if page_text:
                    text += page_text + "\n"
        return text
    except Exception as e:
        raise Exception(f"PDF 읽기 오류: {str(e)}")

def extract_text_from_txt(file_path):
    """TXT 파일에서 텍스트 추출"""
    try:
        with open(file_path, 'r', encoding='utf-8') as file:
            return file.read()
    except UnicodeDecodeError:
        try:
            with open(file_path, 'r', encoding='cp949') as file:
                return file.read()
        except Exception as e:
            raise Exception(f"텍스트 파일 읽기 오류: {str(e)}")

def translate_to_korean(text):
    """영어 텍스트를 한국어로 번역 (Gemini API 사용)"""
    try:
        model = genai.GenerativeModel('gemini-2.0-flash')
        
        prompt = f"""다음 영어 텍스트를 자연스러운 한국어로 번역해주세요.
전문적인 내용도 이해하기 쉽게 번역하되, 원문의 의미를 정확히 전달해주세요.

번역할 텍스트:
{text}

번역 결과만 출력해주세요. 다른 설명은 필요 없습니다."""

        response = model.generate_content(prompt)
        translated = response.text.strip()
        
        print(f"✅ 번역 완료 (원문 {len(text)}자 → 번역본 {len(translated)}자)")
        return translated
        
    except Exception as e:
        print(f"⚠️ 번역 실패: {e}")
        return text  # 번역 실패 시 원문 반환

def generate_mock_summary(text, quiz_count=5):
    """API 키가 없을 때 사용할 모의 데이터 생성"""
    full_summary = [
        {
            "mainTitle": "1. 제차사 및 출시 시기",
            "content": [
                "오큘러스 리프트는 페이스북(이후 메타)이 2012년 E3에서 공개했으며, 2014년 본격적으로 시장에 출시되었습니다.",
                "바이브는 HTC와 밸브가 협력하여 2016년 출시하였으며, 전반적으로 2010년대 중반부터 가상현실 기기가 주목받는 경쟁 기기입니다."
            ]
        },
        {
            "mainTitle": "2. 디자인 및 트래킹 방식",
            "content": [
                "오큘러스 리프트는 초기 모델이 PC에 유선으로 연결되며, 주로 헤드셋 내부와 외부 센서를 통해 헤드와 컨트롤러의 위치를 추적합니다.",
                "바이브는 무선 컨트롤러, 360도 모션 추적이 가능한 트래킹 성능, 다양한 액세서리 지원으로 게임과 인터랙티브 경험이 뛰어납니다."
            ]
        }
    ]
    
    structured_summary = [
        {"title": "주요 개념", "content": "문서의 핵심 개념과 이론을 다룹니다."},
        {"title": "중요 내용", "content": "학습해야 할 주요 내용들입니다."},
        {"title": "학습 포인트", "content": "집중적으로 학습해야 할 부분입니다."}
    ]
    
    keywords = ["핵심개념", "중요내용", "학습포인트", "주요주제"]
    
    expected_questions = [
        {
            "question": "이 문서의 주요 목적은 무엇인가요?",
            "answer": "문서의 핵심 내용을 이해하고 학습하는 것입니다."
        },
        {
            "question": "가장 중요한 개념은 무엇인가요?",
            "answer": "문서에서 다루는 핵심 주제와 관련된 개념입니다."
        }
    ]
    
    questions = []
    for i in range(quiz_count):
        questions.append({
            "id": i + 1,
            "question": f"문제 {i + 1}: 업로드된 문서의 내용은 무엇인가요?",
            "options": [
                "첫 번째 선택지",
                "두 번째 선택지", 
                "세 번째 선택지",
                "네 번째 선택지"
            ],
            "answer": "첫 번째 선택지"
        })
    
    quiz_data = {"questions": questions}
    
    return {
        "fullSummary": full_summary,
        "structuredSummary": structured_summary,
        "keywords": keywords,
        "expectedQuestions": expected_questions,
        "quizData": quiz_data
    }

def generate_gemini_content(text, quiz_count=5, quiz_type='objective'):
    """Gemini API를 사용하여 요약, 키워드, 퀴즈 생성"""
    api_key = os.getenv("GEMINI_API_KEY")
    
    # API 키가 없거나 기본값인 경우 모의 데이터 반환
    if not api_key or api_key == "YOUR_API_KEY_HERE":
        print("⚠️  Gemini API 키가 설정되지 않아 모의 데이터를 반환합니다.")
        return generate_mock_summary(text, quiz_count)
    
    try:
        print(f"🔍 Gemini API 호출 시작...")
        
        # 텍스트 길이에 따라 요약 상세도 조정
        text_length = len(text)
        print(f"📏 텍스트 길이: {text_length}자")
        
        # 텍스트 길이별 요약 설정
        if text_length < 2000:
            summary_sections = 3
            detail_level = "간단하게"
            max_text = 4000
        elif text_length < 5000:
            summary_sections = 5
            detail_level = "보통 수준으로"
            max_text = 8000
        elif text_length < 10000:
            summary_sections = 7
            detail_level = "상세하게"
            max_text = 15000
        else:
            summary_sections = 10
            detail_level = "매우 상세하고 길게"
            max_text = 30000
        
        print(f"📊 요약 설정: {summary_sections}개 섹션, {detail_level}")
        
        # 사용 가능한 모델 확인
        try:
            available_models = genai.list_models()
            print(f"사용 가능한 모델들:")
            for m in available_models:
                if 'generateContent' in m.supported_generation_methods:
                    print(f"  - {m.name}")
        except:
            pass
        
        model = genai.GenerativeModel('gemini-2.0-flash')
        
        # 퀴즈 유형별 설명과 예시
        if quiz_type == 'objective':
            quiz_description = "4지선다형 객관식 문제"
            quiz_example = '''{
                "id": 1,
                "question": "텍스트 내용을 바탕으로 한 질문",
                "options": ["선택지1", "선택지2", "선택지3", "선택지4"],
                "answer": "정답 선택지"
              }'''
        elif quiz_type == 'truefalse':
            quiz_description = "참/거짓(O/X) 문제. options는 반드시 ['O', 'X']만 사용하고, answer도 'O' 또는 'X'만 사용"
            quiz_example = '''{
                "id": 1,
                "question": "텍스트 내용에 대한 참/거짓 질문",
                "options": ["O", "X"],
                "answer": "O"
              }'''
        else:  # short
            quiz_description = "주관식/서술형 문제. options는 빈 배열 []로 설정하고, answer에는 모범 답안을 작성"
            quiz_example = '''{
                "id": 1,
                "question": "텍스트 내용에 대한 서술형 질문",
                "options": [],
                "answer": "모범 답안을 자세하게 작성"
              }'''
        
        prompt = f"""
        다음 텍스트를 분석하여 아래의 JSON 형식에 맞춰 내용을 생성해 줘.
        반드시 유효한 JSON 형식으로만 응답해야 하며, 다른 설명은 포함하지 마.
        퀴즈 문제는 정확히 {quiz_count}개를 생성해야 해.
        
        ⚠️ 중요: 이 문서는 {text_length}자 분량의 내용이므로, fullSummary를 {summary_sections}개 이상의 섹션으로 나누고, 
        각 섹션마다 충분히 {detail_level} 설명해야 해. 절대 간략하게 요약하지 말고, 모든 중요한 내용을 빠짐없이 포함해야 해.
        각 섹션의 content 배열에는 최소 3~5개 이상의 상세한 문장이 들어가야 해.

        --- 텍스트 시작 ---
        {text[:max_text]} 
        --- 텍스트 끝 ---

        --- JSON 형식 ---
        {{
          "fullSummary": [
            {{
              "mainTitle": "1. 첫 번째 주제",
              "content": [
                "첫 번째 주제에 대한 상세한 설명 문장 1",
                "첫 번째 주제에 대한 상세한 설명 문장 2",
                "첫 번째 주제에 대한 상세한 설명 문장 3",
                "첫 번째 주제에 대한 추가 설명 문장 4",
                "첫 번째 주제에 대한 추가 설명 문장 5"
              ]
            }},
            {{
              "mainTitle": "2. 두 번째 주제",
              "content": [
                "두 번째 주제에 대한 상세한 설명 문장 1",
                "두 번째 주제에 대한 상세한 설명 문장 2",
                "두 번째 주제에 대한 상세한 설명 문장 3"
              ]
            }}
            ... (문서 내용에 따라 {summary_sections}개 이상의 섹션으로 나눠서 작성)
          ],
          "structuredSummary": [
            {{
              "title": "핵심 개념 1",
              "content": "개념에 대한 상세한 설명"
            }},
            {{
              "title": "핵심 개념 2",
              "content": "개념에 대한 상세한 설명"
            }},
            {{
              "title": "핵심 개념 3",
              "content": "개념에 대한 상세한 설명"
            }}
          ],
          "keywords": ["핵심 키워드를 5~10개 추출하여 배열로 만들어 줘"],
          "expectedQuestions": [
            {{
              "question": "이 내용과 관련해서 자주 나올 수 있는 질문 1",
              "answer": "질문에 대한 상세한 답변"
            }},
            {{
              "question": "이 내용과 관련해서 자주 나올 수 있는 질문 2",
              "answer": "질문에 대한 상세한 답변"
            }},
            {{
              "question": "이 내용과 관련해서 자주 나올 수 있는 질문 3",
              "answer": "질문에 대한 상세한 답변"
            }}
          ],
          "quizData": {{
            "questions": [
              {quiz_example}
              ... (총 {quiz_count}개의 {quiz_description} 문제를 위 형식에 맞춰 생성해야 함)
            ]
          }}
        }}
        
        중요 지침: 
        1. fullSummary는 반드시 {summary_sections}개 이상의 섹션으로 나누고, 각 섹션은 mainTitle과 content로 구성해야 해.
        2. content는 각각 3~5개 이상의 상세한 문장으로 구성된 배열이어야 해.
        3. 문서가 길수록 더 많은 섹션과 더 상세한 설명이 필요해. 절대 생략하지 마.
        4. structuredSummary는 주요 개념을 3~5개로 정리해.
        5. keywords는 5~10개 정도 추출해.
        6. expectedQuestions는 3~5개의 예상 질문과 답변을 작성해.
        7. 퀴즈는 {quiz_description} 형식으로 정확히 {quiz_count}개를 생성해야 해.
        8. 모든 내용은 한국어로 작성해야 해.
        """
        
        print(f"📤 Gemini에게 요청 전송 중...")
        response = model.generate_content(prompt)
        print(f"📥 Gemini 응답 받음")
        print(f"응답 내용: {response.text[:200]}...")
        
        # Gemini 응답에서 JSON 부분만 추출
        json_text = re.search(r'```json\n({.*?})\n```', response.text, re.DOTALL)
        if json_text:
            clean_response = json_text.group(1)
        else:
            clean_response = response.text

        result = json.loads(clean_response)
        print(f"✅ JSON 파싱 성공!")
        return result
    except Exception as e:
        print(f"⚠️  Gemini API 호출 중 오류 발생: {type(e).__name__}: {str(e)}")
        import traceback
        print(traceback.format_exc())
        print("📝 모의 데이터를 반환합니다.")
        return generate_mock_summary(text, quiz_count)


@app.route('/upload', methods=['POST'])
def upload_file():
    print("=" * 50)
    print("🎯 /upload 요청 받음!")
    print("=" * 50)
    try:
        if 'file' not in request.files:
            return jsonify({'error': '파일이 선택되지 않았습니다.'}), 400
        
        file = request.files['file']
        custom_filename = request.form.get('custom_filename', '').strip()  # 사용자가 입력한 파일명
        category = request.form.get('category', '').strip()  # 카테고리 추가
        
        if file.filename == '':
            return jsonify({'error': '파일이 선택되지 않았습니다.'}), 400
        
        if not allowed_file(file.filename):
            return jsonify({'error': '지원되지 않는 파일 형식입니다. PDF 또는 TXT 파일만 업로드 가능합니다.'}), 400
        
        # 원본 파일명과 확장자 분리
        original_filename = file.filename
        file_extension = original_filename.rsplit('.', 1)[1].lower()
        
        # 사용자가 입력한 이름이 있으면 사용, 없으면 원본 파일명 사용
        if custom_filename:
            display_filename = f"{custom_filename}.{file_extension}"
        else:
            display_filename = original_filename
        
        # 실제 저장할 파일명 (보안을 위해 secure_filename 사용)
        filename = secure_filename(file.filename)
        file_path = os.path.join(app.config['UPLOAD_FOLDER'], filename)
        file.save(file_path)
        
        # 파일 크기 확인
        file_size = os.path.getsize(file_path)
        file_type = file_extension
        
        if filename.lower().endswith('.pdf'):
            text = extract_text_from_pdf(file_path)
        else:
            text = extract_text_from_txt(file_path)
        
        if not text.strip():
            os.remove(file_path)
            return jsonify({'error': '파일에서 텍스트를 추출할 수 없습니다.'}), 400
        
        # 로그인한 사용자인 경우 파일 정보를 데이터베이스에 저장
        user_id = None
        try:
            from flask_jwt_extended import get_jwt_identity, verify_jwt_in_request
            verify_jwt_in_request(optional=True)
            user_id = get_jwt_identity()
            if user_id:
                # user_id가 실제로 존재하는지 확인
                from models import User
                user = User.query.get(int(user_id))
                if not user:
                    user_id = None  # 존재하지 않는 사용자면 None으로 설정
        except:
            pass  # 로그인하지 않은 경우 user_id는 None
        
        # 파일 업로드 시 learning_session에 저장 (오답은 나중에 추가)
        if user_id:
            learning_session = LearningSession(
                user_id=int(user_id),
                custom_filename=display_filename,  # 사용자가 입력한 이름
                original_filename=file.filename,  # 원본 파일명
                file_path=file_path,
                file_size=file_size,
                file_type=file_type,
                category=category,  # 카테고리 저장
                is_wrong=False  # 파일 업로드 시에는 오답 아님
            )
            db.session.add(learning_session)
            db.session.commit()
            
            session_id = learning_session.id
            print(f"✅ 파일 저장 완료 - 사용자: {user_id}, 표시명: {display_filename}, 카테고리: {category}, 세션ID: {session_id}")
        else:
            session_id = None
            print(f"✅ 파일 저장 완료 - 비로그인 사용자, 표시명: {display_filename}, 카테고리: {category}")
        
        # 영어 카테고리일 경우 번역 추가
        translated_text = None
        if category == '영어':
            print("🌐 영어 카테고리 선택됨 - 한국어 번역 시작...")
            translated_text = translate_to_korean(text)
        
        # Gemini API를 사용하여 콘텐츠 생성 (기본 5개 퀴즈)
        # 영어 카테고리인 경우 번역된 텍스트로 요약 생성
        result = generate_gemini_content(translated_text if translated_text else text, 5)
        
        # 번역 결과를 result에 추가
        if translated_text:
            result['translatedText'] = translated_text
        
        # PDF 파일인 경우 저장하고 URL 반환
        pdf_url = None
        if filename.lower().endswith('.pdf'):
            # 파일을 uploads 폴더에 유지하고 URL 제공
            pdf_url = f'/uploads/{filename}'
        else:
            # TXT 파일은 삭제 (필요시 저장하도록 변경 가능)
            os.remove(file_path)
        
        result['pdfUrl'] = pdf_url
        result['pdfText'] = text  # 채팅에 사용할 원본 텍스트 추가
        result['sessionId'] = session_id  # 세션 ID 반환
        
        return jsonify(result)
    
    except Exception as e:
        # 파일 경로가 정의되어 있을 경우에만 삭제 시도
        if 'file_path' in locals() and os.path.exists(file_path):
            os.remove(file_path)
        print(f"❌ 업로드 오류: {str(e)}")
        import traceback
        traceback.print_exc()
        return jsonify({'error': f'파일 처리 중 오류가 발생했습니다: {str(e)}'}), 500

@app.route('/health', methods=['GET'])
def health_check():
    return jsonify({'status': 'healthy', 'message': 'API 서버가 정상적으로 실행 중입니다.'})

@app.route('/uploads/<filename>')
def uploaded_file(filename):
    """업로드된 PDF 파일 제공"""
    return send_from_directory(app.config['UPLOAD_FOLDER'], filename)

@app.route('/feedback', methods=['POST'])
def feedback():
    """퀴즈 답변에 대한 피드백 제공"""
    try:
        data = request.get_json()
        question = data.get('question')
        user_answer = data.get('user_answer')
        correct_answer = data.get('correct_answer')
        
        # 객관식/참거짓은 정확히 일치해야 함
        # 서술형은 AI로 채점
        is_correct = False
        feedback = ""
        
        # 간단한 문자열 비교로 정답 확인 (객관식, 참거짓)
        if user_answer == correct_answer:
            is_correct = True
            feedback = "정답입니다! 잘하셨어요."
        else:
            # 서술형 문제인 경우 AI로 채점 (답변이 짧은 문자열이 아니고 길이가 20자 이상인 경우)
            if len(user_answer) > 20:
                try:
                    api_key = os.getenv("GEMINI_API_KEY")
                    if api_key and api_key != "YOUR_API_KEY_HERE":
                        import google.generativeai as genai
                        genai.configure(api_key=api_key)
                        model = genai.GenerativeModel('gemini-2.0-flash')
                        
                        ai_prompt = f"""
다음 문제와 정답, 그리고 사용자의 답변을 비교하여 채점해주세요.

문제: {question}
정답: {correct_answer}
사용자 답변: {user_answer}

사용자의 답변이 정답의 핵심 내용을 포함하고 있는지 판단해주세요.
완전히 일치하지 않아도, 의미가 같거나 핵심 내용이 맞다면 정답으로 인정합니다.

응답 형식 (JSON):
{{
  "is_correct": true 또는 false,
  "feedback": "채점 결과에 대한 설명"
}}
"""
                        
                        response = model.generate_content(ai_prompt)
                        import json
                        import re
                        
                        # JSON 부분만 추출
                        json_match = re.search(r'\{[^}]+\}', response.text, re.DOTALL)
                        if json_match:
                            result = json.loads(json_match.group())
                            is_correct = result.get('is_correct', False)
                            feedback = result.get('feedback', '')
                        else:
                            is_correct = False
                            feedback = f"정답은 '{correct_answer}'입니다. 다시 한 번 복습해보세요."
                    else:
                        is_correct = False
                        feedback = f"정답은 '{correct_answer}'입니다. 다시 한 번 복습해보세요."
                except Exception as ai_error:
                    print(f"AI 채점 오류: {ai_error}")
                    is_correct = False
                    feedback = f"정답은 '{correct_answer}'입니다. 다시 한 번 복습해보세요."
            else:
                is_correct = False
                feedback = f"정답은 '{correct_answer}'입니다. 다시 한 번 복습해보세요."
        
        return jsonify({
            'is_correct': is_correct,
            'feedback': feedback
        })
    except Exception as e:
        return jsonify({'error': f'피드백 생성 중 오류가 발생했습니다: {str(e)}'}), 500

@app.route('/wrongnotes', methods=['POST'])
@jwt_required()
def save_wrongnote():
    """오답노트 저장 - 로그인 필요"""
    try:
        current_user_id = get_jwt_identity()
        if not current_user_id:
            return jsonify({'error': '인증 정보가 없습니다.'}), 401

        data = request.get_json() or {}
        print(f"📝 오답 저장 요청 사용자:{current_user_id} 데이터:{data}")

        session_id = data.get('session_id')

        base_session = None
        if session_id:
            base_session = LearningSession.query.filter_by(id=session_id, user_id=int(current_user_id), is_wrong=False).first()
        if not base_session:
            base_session = LearningSession.query.filter_by(user_id=int(current_user_id), is_wrong=False).order_by(LearningSession.created_at.desc()).first()
        if not base_session:
            return jsonify({'error': '연결할 파일 세션을 찾을 수 없습니다.'}), 404

        new_wrong = LearningSession(
            user_id=int(current_user_id),
            custom_filename=base_session.custom_filename,
            original_filename=base_session.original_filename,
            file_path=base_session.file_path,
            file_size=base_session.file_size,
            file_type=base_session.file_type,
            question=data.get('question'),
            user_answer=data.get('user_answer'),
            correct_answer=data.get('correct_answer'),
            explanation=data.get('explanation', ''),
            is_wrong=True
        )
        db.session.add(new_wrong)
        db.session.commit()
        print(f"✅ 오답 저장 완료 사용자:{current_user_id} 문제:{(data.get('question') or '')[:40]}")
        return jsonify({'message': '오답 저장 완료', 'wrongnote_id': new_wrong.id}), 201
    except Exception as e:
        db.session.rollback()
        print(f"⚠️ 오답 저장 오류: {e}")
        return jsonify({'error': f'오답 저장 중 오류 발생: {str(e)}'}), 500

@app.route('/wrongnotes', methods=['GET'])
@jwt_required()
def get_wrongnotes():
    """사용자의 오답노트 조회"""
    try:
        current_user_id = get_jwt_identity()
        wrong_notes = LearningSession.query.filter_by(user_id=int(current_user_id), is_wrong=True).order_by(LearningSession.created_at.desc()).all()
        print(f"📊 오답노트 {len(wrong_notes)}건 사용자:{current_user_id}")
        return jsonify([note.to_dict() for note in wrong_notes]), 200
    except Exception as e:
        print(f"⚠️ 오답노트 조회 오류: {e}")
        return jsonify({'error': f'오답노트 조회 중 오류 발생: {str(e)}'}), 500

@app.route('/study/save', methods=['POST'])
@jwt_required()
def save_study_summary():
    """요약/퀴즈/오답 정보를 한 번에 저장"""
    try:
        current_user_id = get_jwt_identity()
        data = request.get_json() or {}
        session_id = data.get('session_id')

        if not session_id:
            return jsonify({'error': 'session_id가 필요합니다.'}), 400

        session = LearningSession.query.filter_by(
            id=session_id,
            user_id=int(current_user_id),
            is_wrong=False
        ).first()

        if not session:
            return jsonify({'error': '해당 세션을 찾을 수 없습니다.'}), 404

        session.summary_data = json.dumps(data.get('summary_data'), ensure_ascii=False) if data.get('summary_data') is not None else None
        session.quiz_data = json.dumps(data.get('quiz_data'), ensure_ascii=False) if data.get('quiz_data') is not None else None
        session.wrong_notes_data = json.dumps(data.get('wrong_notes'), ensure_ascii=False) if data.get('wrong_notes') is not None else None
        session.is_saved = True

        db.session.commit()

        print(f"💾 학습 세션 저장 완료 사용자:{current_user_id} 세션ID:{session_id}")

        return jsonify({'message': '학습 세션이 저장되었습니다.'}), 200
    except Exception as e:
        db.session.rollback()
        print(f"⚠️ 학습 세션 저장 오류: {e}")
        return jsonify({'error': f'학습 세션 저장 중 오류 발생: {str(e)}'}), 500

@app.route('/generate-quiz', methods=['POST'])
def generate_quiz():
    """선택한 개수만큼 퀴즈 생성"""
    try:
        data = request.get_json()
        text = data.get('text', '')
        quiz_count = data.get('quiz_count', 5)
        quiz_type = data.get('quiz_type', 'objective')  # 퀴즈 유형 추가
        
        print(f"🎯 퀴즈 생성 요청: {quiz_count}개, 유형: {quiz_type}")
        
        # Gemini로 퀴즈만 생성
        result = generate_gemini_content(text, quiz_count, quiz_type)
        
        return jsonify({'quizData': result.get('quizData')})
    except Exception as e:
        return jsonify({'error': f'퀴즈 생성 중 오류가 발생했습니다: {str(e)}'}), 500

@app.route('/chat', methods=['POST'])
def chat():
    """PDF 내용 기반 채팅"""
    try:
        data = request.get_json()
        question = data.get('question')
        pdf_text = data.get('pdfText', '')
        
        print(f"📥 /chat 요청 - 질문: {question}")
        print(f"📄 PDF 텍스트 길이: {len(pdf_text)}자")
        print(f"📝 PDF 텍스트 미리보기: {pdf_text[:200]}...")
        
        if not question:
            return jsonify({'error': '질문이 제공되지 않았습니다.'}), 400
        
        # Gemini API로 답변 생성
        api_key = os.getenv("GEMINI_API_KEY")
        
        if not api_key or api_key == "YOUR_API_KEY_HERE":
            return jsonify({'answer': '죄송합니다. API 키가 설정되지 않아 답변을 제공할 수 없습니다.'})
        
        try:
            model = genai.GenerativeModel('gemini-2.0-flash')
            
            prompt = f"""
            다음은 PDF 문서의 내용입니다:
            
            {pdf_text[:8000]}
            
            위 문서 내용을 바탕으로 다음 질문에 답변해주세요:
            질문: {question}
            
            답변은 한국어로, 친절하고 명확하게 작성해주세요.
            문서에 관련 내용이 없다면, "문서에서 관련 내용을 찾을 수 없습니다"라고 답변해주세요.
            """
            
            response = model.generate_content(prompt)
            answer = response.text
            
            # 마크다운 기호 제거
            answer = answer.replace('**', '')
            answer = answer.replace('##', '')
            answer = answer.replace('###', '')
            
            return jsonify({'answer': answer})
        except Exception as e:
            print(f"⚠️ Gemini API 오류: {e}")
            return jsonify({'answer': '죄송합니다. 답변 생성 중 오류가 발생했습니다.'})
    except Exception as e:
        return jsonify({'error': f'채팅 처리 중 오류가 발생했습니다: {str(e)}'}), 500

# 인증 API
@app.route('/auth/signup', methods=['POST'])
def signup():
    """회원가입"""
    try:
        data = request.get_json()
        name = data.get('name')
        email = data.get('email')
        password = data.get('password')
        
        # 유효성 검사
        if not name or not email or not password:
            return jsonify({'error': '모든 필드를 입력해주세요.'}), 400
        
        # 이메일 중복 확인
        existing_user = User.query.filter_by(email=email).first()
        if existing_user:
            return jsonify({'error': '이미 사용 중인 이메일입니다.'}), 400
        
        # 비밀번호 해시
        password_hash = bcrypt.generate_password_hash(password).decode('utf-8')
        
        # 새 사용자 생성
        new_user = User(
            name=name,
            email=email,
            password_hash=password_hash
        )
        
        db.session.add(new_user)
        db.session.commit()
        
        print(f"✅ 새 사용자 등록: {email}")
        
        return jsonify({
            'message': '회원가입이 완료되었습니다.',
            'user': new_user.to_dict()
        }), 201
    except Exception as e:
        db.session.rollback()
        print(f"⚠️ 회원가입 오류: {e}")
        return jsonify({'error': f'회원가입 중 오류가 발생했습니다: {str(e)}'}), 500

@app.route('/auth/login', methods=['POST'])
def login():
    """로그인"""
    try:
        data = request.get_json()
        email = data.get('email')
        password = data.get('password')
        
        # 유효성 검사
        if not email or not password:
            return jsonify({'error': '이메일과 비밀번호를 입력해주세요.'}), 400
        
        # 사용자 확인
        user = User.query.filter_by(email=email).first()
        if not user or not bcrypt.check_password_hash(user.password_hash, password):
            return jsonify({'error': '이메일 또는 비밀번호가 올바르지 않습니다.'}), 401
        
        # JWT 토큰 생성
        # identity는 문자열로 전달하여 JWT sub 타입 문제 방지
        access_token = create_access_token(identity=str(user.id))
        
        print(f"✅ 로그인 성공: {email}")
        
        return jsonify({
            'message': '로그인 성공',
            'access_token': access_token,
            'user': user.to_dict()
        }), 200
    except Exception as e:
        print(f"⚠️ 로그인 오류: {e}")
        return jsonify({'error': f'로그인 중 오류가 발생했습니다: {str(e)}'}), 500

@app.route('/auth/me', methods=['GET'])
@jwt_required()
def get_current_user():
    """현재 로그인한 사용자 정보 조회"""
    try:
        current_user_id = get_jwt_identity()
        user = User.query.get(current_user_id)
        
        if not user:
            return jsonify({'error': '사용자를 찾을 수 없습니다.'}), 404
        
        return jsonify({'user': user.to_dict()}), 200
    except Exception as e:
        return jsonify({'error': f'사용자 정보 조회 중 오류가 발생했습니다: {str(e)}'}), 500

@app.route('/mypage/files', methods=['GET'])
@jwt_required()
def get_my_files():
    """사용자가 업로드한 파일 목록 조회"""
    try:
        current_user_id = get_jwt_identity()
        
        # 사용자가 업로드한 파일만 조회 (is_wrong=False인 것만)
        files = LearningSession.query.filter_by(
            user_id=int(current_user_id),
            is_wrong=False
        ).order_by(LearningSession.created_at.desc()).all()
        
        return jsonify([file.to_dict() for file in files]), 200
    except Exception as e:
        print(f"⚠️ 파일 목록 조회 오류: {e}")
        return jsonify({'error': f'파일 목록 조회 중 오류가 발생했습니다: {str(e)}'}), 500

@app.route('/mypage/files/<int:file_id>', methods=['DELETE'])
@jwt_required()
def delete_my_file(file_id):
    """사용자가 업로드한 파일 삭제"""
    try:
        current_user_id = get_jwt_identity()
        
        # 파일 조회 및 권한 확인
        file = LearningSession.query.filter_by(
            id=file_id,
            user_id=int(current_user_id),
            is_wrong=False
        ).first()
        
        if not file:
            return jsonify({'error': '파일을 찾을 수 없거나 권한이 없습니다.'}), 404
        
        # 실제 파일 삭제
        if os.path.exists(file.file_path):
            os.remove(file.file_path)
        
        # 데이터베이스에서 삭제
        db.session.delete(file)
        db.session.commit()
        
        return jsonify({'message': '파일이 삭제되었습니다.'}), 200
    except Exception as e:
        print(f"⚠️ 파일 삭제 오류: {e}")
        return jsonify({'error': f'파일 삭제 중 오류가 발생했습니다: {str(e)}'}), 500

@app.route('/explain', methods=['POST'])
def explain_text():
    """PDF에서 선택한 텍스트를 Gemini로 간단하게 설명"""
    try:
        data = request.json
        print(f"📥 /explain 요청 받음: {data}")
        clicked_text = data.get('text', '').strip()
        
        if not clicked_text:
            print("⚠️ 텍스트가 비어있음")
            return jsonify({'error': '텍스트가 제공되지 않았습니다.'}), 400
        
        print(f"📝 설명할 텍스트: {clicked_text[:50]}...")
        
        # Gemini 프롬프트
        prompt = f"""역할: 당신은 문장을 빠르고 쉽게 설명하는 AI 학습 도우미입니다.

아래 문장 또는 단어의 의미를 초보자도 이해할 수 있게 짧게 설명해주세요.

조건:
- 전체 설명은 3~4문장 이내.
- 핵심 의미를 1~2문장으로 요약.
- 너무 어려운 용어는 사용하지 않음.
- 필요하면 간단한 예시 한 개 첨부.

설명 대상 문장:
"{clicked_text}"

출력 형식(JSON):
{{
  "summary": "",        // 핵심 의미 요약
  "easy_explanation": "", // 쉬운 버전 설명
  "example": ""         // 간단한 예시 (없으면 빈 문자열)
}}"""

        # Gemini API 호출
        model = genai.GenerativeModel('gemini-2.0-flash')
        response = model.generate_content(prompt)
        result_text = response.text.strip()
        
        # JSON 파싱
        if result_text.startswith('```json'):
            result_text = result_text[7:]
        if result_text.startswith('```'):
            result_text = result_text[3:]
        if result_text.endswith('```'):
            result_text = result_text[:-3]
        result_text = result_text.strip()
        
        explanation = json.loads(result_text)
        
        return jsonify({
            'success': True,
            'explanation': explanation
        }), 200
        
    except json.JSONDecodeError as e:
        print(f"⚠️ JSON 파싱 오류: {e}")
        print(f"응답 내용: {result_text}")
        return jsonify({'error': 'AI 응답 형식 오류'}), 500
    except Exception as e:
        print(f"⚠️ 텍스트 설명 오류: {e}")
        return jsonify({'error': f'설명 생성 중 오류가 발생했습니다: {str(e)}'}), 500

@app.route('/pdf', methods=['POST'])
def generate_pdf():
    """저장된 학습 세션을 PDF로 생성"""
    try:
        data = request.json
        print(f"📥 받은 데이터 키: {list(data.keys())}")
        print(f"📥 데이터 내용: {data}")
        
        summary_data = data.get('summary', {})
        quiz_data = data.get('quiz_results', [])
        wrong_notes_data = data.get('wrong_notes', {})
        
        print(f"Summary sections: {summary_data.get('sections', [])[:1] if summary_data else 'None'}")
        print(f"Quiz data length: {len(quiz_data)}")
        print(f"Wrong notes: {wrong_notes_data}")
        
        # BytesIO 버퍼에 PDF 생성
        buffer = BytesIO()
        doc = SimpleDocTemplate(buffer, pagesize=A4)
        story = []
        
        # 한글 폰트 등록 (Windows 기본 폰트 사용)
        try:
            font_path = 'C:/Windows/Fonts/malgun.ttf'  # 맑은 고딕
            pdfmetrics.registerFont(TTFont('Malgun', font_path))
            font_name = 'Malgun'
        except Exception as e:
            print(f"⚠️ 한글 폰트 로드 실패: {e}")
            font_name = 'Helvetica'
        
        # 스타일 정의
        styles = getSampleStyleSheet()
        title_style = ParagraphStyle(
            'CustomTitle',
            parent=styles['Heading1'],
            fontName=font_name,
            fontSize=24,
            spaceAfter=30,
            alignment=TA_CENTER
        )
        heading_style = ParagraphStyle(
            'CustomHeading',
            parent=styles['Heading2'],
            fontName=font_name,
            fontSize=16,
            spaceAfter=12,
            spaceBefore=12
        )
        body_style = ParagraphStyle(
            'CustomBody',
            parent=styles['Normal'],
            fontName=font_name,
            fontSize=11,
            leading=16,
            spaceAfter=10
        )
        
        # 제목
        story.append(Paragraph("학습 결과 리포트", title_style))
        story.append(Spacer(1, 0.3*inch))
        
        # 1. 요약 섹션
        if summary_data:
            story.append(Paragraph("요약", heading_style))
            story.append(Spacer(1, 0.1*inch))
            
            sections = summary_data.get('sections', [])
            for section in sections:
                section_title = section.get('title', '')
                section_content = section.get('content', '')
                
                if section_title:
                    story.append(Paragraph(f"<b>{section_title}</b>", body_style))
                if section_content:
                    story.append(Paragraph(section_content.replace('\n', '<br/>'), body_style))
                story.append(Spacer(1, 0.15*inch))
        
        story.append(PageBreak())
        
        # 2. 퀴즈 섹션
        if quiz_data:
            story.append(Paragraph("퀴즈", heading_style))
            story.append(Spacer(1, 0.1*inch))
            
            for idx, quiz_item in enumerate(quiz_data, 1):
                question = quiz_item.get('question', '')
                user_answer = quiz_item.get('userAnswer', '')
                correct_answer = quiz_item.get('correctAnswer', '')
                
                if question:
                    story.append(Paragraph(f"<b>문제 {idx}. {question}</b>", body_style))
                    story.append(Paragraph(f"내 답: {user_answer}", body_style))
                    story.append(Paragraph(f"정답: {correct_answer}", body_style))
                    story.append(Spacer(1, 0.2*inch))
        
        story.append(PageBreak())
        
        # 3. 오답노트 섹션
        if wrong_notes_data:
            story.append(Paragraph("오답노트", heading_style))
            story.append(Spacer(1, 0.1*inch))
            
            wrong_answers = wrong_notes_data.get('wrong_answers', [])
            if wrong_answers:
                for idx, item in enumerate(wrong_answers, 1):
                    question_num = item.get('question_number', idx)
                    user_answer = item.get('user_answer', '')
                    correct_answer = item.get('correct_answer', '')
                    explanation = item.get('explanation', '')
                    
                    story.append(Paragraph(f"<b>문제 {question_num}</b>", body_style))
                    story.append(Paragraph(f"내 답: {user_answer}", body_style))
                    story.append(Paragraph(f"정답: {correct_answer}", body_style))
                    if explanation:
                        story.append(Paragraph(f"해설: {explanation}", body_style))
                    story.append(Spacer(1, 0.2*inch))
            else:
                story.append(Paragraph("모든 문제를 맞췄습니다!", body_style))
        
        # PDF 빌드
        doc.build(story)
        buffer.seek(0)
        
        return buffer.getvalue(), 200, {
            'Content-Type': 'application/pdf',
            'Content-Disposition': 'attachment; filename=learning_result.pdf'
        }
        
    except Exception as e:
        print(f"⚠️ PDF 생성 오류: {e}")
        import traceback
        traceback.print_exc()
        return jsonify({'error': f'PDF 생성 중 오류가 발생했습니다: {str(e)}'}), 500

if __name__ == '__main__':
    with app.app_context():
        db.create_all()
        print("✅ 데이터베이스 테이블이 생성되었습니다.")
    
    print("🚀 Learning Flow API 서버를 시작합니다 (Gemini ver.)...")
    print("🔑 Gemini API 키가 .env 파일에 설정되었는지 확인하세요.")
    print("📝 지원 파일 형식: PDF, TXT")
    print("🌐 서버 주소: http://localhost:8000")
    print("💡 테스트 URL: http://localhost:8000/health")
    app.run(host='0.0.0.0', port=8000, debug=True)