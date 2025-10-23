import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Login from './components/Login';
import Layout from './components/Layout';
import DashboardPage from './components/DashboardPage';
import UserManagement from './components/UserManagement';
import UserStatus from './components/UserStatus';
import SalesManagement from './components/SalesManagement';
import RevenueStatus from './components/RevenueStatus';
import QuotePage from './components/QuotePage';
import ExpenseStatus from './components/ExpenseStatus';
import ExpenseList from './components/ExpenseList';
import { NotificationProvider } from './context/NotificationContext';

import './App.css';

function App() {
  // 독립적인 인증 상태 관리
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [userInfo, setUserInfo] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  // 로컬 스토리지에서 인증 상태 확인 (독립적인 세션 관리)
  useEffect(() => {
    const checkAuthStatus = () => {
      try {
        const authData = localStorage.getItem('marketing_auth');
        if (authData) {
          const { user, sessionToken } = JSON.parse(authData);
          if (user && sessionToken) {
            setIsAuthenticated(true);
            setUserInfo(user);
            if (process.env.NODE_ENV === 'development') {
              console.log('✅ Marketing 독립 세션 확인:', user);
            }
          }
        }
      } catch (error) {
        console.error('❌ 인증 상태 확인 오류:', error);
      }
      setIsLoading(false);
    };

    checkAuthStatus();
  }, []);

  // 컴포넌트 로딩 완료 이벤트 (메뉴 안정화를 위해)
  useEffect(() => {
    if (isAuthenticated) {
      // 모든 컴포넌트가 이미 정적으로 import되어 있으므로 즉시 이벤트 발생
      console.log('✅ 모든 컴포넌트 로딩 완료');
      
      // 컴포넌트 로딩 완료 후 강제 리렌더링 트리거
      setTimeout(() => {
        window.dispatchEvent(new Event('componentsLoaded'));
      }, 100);
    }
  }, [isAuthenticated]);

  // 로그인 처리 (독립적인 세션 관리)
  const handleLogin = (userData, sessionToken) => {
    setIsAuthenticated(true);
    setUserInfo(userData);
    localStorage.setItem('marketing_auth', JSON.stringify({ user: userData, sessionToken }));
    if (process.env.NODE_ENV === 'development') {
      console.log('✅ Marketing 독립 로그인 성공:', userData);
    }
  };

  // 로그아웃 처리
  const handleLogout = () => {
    if (process.env.NODE_ENV === 'development') {
      console.log('🚪 Marketing 로그아웃');
    }
    setIsAuthenticated(false);
    setUserInfo(null);
    localStorage.removeItem('marketing_auth');
  };

  // 로딩 중일 때 표시
  if (isLoading) {
    return (
      <div style={{ 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center', 
        height: '100vh',
        fontSize: '18px',
        color: '#666'
      }}>
        🔍 로그인 상태 확인 중...
      </div>
    );
  }

  // 인증되지 않은 경우 로그인 페이지 표시
  if (!isAuthenticated) {
    return (
      <NotificationProvider>
        <Router>
          <div className="App">
            <Routes>
              <Route path="/login" element={<Login onLogin={handleLogin} />} />
              <Route path="*" element={<Navigate to="/login" replace />} />
            </Routes>
          </div>
        </Router>
      </NotificationProvider>
    );
  }

  return (
    <NotificationProvider>
      <Router>
        <div className="App">
          <Routes>
          <Route 
            path="/login" 
            element={<Login onLogin={handleLogin} />} 
          />
          <Route 
            path="/dashboard" 
            element={
              <Layout userInfo={userInfo} onLogout={handleLogout}>
                <DashboardPage />
              </Layout>
            } 
          />
                                {/* 사용자 관리 라우트들 */}
                      <Route
                        path="/user"
                        element={
                          <Layout userInfo={userInfo} onLogout={handleLogout}>
                            <UserManagement />
                          </Layout>
                        }
                      />
                      <Route
                        path="/user/all"
                        element={
                          <Layout userInfo={userInfo} onLogout={handleLogout}>
                            <UserManagement />
                          </Layout>
                        }
                      />
                      <Route
                        path="/user/status"
                        element={
                          <Layout userInfo={userInfo} onLogout={handleLogout}>
                            <UserStatus />
                          </Layout>
                        }
                      />
                      
                      {/* 매출 관리 라우트들 */}
                      <Route
                        path="/sales"
                        element={
                          <Layout userInfo={userInfo} onLogout={handleLogout}>
                            <SalesManagement />
                          </Layout>
                        }
                      />
                      <Route
                        path="/sales/list"
                        element={
                          <Layout userInfo={userInfo} onLogout={handleLogout}>
                            <SalesManagement />
                          </Layout>
                        }
                      />
                      <Route
                        path="/sales/status"
                        element={
                          <Layout userInfo={userInfo} onLogout={handleLogout}>
                            <RevenueStatus />
                          </Layout>
                        }
                      />
                      <Route
                        path="/sales/quote"
                        element={
                          <Layout userInfo={userInfo} onLogout={handleLogout}>
                            <QuotePage />
                          </Layout>
                        }
                      />
                      
                      {/* 지출 관리 라우트들 */}
                      <Route
                        path="/expense"
                        element={
                          <Layout userInfo={userInfo} onLogout={handleLogout}>
                            <ExpenseStatus />
                          </Layout>
                        }
                      />
                      <Route
                        path="/expense/status"
                        element={
                          <Layout userInfo={userInfo} onLogout={handleLogout}>
                            <ExpenseStatus />
                          </Layout>
                        }
                      />
                      <Route
                        path="/expense/list"
                        element={
                          <Layout userInfo={userInfo} onLogout={handleLogout}>
                            <ExpenseList />
                          </Layout>
                        }
                      />

          <Route 
            path="/" 
            element={<Navigate to="/login" replace />} 
          />
          </Routes>
        </div>
      </Router>
    </NotificationProvider>
  );
}

export default App;

