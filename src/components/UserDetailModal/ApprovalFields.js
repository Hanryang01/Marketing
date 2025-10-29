import React from 'react';
import useApprovalFields from '../../hooks/useApprovalFields';

/**
 * 공통 승인 필드 컴포넌트
 * @param {Object} props - 컴포넌트 props
 */
const ApprovalFields = ({ 
  editedUser, 
  user, 
  handleInputChange, 
  handleDateInputChange,
  handleOpenCalendar,
  isEditable = true,
  setEditedUser,
  showLabels = true,
  compactMode = false,
  fieldsToShow = ['companyType', 'pricingPlan', 'startDate', 'endDate', 'approvalStatus'],
  activeTab = '전체'
}) => {
  const {
    isFreeUser,
    getDisabledStyle,
    handleCalendarClick,
    getCalendarIconStyle,
    handleCompanyTypeChange,
    handlePricingPlanChange,
    handleApprovalStatusChange,
    handleDateChange
  } = useApprovalFields(
    editedUser, 
    user, 
    handleInputChange, 
    handleDateInputChange, 
    handleOpenCalendar, 
    setEditedUser, 
    isEditable,
    activeTab
  );

  return (
    <>
      {/* 업체 형태 */}
      {fieldsToShow.includes('companyType') && (
        <div className="form-group">
          {showLabels && <label>업체 형태</label>}
          <select
            value={editedUser?.companyType || '무료 사용자'}
            onChange={(e) => handleCompanyTypeChange(e.target.value)}
            disabled={!isEditable}
            className={!isEditable ? 'readonly-input' : ''}
          >
            <option value="무료 사용자">무료 사용자</option>
            <option value="컨설팅 업체">컨설팅 업체</option>
            <option value="일반 업체">일반 업체</option>
            <option value="탈퇴 사용자">탈퇴 사용자</option>
            <option value="기타">기타</option>
          </select>
        </div>
      )}

      {/* 요금제 */}
      {fieldsToShow.includes('pricingPlan') && (
        <div className="form-group">
          {showLabels && <label>요금제</label>}
          <select
            value={editedUser?.pricingPlan || '무료'}
            onChange={(e) => handlePricingPlanChange(e.target.value)}
            disabled={!isEditable || isFreeUser || activeTab === '탈퇴'}
            className={(!isEditable || isFreeUser || activeTab === '탈퇴') ? 'readonly-input' : ''}
            style={getDisabledStyle(!isEditable || isFreeUser || activeTab === '탈퇴')}
          >
            <option value="무료">무료</option>
            <option value="스탠다드">스탠다드</option>
            <option value="프리미엄">프리미엄</option>
          </select>
        </div>
      )}

      {/* 시작일 */}
      {fieldsToShow.includes('startDate') && (
        <div className="form-group">
          {showLabels && <label>시작일</label>}
          <div className="date-input-container">
            <input
              type="text"
              value={editedUser?.startDate || ''}
              onChange={(e) => handleDateChange('startDate', e.target.value)}
              placeholder="YYYY-MM-DD"
              maxLength="10"
              disabled={!isEditable || isFreeUser || activeTab === '탈퇴'}
              className={(!isEditable || isFreeUser || activeTab === '탈퇴') ? 'readonly-input' : ''}
              style={{ 
                backgroundColor: 'white', 
                border: '1px solid #ccc'
              }}
            />
            <div 
              className="calendar-icon" 
              onClick={(e) => handleCalendarClick('startDate', e)}
              style={getCalendarIconStyle('startDate')}
            >
              📅
            </div>
          </div>
        </div>
      )}

      {/* 종료일 */}
      {fieldsToShow.includes('endDate') && (
        <div className="form-group">
          {showLabels && <label>종료일</label>}
          <div className="date-input-container">
            <input
              type="text"
              value={editedUser?.endDate || ''}
              onChange={(e) => handleDateChange('endDate', e.target.value)}
              placeholder="YYYY-MM-DD"
              maxLength="10"
              disabled={!isEditable || isFreeUser || activeTab === '탈퇴'}
              className={(!isEditable || isFreeUser || activeTab === '탈퇴') ? 'readonly-input' : ''}
              style={{ 
                backgroundColor: 'white', 
                border: '1px solid #ccc'
              }}
            />
            <div 
              className="calendar-icon" 
              onClick={(e) => handleCalendarClick('endDate', e)}
              style={getCalendarIconStyle('endDate')}
            >
              📅
            </div>
          </div>
        </div>
      )}

      {/* 승인 상태 */}
      {fieldsToShow.includes('approvalStatus') && (
        <div className="form-group">
          {showLabels && <label>승인 상태</label>}
          <select
            value={editedUser?.approvalStatus || '승인 예정'}
            onChange={(e) => handleApprovalStatusChange(e.target.value)}
            disabled={!isEditable}
            className={!isEditable ? 'readonly-input' : ''}
            style={getDisabledStyle(!isEditable)}
          >
            <option value="승인 예정">승인 예정</option>
            <option value="승인 완료">승인 완료</option>
            <option value="탈퇴">탈퇴</option>
          </select>
        </div>
      )}
    </>
  );
};

export default ApprovalFields;
