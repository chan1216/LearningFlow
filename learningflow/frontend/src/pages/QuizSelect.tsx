import { useLocation, useNavigate } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import apiClient from '../api';

const QuizSelect = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [summaryResult, setSummaryResult] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState<'type' | 'count'>('type');
  const [selectedType, setSelectedType] = useState<string>('');

  useEffect(() => {
    if (location.state?.summaryResult) {
      setSummaryResult(location.state.summaryResult);
    } else {
      navigate('/');
    }
  }, [location, navigate]);

  const handleSelectType = (type: string) => {
    setSelectedType(type);
    setStep('count');
  };

  const handleSelectQuizCount = async (count: number) => {
    setLoading(true);
    try {
      // 선택한 개수로 퀴즈 재생성 요청
      const response = await apiClient.post('/generate-quiz', {
        text: summaryResult.summary,
        quiz_count: count,
        quiz_type: selectedType
      });
      localStorage.setItem('learningflow_quiz', JSON.stringify(response.data.quizData));
      if (summaryResult.sessionId) {
        localStorage.setItem('learningflow_session_id', String(summaryResult.sessionId));
      }
      
      // 퀴즈 페이지로 이동 (sessionId 포함)
      navigate('/quiz', { 
        state: { 
          quizData: response.data.quizData,
          sessionId: summaryResult.sessionId  // 세션 ID 전달
        } 
      });
    } catch (error) {
      console.error('퀴즈 생성 실패:', error);
      alert('퀴즈 생성에 실패했습니다.');
      setLoading(false);
    }
  };

  const quizTypes = [
    { id: 'objective', label: '객관식 문제', icon: '📝', description: '4지선다형 객관식 문제' },
    { id: 'truefalse', label: '참·거짓 문제', icon: '✓✗', description: 'O/X로 답하는 문제' },
    { id: 'short', label: '서술형 문제', icon: '✍️', description: '직접 답을 작성하는 문제' }
  ];

  const quizOptions = [
    { count: 3, emoji: '🎯', label: '빠른 복습' },
    { count: 5, emoji: '📚', label: '기본 학습' },
    { count: 7, emoji: '💪', label: '심화 학습' },
    { count: 10, emoji: '🏆', label: '완벽 마스터' }
  ];

  if (!summaryResult) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 to-blue-50 dark:from-gray-900 dark:to-gray-800 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto">
        {step === 'type' ? (
          <>
            <div className="text-center mb-12">
              <div className="inline-flex items-center justify-center w-16 h-16 bg-indigo-100 dark:bg-indigo-900/30 rounded-full mb-4">
                <span className="text-3xl">📋</span>
              </div>
              <h1 className="text-3xl md:text-4xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent mb-3">
                문제 유형 선택
              </h1>
              <p className="text-lg text-gray-600 dark:text-gray-300">
                원하는 문제 유형을 선택하세요
              </p>
            </div>

            <div className="space-y-4 max-w-2xl mx-auto">
              {quizTypes.map((type) => (
                <motion.button
                  key={type.id}
                  onClick={() => handleSelectType(type.id)}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  className="w-full p-6 rounded-2xl bg-white dark:bg-gray-800 shadow-lg hover:shadow-xl transition-all duration-300 border-2 border-transparent hover:border-indigo-300 dark:hover:border-indigo-700 text-left"
                >
                  <div className="flex items-center">
                    <div className="w-12 h-12 rounded-full bg-indigo-100 dark:bg-indigo-900/30 flex items-center justify-center mr-4">
                      <span className="text-2xl">{type.icon}</span>
                    </div>
                    <div className="flex-1">
                      <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-1">
                        {type.label}
                      </h3>
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        {type.description}
                      </p>
                    </div>
                    <svg className="w-6 h-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </div>
                </motion.button>
              ))}
            </div>

            <div className="mt-8 text-center">
              <button
                onClick={() => navigate('/summary', { state: { summaryResult } })}
                className="text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 transition-colors"
              >
                ← 요약으로 돌아가기
              </button>
            </div>
          </>
        ) : (
          <>
            <div className="text-center mb-12">
              <button
                onClick={() => setStep('type')}
                className="inline-flex items-center text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 mb-4 transition-colors"
              >
                <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
                문제 유형 다시 선택
              </button>
              <h1 className="text-3xl md:text-4xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent mb-3">
                퀴즈 개수 선택
              </h1>
              <p className="text-lg text-gray-600 dark:text-gray-300">
                원하는 퀴즈 개수를 선택하세요
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {quizOptions.map((option) => (
                <motion.button
                  key={option.count}
                  onClick={() => handleSelectQuizCount(option.count)}
                  disabled={loading}
                  whileHover={{ scale: loading ? 1 : 1.03 }}
                  whileTap={{ scale: loading ? 1 : 0.98 }}
                  className={`relative p-8 rounded-2xl shadow-xl transition-all duration-300 ${
                    loading
                      ? 'bg-gray-100 dark:bg-gray-800 cursor-not-allowed opacity-50'
                      : 'bg-white dark:bg-gray-800 hover:shadow-2xl border-2 border-transparent hover:border-indigo-300 dark:hover:border-indigo-700'
                  }`}
                >
                  <div className="text-center">
                    <div className="text-6xl mb-4">{option.emoji}</div>
                    <div className="text-4xl font-bold text-gray-900 dark:text-white mb-2">
                      {option.count}개
                    </div>
                    <div className="text-lg text-gray-600 dark:text-gray-400">
                      {option.label}
                    </div>
                    {loading && (
                      <div className="mt-4">
                        <svg className="animate-spin h-6 w-6 text-indigo-600 mx-auto" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                      </div>
                    )}
                  </div>
                </motion.button>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default QuizSelect;
