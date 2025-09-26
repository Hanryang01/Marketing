import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMessage } from '../hooks/useMessage';
import MessageModal from './MessageModal';
import './Login.css';

const Login = ({ onLogin }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const navigate = useNavigate();
  const { showMessageModal, messageData, showMessage, handleMessageConfirm, handleMessageCancel } = useMessage();

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // 개발 버전과 배포 버전 구분
    const isDevelopment = process.env.NODE_ENV === 'development';
    
    if (isDevelopment) {
      // 개발 버전: 빈 값이어도 로그인 허용
      const userEmail = email.trim() || 'admin@example.com';
      const userName = email.trim() || 'admin';
      
      onLogin({ 
        id: 1, 
        username: userName, 
        email: userEmail,
        role: 'admin' 
      }, `admin-session-${Date.now()}`);
      
      navigate('/dashboard');
    } else {
      // 배포 버전: 하드코딩된 ID/PW 확인
      if (email.trim() === 'technonia' && password === 'nonia8123') {
        onLogin({ 
          id: 1, 
          username: 'technonia', 
          email: 'technonia@admin.com',
          role: 'admin' 
        }, `admin-session-${Date.now()}`);
        
        navigate('/dashboard');
      } else {
        showMessage('error', '로그인 오류', '잘못된 ID 또는 비밀번호입니다.', {
          showCancel: false,
          confirmText: '확인'
        });
      }
    }
  };

  const togglePasswordVisibility = () => {
    setShowPassword(!showPassword);
  };

  return (
    <div className="login-container">
      <div className="login-left">
        <div className="logo-container">
          {/* SIHM 로고 이미지 */}
          <div className="logo-image">
            <img 
              src="/sihm-logo.png" 
              alt="SIHM Logo" 
              width="200" 
              height="200"
            />
          </div>
        </div>
      </div>
      
      <div className="login-divider"></div>
      
             <div className="login-right">
         <div className="login-form">
           <div className="form-header">
             <h1>SIHM 관리자</h1>
           </div>
           <div className="form-group">
             <label htmlFor="email">사용자 ID</label>
             <input
               type="email"
               id="email"
               value={email}
               onChange={(e) => setEmail(e.target.value)}
               placeholder="사용자 ID"
               className="form-input"
             />
          </div>
          
          <div className="form-group">
            <label htmlFor="password">비밀번호</label>
            <div className="password-input-container">
              <input
                type={showPassword ? "text" : "password"}
                id="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="비밀번호"
                className="form-input"
              />
              <button
                type="button"
                className="password-toggle"
                onClick={togglePasswordVisibility}
              >
                {showPassword ? "👁️" : "👁️‍🗨️"}
              </button>
            </div>
          </div>
          
          
          <button 
            type="submit" 
            className="login-button"
            onClick={handleSubmit}
          >
            로그인
          </button>
        </div>
      </div>
      
      {/* 에러 메시지 모달 */}
      <MessageModal
        isOpen={showMessageModal}
        messageData={messageData}
        onConfirm={handleMessageConfirm}
        onCancel={handleMessageCancel}
      />
    </div>
  );
};

export default Login;

