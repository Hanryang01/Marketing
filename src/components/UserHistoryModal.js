import React, { useState, useEffect } from 'react';
import { apiCall, API_ENDPOINTS } from '../config/api';
import './UserHistoryModal.css';

const UserHistoryModal = ({ user, onClose }) => {
  const [historyData, setHistoryData] = useState(null);
  const [loading, setLoading] = useState(false);

  // 상세 이력 조회
  const fetchDetailedHistory = async () => {
    setLoading(true);
    try {
      const response = await apiCall(`${API_ENDPOINTS.HISTORY_USER_DETAIL}?company=${user.companyName}`);
      const data = await response.json();
      if (data.success) {
        setHistoryData(data.data);
      } else {
        console.error('이력 조회 실패:', data.error);
      }
    } catch (error) {
      console.error('상세 이력 조회 실패:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user && user.companyName) {
      fetchDetailedHistory();
    }
  }, [user]);

  // 상태별 색상 반환
  const getStatusColor = (status) => {
    switch (status) {
      case '승인 완료': return '#28a745';
      case '탈퇴': return '#6c757d';
      case '승인 예정': return '#ffc107';
      default: return '#007bff';
    }
  };

  // 상태별 아이콘 반환
  const getStatusIcon = (status) => {
    switch (status) {
      case '승인 완료': return '✅';
      case '탈퇴': return '⚫';
      case '승인 예정': return '⏳';
      default: return '🔵';
    }
  };

  return (
    <div className="modal-overlay">
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3>📋 {user.companyName} 승인 상태 이력</h3>
          <button className="close-button" onClick={onClose}>×</button>
        </div>

        <div className="modal-body">
          {/* 사용자 기본 정보 */}
          <div className="user-info-section">
            <h4>👤 사용자 정보</h4>
            <div className="user-info-grid">
              <div className="info-item">
                <span className="info-label">회사명:</span>
                <span className="info-value">{user.companyName}</span>
              </div>
              <div className="info-item">
                <span className="info-label">사용자ID:</span>
                <span className="info-value">{user.userId}</span>
              </div>
              <div className="info-item">
                <span className="info-label">이메일:</span>
                <span className="info-value">{user.email}</span>
              </div>
              <div className="info-item">
                <span className="info-label">업체 형태:</span>
                <span className="info-value">{user.companyType}</span>
              </div>
              <div className="info-item">
                <span className="info-label">현재 상태:</span>
                <span className="info-value">
                  <span 
                    className="status-badge"
                    style={{ backgroundColor: getStatusColor(user.approvalStatus) }}
                  >
                    {getStatusIcon(user.approvalStatus)} {user.approvalStatus}
                  </span>
                </span>
              </div>
            </div>
          </div>

          {loading ? (
            <div className="loading">로딩 중...</div>
          ) : historyData ? (
            <>
              {/* 통계 섹션 */}
              <div className="stats-section">
                <h4>📊 활성화 통계</h4>
                <div className="stats-grid">
                  <div className="stat-item">
                    <span className="stat-label">총 승인 횟수:</span>
                    <span className="stat-value">{historyData.stats.total_approvals}회</span>
                  </div>
                  <div className="stat-item">
                    <span className="stat-label">총 활성화 일수:</span>
                    <span className="stat-value">{historyData.stats.total_active_days}일</span>
                  </div>
                  <div className="stat-item">
                    <span className="stat-label">첫 승인일:</span>
                    <span className="stat-value">{historyData.stats.first_activation || '-'}</span>
                  </div>
                  <div className="stat-item">
                    <span className="stat-label">마지막 승인일:</span>
                    <span className="stat-value">{historyData.stats.last_activation || '-'}</span>
                  </div>
                </div>
              </div>

              {/* 이력 섹션 */}
              <div className="history-section">
                <h4>📋 승인 완료 이력</h4>
                <div className="history-table-container">
                  <table className="history-table">
                    <thead>
                      <tr>
                        <th>상태</th>
                        <th>시작일</th>
                        <th>종료일</th>
                        <th>업체 형태</th>
                        <th>요금제</th>
                        <th>활성화 기간</th>
                        <th>수정</th>
                      </tr>
                    </thead>
                    <tbody>
                      {historyData.history
                        .filter(item => {
                          // 승인 완료 이력만 표시 (종료일 < 오늘, 승인 이력 탭과 동일)
                          if (item.approval_status !== '승인 완료' || !item.end_date) return false;
                          
                          // 문자열 비교 사용 (YYYY-MM-DD 형식)
                          const today = new Date();
                          const todayString = today.toISOString().split('T')[0];
                          const endDateString = item.end_date.toString().split('T')[0];
                          
                          return endDateString < todayString;
                        })
                        .map((item, index) => (
                        <tr key={index}>
                          <td>
                            <span 
                              className="status-badge"
                              style={{ backgroundColor: getStatusColor(item.approval_status) }}
                            >
                              {getStatusIcon(item.approval_status)} {item.approval_status}
                            </span>
                          </td>
                          <td>{item.start_date || '-'}</td>
                          <td>{item.end_date || '-'}</td>
                          <td>{item.company_type || '-'}</td>
                          <td>{item.pricing_plan || '-'}</td>
                          <td>
                            {item.active_days > 0 ? (
                              <span className="active-days">
                                {item.active_days}일
                              </span>
                            ) : '-'}
                          </td>
                          <td>
                            <button 
                              className="edit-button"
                              onClick={() => {
                                // 수정 기능 구현
                                                              }}
                              title="이력 수정"
                            >
                              수정
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          ) : (
            <div className="no-data">데이터를 불러올 수 없습니다.</div>
          )}
        </div>

        <div className="modal-footer">
          <button onClick={onClose}>닫기</button>
          <button onClick={() => window.print()}>인쇄</button>
          <button onClick={() => {
            // 내보내기 기능 구현
                      }}>내보내기</button>
        </div>
      </div>
    </div>
  );
};

export default UserHistoryModal;

