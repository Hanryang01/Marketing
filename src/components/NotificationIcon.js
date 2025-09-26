import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useNotification } from '../context/NotificationContext';
import './NotificationIcon.css';

const NotificationIcon = () => {
  const { unreadCount, openModal } = useNotification();
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [dropdownPosition, setDropdownPosition] = useState({ top: 0, right: 0 });
  const dropdownRef = useRef(null);
  const buttonRef = useRef(null);

  // 관련 사이트 목록
  const relatedSites = [
    { name: '기업은행', url: 'https://www.ibk.co.kr/' },
    { name: '홈택스', url: 'https://hometax.go.kr/' },
    { name: 'SIHM', url: 'https://work.sihm.co.kr' },
    { name: '토스 Admin', url: 'https://app.tosspayments.com' }
  ];

  // 드롭다운 위치 계산
  const calculateDropdownPosition = () => {
    if (buttonRef.current) {
      const buttonRect = buttonRef.current.getBoundingClientRect();
      
      setDropdownPosition({
        top: buttonRect.bottom + 4,
        right: window.innerWidth - buttonRect.right
      });
    }
  };

  // 드롭다운 열기/닫기
  const toggleDropdown = () => {
    if (!isDropdownOpen) {
      calculateDropdownPosition();
    }
    setIsDropdownOpen(!isDropdownOpen);
  };

  // 드롭다운 외부 클릭 시 닫기
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsDropdownOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // 스크롤이나 리사이즈 시 위치 재계산
  useEffect(() => {
    if (isDropdownOpen) {
      const handleScrollOrResize = () => {
        calculateDropdownPosition();
      };

      window.addEventListener('scroll', handleScrollOrResize);
      window.addEventListener('resize', handleScrollOrResize);
      
      return () => {
        window.removeEventListener('scroll', handleScrollOrResize);
        window.removeEventListener('resize', handleScrollOrResize);
      };
    }
  }, [isDropdownOpen]);

  // 사이트 열기
  const handleSiteOpen = (url) => {
    // console.log('사이트 클릭됨:', url); // 디버깅용 - 제거됨
    window.open(url, '_blank', 'noopener,noreferrer');
    setIsDropdownOpen(false);
  };

  return (
    <div className="notification-icon-container">
      <button 
        className="notification-icon" 
        onClick={openModal}
        aria-label={`알림 ${unreadCount > 0 ? `${unreadCount}개` : ''}`}
      >
        <svg 
          width="24" 
          height="24" 
          viewBox="0 0 24 24" 
          fill="none" 
          xmlns="http://www.w3.org/2000/svg"
        >
          <path 
            d="M12 22C13.1 22 14 21.1 14 20H10C10 21.1 10.9 22 12 22ZM18 16V11C18 7.93 16.36 5.36 13.5 4.68V4C13.5 3.17 12.83 2.5 12 2.5S10.5 3.17 10.5 4V4.68C7.63 5.36 6 7.92 6 11V16L4 18V19H20V18L18 16Z" 
            fill="currentColor"
          />
        </svg>
        {unreadCount > 0 && (
          <span className="notification-badge">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {/* 관련 사이트 드롭다운 */}
      <div className="related-sites-container" ref={dropdownRef}>
        <button 
          ref={buttonRef}
          className="related-sites-button"
          onClick={toggleDropdown}
          aria-label="관련 사이트"
        >
          <span className="related-sites-text">관련 사이트</span>
          <svg 
            width="16" 
            height="16" 
            viewBox="0 0 24 24" 
            fill="none" 
            xmlns="http://www.w3.org/2000/svg"
            className={`dropdown-arrow ${isDropdownOpen ? 'open' : ''}`}
          >
            <path 
              d="M6 9L12 15L18 9" 
              stroke="currentColor" 
              strokeWidth="2" 
              strokeLinecap="round" 
              strokeLinejoin="round"
            />
          </svg>
        </button>

        {isDropdownOpen && createPortal(
          <div 
            className="related-sites-dropdown"
            style={{
              top: `${dropdownPosition.top}px`,
              right: `${dropdownPosition.right}px`
            }}
            onClick={(e) => e.stopPropagation()}
            onMouseDown={(e) => e.stopPropagation()}
          >
            <div className="dropdown-header">
              관련 사이트
            </div>
            {relatedSites.map((site, index) => (
              <button
                key={index}
                className="dropdown-item"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  // console.log('버튼 클릭됨:', site.name); // 디버깅용 - 제거됨
                  handleSiteOpen(site.url);
                }}
                onMouseDown={(e) => {
                  e.preventDefault();
                }}
              >
                <span className="site-name">{site.name}</span>
                <svg 
                  width="16" 
                  height="16" 
                  viewBox="0 0 24 24" 
                  fill="none" 
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path 
                    d="M18 13V19C18 20.1 17.1 21 16 21H5C3.9 21 3 20.1 3 19V8C3 6.9 3.9 6 5 6H11" 
                    stroke="currentColor" 
                    strokeWidth="2" 
                    strokeLinecap="round" 
                    strokeLinejoin="round"
                  />
                  <path 
                    d="M15 3H21V9" 
                    stroke="currentColor" 
                    strokeWidth="2" 
                    strokeLinecap="round" 
                    strokeLinejoin="round"
                  />
                  <path 
                    d="M10 14L21 3" 
                    stroke="currentColor" 
                    strokeWidth="2" 
                    strokeLinecap="round" 
                    strokeLinejoin="round"
                  />
                </svg>
              </button>
            ))}
          </div>,
          document.body
        )}
      </div>
    </div>
  );
};

export default NotificationIcon;
