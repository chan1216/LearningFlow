import { Link } from "react-router-dom";

const NotFound = () => {
  return (
    <div className="text-center">
      <div className="glass-card p-10 max-w-md mx-auto">
        <h1 className="text-6xl font-bold text-red-400">404</h1>
        <h2 className="text-2xl font-bold mt-4 mb-2">Page Not Found</h2>
        <p className="text-white/70 mb-6">요청하신 페이지를 찾을 수 없습니다.</p>
        <Link to="/" className="glass-btn font-bold py-2 px-4">
          홈으로 돌아가기
        </Link>
      </div>
    </div>
  );
};

export default NotFound;
