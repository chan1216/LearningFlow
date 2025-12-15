import { useLocation, useNavigate } from 'react-router-dom';
import { useEffect, useState, useMemo, useRef } from 'react';
import { DocumentTextIcon, LightBulbIcon, ArrowRightIcon, QuestionMarkCircleIcon, ChatBubbleLeftRightIcon, XMarkIcon, PaperAirplaneIcon } from '@heroicons/react/24/outline';
import axios from 'axios';

const Summary = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [fullSummary, setFullSummary] = useState<Array<{mainTitle: string, content: string[]}>>([]);
  const [structuredSummary, setStructuredSummary] = useState<Array<{title: string, content: string}>>([]);
  const [keywords, setKeywords] = useState<string[]>([]);
  const [expectedQuestions, setExpectedQuestions] = useState<Array<{question: string, answer: string}>>([]);
  const [copied, setCopied] = useState(false);
  const [isPageLoading, setIsPageLoading] = useState(true);
  const [expandedQuestion, setExpandedQuestion] = useState<number | null>(null);
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [pdfText, setPdfText] = useState<string>('');
  const [translatedText, setTranslatedText] = useState<string | null>(null);
  
  // 챗봇 상태
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [chatMessages, setChatMessages] = useState<Array<{role: 'user' | 'assistant', content: string}>>([]);
  const [chatInput, setChatInput] = useState('');
  const [isChatLoading, setIsChatLoading] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);

  const summaryResult = useMemo(() => location.state?.summaryResult, [location.state]);

  useEffect(() => {
    if (summaryResult) {
      setFullSummary(summaryResult.fullSummary || []);
      setStructuredSummary(summaryResult.structuredSummary || []);
      setKeywords(summaryResult.keywords);
      setExpectedQuestions(summaryResult.expectedQuestions || []);
      setPdfUrl(summaryResult.pdfUrl || null);
      setPdfText(summaryResult.pdfText || '');
      setTranslatedText(summaryResult.translatedText || null);
      setIsPageLoading(false);
    } else {
      // 직접 접근 방지 또는 기본 상태 처리
      navigate('/');
    }
  }, [summaryResult, navigate]);

  // 채팅 메시지가 추가될 때마다 스크롤 아래로
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages]);

  const handleChatSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatInput.trim() || isChatLoading) return;

    const userMessage = chatInput.trim();
    setChatInput('');
    setChatMessages(prev => [...prev, { role: 'user', content: userMessage }]);
    setIsChatLoading(true);

    try {
      const response = await axios.post('http://localhost:8000/chat', {
        question: userMessage,
        pdfText: pdfText
      });

      setChatMessages(prev => [...prev, { 
        role: 'assistant', 
        content: response.data.answer 
      }]);
    } catch (error) {
      console.error('채팅 오류:', error);
      setChatMessages(prev => [...prev, { 
        role: 'assistant', 
        content: '죄송합니다. 답변을 생성하는 중 오류가 발생했습니다.' 
      }]);
    } finally {
      setIsChatLoading(false);
    }
  };

  const handleCreateQuiz = () => {
    // 퀴즈 개수 선택 페이지로 이동
    navigate('/quiz-select', { state: { summaryResult } });
  };

  const copyToClipboard = () => {
    const fullText = fullSummary.map(section => 
      `${section.mainTitle}\n${section.content.map(item => `• ${item}`).join('\n')}`
    ).join('\n\n');
    navigator.clipboard.writeText(fullText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (isPageLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-indigo-50 to-blue-50 dark:from-gray-900 dark:to-gray-800">
        <div className="text-center p-8 bg-white dark:bg-gray-800 rounded-2xl shadow-xl">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto mb-4"></div>
          <p className="text-gray-700 dark:text-gray-300">요약 결과를 불러오는 중...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen overflow-hidden bg-gradient-to-br from-indigo-50 to-blue-50 dark:from-gray-900 dark:to-gray-800">
      <div className="flex h-full">
        {/* 왼쪽: PDF 뷰어 */}
        {pdfUrl && (
          <div className="w-1/2 h-full border-r border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 flex flex-col overflow-hidden relative">
            <div className="p-4 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 flex-shrink-0">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">원본 PDF</h2>
            </div>
            <div className="flex-1 overflow-hidden bg-gray-100 dark:bg-gray-950" style={{ paddingBottom: '64px' }}>
              <iframe
                src={`http://localhost:8000${pdfUrl}`}
                title="PDF Viewer"
                className="w-full h-full"
                style={{ border: 'none' }}
              />
            </div>
            <div className="absolute bottom-0 left-0 w-full bg-gray-800 dark:bg-gray-900 py-3 px-4 border-t border-gray-700 z-10">
              <div className="flex items-center justify-center space-x-4">
                <button className="p-2 text-gray-300 hover:text-white transition-colors">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                  </svg>
                </button>
                <button className="p-2 text-gray-300 hover:text-white transition-colors">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                </button>
                <button className="p-2 text-gray-300 hover:text-white transition-colors">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                </button>
                <div className="flex items-center space-x-2 px-4">
                  <input 
                    type="text" 
                    defaultValue="1" 
                    className="w-12 px-2 py-1 text-center bg-gray-700 text-white rounded border border-gray-600 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                  <span className="text-gray-400">/</span>
                  <span className="text-gray-300">3</span>
                </div>
                <button className="p-2 text-gray-300 hover:text-white transition-colors">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                </button>
                <button className="px-3 py-1 bg-gray-700 text-white text-sm rounded hover:bg-gray-600 transition-colors">
                  확대
                </button>
              </div>
            </div>
          </div>
        )}
        
        {/* 오른쪽: 요약 내용 */}
        <div className={`${pdfUrl ? 'w-1/2' : 'w-full'} h-full flex flex-col overflow-hidden`}>
          <div className="flex-1 overflow-y-auto pb-24">
            <div className="py-8 px-4 sm:px-6 lg:px-8">
            <div className="max-w-4xl mx-auto">
              <div className="text-center mb-8">
                <h1 className="text-3xl md:text-4xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent mb-3">
                  AI 생성 요약 결과
                </h1>
                <p className="text-lg text-gray-600 dark:text-gray-300">
                  AI가 분석한 문서의 핵심 내용과 키워드입니다.
                </p>
              </div>

        {/* 번역 결과 (영어 카테고리인 경우만 표시) */}
        {translatedText && (
          <div className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-gray-800 dark:to-gray-700 rounded-2xl shadow-xl overflow-hidden mb-6 border-2 border-blue-200 dark:border-blue-700">
            <div className="p-4 border-b border-blue-200 dark:border-blue-700 bg-blue-100 dark:bg-gray-800">
              <div className="flex items-center">
                <span className="text-2xl mr-2">🌐</span>
                <h2 className="text-xl font-semibold text-gray-900 dark:text-white">한국어 번역</h2>
              </div>
            </div>
            <div className="p-6 max-h-96 overflow-y-auto">
              <p className="text-gray-800 dark:text-gray-200 leading-relaxed whitespace-pre-wrap">
                {translatedText}
              </p>
            </div>
          </div>
        )}

        {/* 구조화된 요약 */}
        {structuredSummary.length > 0 && (
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl overflow-hidden mb-6 transition-all duration-300 hover:shadow-2xl">
            <div className="p-4 border-b border-gray-100 dark:border-gray-700">
              <div className="flex items-center">
                <DocumentTextIcon className="h-6 w-6 text-indigo-600 dark:text-indigo-400 mr-2" />
                <h2 className="text-xl font-semibold text-gray-900 dark:text-white">핵심 내용 정리</h2>
              </div>
            </div>
            <div className="p-4 space-y-3">
              {structuredSummary.map((item, index) => (
                <div key={index} className="border-l-4 border-indigo-500 pl-4 py-2">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                    {item.title}
                  </h3>
                  <p className="text-gray-700 dark:text-gray-300 leading-relaxed">
                    {item.content}
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl overflow-hidden mb-6 transition-all duration-300 hover:shadow-2xl">
          <div className="p-4 border-b border-gray-100 dark:border-gray-700 flex justify-between items-center">
            <div className="flex items-center">
              <DocumentTextIcon className="h-6 w-6 text-indigo-600 dark:text-indigo-400 mr-2" />
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white">전체 요약</h2>
            </div>
            <button
              onClick={copyToClipboard}
              className="text-sm text-indigo-600 dark:text-indigo-400 hover:text-indigo-800 dark:hover:text-indigo-300 flex items-center"
            >
              {copied ? '복사 완료!' : '복사하기'}
            </button>
          </div>
          <div className="p-4 space-y-4">
            {fullSummary.map((section, index) => (
              <div key={index} className="border-l-4 border-indigo-500 pl-4">
                <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-3">
                  {section.mainTitle}
                </h3>
                <div className="space-y-2">
                  {section.content.map((item, idx) => (
                    <p key={idx} className="text-gray-700 dark:text-gray-300 leading-relaxed">
                      {item}
                    </p>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl overflow-hidden mb-6 transition-all duration-300 hover:shadow-2xl">
          <div className="p-4 border-b border-gray-100 dark:border-gray-700">
            <div className="flex items-center">
              <LightBulbIcon className="h-6 w-6 text-yellow-500 dark:text-yellow-400 mr-2" />
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white">핵심 키워드</h2>
            </div>
          </div>
          <div className="p-4">
            <div className="flex flex-wrap gap-3">
              {keywords.map((keyword, index) => (
                <span 
                  key={index} 
                  className="inline-flex items-center px-4 py-2 rounded-full text-sm font-medium bg-indigo-100 text-indigo-800 dark:bg-indigo-900/30 dark:text-indigo-200 border border-indigo-200 dark:border-indigo-800 transition-colors duration-200 hover:bg-indigo-200 dark:hover:bg-indigo-800/50"
                >
                  # {keyword}
                </span>
              ))}
            </div>
          </div>
        </div>

        {/* 예상 질문 */}
        {expectedQuestions.length > 0 && (
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl overflow-hidden mb-6 transition-all duration-300 hover:shadow-2xl">
            <div className="p-4 border-b border-gray-100 dark:border-gray-700">
              <div className="flex items-center">
                <QuestionMarkCircleIcon className="h-6 w-6 text-purple-600 dark:text-purple-400 mr-2" />
                <h2 className="text-xl font-semibold text-gray-900 dark:text-white">예상 질문</h2>
              </div>
            </div>
            <div className="p-4 space-y-3">
              {expectedQuestions.map((item, index) => (
                <div key={index} className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
                  <button
                    onClick={() => setExpandedQuestion(expandedQuestion === index ? null : index)}
                    className="w-full p-4 text-left hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex items-start flex-1">
                        <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400 text-sm font-semibold mr-3 mt-0.5">
                          Q
                        </span>
                        <p className="text-gray-900 dark:text-white font-medium pr-4">
                          {item.question}
                        </p>
                      </div>
                      <svg
                        className={`w-5 h-5 text-gray-500 transition-transform ${
                          expandedQuestion === index ? 'transform rotate-180' : ''
                        }`}
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                      </svg>
                    </div>
                  </button>
                  {expandedQuestion === index && (
                    <div className="px-4 pb-4 pt-2 bg-purple-50 dark:bg-purple-900/10">
                      <div className="flex items-start">
                        <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-purple-600 text-white text-sm font-semibold mr-3 mt-0.5">
                          A
                        </span>
                        <p className="text-gray-700 dark:text-gray-300 leading-relaxed">
                          {item.answer}
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="text-center mt-6 mb-6">
          <button 
            onClick={handleCreateQuiz}
            className="inline-flex items-center px-8 py-3 border border-transparent text-base font-medium rounded-md shadow-sm text-white bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
          >
            퀴즈 풀기
            <ArrowRightIcon className="ml-3 -mr-1 h-5 w-5" />
          </button>
        </div>
              </div>
            </div>
          </div>
        </div>

        {/* 챗봇 버튼 */}
        <button
          onClick={() => setIsChatOpen(!isChatOpen)}
          className="fixed bottom-6 right-6 w-14 h-14 bg-gradient-to-r from-indigo-600 to-purple-600 rounded-full shadow-lg hover:shadow-xl transition-all duration-300 flex items-center justify-center text-white z-50"
        >
          {isChatOpen ? (
            <XMarkIcon className="h-6 w-6" />
          ) : (
            <ChatBubbleLeftRightIcon className="h-6 w-6" />
          )}
        </button>

        {/* 챗봇 창 */}
        {isChatOpen && (
          <div className="fixed bottom-24 right-6 w-96 h-[500px] bg-white dark:bg-gray-800 rounded-2xl shadow-2xl flex flex-col z-50 border border-gray-200 dark:border-gray-700">
            {/* 헤더 */}
            <div className="p-4 border-b border-gray-200 dark:border-gray-700 bg-gradient-to-r from-indigo-600 to-purple-600 rounded-t-2xl">
              <h3 className="text-lg font-semibold text-white flex items-center">
                <ChatBubbleLeftRightIcon className="h-5 w-5 mr-2" />
                PDF 문서 도우미
              </h3>
              <p className="text-sm text-indigo-100 mt-1">PDF 내용에 대해 질문해보세요</p>
            </div>

            {/* 메시지 영역 */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {chatMessages.length === 0 && (
                <div className="text-center text-gray-500 dark:text-gray-400 mt-8">
                  <ChatBubbleLeftRightIcon className="h-12 w-12 mx-auto mb-3 opacity-50" />
                  <p className="text-sm">PDF 내용에 대해 궁금한 점을 물어보세요!</p>
                </div>
              )}
              
              {chatMessages.map((message, index) => (
                <div
                  key={index}
                  className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`max-w-[80%] rounded-lg px-4 py-2 ${
                      message.role === 'user'
                        ? 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white'
                        : 'bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-white'
                    }`}
                  >
                    <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                  </div>
                </div>
              ))}
              
              {isChatLoading && (
                <div className="flex justify-start">
                  <div className="bg-gray-100 dark:bg-gray-700 rounded-lg px-4 py-2">
                    <div className="flex space-x-2">
                      <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                      <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                      <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.4s' }}></div>
                    </div>
                  </div>
                </div>
              )}
              
              <div ref={chatEndRef} />
            </div>

            {/* 입력 영역 */}
            <form onSubmit={handleChatSubmit} className="p-4 border-t border-gray-200 dark:border-gray-700">
              <div className="flex items-center space-x-2 mb-3">
                <button
                  type="button"
                  className="px-3 py-1.5 text-sm bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors"
                >
                  빠른
                </button>
                <button
                  type="button"
                  className="px-3 py-1.5 text-sm bg-purple-100 dark:bg-purple-900/30 border border-purple-300 dark:border-purple-700 rounded-lg text-purple-700 dark:text-purple-300 hover:bg-purple-200 dark:hover:bg-purple-800/40 transition-colors flex items-center"
                >
                  <span className="mr-1">✨</span>
                  고품질
                </button>
                <button
                  type="button"
                  className="px-3 py-1.5 text-sm bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors"
                >
                  +
                </button>
              </div>
              <div className="flex space-x-2">
                <input
                  type="text"
                  value={chatInput}
                  onChange={(e) => setChatInput(e.target.value)}
                  placeholder="질문을 입력하세요..."
                  className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400"
                  disabled={isChatLoading}
                />
                <button
                  type="submit"
                  disabled={isChatLoading || !chatInput.trim()}
                  className="px-4 py-2 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-lg hover:from-indigo-700 hover:to-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
                >
                  <PaperAirplaneIcon className="h-5 w-5" />
                </button>
              </div>
            </form>
          </div>
        )}
      </div>
    </div>
  );
};

export default Summary;
