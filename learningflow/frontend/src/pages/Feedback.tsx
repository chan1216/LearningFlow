import { useLocation, useNavigate } from 'react-router-dom';

const Feedback = () => {
    const location = useLocation();
    const navigate = useNavigate();
    const { quizResults, finalFeedback } = location.state || { quizResults: [], finalFeedback: '' };

    const correctCount = quizResults.filter((r: any) => r.isCorrect).length;
    const totalCount = quizResults.length;

    return (
        <div className="glass-card p-8 max-w-3xl mx-auto">
            <h2 className="text-3xl font-bold mb-4 text-center">퀴즈 결과</h2>
            <p className="text-center text-xl mb-6">총 {totalCount}문제 중 <span className="text-green-400 font-bold">{correctCount}개</span> 맞추셨습니다!</p>

            <div className="space-y-4 mb-8">
                {quizResults.map((res: any, index: number) => (
                    <div key={index} className={`p-4 rounded-lg ${res.isCorrect ? 'bg-green-500/20' : 'bg-red-500/20'}`}>
                        <p className="font-semibold">Q. {res.question}</p>
                        <p className={`text-sm ${res.isCorrect ? 'text-green-300' : 'text-red-300'}`}>- 제출 답안: {res.userAnswer}</p>
                        <p className="text-sm text-yellow-300">- 정답: {res.answer || res.correctAnswer}</p>
                    </div>
                ))}
            </div>

            <div className="text-center space-x-4">
                <button onClick={() => navigate('/wrong-note')} className="glass-btn font-bold py-3 px-6">
                    오답노트 보기
                </button>
                <button onClick={() => navigate('/')} className="glass-btn font-bold py-3 px-6 bg-blue-500/50">
                    홈으로
                </button>
            </div>
        </div>
    );
};

export default Feedback;
