import React, { useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import './Layout.css';
import NotificationIcon from './NotificationIcon';
import NotificationModal from './NotificationModal';

const Layout = ({ children, userInfo, onLogout }) => {
  const location = useLocation();
  const navigate = useNavigate();
  // 컴포넌트 로딩 완료 이벤트 리스너
  useEffect(() => {
    const handleComponentsLoaded = () => {
      console.log('🔄 컴포넌트 로딩 완료 - 메뉴 강제 리렌더링');
    };

    window.addEventListener('componentsLoaded', handleComponentsLoaded);
    
    return () => {
      window.removeEventListener('componentsLoaded', handleComponentsLoaded);
    };
  }, []);

  // 독립적인 Marketing 로그아웃 처리
  const handleLogout = () => {
    if (onLogout) {
      onLogout();
    }
    // 로그아웃 후 로그인 페이지로 리다이렉트
    navigate('/login');
  };

  const menuItems = [
    { id: 'dashboard', label: '대시보드', path: '/dashboard', icon: '📊' },
    { 
      id: 'user', 
      label: '사용자 관리', 
      path: '/user', 
      icon: '👥',
      subItems: [
        { id: 'user-status', label: '사용자 현황', path: '/user/status', icon: '📊' },
        { id: 'user-list', label: '사용자 리스트', path: '/user/all', icon: '👥' }
      ]
    },
    { 
      id: 'sales', 
      label: '매출', 
      path: '/sales', 
      icon: '💰',
      subItems: [
        { id: 'revenue-status', label: '매출 현황', path: '/sales/status', icon: '💰' },
        { id: 'revenue-list', label: '매출 리스트', path: '/sales/list', icon: '📋' },
        { id: 'quote', label: '견적서', path: '/sales/quote', icon: '📄' }
      ]
    }
  ];

  return (
    <div className="layout">
      {/* 왼쪽 사이드바 */}
      <div className="sidebar">
        <div className="sidebar-header">
          <img src="/sihm-logo.png" alt="SIHM Logo" className="sidebar-logo" />
        </div>
        <nav className="sidebar-nav">
          {menuItems.map((item) => (
            <div key={item.id} className="menu-section">
              <div className="menu-title">
                <span>{item.label}</span>
                {item.subItems && <span className="menu-arrow">▼</span>}
              </div>
              <ul className="menu-items">
                {item.subItems ? (
                  // 서브메뉴가 있는 경우
                  item.subItems.map((subItem) => (
                    <li key={subItem.id}>
                      <Link
                        to={subItem.path}
                        className={`menu-item ${location.pathname === subItem.path ? 'active' : ''}`}
                        onClick={() => {}}
                      >
                        <span className="menu-icon">{subItem.icon}</span>
                        {subItem.label}
                      </Link>
                    </li>
                  ))
                ) : (
                  // 서브메뉴가 없는 경우 (대시보드)
                  <li>
                    <Link
                      to={item.path}
                      className={`menu-item ${location.pathname === item.path ? 'active' : ''}`}
                      onClick={() => {}}
                    >
                      <span className="menu-icon">{item.icon}</span>
                      {item.label}
                    </Link>
                  </li>
                )}
              </ul>
            </div>
          ))}
        </nav>
        
        {/* 사이드바 하단 - 로그아웃 */}
        <div className="sidebar-footer">
          <button className="sidebar-logout-button" onClick={handleLogout}>
            🚪 로그아웃
          </button>
        </div>
      </div>

      {/* 메인 콘텐츠 영역 */}
      <div className="main-content">
        {/* 상위 메뉴 */}
        <header className="top-header">
          <div className="header-content">
            <h1 className="page-title">
              {(() => {
                const currentPath = location.pathname;
                
                // 사용자 관리 하위 페이지들
                if (currentPath.startsWith('/user/')) {
                  return '사용자 관리';
                }
                
                // 매출 관리 하위 페이지들
                if (currentPath.startsWith('/sales/')) {
                  if (currentPath === '/sales/quote') {
                    return '견적서';
                  }
                  return '매출 관리';
                }
                
                                 // 대시보드
                 if (currentPath === '/dashboard') {
                   return '대시보드';
                 }
                
                // 기본값
                return '관리자 시스템';
              })()}
            </h1>
            
            <div className="header-right">
              {/* 알림 아이콘만 표시 */}
              <NotificationIcon />
            </div>
          </div>
        </header>

        {/* 페이지 콘텐츠 */}
        <main className="page-content">
          {children}
        </main>
      </div>
      
      {/* 알림 모달 */}
      <NotificationModal />
    </div>
  );
};

export default Layout;
