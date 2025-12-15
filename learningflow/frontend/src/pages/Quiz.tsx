import { useLocation, useNavigate } from 'react-router-dom';
import { useEffect, useState } from 'react';
import apiClient from '../api';
import { CheckCircleIcon, XCircleIcon, ArrowRightIcon, ArrowLeftIcon } from '@heroicons/react/24/outline';

interface Question {
  id: number;
  question: string;
  options: string[];
  answer: string;
  explanation?: string;
}

const Quiz = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [questions, setQuestions] = useState<Question[]>([]);
  const [currentQ, setCurrentQ] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);
  const [subjectiveAnswer, setSubjectiveAnswer] = useState(''); // 서술형 답안
  const [quizResults, setQuizResults] = useState<any[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showFeedback, setShowFeedback] = useState(false);
  const [currentFeedback, setCurrentFeedback] = useState<{isCorrect: boolean; feedback: string} | null>(null);
  const [sessionId, setSessionId] = useState<number | null>(null); // 세션 ID 추가

  const persistWrongNote = (note: { question: string; user_answer: string; correct_answer: string; explanation?: string }) => {
    try {
      const existingRaw = localStorage.getItem('learningflow_wrong_notes');
      const existing = existingRaw ? JSON.parse(existingRaw) : [];
      const normalized = Array.isArray(existing) ? existing : [];
      const filtered = normalized.filter((entry: any) => entry?.question !== note.question);
      filtered.push({
        ...note,
        created_at: new Date().toISOString(),
      });
      localStorage.setItem('learningflow_wrong_notes', JSON.stringify(filtered));
    } catch (error) {
      console.error('오답노트 저장 실패:', error);
    }
  };

  useEffect(() => {
    if (location.state?.quizData) {
      setQuestions(location.state.quizData.questions);
      setSessionId(location.state.sessionId || null); // 세션 ID 저장
    } else {
      navigate('/');
    }
  }, [location, navigate]);

  const handleAnswerSelect = (option: string) => {
    if (showFeedback) return; // 피드백 표시 중에는 답변 변경 불가
    setSelectedAnswer(option);
  };

  const handleSubmit = async () => {
    const currentQuestion = questions[currentQ];
    const isSubjective = currentQuestion.options.length === 0;
    const userAnswer = isSubjective ? subjectiveAnswer : selectedAnswer;
    
    if (!userAnswer || userAnswer.trim() === '') {
      alert(isSubjective ? "답안을 작성해주세요." : "답을 선택해주세요.");
      return;
    }

    setIsSubmitting(true);
    
    try {
      // API 호출 (피드백)
      const feedbackResponse = await apiClient.post('/feedback', {
        question: currentQuestion.question,
        user_answer: userAnswer,
        correct_answer: currentQuestion.answer
      });

      const { is_correct, feedback } = feedbackResponse.data;
      setCurrentFeedback({ isCorrect: is_correct, feedback });
      setShowFeedback(true);

      // 결과 저장
      const result = {
        ...currentQuestion,
        userAnswer: userAnswer,
        isCorrect: is_correct,
        feedback: feedback
      };

      setQuizResults((prev) => [...prev, result]);

      // 오답일 경우 오답노트에 저장 (로그인한 경우만)
      if (!is_correct) {
        persistWrongNote({
          question: currentQuestion.question,
          user_answer: userAnswer,
          correct_answer: currentQuestion.answer,
          explanation: feedback
        });
      }
    } catch (error) {
      console.error("피드백을 가져오는 중 오류 발생:", error);
      alert("문제 제출 중 오류가 발생했습니다.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleNext = () => {
    if (currentQ < questions.length - 1) {
      setCurrentQ(currentQ + 1);
      setSelectedAnswer(null);
      setSubjectiveAnswer(''); // 서술형 답안 초기화
      setShowFeedback(false);
      setCurrentFeedback(null);
    } else {
      // 모든 퀴즈 완료 - quizResults에 이미 모든 결과가 저장되어 있음
      navigate('/feedback', { 
        state: { 
          quizResults: quizResults,
          finalFeedback: "모든 퀴즈를 완료했습니다!" 
        } 
      });
    }
  };

  if (questions.length === 0) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-indigo-50 to-blue-50 dark:from-gray-900 dark:to-gray-800">
        <div className="text-center p-8 bg-white dark:bg-gray-800 rounded-2xl shadow-xl">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto mb-4"></div>
          <p className="text-gray-700 dark:text-gray-300">퀴즈를 불러오는 중...</p>
        </div>
      </div>
    );
  }

  const question = questions[currentQ];
  const isLastQuestion = currentQ === questions.length - 1;

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 to-blue-50 dark:from-gray-900 dark:to-gray-800 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-3xl mx-auto">
        {/* 진행 상황 표시기 */}
        <div className="mb-8">
          <div className="flex justify-between items-center mb-2">
            <span className="text-sm font-medium text-indigo-700 dark:text-indigo-300">
              문제 {currentQ + 1} / {questions.length}
            </span>
            <span className="text-sm font-medium text-gray-500 dark:text-gray-400">
              {Math.round(((currentQ) / questions.length) * 100)}% 완료
            </span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2.5 dark:bg-gray-700">
            <div 
              className="bg-indigo-600 h-2.5 rounded-full transition-all duration-500 ease-in-out" 
              style={{ width: `${((currentQ) / questions.length) * 100}%` }}
            ></div>
          </div>
        </div>

        {/* 문제 카드 */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl overflow-hidden mb-8 transition-all duration-300 hover:shadow-2xl">
          <div className="p-6 border-b border-gray-100 dark:border-gray-700">
            <h2 className="text-xl md:text-2xl font-bold text-gray-900 dark:text-white">
              {question.question}
            </h2>
          </div>
          
          <div className="p-6">
            {question.options.length === 0 ? (
              // 서술형 문제
              <div>
                <label htmlFor="subjective-answer" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  답안을 작성해주세요:
                </label>
                <textarea
                  id="subjective-answer"
                  rows={6}
                  value={subjectiveAnswer}
                  onChange={(e) => setSubjectiveAnswer(e.target.value)}
                  disabled={showFeedback}
                  className="w-full px-4 py-3 border-2 border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 dark:bg-gray-700 dark:text-white resize-none disabled:bg-gray-100 dark:disabled:bg-gray-800"
                  placeholder="여기에 답안을 작성하세요..."
                />
              </div>
            ) : (
              // 객관식/참거짓 문제
            <div className="space-y-3">
              {question.options.map((option, index) => {
                const isSelected = selectedAnswer === option;
                const isCorrect = showFeedback && option === question.answer;
                const isWrong = showFeedback && isSelected && !isCorrect;
                
                let optionStyle = "w-full text-left p-4 rounded-lg transition-all duration-200 border-2 ";
                
                if (showFeedback) {
                  if (isCorrect) {
                    optionStyle += "bg-green-50 border-green-300 dark:bg-green-900/30 dark:border-green-800";
                  } else if (isWrong) {
                    optionStyle += "bg-red-50 border-red-300 dark:bg-red-900/30 dark:border-red-800";
                  } else {
                    optionStyle += "bg-gray-50 border-gray-200 dark:bg-gray-700/50 dark:border-gray-600";
                  }
                } else {
                  optionStyle += isSelected 
                    ? "bg-indigo-50 border-indigo-300 dark:bg-indigo-900/30 dark:border-indigo-700" 
                    : "bg-white border-gray-200 hover:bg-gray-50 dark:bg-gray-700 dark:border-gray-600 dark:hover:bg-gray-600";
                }

                return (
                  <button
                    key={index}
                    onClick={() => handleAnswerSelect(option)}
                    disabled={showFeedback}
                    className={`${optionStyle} flex items-center`}
                  >
                    <div className={`flex-shrink-0 h-5 w-5 rounded-full border flex items-center justify-center mr-3 ${
                      isSelected 
                        ? 'bg-indigo-600 border-indigo-600 text-white' 
                        : 'border-gray-300 dark:border-gray-500'
                    }`}>
                      {isSelected && (
                        <div className="h-2 w-2 rounded-full bg-white"></div>
                      )}
                    </div>
                    <span className="text-gray-800 dark:text-gray-200">{option}</span>
                    {showFeedback && (
                      <span className="ml-auto">
                        {isCorrect && <CheckCircleIcon className="h-5 w-5 text-green-500" />}
                        {isWrong && <XCircleIcon className="h-5 w-5 text-red-500" />}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
            )}

            {/* 피드백 영역 */}
            {showFeedback && currentFeedback && (
              <div className={`mt-6 p-4 rounded-lg ${
                currentFeedback.isCorrect 
                  ? 'bg-green-50 text-green-800 dark:bg-green-900/30 dark:text-green-200' 
                  : 'bg-red-50 text-red-800 dark:bg-red-900/30 dark:text-red-200'
              }`}>
                <p className="font-medium">
                  {currentFeedback.isCorrect ? '정답입니다! 🎉' : '틀렸습니다. 다시 생각해보세요.'}
                </p>
                {!currentFeedback.isCorrect && (
                  <p className="mt-1 text-sm">
                    <span className="font-medium">정답:</span> {question.answer}
                  </p>
                )}
                {currentFeedback.feedback && (
                  <p className="mt-2 text-sm">{currentFeedback.feedback}</p>
                )}
              </div>
            )}
          </div>
        </div>

        {/* 네비게이션 버튼 */}
        <div className="flex justify-between">
          <button
            onClick={() => {
              if (currentQ > 0) {
                setCurrentQ(currentQ - 1);
                setSelectedAnswer(null);
                setShowFeedback(false);
                setCurrentFeedback(null);
              }
            }}
            disabled={currentQ === 0 || isSubmitting}
            className={`inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm ${
              currentQ === 0 || isSubmitting
                ? 'bg-gray-200 text-gray-500 cursor-not-allowed dark:bg-gray-700 dark:text-gray-400'
                : 'bg-white text-gray-700 hover:bg-gray-50 dark:bg-gray-700 dark:text-gray-200 dark:hover:bg-gray-600'
            }`}
          >
            <ArrowLeftIcon className="h-4 w-4 mr-1" />
            이전 문제
          </button>
          
          {!showFeedback ? (
            <button
              onClick={handleSubmit}
              disabled={
                isSubmitting || 
                (question.options.length === 0 ? !subjectiveAnswer.trim() : !selectedAnswer)
              }
              className={`inline-flex items-center px-6 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white ${
                isSubmitting || 
                (question.options.length === 0 ? !subjectiveAnswer.trim() : !selectedAnswer)
                  ? 'bg-indigo-300 cursor-not-allowed dark:bg-indigo-800/50'
                  : 'bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500'
              }`}
            >
              {isSubmitting ? (
                <>
                  <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  확인 중...
                </>
              ) : (
                '답변 제출'
              )}
            </button>
          ) : (
            <button
              onClick={handleNext}
              className="inline-flex items-center px-6 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
            >
              {isLastQuestion ? '결과 보기' : '다음 문제'}
              <ArrowRightIcon className="ml-2 -mr-1 h-4 w-4" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default Quiz;
