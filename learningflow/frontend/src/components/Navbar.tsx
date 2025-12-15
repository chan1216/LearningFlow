import { NavLink, useNavigate } from "react-router-dom";
import { useState, useEffect } from "react";

const Navbar = () => {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [userName, setUserName] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    // 로그인 상태 확인
    const token = localStorage.getItem('access_token');
    const user = localStorage.getItem('user');
    
    if (token && user) {
      setIsLoggedIn(true);
      const userData = JSON.parse(user);
      setUserName(userData.name);
    }
  }, []);

  const handleLogout = () => {
    localStorage.removeItem('access_token');
    localStorage.removeItem('user');
    setIsLoggedIn(false);
    setUserName('');
    navigate('/');
  };

  const navLinkClass = ({ isActive }: { isActive: boolean }) =>
    `px-3 py-2 rounded-md text-sm font-medium ${isActive ? 'bg-white/20 text-white' : 'text-gray-300 hover:bg-white/10 hover:text-white'}`;

  return (
    <nav className="bg-black/20 backdrop-blur-sm sticky top-0 z-50">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          <div className="flex-shrink-0 text-white font-bold text-xl">
            <NavLink to="/">🚀 LearningFlow</NavLink>
          </div>
          <div className="hidden md:flex items-center space-x-4">
            <div className="flex items-baseline space-x-4">
              <NavLink to="/" className={navLinkClass}>Home</NavLink>
              <NavLink to="/summary" className={navLinkClass}>Summary</NavLink>
              <NavLink to="/quiz" className={navLinkClass}>Quiz</NavLink>
              <NavLink to="/wrong-note" className={navLinkClass}>Wrong Note</NavLink>
              <NavLink to="/pdf" className={navLinkClass}>PDF</NavLink>
            </div>
            <div className="flex items-center space-x-3 ml-6 pl-6 border-l border-white/20">
              {isLoggedIn ? (
                <>
                  <span className="text-white text-sm font-medium">
                    {userName}님
                  </span>
                  <NavLink 
                    to="/mypage" 
                    className="px-4 py-2 text-sm font-medium text-white hover:text-gray-200 transition-colors"
                  >
                    마이페이지
                  </NavLink>
                  <button 
                    onClick={handleLogout}
                    className="px-4 py-2 text-sm font-medium bg-gradient-to-r from-gray-600 to-gray-700 text-white rounded-lg hover:from-gray-700 hover:to-gray-800 transition-all shadow-lg"
                  >
                    로그아웃
                  </button>
                </>
              ) : (
                <>
                  <NavLink 
                    to="/login" 
                    className="px-4 py-2 text-sm font-medium text-white hover:text-gray-200 transition-colors"
                  >
                    로그인
                  </NavLink>
                  <NavLink 
                    to="/signup" 
                    className="px-4 py-2 text-sm font-medium bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-lg hover:from-indigo-700 hover:to-purple-700 transition-all shadow-lg"
                  >
                    회원가입
                  </NavLink>
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
