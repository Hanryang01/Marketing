import React from 'react';

const ApprovalModeView = ({ 
  editedUser, 
  user, 
  handleInputChange, 
  handleDateInputChange,
  handleOpenCalendar,
  formatDate,
  userHistory,
  handleDeleteHistory,
  showMessage
}) => {
  return (
    <>
      <div className="form-row">
        <div className="form-group">
          <label>사용자 ID</label>
          <input
            type="text"
            value={editedUser?.userId || ''}
            readOnly
            className="readonly-input"
          />
        </div>
        <div className="form-group">
          <label>회사명</label>
          <input
            type="text"
            value={editedUser?.companyName !== undefined ? editedUser.companyName : (user.companyName || '')}
            onChange={(e) => handleInputChange('companyName', e.target.value)}
          />
        </div>
      </div>

      <div className="form-row">
        <div className="form-group">
          <label>업체 형태</label>
          <select
            value={editedUser?.companyType || '무료 사용자'} 
            onChange={(e) => handleInputChange('companyType', e.target.value)}
          >
            <option value="무료 사용자">무료 사용자</option>
            <option value="컨설팅 업체">컨설팅 업체</option>
            <option value="일반 업체">일반 업체</option>
            <option value="탈퇴 사용자">탈퇴 사용자</option>
            <option value="기타">기타</option>
          </select>
        </div>
        <div className="form-group">
          <label>요금제</label>
          <select
            value={editedUser?.pricingPlan || '무료'} 
            onChange={(e) => handleInputChange('pricingPlan', e.target.value)}
            disabled={editedUser?.companyType === '무료 사용자' || editedUser?.companyType === '탈퇴 사용자'}
            style={(editedUser?.companyType === '무료 사용자' || editedUser?.companyType === '탈퇴 사용자') ? { backgroundColor: '#f5f5f5', color: '#666', cursor: 'not-allowed' } : {}}
          >
            <option value="무료">무료</option>
            <option value="스탠다드">스탠다드</option>
            <option value="프리미엄">프리미엄</option>
          </select>
        </div>
      </div>
      
      <div className="form-row">
        <div className="form-group">
          <label>시작일</label>
          <div className="date-input-container">
            <input
              type="text"
              value={editedUser?.startDate || ''}
              onChange={(e) => {
                handleDateInputChange('startDate', e.target.value);
              }}
              onFocus={(e) => {
                // startDate 포커스
              }}
              placeholder="YYYY-MM-DD"
              maxLength="10"
              disabled={editedUser?.companyType === '무료 사용자'}
              style={{ 
                backgroundColor: 'white', 
                border: '1px solid #ccc'
              }}
            />
            <div 
              className="calendar-icon" 
              onClick={(e) => {
                const currentCompanyType = editedUser?.companyType || user?.companyType;
                if (currentCompanyType === '무료 사용자') {
                  return; // 무료 사용자일 때는 달력 클릭 무시
                }
                const inputElement = e.target.previousElementSibling;
                const currentStartDate = editedUser?.startDate || user?.startDate;
                handleOpenCalendar('start', inputElement, currentStartDate);
              }}
              style={(() => {
                const currentCompanyType = editedUser?.companyType || user?.companyType;
                const isDisabled = currentCompanyType === '무료 사용자';
                return isDisabled ? { opacity: 0.3, cursor: 'not-allowed' } : {};
              })()}
            >
              📅
            </div>
          </div>
        </div>
        <div className="form-group">
          <label>종료일</label>
          <div className="date-input-container">
            <input
              type="text"
              value={editedUser?.endDate || ''}
              onChange={(e) => {
                handleDateInputChange('endDate', e.target.value);
              }}
              onFocus={(e) => {
                // endDate 포커스
              }}
              placeholder="YYYY-MM-DD"
              maxLength="10"
              disabled={editedUser?.companyType === '무료 사용자'}
              style={{ 
                backgroundColor: 'white', 
                border: '1px solid #ccc'
              }}
            />
            <div 
              className="calendar-icon" 
              onClick={(e) => {
                const currentCompanyType = editedUser?.companyType || user?.companyType;
                if (currentCompanyType === '무료 사용자') {
                  return; // 무료 사용자일 때는 달력 클릭 무시
                }
                const inputElement = e.target.previousElementSibling;
                const currentEndDate = editedUser?.endDate || user?.endDate;
                handleOpenCalendar('end', inputElement, currentEndDate);
              }}
              style={(() => {
                const currentCompanyType = editedUser?.companyType || user?.companyType;
                const isDisabled = currentCompanyType === '무료 사용자';
                return isDisabled ? { opacity: 0.3, cursor: 'not-allowed' } : {};
              })()}
            >
              📅
            </div>
          </div>
        </div>
      </div>
      
      <div className="form-row">
        <div className="form-group">
          <label>승인 상태</label>
          <select
            value={editedUser?.approvalStatus || ''}
            onChange={(e) => handleInputChange('approvalStatus', e.target.value)}
            disabled={editedUser?.companyType === '무료 사용자'}
            style={editedUser?.companyType === '무료 사용자' ? { backgroundColor: '#f5f5f5', color: '#666', cursor: 'not-allowed' } : {}}
          >
            <option value="승인 예정">승인 예정</option>
            <option value="승인 완료">승인 완료</option>
            <option value="탈퇴">탈퇴</option>
          </select>
        </div>
      </div>

      {/* 승인 완료 이력 테이블 */}
      <div className="approval-history-section">
        <h3 className="section-title">승인 완료 이력</h3>
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
                <th>삭제</th>
              </tr>
            </thead>
            <tbody>
              {userHistory
                .filter(history => {
                  // 승인 완료 이력만 표시 (승인 이력 탭과 동일)
                  return history.status_type === '승인 완료';
                })
                .map((history, index) => (
                <tr key={index}>
                  <td>
                    <span className="status-badge approved">
                      ✓ {history.status_type}
                    </span>
                  </td>
                  <td>{formatDate(history.start_date)}</td>
                  <td>{formatDate(history.end_date)}</td>
                  <td>{history.company_type || '-'}</td>
                  <td>{history.pricing_plan || '-'}</td>
                  <td>
                    {history.active_days ? 
                      `${Math.round(history.active_days / 30)}개월` : 
                      '-'
                    }
                  </td>
                  <td>
                    <button 
                      className="status-button delete-red"
                      onClick={() => {
                        // ID가 없으면 index를 사용
                        const deleteId = history.id || index;
                        handleDeleteHistory(deleteId);
                      }}
                    >
                      삭제
                    </button>
                  </td>
                </tr>
              ))}
              {userHistory.filter(history => {
                // status_type이 '승인 완료'인 경우만 표시 (승인 이력 탭과 동일)
                return history.status_type === '승인 완료';
              }).length === 0 && (
                <tr>
                  <td colSpan="7" style={{ textAlign: 'center', padding: '20px' }}>
                    등록된 승인 완료 이력이 없습니다.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
};

export default ApprovalModeView;
