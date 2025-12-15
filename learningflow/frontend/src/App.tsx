import { Route, Routes } from 'react-router-dom';
import Layout from './components/Layout';
import Home from './pages/Home';
import Summary from './pages/Summary';
import QuizSelect from './pages/QuizSelect';
import Quiz from './pages/Quiz';
import WrongNote from './pages/WrongNote';
import PDFView from './pages/PDFView';
import NotFound from './pages/NotFound';
import Feedback from './pages/Feedback';
import Login from './pages/Login';
import Signup from './pages/Signup';
import MyPage from './pages/MyPage';

function App() {
  return (
    <Layout>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/login" element={<Login />} />
        <Route path="/signup" element={<Signup />} />
        <Route path="/mypage" element={<MyPage />} />
        <Route path="/summary" element={<Summary />} />
        <Route path="/quiz-select" element={<QuizSelect />} />
        <Route path="/quiz" element={<Quiz />} />
        <Route path="/feedback" element={<Feedback />} />
        <Route path="/wrong-note" element={<WrongNote />} />
        <Route path="/pdf" element={<PDFView />} />
        <Route path="*" element={<NotFound />} />
      </Routes>
    </Layout>
  );
}

export default App;
