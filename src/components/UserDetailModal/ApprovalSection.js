import React from 'react';
import ApprovalFields from './ApprovalFields';

/**
 * 승인 정보 섹션 컴포넌트
 * @param {Object} props - 컴포넌트 props
 */
const ApprovalSection = ({
  editedUser,
  user,
  handleInputChange,
  handleDateInputChange,
  handleOpenCalendar,
  isEditable = true,
  setEditedUser,
  activeTab = '전체'
}) => {
  return (
    <div className="form-section approval-info-section">
      <h3 className="section-title">승인 정보</h3>

      <div className="form-row">
        <ApprovalFields
          editedUser={editedUser}
          user={user}
          handleInputChange={handleInputChange}
          handleDateInputChange={handleDateInputChange}
          handleOpenCalendar={handleOpenCalendar}
          isEditable={isEditable}
          setEditedUser={setEditedUser}
          showLabels={true}
          compactMode={false}
          fieldsToShow={['companyType', 'pricingPlan']}
          activeTab={activeTab}
        />
      </div>

      <div className="form-row">
        {/* 결제 주기 옆으로 승인 상태 항목 이동 (사용자 요청 3번) */}
        <ApprovalFields
          editedUser={editedUser}
          user={user}
          handleInputChange={handleInputChange}
          handleDateInputChange={handleDateInputChange}
          handleOpenCalendar={handleOpenCalendar}
          isEditable={isEditable}
          setEditedUser={setEditedUser}
          showLabels={true}
          compactMode={false}
          fieldsToShow={['subscriptionType', 'approvalStatus']}
          activeTab={activeTab}
        />
      </div>

      <div className="form-row">
        <ApprovalFields
          editedUser={editedUser}
          user={user}
          handleInputChange={handleInputChange}
          handleDateInputChange={handleDateInputChange}
          handleOpenCalendar={handleOpenCalendar}
          isEditable={isEditable}
          setEditedUser={setEditedUser}
          showLabels={true}
          compactMode={false}
          fieldsToShow={['startDate', 'endDate']}
          activeTab={activeTab}
        />
      </div>
    </div>
  );
};

export default ApprovalSection;
