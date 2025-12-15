import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import apiClient from '../api';

interface UploadedFile {
  id: number;
  custom_filename: string;
  original_filename: string;
  file_size: number;
  file_type: string;
  file_path?: string;
  created_at: string;
  summary_data?: string;
  quiz_data?: string;
  wrong_notes_data?: string;
  is_saved?: boolean;
}

const MyPage = () => {
  const [user, setUser] = useState<any>(null);
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedSession, setSelectedSession] = useState<UploadedFile | null>(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [currentPage, setCurrentPage] = useState<'summary' | 'quiz' | 'wrongnote'>('summary');
  const [downloadingPdf, setDownloadingPdf] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const loadUserInfo = async () => {
      const userStr = localStorage.getItem('user');
      const token = localStorage.getItem('access_token');
      
      if (userStr && token) {
        const userData = JSON.parse(userStr);
        setUser(userData);
        
        try {
          const response = await apiClient.get('/mypage/files');
          setUploadedFiles(response.data);
        } catch (error) {
          console.error('파일 목록 로드 실패:', error);
        }
      } else {
        navigate('/login');
      }
      setLoading(false);
    };

    loadUserInfo();
    
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [navigate]);

  const handleDeleteFile = async (fileId: number) => {
    if (!confirm('정말 이 파일을 삭제하시겠습니까?')) {
      return;
    }

    try {
      await apiClient.delete(`/mypage/files/${fileId}`);
      setUploadedFiles(uploadedFiles.filter(file => file.id !== fileId));
      alert('파일이 삭제되었습니다.');
    } catch (error) {
      console.error('파일 삭제 실패:', error);
      alert('파일 삭제에 실패했습니다.');
    }
  };

  const parseJSONSafe = (payload?: string | null) => {
    if (!payload) return null;
    try {
      return JSON.parse(payload);
    } catch (error) {
      console.error('JSON 파싱 실패:', error);
      return null;
    }
  };

  const openDetailModal = (file: UploadedFile) => {
    setSelectedSession(file);
    setCurrentPage('summary');
    setShowDetailModal(true);
    document.body.style.overflow = 'hidden';
  };

  const closeDetailModal = () => {
    setShowDetailModal(false);
    setSelectedSession(null);
    setCurrentPage('summary');
    document.body.style.overflow = 'unset';
  };

  const hasDetail = (file: UploadedFile) => {
    return !!(file.summary_data || file.quiz_data || file.wrong_notes_data);
  };

  const handleDownloadPdf = async () => {
    if (!selectedSession) return;
    
    setDownloadingPdf(true);
    try {
      const summary = parseJSONSafe(selectedSession.summary_data);
      const quiz = parseJSONSafe(selectedSession.quiz_data);
      const wrongNotes = parseJSONSafe(selectedSession.wrong_notes_data);

      console.log('Summary:', summary);
      console.log('Quiz:', quiz);
      console.log('Wrong Notes:', wrongNotes);

      const response = await apiClient.post('/pdf', {
        summary: summary,
        keywords: summary?.keywords || [],
        quiz_results: quiz?.quizzes?.map((q: any) => ({
          question: q.question,
          userAnswer: q.answer,
          correctAnswer: q.answer,
          isCorrect: true
        })) || [],
        wrong_notes: wrongNotes || {}
      }, {
        responseType: 'blob',
      });

      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `${selectedSession.custom_filename}_학습결과_${new Date().toISOString().split('T')[0]}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.parentNode?.removeChild(link);
      
      alert('PDF 다운로드가 완료되었습니다!');
    } catch (error) {
      console.error('PDF 다운로드 실패:', error);
      alert('PDF 다운로드에 실패했습니다.');
    } finally {
      setDownloadingPdf(false);
    }
  };

  const handleDownloadPdfFromList = async (file: UploadedFile) => {
    setDownloadingPdf(true);
    try {
      const summary = parseJSONSafe(file.summary_data);
      const quiz = parseJSONSafe(file.quiz_data);
      const wrongNotes = parseJSONSafe(file.wrong_notes_data);

      console.log('Summary:', summary);
      console.log('Quiz:', quiz);
      console.log('Wrong Notes:', wrongNotes);

      const response = await apiClient.post('/pdf', {
        summary: summary,
        keywords: summary?.keywords || [],
        quiz_results: quiz?.quizzes?.map((q: any) => ({
          question: q.question,
          userAnswer: q.answer,
          correctAnswer: q.answer,
          isCorrect: true
        })) || [],
        wrong_notes: wrongNotes || {}
      }, {
        responseType: 'blob',
      });

      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `${file.custom_filename}_학습결과_${new Date().toISOString().split('T')[0]}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.parentNode?.removeChild(link);
      
      alert('PDF 다운로드가 완료되었습니다!');
    } catch (error) {
      console.error('PDF 다운로드 실패:', error);
      alert('PDF 다운로드에 실패했습니다.');
    } finally {
      setDownloadingPdf(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50 dark:from-gray-900 dark:to-gray-800 flex items-center justify-center">
        <div className="text-gray-600 dark:text-gray-300">로딩 중...</div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <>
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50 dark:from-gray-900 dark:to-gray-800">
        <div className="max-w-6xl mx-auto px-4 py-12">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-8"
          >
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-8">마이 페이지</h1>
            
            <div className="mb-8 p-6 bg-gradient-to-r from-indigo-50 to-purple-50 dark:from-indigo-900/20 dark:to-purple-900/20 rounded-xl">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">환영합니다, {user.name}님!</h2>
              <p className="text-gray-600 dark:text-gray-300">이메일: {user.email}</p>
            </div>

            <div className="mb-6">
              <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">업로드한 파일 목록</h3>
              {uploadedFiles.length === 0 ? (
                <div className="text-center py-12 text-gray-500 dark:text-gray-400">
                  아직 업로드한 파일이 없습니다.
                </div>
              ) : (
                <div className="space-y-4">
                  {uploadedFiles.map((file) => (
                    <motion.div
                      key={file.id}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="bg-gray-50 dark:bg-gray-700 rounded-xl p-4"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <div className="flex items-center space-x-3">
                            <div className="w-10 h-10 bg-indigo-100 dark:bg-indigo-900/40 rounded-lg flex items-center justify-center">
                              <span className="text-indigo-600 dark:text-indigo-400 text-xl">📄</span>
                            </div>
                            <div>
                              <h4 className="font-semibold text-gray-900 dark:text-white">{file.custom_filename}</h4>
                              <p className="text-sm text-gray-500 dark:text-gray-400">
                                업로드: {new Date(file.created_at).toLocaleDateString('ko-KR')} • {(file.file_size / 1024).toFixed(1)} KB
                              </p>
                              {file.is_saved && (
                                <span className="inline-flex items-center mt-2 px-2 py-1 text-xs font-medium bg-green-100 text-green-700 rounded-full dark:bg-green-900/40 dark:text-green-300">
                                  저장 완료
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center space-x-2">
                          <button 
                            onClick={() => openDetailModal(file)}
                            className={`px-4 py-2 rounded-lg transition-colors text-sm font-medium ${
                              hasDetail(file)
                                ? 'bg-indigo-600 text-white hover:bg-indigo-700'
                                : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                            }`}
                            disabled={!hasDetail(file)}
                          >
                            {hasDetail(file) ? '저장 내용 보기' : '정보 없음'}
                          </button>
                          <button 
                            onClick={() => handleDownloadPdfFromList(file)}
                            disabled={!hasDetail(file) || downloadingPdf}
                            className={`px-4 py-2 rounded-lg transition-colors text-sm font-medium flex items-center gap-2 ${
                              hasDetail(file) && !downloadingPdf
                                ? 'bg-green-600 text-white hover:bg-green-700'
                                : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                            }`}
                          >
                            {downloadingPdf ? (
                              <>
                                <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                </svg>
                                생성 중...
                              </>
                            ) : (
                              '📥 PDF'
                            )}
                          </button>
                          <button 
                            onClick={() => handleDeleteFile(file.id)}
                            className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors text-sm font-medium"
                          >
                            삭제
                          </button>
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </div>
              )}
            </div>
          </motion.div>
        </div>
      </div>

      {showDetailModal && selectedSession && (
        <div 
          className="fixed inset-0 bg-black/50 z-50 overflow-hidden"
          style={{ touchAction: 'none' }}
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              closeDetailModal();
            }
          }}
        >
          <div 
            className="w-full h-full bg-white dark:bg-gray-900 flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            {/* 헤더 */}
            <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-800 flex-shrink-0 bg-gray-50 dark:bg-gray-800">
              <div>
                <h2 className="text-xl font-bold text-gray-900 dark:text-white">{selectedSession.custom_filename}</h2>
                <p className="text-sm text-gray-500 dark:text-gray-400">저장된 학습 세션</p>
              </div>
              <button onClick={closeDetailModal} className="text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 text-2xl">✕</button>
            </div>

            {/* 탭 네비게이션 */}
            <div className="flex border-b border-gray-200 dark:border-gray-800 flex-shrink-0 bg-white dark:bg-gray-900">
              <button
                onClick={() => setCurrentPage('summary')}
                className={`flex-1 px-6 py-4 text-sm font-medium transition-colors ${
                  currentPage === 'summary'
                    ? 'text-indigo-600 dark:text-indigo-400 border-b-2 border-indigo-600 dark:border-indigo-400'
                    : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
                }`}
              >
                📝 요약
              </button>
              <button
                onClick={() => setCurrentPage('quiz')}
                className={`flex-1 px-6 py-4 text-sm font-medium transition-colors ${
                  currentPage === 'quiz'
                    ? 'text-purple-600 dark:text-purple-400 border-b-2 border-purple-600 dark:border-purple-400'
                    : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
                }`}
              >
                📚 퀴즈
              </button>
              <button
                onClick={() => setCurrentPage('wrongnote')}
                className={`flex-1 px-6 py-4 text-sm font-medium transition-colors ${
                  currentPage === 'wrongnote'
                    ? 'text-red-600 dark:text-red-400 border-b-2 border-red-600 dark:border-red-400'
                    : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
                }`}
              >
                ❌ 오답 노트
              </button>
            </div>

            {/* 컨텐츠 영역 - Summary 페이지 스타일 적용 */}
            {currentPage === 'summary' && (() => {
              const summary = parseJSONSafe(selectedSession.summary_data);
              if (!summary) {
                return (
                  <div className="flex-1 flex items-center justify-center text-gray-500 dark:text-gray-400">
                    저장된 요약이 없습니다.
                  </div>
                );
              }
              
              const pdfUrl = selectedSession.file_path ? selectedSession.file_path.replace('uploads/', '/uploads/') : null;
              
              return (
                <div className="flex-1 flex overflow-hidden">
                  {/* 왼쪽: PDF 뷰어 */}
                  {pdfUrl && (
                    <div className="w-1/2 h-full border-r border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 flex flex-col overflow-hidden">
                      <div className="p-4 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 flex-shrink-0">
                        <h2 className="text-lg font-semibold text-gray-900 dark:text-white">원본 PDF</h2>
                      </div>
                      <div className="flex-1 overflow-hidden bg-gray-100 dark:bg-gray-950">
                        <iframe
                          src={`http://localhost:8000${pdfUrl}`}
                          title="PDF Viewer"
                          className="w-full h-full"
                          style={{ border: 'none' }}
                        />
                      </div>
                    </div>
                  )}
                  
                  {/* 오른쪽: 요약 내용 */}
                  <div className={`${pdfUrl ? 'w-1/2' : 'w-full'} h-full flex flex-col overflow-hidden`}>
                    <div className="flex-1 overflow-y-auto">
                      <div className="p-6">
                        <div className="max-w-4xl mx-auto space-y-6">
                          {/* 구조화된 요약 */}
                          {summary.structuredSummary && summary.structuredSummary.length > 0 && (
                        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl overflow-hidden">
                          <div className="p-4 border-b border-gray-100 dark:border-gray-700">
                            <h3 className="text-xl font-semibold text-gray-900 dark:text-white flex items-center">
                              <span className="mr-2">📄</span>
                              핵심 내용 정리
                            </h3>
                          </div>
                          <div className="p-4 space-y-3">
                            {summary.structuredSummary.map((item: any, index: number) => (
                              <div key={index} className="border-l-4 border-indigo-500 pl-4 py-2">
                                <h4 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                                  {item.title}
                                </h4>
                                <p className="text-gray-700 dark:text-gray-300 leading-relaxed">
                                  {item.content}
                                </p>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* 전체 요약 */}
                      {summary.fullSummary && summary.fullSummary.length > 0 && (
                        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl overflow-hidden">
                          <div className="p-4 border-b border-gray-100 dark:border-gray-700">
                            <h3 className="text-xl font-semibold text-gray-900 dark:text-white flex items-center">
                              <span className="mr-2">📋</span>
                              전체 요약
                            </h3>
                          </div>
                          <div className="p-4 space-y-4">
                            {summary.fullSummary.map((section: any, index: number) => (
                              <div key={index} className="border-l-4 border-indigo-500 pl-4">
                                <h4 className="text-lg font-bold text-gray-900 dark:text-white mb-3">
                                  {section.mainTitle}
                                </h4>
                                <div className="space-y-2">
                                  {section.content.map((item: string, idx: number) => (
                                    <p key={idx} className="text-gray-700 dark:text-gray-300 leading-relaxed">
                                      {item}
                                    </p>
                                  ))}
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* 핵심 키워드 */}
                      {summary.keywords && summary.keywords.length > 0 && (
                        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl overflow-hidden">
                          <div className="p-4 border-b border-gray-100 dark:border-gray-700">
                            <h3 className="text-xl font-semibold text-gray-900 dark:text-white flex items-center">
                              <span className="mr-2">💡</span>
                              핵심 키워드
                            </h3>
                          </div>
                          <div className="p-4">
                            <div className="flex flex-wrap gap-3">
                              {summary.keywords.map((keyword: string, index: number) => (
                                <span 
                                  key={index} 
                                  className="inline-flex items-center px-4 py-2 rounded-full text-sm font-medium bg-indigo-100 text-indigo-800 dark:bg-indigo-900/30 dark:text-indigo-200 border border-indigo-200 dark:border-indigo-800"
                                >
                                  # {keyword}
                                </span>
                              ))}
                            </div>
                          </div>
                        </div>
                      )}

                      {/* 예상 질문 */}
                      {summary.expectedQuestions && summary.expectedQuestions.length > 0 && (
                        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl overflow-hidden">
                          <div className="p-4 border-b border-gray-100 dark:border-gray-700">
                            <h3 className="text-xl font-semibold text-gray-900 dark:text-white flex items-center">
                              <span className="mr-2">❓</span>
                              예상 질문
                            </h3>
                          </div>
                          <div className="p-4 space-y-3">
                            {summary.expectedQuestions.map((item: any, index: number) => (
                              <div key={index} className="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
                                <div className="flex items-start mb-2">
                                  <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400 text-sm font-semibold mr-3 mt-0.5">
                                    Q
                                  </span>
                                  <p className="text-gray-900 dark:text-white font-medium">
                                    {item.question}
                                  </p>
                                </div>
                                <div className="flex items-start bg-purple-50 dark:bg-purple-900/10 p-3 rounded-lg mt-2">
                                  <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-purple-600 text-white text-sm font-semibold mr-3 mt-0.5">
                                    A
                                  </span>
                                  <p className="text-gray-700 dark:text-gray-300 leading-relaxed">
                                    {item.answer}
                                  </p>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })()}

            {currentPage === 'quiz' && (() => {
              const quiz = parseJSONSafe(selectedSession.quiz_data);
              if (!quiz?.questions || quiz.questions.length === 0) {
                return (
                  <div className="flex-1 flex items-center justify-center text-gray-500 dark:text-gray-400">
                    저장된 퀴즈가 없습니다.
                  </div>
                );
              }
              return (
                <div className="flex-1 overflow-y-auto p-6">
                  <div className="space-y-6">
                    <h3 className="text-2xl font-bold text-purple-700 dark:text-purple-300 mb-4">📚 퀴즈 문제</h3>
                    {quiz.questions.map((q: any, idx: number) => (
                      <div key={idx} className="bg-purple-50 dark:bg-purple-900/20 p-6 rounded-xl">
                        <p className="text-lg font-semibold text-purple-900 dark:text-purple-100 mb-3">
                          Q{idx + 1}. {q.question}
                        </p>
                        {q.options && q.options.length > 0 && (
                          <ul className="space-y-2 mb-3">
                            {q.options.map((opt: string, optIdx: number) => (
                              <li key={optIdx} className="flex items-start">
                                <span className="inline-block w-6 h-6 rounded-full bg-purple-200 dark:bg-purple-800 text-purple-800 dark:text-purple-200 text-center text-sm font-medium mr-2 flex-shrink-0">
                                  {optIdx + 1}
                                </span>
                                <span className="text-gray-800 dark:text-gray-200">{opt}</span>
                              </li>
                            ))}
                          </ul>
                        )}
                        <div className="mt-4 p-3 bg-green-100 dark:bg-green-900/30 rounded-lg">
                          <p className="text-sm font-medium text-green-800 dark:text-green-200">
                            ✓ 정답: {q.answer}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })()}

            {currentPage === 'wrongnote' && (() => {
              const wrongNotes = parseJSONSafe(selectedSession.wrong_notes_data);
              if (!Array.isArray(wrongNotes) || wrongNotes.length === 0) {
                return (
                  <div className="flex-1 flex items-center justify-center text-gray-500 dark:text-gray-400">
                    저장된 오답이 없습니다. 완벽해요! 🎉
                  </div>
                );
              }
              return (
                <div className="flex-1 overflow-y-auto p-6">
                  <div className="space-y-6">
                    <h3 className="text-2xl font-bold text-red-700 dark:text-red-300 mb-4">❌ 오답 노트</h3>
                    {wrongNotes.map((note: any, idx: number) => (
                      <div key={idx} className="bg-red-50 dark:bg-red-900/20 p-6 rounded-xl">
                        <p className="text-lg font-semibold text-red-900 dark:text-red-100 mb-4">
                          문제 {idx + 1}: {note.question}
                        </p>
                        <div className="space-y-3">
                          <div className="p-3 bg-red-100 dark:bg-red-900/30 rounded-lg">
                            <p className="text-sm font-medium text-red-800 dark:text-red-200 mb-1">❌ 내 답변</p>
                            <p className="text-gray-800 dark:text-gray-200">{note.user_answer}</p>
                          </div>
                          <div className="p-3 bg-green-100 dark:bg-green-900/30 rounded-lg">
                            <p className="text-sm font-medium text-green-800 dark:text-green-200 mb-1">✓ 정답</p>
                            <p className="text-gray-800 dark:text-gray-200">{note.correct_answer}</p>
                          </div>
                          {note.explanation && (
                            <div className="p-3 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg">
                              <p className="text-sm font-medium text-yellow-800 dark:text-yellow-200 mb-1">💡 해설</p>
                              <p className="text-gray-800 dark:text-gray-200">{note.explanation}</p>
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })()}
          </div>

          {/* 하단 네비게이션 */}
          <div className="p-4 border-t border-gray-200 dark:border-gray-800 flex justify-between items-center flex-shrink-0">
            <div className="flex gap-2">
              {currentPage !== 'summary' && (
                <button
                  onClick={() => {
                    if (currentPage === 'quiz') setCurrentPage('summary');
                    else if (currentPage === 'wrongnote') setCurrentPage('quiz');
                  }}
                  className="px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
                >
                  ← 이전
                </button>
              )}
              {currentPage !== 'wrongnote' && (
                <button
                  onClick={() => {
                    if (currentPage === 'summary') setCurrentPage('quiz');
                    else if (currentPage === 'quiz') setCurrentPage('wrongnote');
                  }}
                  className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
                >
                  다음 →
                </button>
              )}
            </div>
            
            <div className="flex gap-2">
              <button 
                onClick={handleDownloadPdf}
                disabled={downloadingPdf}
                className={`px-4 py-2 rounded-lg transition-colors flex items-center gap-2 ${
                  downloadingPdf
                    ? 'bg-gray-400 cursor-not-allowed text-white'
                    : 'bg-green-600 text-white hover:bg-green-700'
                }`}
              >
                {downloadingPdf ? (
                  <>
                    <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    생성 중...
                  </>
                ) : (
                  <>
                    📥 PDF 다운로드
                  </>
                )}
              </button>
              <button onClick={closeDetailModal} className="px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors">
                닫기
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default MyPage;
