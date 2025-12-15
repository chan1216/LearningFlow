import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence, Variants } from 'framer-motion';
import apiClient from '../api/index';
import { isAxiosError } from 'axios';

const ALLOWED_FILE_TYPES = '.pdf,.txt';
const MAX_FILE_SIZE_TEXT = 'PDF, TXT 파일 (최대 50MB) • 1개 파일만 업로드 가능';
const MAX_FILE_SIZE_BYTES = 50 * 1024 * 1024; // 50MB

// API 응답 타입 정의
interface SummaryResult {
  summary: string;
  keywords: string[];
  quizData: {
    questions: {
      id: number;
      question: string;
      options: string[];
      answer: string;
    }[];
  };
}

const Home = () => {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isMounted, setIsMounted] = useState(false);
  const [showNameModal, setShowNameModal] = useState(false);
  const [fileName, setFileName] = useState('');
  const [category, setCategory] = useState('일반');
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setIsMounted(true);
    return () => setIsMounted(false);
  }, []);

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const file = e.dataTransfer.files[0];
      if (file.size > MAX_FILE_SIZE_BYTES) {
        setError(`파일 크기는 ${MAX_FILE_SIZE_BYTES / 1024 / 1024}MB를 초과할 수 없습니다.`);
        return;
      }
      setPendingFile(file);
      setShowNameModal(true);
      setError(null);
    }
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      if (file.size > MAX_FILE_SIZE_BYTES) {
        setError(`파일 크기는 ${MAX_FILE_SIZE_BYTES / 1024 / 1024}MB를 초과할 수 없습니다.`);
        return;
      }
      setPendingFile(file);
      setShowNameModal(true);
      setError(null);
    }
  };

  const handleNameSubmit = () => {
    if (!fileName.trim()) {
      setError('파일명을 입력해주세요.');
      return;
    }
    if (pendingFile) {
      handleFileUpload(pendingFile);
      setShowNameModal(false);
      setFileName('');
    }
  };

  const handleModalClose = () => {
    setShowNameModal(false);
    setFileName('');
    setCategory('일반');
    setPendingFile(null);
  };

  const handleFileUpload = async (file: File) => {
    setUploading(true);
    setError(null);

    if (file.size > MAX_FILE_SIZE_BYTES) {
      setError(`파일 크기는 ${MAX_FILE_SIZE_BYTES / 1024 / 1024}MB를 초과할 수 없습니다.`);
      setUploading(false);
      return;
    }

    const formData = new FormData();
    formData.append('file', file);
    formData.append('custom_filename', fileName.trim()); // 사용자가 입력한 파일명 추가
    formData.append('category', category); // 카테고리 추가

    try {
      const response = await apiClient.post<SummaryResult>('/upload', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
      const sessionId = (response.data as any).sessionId;
      if (sessionId) {
        localStorage.setItem('learningflow_session_id', String(sessionId));
      }
      localStorage.removeItem('learningflow_wrong_notes');
      localStorage.setItem('learningflow_summary', JSON.stringify(response.data));
      localStorage.setItem('learningflow_custom_filename', fileName.trim() || response.data?.pdfUrl || '');
      
      // 요약 페이지로 결과와 함께 이동
      navigate('/summary', { state: { summaryResult: response.data } });

    } catch (err: unknown) {
      if (isAxiosError(err) && err.response) {
        setError(err.response.data.message || '파일 처리 중 서버에서 오류가 발생했습니다.');
      } else {
        setError('파일 업로드 또는 요약 생성에 실패했습니다. 네트워크 연결을 확인해주세요.');
      }
      console.error(err);
    } finally {
      setUploading(false);
    }
  };

  const handleUploadClick = () => {
    fileInputRef.current?.click();
  };

  const containerVariants: Variants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1,
        delayChildren: 0.2
      }
    }
  };

  const itemVariants = {
    hidden: { 
      y: 20, 
      opacity: 0 
    },
    visible: {
      y: 0,
      opacity: 1,
      transition: {
        type: 'spring',
        stiffness: 100,
        damping: 10
      }
    }
  } as const;

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50 dark:from-gray-900 dark:to-gray-800 py-12 px-4 sm:px-6 lg:px-8 transition-colors duration-300">
      <div className="max-w-5xl mx-auto">
        <motion.div 
          className="text-center mb-16"
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <div className="inline-block bg-gradient-to-r from-indigo-500 to-purple-600 text-white text-sm font-semibold px-4 py-2 rounded-full mb-6 shadow-lg">
            AI 기반 학습 플랫폼
          </div>
          <h1 className="text-4xl md:text-6xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent mb-6">
            학습을 더 스마트하게, <br className="hidden md:block" />러닝플로우와 함께
          </h1>
          <p className="text-lg md:text-xl text-gray-600 dark:text-gray-300 max-w-3xl mx-auto leading-relaxed">
            문서를 업로드하기만 하면 AI가 자동으로 요약, 퀴즈, 오답노트를 생성해드려요.
            <span className="block mt-2 text-indigo-600 dark:text-indigo-400 font-medium">학습 효율을 한 단계 업그레이드하세요.</span>
          </p>
        </motion.div>

        <motion.div 
          className={`relative bg-white dark:bg-gray-800 rounded-2xl p-8 md:p-10 shadow-2xl border-2 border-dashed ${
            isDragging 
              ? 'border-indigo-500 bg-indigo-50/50 dark:bg-gray-700/80' 
              : 'border-gray-200 dark:border-gray-700 hover:border-indigo-300 dark:hover:border-indigo-600'
          } transition-all duration-300 backdrop-blur-sm`}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={handleUploadClick}
          whileHover={{ scale: 1.01 }}
          whileTap={{ scale: 0.99 }}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <div className="relative z-10 text-center">
            <motion.div 
              className="mx-auto flex items-center justify-center h-20 w-20 rounded-2xl bg-gradient-to-br from-indigo-100 to-purple-100 dark:from-indigo-900/50 dark:to-purple-900/30 shadow-lg mb-6"
              animate={{
                y: [0, -5, 0],
              }}
              transition={{
                duration: 3,
                repeat: Infinity,
                ease: "easeInOut"
              }}
            >
              <svg 
                className="h-10 w-10 text-indigo-600 dark:text-indigo-300" 
                fill="none" 
                viewBox="0 0 24 24" 
                stroke="currentColor"
                strokeWidth="1.5"
              >
                <path 
                  strokeLinecap="round" 
                  strokeLinejoin="round" 
                  d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m6.75 12l-3-3m0 0l-3 3m3-3v6m-1.5-15H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" 
                />
              </svg>
            </motion.div>
            
            <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
              {uploading ? '파일 처리 중...' : '여기에 파일을 드롭하세요'}
            </h3>
            <p className="text-gray-500 dark:text-gray-300 mb-6">
              {uploading 
                ? 'AI가 문서를 분석하고 있어요. 잠시만 기다려주세요...' 
                : 'PDF 또는 텍스트 파일을 끌어다 놓거나 클릭하여 선택하세요.'}
            </p>
            
            <input 
              type="file" 
              ref={fileInputRef} 
              onChange={handleFileChange} 
              className="hidden" 
              accept={ALLOWED_FILE_TYPES}
              disabled={uploading}
            />
            
            <motion.button 
              type="button" 
              className={`group relative inline-flex items-center px-8 py-3.5 overflow-hidden text-sm font-medium rounded-full shadow-lg ${
                uploading 
                  ? 'bg-gray-400 cursor-not-allowed' 
                  : 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white hover:from-indigo-700 hover:to-purple-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500'
              }`}
              disabled={uploading}
              whileHover={!uploading ? { scale: 1.03 } : {}}
              whileTap={!uploading ? { scale: 0.98 } : {}}
            >
              <span className="relative">
                {uploading ? (
                  <>
                    <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white inline-block" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    처리 중...
                  </>
                ) : (
                  <>
                    <svg className="w-5 h-5 mr-2 -ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4"></path>
                    </svg>
                    파일 선택하기
                  </>
                )}
              </span>
            </motion.button>
            
            <p className="mt-4 text-sm text-gray-400 dark:text-gray-500">
              {MAX_FILE_SIZE_TEXT}
            </p>
          </div>
          
          {isDragging && (
            <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/5 to-purple-500/5 rounded-2xl"></div>
          )}
        </motion.div>

        <AnimatePresence>
          {error && (
            <motion.div 
              className="mt-6 p-4 bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 rounded-lg shadow-lg"
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
            >
              <div className="flex items-start">
                <div className="flex-shrink-0">
                  <svg className="h-5 w-5 text-red-500" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                  </svg>
                </div>
                <div className="ml-3">
                  <h3 className="text-sm font-medium text-red-800 dark:text-red-200">
                    오류 발생
                  </h3>
                  <div className="mt-1 text-sm text-red-700 dark:text-red-300">
                    <p>{error}</p>
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <motion.div 
          className="mt-16"
          variants={containerVariants}
          initial="hidden"
          animate={isMounted ? "visible" : "hidden"}
        >
          <div className="text-center mb-10">
            <h2 className="text-2xl md:text-3xl font-bold text-gray-800 dark:text-white mb-3">
              학습을 위한 완벽한 도구들
            </h2>
            <p className="text-gray-500 dark:text-gray-400 max-w-2xl mx-auto">
              AI가 당신의 학습을 돕기 위해 다양한 기능을 제공합니다.
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <motion.div 
              className="group bg-white dark:bg-gray-800 p-7 rounded-2xl shadow-lg hover:shadow-xl border border-gray-100 dark:border-gray-700 transition-all duration-300 hover:-translate-y-1"
              variants={itemVariants}
            >
              <div className="w-14 h-14 bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-900/30 dark:to-indigo-900/20 rounded-xl flex items-center justify-center mb-5 shadow-sm">
                <svg className="w-7 h-7 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <h3 className="text-xl font-semibold text-gray-800 dark:text-white mb-3 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">스마트 요약</h3>
              <p className="text-gray-500 dark:text-gray-400 text-sm leading-relaxed">
                긴 문서를 AI가 분석하여 핵심 내용만 추출해드립니다. 복잡한 내용도 간결하게 정리되어 학습 효율이 크게 향상됩니다.
              </p>
              <div className="mt-4">
                <span className="inline-flex items-center text-xs font-medium px-2.5 py-0.5 rounded-full bg-blue-100 text-blue-800 dark:bg-blue-900/50 dark:text-blue-300">
                  <span className="w-1.5 h-1.5 bg-blue-500 rounded-full mr-1.5"></span>
                  학습 효율 ↑
                </span>
              </div>
            </motion.div>
            
            <motion.div 
              className="group bg-white dark:bg-gray-800 p-7 rounded-2xl shadow-lg hover:shadow-xl border border-gray-100 dark:border-gray-700 transition-all duration-300 hover:-translate-y-1"
              variants={itemVariants}
            >
              <div className="w-14 h-14 bg-gradient-to-br from-purple-50 to-pink-50 dark:from-purple-900/30 dark:to-pink-900/20 rounded-xl flex items-center justify-center mb-5 shadow-sm">
                <svg className="w-7 h-7 text-purple-600 dark:text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
                </svg>
              </div>
              <h3 className="text-xl font-semibold text-gray-800 dark:text-white mb-3 group-hover:text-purple-600 dark:group-hover:text-purple-400 transition-colors">맞춤형 퀴즈</h3>
              <p className="text-gray-500 dark:text-gray-400 text-sm leading-relaxed">
                학습한 내용을 바탕으로 AI가 개인 맞춤형 퀴즈를 생성합니다. 이해도를 테스트하고 부족한 부분을 파악하세요.
              </p>
              <div className="mt-4">
                <span className="inline-flex items-center text-xs font-medium px-2.5 py-0.5 rounded-full bg-purple-100 text-purple-800 dark:bg-purple-900/50 dark:text-purple-300">
                  <span className="w-1.5 h-1.5 bg-purple-500 rounded-full mr-1.5"></span>
                  이해도 체크
                </span>
              </div>
            </motion.div>
            
            <motion.div 
              className="group bg-white dark:bg-gray-800 p-7 rounded-2xl shadow-lg hover:shadow-xl border border-gray-100 dark:border-gray-700 transition-all duration-300 hover:-translate-y-1"
              variants={itemVariants}
            >
              <div className="w-14 h-14 bg-gradient-to-br from-amber-50 to-orange-50 dark:from-amber-900/30 dark:to-orange-900/20 rounded-xl flex items-center justify-center mb-5 shadow-sm">
                <svg className="w-7 h-7 text-amber-600 dark:text-amber-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                </svg>
              </div>
              <h3 className="text-xl font-semibold text-gray-800 dark:text-white mb-3 group-hover:text-amber-600 dark:group-hover:text-amber-400 transition-colors">오답 노트</h3>
              <p className="text-gray-500 dark:text-gray-400 text-sm leading-relaxed">
                틀린 문제는 자동으로 저장되어 나중에 다시 복습할 수 있습니다. 취약한 부분을 집중적으로 학습하여 실력을 향상시켜보세요.
              </p>
              <div className="mt-4">
                <span className="inline-flex items-center text-xs font-medium px-2.5 py-0.5 rounded-full bg-amber-100 text-amber-800 dark:bg-amber-900/50 dark:text-amber-300">
                  <span className="w-1.5 h-1.5 bg-amber-500 rounded-full mr-1.5"></span>
                  오답 관리
                </span>
              </div>
            </motion.div>
          </div>
          
          <div className="mt-12 text-center">
            <motion.button 
              className="inline-flex items-center px-6 py-3 border border-transparent text-base font-medium rounded-full shadow-sm text-white bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-all duration-300 hover:shadow-lg"
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.98 }}
              onClick={handleUploadClick}
            >
              시작하기
              <svg className="ml-2 -mr-1 w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M14 5l7 7m0 0l-7 7m7-7H3"></path>
              </svg>
            </motion.button>
          </div>
        </motion.div>
      </div>

      {/* 파일명 입력 모달 */}
      <AnimatePresence>
        {showNameModal && (
          <motion.div
            className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={handleModalClose}
          >
            <motion.div
              className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl max-w-md w-full p-6"
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
            >
              <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-4">
                파일 정보 입력
              </h3>
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                저장할 파일의 이름과 카테고리를 선택해주세요.
              </p>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    파일명
                  </label>
                  <input
                    type="text"
                    value={fileName}
                    onChange={(e) => setFileName(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && handleNameSubmit()}
                    placeholder="예: 2024년 1학기 중간고사"
                    className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                    autoFocus
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    카테고리
                  </label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                  >
                    <option value="일반">일반</option>
                    <option value="과학">과학</option>
                    <option value="수학">수학</option>
                    <option value="영어">영어 (자동 번역)</option>
                    <option value="논문">논문</option>
                    <option value="기타">기타</option>
                  </select>
                  {category === '영어' && (
                    <p className="mt-2 text-xs text-indigo-600 dark:text-indigo-400">
                      ℹ️ 영어 문서는 자동으로 한국어로 번역됩니다.
                    </p>
                  )}
                </div>
              </div>

              <div className="flex gap-3 mt-6">
                <button
                  onClick={handleModalClose}
                  className="flex-1 px-4 py-2.5 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg font-medium hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
                >
                  취소
                </button>
                <button
                  onClick={handleNameSubmit}
                  className="flex-1 px-4 py-2.5 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-lg font-medium hover:from-indigo-700 hover:to-purple-700 transition-all shadow-lg"
                >
                  확인
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default Home;
