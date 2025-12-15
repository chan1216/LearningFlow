import { useState, useRef, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import apiClient from '../api';
import { DocumentTextIcon, ArrowDownTrayIcon, ArrowLeftIcon, ArrowUpTrayIcon, ChatBubbleLeftRightIcon, PaperAirplaneIcon } from '@heroicons/react/24/outline';

const PDFView = () => {
    const [loading, setLoading] = useState(false);
    const [uploadedPdfUrl, setUploadedPdfUrl] = useState('');
    const [uploadedPdfText, setUploadedPdfText] = useState('');
    const [chatMessages, setChatMessages] = useState<Array<{role: 'user' | 'assistant', content: string, showQuizPrompt?: boolean, quizGenerated?: boolean}>>([]);
    const [chatInput, setChatInput] = useState('');
    const [isChatLoading, setIsChatLoading] = useState(false);
    const [selectedText, setSelectedText] = useState('');
    const [showPopup, setShowPopup] = useState(false);
    const [popupPosition, setPopupPosition] = useState({ x: 0, y: 0 });
    const [showSuccessModal, setShowSuccessModal] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const chatEndRef = useRef<HTMLDivElement>(null);
    const pdfContainerRef = useRef<HTMLDivElement>(null);
    const navigate = useNavigate();
    const location = useLocation();
    const pdfUrl = location.state?.pdfUrl || uploadedPdfUrl || '';
    const pdfText = location.state?.pdfText || uploadedPdfText || '';

    useEffect(() => {
        if (chatEndRef.current) {
            chatEndRef.current.scrollIntoView({ behavior: 'smooth' });
        }
    }, [chatMessages, isChatLoading]);

    useEffect(() => {
        const handleTextSelection = () => {
            const selection = window.getSelection();
            const text = selection?.toString().trim();
            
            if (text && text.length > 0 && pdfContainerRef.current) {
                const range = selection?.getRangeAt(0);
                const rect = range?.getBoundingClientRect();
                
                if (rect) {
                    setSelectedText(text);
                    setPopupPosition({
                        x: rect.left + rect.width / 2,
                        y: rect.top - 10
                    });
                    setShowPopup(true);
                }
            }
        };

        document.addEventListener('mouseup', handleTextSelection);
        return () => {
            document.removeEventListener('mouseup', handleTextSelection);
        };
    }, []);

    const handleAskQuestion = () => {
        if (selectedText) {
            setChatInput(selectedText);
            setShowPopup(false);
            // 포커스를 input으로 이동
            setTimeout(() => {
                const inputElement = document.querySelector('input[type="text"]') as HTMLInputElement;
                inputElement?.focus();
            }, 100);
        }
    };

    const handleClosePopup = () => {
        setShowPopup(false);
        setSelectedText('');
    };

    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        console.log('📁 파일 선택됨:', file);
        
        if (!file) return;
        
        if (file.type !== 'application/pdf') {
            alert('PDF 파일만 업로드 가능합니다.');
            return;
        }

        try {
            setLoading(true);
            console.log('📤 백엔드로 업로드 시작...');
            
            // FormData로 파일 전송
            const formData = new FormData();
            formData.append('file', file);
            formData.append('custom_filename', file.name);
            formData.append('category', '일반');

            const response = await apiClient.post('/upload', formData, {
                headers: {
                    'Content-Type': 'multipart/form-data',
                },
            });

            console.log('✅ 업로드 응답:', response.data);

            // 업로드 성공 후 PDF URL과 텍스트 저장
            if (response.data.pdfUrl) {
                setUploadedPdfUrl(`http://localhost:8000${response.data.pdfUrl}`);
            }
            if (response.data.pdfText) {
                setUploadedPdfText(response.data.pdfText);
            }
            
            setShowSuccessModal(true);
            setTimeout(() => setShowSuccessModal(false), 2000);
        } catch (error) {
            console.error('❌ PDF 업로드 실패:', error);
            alert('PDF 업로드에 실패했습니다.');
        } finally {
            setLoading(false);
        }
    };

    const handleDownload = async () => {
        setLoading(true);
        try {
            // 실제 애플리케이션에서는 이 데이터를 상태 관리 라이브러리(Redux, Zustand) 또는
            // LocalStorage/SessionStorage에서 가져와야 합니다.
            // 여기서는 Placeholder 데이터를 사용합니다.
            const requestData = {
                summary: "이것은 AI가 생성한 문서 요약입니다.",
                keywords: ["AI", "PDF", "React"],
                quiz_results: [
                    { question: "React는 라이브러리인가요?", userAnswer: "네", correctAnswer: "네", isCorrect: true },
                    { question: "TailwindCSS는 유틸리티 기반인가요?", userAnswer: "아니오", correctAnswer: "네", isCorrect: false },
                ],
                wrong_notes: [
                    { id: 1, question: "TailwindCSS는 유틸리티 기반인가요?", user_answer: "아니오", correct_answer: "네", explanation: "TailwindCSS는 유틸리티 우선 프레임워크입니다." }
                ]
            };

            // --- Axios API 호출 (PDF 생성) ---
            const response = await apiClient.post('/pdf', requestData, {
                responseType: 'blob', // 중요: 바이너리 데이터로 응답 받기
            });

            const url = window.URL.createObjectURL(new Blob([response.data]));
            const link = document.createElement('a');
            link.href = url;
            link.setAttribute('download', `LearningFlow_Report_${new Date().toISOString().split('T')[0]}.pdf`);
            document.body.appendChild(link);
            link.click();
            link.parentNode?.removeChild(link);

            // 다운로드 완료 알림
            setTimeout(() => {
                alert('PDF 다운로드가 완료되었습니다!');
            }, 500);

        } catch (error) {
            console.error("PDF 다운로드 실패:", error);
            alert("PDF 생성에 실패했습니다. 잠시 후 다시 시도해주세요.");
        } finally {
            setLoading(false);
        }
    };

    const handleChatSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!chatInput.trim() || isChatLoading) return;

        const userMessage = chatInput.trim();
        setChatInput('');
        setChatMessages(prev => [...prev, { role: 'user', content: userMessage }]);
        setIsChatLoading(true);

        try {
            const response = await apiClient.post('/chat', { 
                question: userMessage,
                pdfText: pdfText
            });
            
            setChatMessages(prev => [...prev, { 
                role: 'assistant', 
                content: response.data.answer,
                showQuizPrompt: true,
                quizGenerated: false
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

    const handleGenerateQuiz = async (messageIndex: number) => {
        const message = chatMessages[messageIndex];
        if (!message || message.role !== 'assistant') return;

        setIsChatLoading(true);

        try {
            const response = await apiClient.post('/chat', {
                question: `다음 내용을 바탕으로 2개의 퀴즈 문제를 만들어주세요. 각 문제는 객관식 4지선다로 만들어주세요:\n\n${message.content}`,
                pdfText: pdfText
            });

            // 퀴즈 생성됨으로 표시
            setChatMessages(prev => prev.map((msg, idx) => 
                idx === messageIndex ? { ...msg, quizGenerated: true } : msg
            ));

            // 퀴즈 답변 추가
            setChatMessages(prev => [...prev, {
                role: 'assistant',
                content: response.data.answer,
                showQuizPrompt: false
            }]);
        } catch (error) {
            console.error('퀴즈 생성 오류:', error);
            setChatMessages(prev => [...prev, {
                role: 'assistant',
                content: '퀴즈 생성 중 오류가 발생했습니다.'
            }]);
        } finally {
            setIsChatLoading(false);
        }
    };

    const handleDeclineQuiz = (messageIndex: number) => {
        setChatMessages(prev => prev.map((msg, idx) => 
            idx === messageIndex ? { ...msg, showQuizPrompt: false } : msg
        ));
    };

    return (
        <>
        <div className="min-h-screen bg-gradient-to-br from-indigo-50 to-blue-50 dark:from-gray-900 dark:to-gray-800 py-12 px-4 sm:px-6 lg:px-8">
            <div className="max-w-6xl mx-auto">
                <button
                    onClick={() => navigate(-1)}
                    className="mb-6 inline-flex items-center text-sm font-medium text-indigo-600 hover:text-indigo-800 dark:text-indigo-400 dark:hover:text-indigo-300 transition-colors"
                >
                    <ArrowLeftIcon className="h-4 w-4 mr-1" />
                    이전으로
                </button>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* PDF 뷰어 영역 */}
                    <div className="lg:col-span-2">
                        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl overflow-hidden">
                            <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center">
                                <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                                    📄 PDF 뷰어
                                </h2>
                                <div className="flex items-center gap-2">
                                    <button
                                        onClick={() => fileInputRef.current?.click()}
                                        className="px-3 py-1.5 bg-indigo-600 text-white text-sm rounded-lg hover:bg-indigo-700 transition-colors flex items-center gap-1"
                                    >
                                        <ArrowUpTrayIcon className="h-4 w-4" />
                                        업로드
                                    </button>
                                    <input
                                        ref={fileInputRef}
                                        type="file"
                                        accept=".pdf"
                                        onChange={handleFileUpload}
                                        className="hidden"
                                    />
                                    <p className="text-sm text-gray-500 dark:text-gray-400">
                                        텍스트를 드래그하여 선택하세요
                                    </p>
                                </div>
                            </div>
                            <div 
                                ref={pdfContainerRef}
                                className="p-6 h-[600px] overflow-y-auto bg-gray-50 dark:bg-gray-900"
                            >
                                {pdfUrl ? (
                                    <iframe 
                                        src={pdfUrl} 
                                        className="w-full h-full rounded border-0"
                                        title="PDF Viewer"
                                    />
                                ) : (
                                    <div className="flex items-center justify-center h-full">
                                        <div className="text-center">
                                            <DocumentTextIcon className="h-16 w-16 mx-auto text-gray-400 mb-4" />
                                            <p className="text-gray-500 dark:text-gray-400">
                                                PDF 파일을 불러오는 중...
                                            </p>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* 설명 패널 */}
                    <div className="lg:col-span-1">
                        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl overflow-hidden sticky top-6 flex flex-col h-[calc(100vh-8rem)]">
                            {/* 헤더 */}
                            <div className="bg-gradient-to-r from-indigo-600 to-purple-600 p-4 flex items-center gap-3">
                                <div className="bg-white/20 p-2 rounded-lg">
                                    <ChatBubbleLeftRightIcon className="h-5 w-5 text-white" />
                                </div>
                                <div>
                                    <h3 className="font-semibold text-white">AI 도우미</h3>
                                    <p className="text-xs text-white/80">궁금한 것을 물어보세요</p>
                                </div>
                            </div>

                            {/* 메시지 영역 */}
                            <div className="flex-1 overflow-y-auto p-4 space-y-4">
                                {chatMessages.length === 0 ? (
                                    <div className="h-full flex items-center justify-center">
                                        <div className="text-center text-gray-500 dark:text-gray-400">
                                            <ChatBubbleLeftRightIcon className="h-16 w-16 mx-auto mb-3 text-gray-300 dark:text-gray-600" />
                                            <p className="text-sm">PDF에 대해 궁금한 점을 물어보세요!</p>
                                            <p className="text-xs mt-2 text-gray-400">
                                                단어, 문장, 개념 등 무엇이든 질문할 수 있습니다
                                            </p>
                                        </div>
                                    </div>
                                ) : (
                                    <>
                                        {chatMessages.map((msg, idx) => (
                                            <div key={idx}>
                                                <div
                                                    className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                                                >
                                                    <div
                                                        className={`max-w-[85%] px-4 py-3 rounded-2xl ${
                                                            msg.role === 'user'
                                                                ? 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white'
                                                                : 'bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-white'
                                                        }`}
                                                    >
                                                        <p className="text-sm whitespace-pre-wrap leading-relaxed">{msg.content}</p>
                                                    </div>
                                                </div>
                                                
                                                {/* 퀴즈 프롬프트 */}
                                                {msg.role === 'assistant' && msg.showQuizPrompt && !msg.quizGenerated && (
                                                    <div className="flex justify-start mt-2 ml-2">
                                                        <div className="bg-indigo-50 dark:bg-indigo-900/30 px-4 py-2 rounded-lg border border-indigo-200 dark:border-indigo-700">
                                                            <p className="text-sm text-gray-700 dark:text-gray-300 mb-2">
                                                                💡 이 내용으로 퀴즈를 풀어볼까요?
                                                            </p>
                                                            <div className="flex gap-2">
                                                                <button
                                                                    onClick={() => handleGenerateQuiz(idx)}
                                                                    className="px-3 py-1 bg-indigo-600 text-white text-xs rounded hover:bg-indigo-700 transition-colors"
                                                                    disabled={isChatLoading}
                                                                >
                                                                    예
                                                                </button>
                                                                <button
                                                                    onClick={() => handleDeclineQuiz(idx)}
                                                                    className="px-3 py-1 bg-gray-300 dark:bg-gray-600 text-gray-700 dark:text-gray-300 text-xs rounded hover:bg-gray-400 dark:hover:bg-gray-500 transition-colors"
                                                                >
                                                                    아니요
                                                                </button>
                                                            </div>
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        ))}
                                        {isChatLoading && (
                                            <div className="flex justify-start">
                                                <div className="bg-gray-100 dark:bg-gray-700 px-4 py-3 rounded-2xl">
                                                    <div className="flex gap-1">
                                                        <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                                                        <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                                                        <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                                                    </div>
                                                </div>
                                            </div>
                                        )}
                                        <div ref={chatEndRef} />
                                    </>
                                )}
                            </div>

                            {/* 입력 영역 */}
                            <form onSubmit={handleChatSubmit} className="p-4 border-t border-gray-200 dark:border-gray-700">
                                <div className="flex gap-2">
                                    <input
                                        type="text"
                                        value={chatInput}
                                        onChange={(e) => setChatInput(e.target.value)}
                                        placeholder="질문을 입력하세요..."
                                        className="flex-1 px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                                        disabled={isChatLoading}
                                    />
                                    <button
                                        type="submit"
                                        disabled={isChatLoading || !chatInput.trim()}
                                        className={`p-3 rounded-xl transition-colors ${
                                            isChatLoading || !chatInput.trim()
                                                ? 'bg-gray-300 dark:bg-gray-600 cursor-not-allowed'
                                                : 'bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700'
                                        }`}
                                    >
                                        <PaperAirplaneIcon className="h-5 w-5 text-white" />
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                </div>
            </div>
        </div>

        {/* 텍스트 선택 팝업 */}
        {showPopup && (
            <>
                <div 
                    className="fixed inset-0 z-40"
                    onClick={handleClosePopup}
                />
                <div 
                    className="fixed z-50 bg-white dark:bg-gray-800 rounded-lg shadow-2xl p-3 border-2 border-indigo-500"
                    style={{
                        left: `${popupPosition.x}px`,
                        top: `${popupPosition.y}px`,
                        transform: 'translate(-50%, -100%)',
                    }}
                >
                    <p className="text-sm text-gray-700 dark:text-gray-300 mb-2">
                        "{selectedText.length > 50 ? selectedText.substring(0, 50) + '...' : selectedText}"
                    </p>
                    <button
                        onClick={handleAskQuestion}
                        className="w-full px-4 py-2 bg-gradient-to-r from-indigo-600 to-purple-600 text-white text-sm rounded-lg hover:from-indigo-700 hover:to-purple-700 transition-colors flex items-center justify-center gap-2"
                    >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        궁금하십니까?
                    </button>
                </div>
            </>
        )}

        {/* 로딩 모달 */}
        {loading && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                <div className="bg-white dark:bg-gray-800 rounded-2xl p-8 shadow-2xl">
                    <div className="flex flex-col items-center">
                        <div className="relative">
                            <div className="w-20 h-20 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin"></div>
                            <div className="absolute inset-0 flex items-center justify-center">
                                <svg className="w-10 h-10 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                                </svg>
                            </div>
                        </div>
                        <h3 className="mt-4 text-lg font-semibold text-gray-900 dark:text-white">
                            PDF 업로드 중...
                        </h3>
                        <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
                            파일을 분석하고 있습니다
                        </p>
                    </div>
                </div>
            </div>
        )}

        {/* 성공 모달 */}
        {showSuccessModal && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                <div className="bg-white dark:bg-gray-800 rounded-2xl p-8 shadow-2xl transform animate-bounce">
                    <div className="flex flex-col items-center">
                        <div className="w-20 h-20 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center">
                            <svg className="w-12 h-12 text-green-600 dark:text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                            </svg>
                        </div>
                        <h3 className="mt-4 text-xl font-bold text-gray-900 dark:text-white">
                            업로드 완료!
                        </h3>
                        <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
                            이제 챗봇에게 질문할 수 있습니다
                        </p>
                    </div>
                </div>
            </div>
        )}
        </>
    );
};

export default PDFView;
