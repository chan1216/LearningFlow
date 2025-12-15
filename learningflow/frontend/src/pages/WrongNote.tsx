import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import apiClient from '../api';
import { XCircleIcon, CheckCircleIcon, LightBulbIcon } from '@heroicons/react/24/outline';

interface WrongNote {
  id?: number;
  question: string;
  user_answer: string;
  correct_answer: string;
  explanation?: string;
  created_at?: string;
}

const WrongNote = () => {
  const [notes, setNotes] = useState<WrongNote[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedNoteKey, setExpandedNoteKey] = useState<string | null>(null);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const navigate = useNavigate();

  const deduplicateNotes = (noteList: WrongNote[]) => {
    const seen = new Set<string>();
    return noteList.filter((note) => {
      const key = `${note.question || ''}__${note.correct_answer || ''}`;
      if (seen.has(key)) {
        return false;
      }
      seen.add(key);
      return true;
    });
  };

  const syncNotesFromStorage = () => {
    const stored = localStorage.getItem('learningflow_wrong_notes');
    if (!stored) {
      setNotes([]);
      return;
    }
    try {
      const parsed = JSON.parse(stored) as WrongNote[];
      const deduped = deduplicateNotes(parsed);
      const sorted = deduped.sort(
        (a, b) => new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime()
      );
      setNotes(sorted);
      localStorage.setItem('learningflow_wrong_notes', JSON.stringify(sorted));
    } catch (error) {
      console.error('오답노트 로드 실패:', error);
      setNotes([]);
    }
  };

  const handleSaveSession = async () => {
    if (!isLoggedIn) {
      alert('로그인 후 이용 가능합니다.');
      return;
    }

    const sessionId = localStorage.getItem('learningflow_session_id');
    if (!sessionId) {
      alert('저장할 세션 정보를 찾을 수 없습니다. 먼저 파일을 업로드하고 학습을 진행해주세요.');
      return;
    }

    const summaryRaw = localStorage.getItem('learningflow_summary');
    const quizRaw = localStorage.getItem('learningflow_quiz');

    try {
      const cleanNotes = deduplicateNotes(notes);

      const serializedNotes = cleanNotes.map(({ question, user_answer, correct_answer, explanation, created_at }) => ({
        question,
        user_answer,
        correct_answer,
        explanation,
        created_at,
      }));

      await apiClient.post('/study/save', {
        session_id: Number(sessionId),
        summary_data: summaryRaw ? JSON.parse(summaryRaw) : null,
        quiz_data: quizRaw ? JSON.parse(quizRaw) : null,
        wrong_notes: serializedNotes,
      });
      alert('학습 세션이 저장되었습니다! 마이페이지에서 확인할 수 있어요.');
      localStorage.removeItem('learningflow_wrong_notes');
      setNotes([]);
      setExpandedNoteKey(null);
    } catch (error) {
      console.error('학습 세션 저장 실패:', error);
      alert('저장 중 문제가 발생했습니다. 다시 시도해주세요.');
    }
  };

  const handleGoToQuiz = () => {
    localStorage.removeItem('learningflow_wrong_notes');
    setNotes([]);
    setExpandedNoteKey(null);
    const summaryRaw = localStorage.getItem('learningflow_summary');
    if (summaryRaw) {
      try {
        const parsed = JSON.parse(summaryRaw);
        navigate('/quiz-select', { state: { summaryResult: parsed } });
        return;
      } catch (error) {
        console.error('요약 데이터 파싱 실패:', error);
      }
    }
    navigate('/');
  };

  useEffect(() => {
    const token = localStorage.getItem('access_token');
    setIsLoggedIn(!!token);
    syncNotesFromStorage();
    setLoading(false);
  }, []);

  const toggleNote = (key: string) => {
    setExpandedNoteKey(expandedNoteKey === key ? null : key);
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('ko-KR', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    }).format(date);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-indigo-50 to-blue-50 dark:from-gray-900 dark:to-gray-800">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto mb-4"></div>
          <p className="text-gray-700 dark:text-gray-300">오답노트를 불러오는 중...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 to-blue-50 dark:from-gray-900 dark:to-gray-800 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-12">
          <h1 className="text-3xl md:text-4xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent mb-3">
            나의 오답 노트
          </h1>
          <p className="text-lg text-gray-600 dark:text-gray-300">
            틀렸던 문제들을 다시 한번 복습해보세요.
          </p>
        </div>

        {!isLoggedIn ? (
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl overflow-hidden text-center p-12">
            <div className="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-indigo-100 dark:bg-indigo-900/30 mb-4">
              <svg className="h-8 w-8 text-indigo-600 dark:text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
            </div>
            <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">로그인이 필요합니다</h3>
            <p className="text-gray-600 dark:text-gray-400 mb-6">
              오답노트 기능을 사용하려면 로그인해주세요.
            </p>
            <button
              onClick={() => navigate('/login')}
              className="px-6 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-lg hover:from-indigo-700 hover:to-purple-700 transition-all shadow-lg font-medium"
            >
              로그인하기
            </button>
          </div>
        ) : notes.length === 0 ? (
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl overflow-hidden text-center p-12">
            <div className="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-green-100 dark:bg-green-900/30 mb-4">
              <CheckCircleIcon className="h-8 w-8 text-green-600 dark:text-green-400" />
            </div>
            <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">오답노트가 비어있어요!</h3>
            <p className="text-gray-600 dark:text-gray-400">
              모든 문제를 정확히 푸셨네요. 훌륭해요! 👏
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {notes.map((note, index) => {
              const noteKey = note.id ? String(note.id) : `${note.question || 'note'}-${index}`;
              return (
                <div 
                  key={noteKey} 
                  className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg overflow-hidden transition-all duration-300 hover:shadow-xl"
                >
                  <button 
                    onClick={() => toggleNote(noteKey)}
                    className="w-full text-left p-6 focus:outline-none"
                  >
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <div className="flex items-center">
                          <XCircleIcon className="h-5 w-5 text-red-500 mr-2 flex-shrink-0" />
                          <h3 className="text-lg font-medium text-gray-900 dark:text-white line-clamp-2">
                            {note.question}
                          </h3>
                        </div>
                        <div className="mt-2 flex items-center text-sm text-gray-500 dark:text-gray-400">
                          <span className="truncate">
                            {formatDate(note.created_at)}
                          </span>
                        </div>
                      </div>
                      <div className="ml-4 flex-shrink-0">
                        <svg
                          className={`h-5 w-5 text-gray-400 transition-transform duration-200 ${
                            expandedNoteKey === noteKey ? 'transform rotate-180' : ''
                          }`}
                          xmlns="http://www.w3.org/2000/svg"
                          viewBox="0 0 20 20"
                          fill="currentColor"
                          aria-hidden="true"
                        >
                          <path
                            fillRule="evenodd"
                            d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z"
                            clipRule="evenodd"
                          />
                        </svg>
                      </div>
                    </div>
                  </button>

                  {expandedNoteKey === noteKey && (
                    <div className="px-6 pb-6 pt-2 border-t border-gray-100 dark:border-gray-700">
                      <div className="space-y-4">
                        <div>
                          <p className="text-sm font-medium text-gray-500 dark:text-gray-400">내 답변</p>
                          <p className="mt-1 text-gray-900 dark:text-gray-200 bg-red-50 dark:bg-red-900/20 px-4 py-2 rounded-lg">
                            {note.user_answer}
                          </p>
                        </div>
                        
                        <div>
                          <p className="text-sm font-medium text-gray-500 dark:text-gray-400">정답</p>
                          <p className="mt-1 text-gray-900 dark:text-gray-200 bg-green-50 dark:bg-green-900/20 px-4 py-2 rounded-lg">
                            {note.correct_answer}
                          </p>
                        </div>
                        
                        {note.explanation && (
                          <div>
                            <div className="flex items-center text-sm font-medium text-gray-500 dark:text-gray-400">
                              <LightBulbIcon className="h-4 w-4 text-yellow-500 mr-1" />
                              해설
                            </div>
                            <p className="mt-1 text-gray-700 dark:text-gray-300 bg-yellow-50 dark:bg-yellow-900/10 px-4 py-2 rounded-lg">
                              {note.explanation}
                            </p>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}

            <div className="flex flex-col sm:flex-row gap-4 justify-end pt-6">
              <button
                onClick={handleSaveSession}
                className="px-6 py-3 rounded-lg bg-white dark:bg-gray-900 border border-indigo-200 dark:border-indigo-700 text-indigo-600 dark:text-indigo-300 hover:bg-indigo-50 dark:hover:bg-indigo-800 transition-all shadow-sm"
              >
                저장하기
              </button>
              <button
                onClick={handleGoToQuiz}
                className="px-6 py-3 rounded-lg bg-gradient-to-r from-indigo-600 to-purple-600 text-white hover:from-indigo-700 hover:to-purple-700 transition-all shadow-lg"
              >
                또 다른 문제 풀기
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default WrongNote;
