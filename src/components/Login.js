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

    try {
      const API_BASE_URL = (process.env.REACT_APP_API_BASE_URL || 'http://localhost:3007').trim();
      const response = await fetch(`${API_BASE_URL}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim(), password })
      });

      const data = await response.json();

      if (data.success && data.sessionToken) {
        onLogin(data.user, data.sessionToken);
        navigate('/dashboard');
      } else {
        showMessage('error', '로그인 오류', data.error || '잘못된 ID 또는 비밀번호입니다.', {
          showCancel: false,
          confirmText: '확인'
        });
      }
    } catch (err) {
      console.error('로그인 오류:', err);
      showMessage('error', '로그인 오류', '서버 연결에 실패했습니다. 잠시 후 다시 시도해 주세요.', {
        showCancel: false,
        confirmText: '확인'
      });
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
              placeholder=""
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
                placeholder=""
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

