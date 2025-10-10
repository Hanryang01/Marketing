import React from 'react';

const UserTableRow = ({ 
  user, 
  activeTab, 
  formatDate, 
  handleDoubleClick, 
  handleDeleteUser, 
  handleDeleteHistory,
  handleApprovalUser, 
  handleRevenueUser,
  isUserActive,
  showMessageRef
}) => {
  const renderCells = () => {
    const commonCells = [
      <td key="userId" onDoubleClick={() => handleDoubleClick(user)} style={{ cursor: activeTab === '승인' ? 'default' : 'pointer' }}>{user.userId}</td>,
      <td key="companyName" onDoubleClick={() => handleDoubleClick(user)} style={{ cursor: activeTab === '승인' ? 'default' : 'pointer' }}>{user.companyName}</td>,
      <td key="userName" onDoubleClick={() => handleDoubleClick(user)} style={{ cursor: activeTab === '승인' ? 'default' : 'pointer' }}>{user.userName}</td>
    ];

    // 직책 컬럼 (전체, 무료, 탈퇴, 승인 탭에서만 표시)
    if (['전체', '무료', '탈퇴', '승인'].includes(activeTab)) {
      commonCells.push(
        <td key="position" onDoubleClick={() => handleDoubleClick(user)} style={{ cursor: activeTab === '승인' ? 'default' : 'pointer' }}>{user.position || ''}</td>
      );
    }

    switch (activeTab) {
      case '무료':
        return [
          ...commonCells,
          <td key="mobilePhone" onDoubleClick={() => handleDoubleClick(user)} style={{ cursor: 'pointer' }}>{user.mobilePhone || user.phoneNumber || ''}</td>,
          <td key="email" onDoubleClick={() => handleDoubleClick(user)} style={{ cursor: 'pointer' }}>{user.email}</td>,
          <td key="companyType" onDoubleClick={() => handleDoubleClick(user)} style={{ cursor: 'pointer' }}>{user.companyType || ''}</td>,
          <td key="pricingPlan" onDoubleClick={() => handleDoubleClick(user)} style={{ cursor: 'pointer' }}>{user.pricingPlan || '무료'}</td>,
          <td key="startDate" onDoubleClick={() => handleDoubleClick(user)} style={{ cursor: 'pointer' }}>{user.startDate ? formatDate(user.startDate) : ''}</td>,
          <td key="endDate" onDoubleClick={() => handleDoubleClick(user)} style={{ cursor: 'pointer' }}>{user.endDate ? formatDate(user.endDate) : ''}</td>,
          <td key="approvalStatus">
            <button 
              className={`status-button ${user.approvalStatus === '승인 완료' ? 'approved' : user.approvalStatus === '탈퇴' ? 'withdrawn' : 'pending'}`}
              onClick={() => handleApprovalUser(user)}
              title="승인 관리"
            >
              {user.approvalStatus}
            </button>
          </td>
        ];

      case '컨설팅':
        return [
          ...commonCells,
          <td key="mobilePhone" onDoubleClick={() => handleDoubleClick(user)} style={{ cursor: 'pointer' }}>{user.mobilePhone || user.phoneNumber || ''}</td>,
          <td key="companyType" onDoubleClick={() => handleDoubleClick(user)} style={{ cursor: 'pointer' }}>{user.companyType || ''}</td>,
          <td key="pricingPlan" onDoubleClick={() => handleDoubleClick(user)} style={{ cursor: 'pointer' }}>{user.pricingPlan || '무료'}</td>,
          <td key="startDate" onDoubleClick={() => handleDoubleClick(user)} style={{ cursor: 'pointer' }}>{user.startDate ? formatDate(user.startDate) : ''}</td>,
          <td key="endDate" onDoubleClick={() => handleDoubleClick(user)} style={{ cursor: 'pointer' }}>{user.endDate ? formatDate(user.endDate) : ''}</td>,
          <td key="msdsLimit" onDoubleClick={() => handleDoubleClick(user)} style={{ cursor: 'pointer' }}>{user.msdsLimit || 0}</td>,
          <td key="aiImageLimit" onDoubleClick={() => handleDoubleClick(user)} style={{ cursor: 'pointer' }}>{user.aiImageLimit || 0}</td>,
          <td key="aiReportLimit" onDoubleClick={() => handleDoubleClick(user)} style={{ cursor: 'pointer' }}>{user.aiReportLimit || 0}</td>,
          <td key="approvalStatus">
            <button 
              className={`status-button ${user.approvalStatus === '승인 완료' ? 'approved' : user.approvalStatus === '탈퇴' ? 'withdrawn' : 'pending'}`}
              onClick={() => handleApprovalUser(user)}
              title="승인 관리"
            >
              {user.approvalStatus}
            </button>
          </td>,
          <td key="revenue">
            <button 
              className="status-button revenue-button"
              onClick={() => handleRevenueUser(user)}
              title="매출 입력"
            >
              매출
            </button>
          </td>
        ];

      case '일반':
        return [
          ...commonCells,
          <td key="mobilePhone" onDoubleClick={() => handleDoubleClick(user)} style={{ cursor: 'pointer' }}>{user.mobilePhone || user.phoneNumber || ''}</td>,
          <td key="companyType" onDoubleClick={() => handleDoubleClick(user)} style={{ cursor: 'pointer' }}>{user.companyType || ''}</td>,
          <td key="pricingPlan" onDoubleClick={() => handleDoubleClick(user)} style={{ cursor: 'pointer' }}>{user.pricingPlan || '무료'}</td>,
          <td key="startDate" onDoubleClick={() => handleDoubleClick(user)} style={{ cursor: 'pointer' }}>{user.startDate ? formatDate(user.startDate) : ''}</td>,
          <td key="endDate" onDoubleClick={() => handleDoubleClick(user)} style={{ cursor: 'pointer' }}>{user.endDate ? formatDate(user.endDate) : ''}</td>,
          <td key="msdsLimit" onDoubleClick={() => handleDoubleClick(user)} style={{ cursor: 'pointer' }}>{user.msdsLimit || 0}</td>,
          <td key="aiImageLimit" onDoubleClick={() => handleDoubleClick(user)} style={{ cursor: 'pointer' }}>{user.aiImageLimit || 0}</td>,
          <td key="aiReportLimit" onDoubleClick={() => handleDoubleClick(user)} style={{ cursor: 'pointer' }}>{user.aiReportLimit || 0}</td>,
          <td key="approvalStatus">
            <button 
              className={`status-button ${user.approvalStatus === '승인 완료' ? 'approved' : user.approvalStatus === '탈퇴' ? 'withdrawn' : 'pending'}`}
              onClick={() => handleApprovalUser(user)}
              title="승인 관리"
            >
              {user.approvalStatus}
            </button>
          </td>,
          <td key="revenue">
            <button 
              className="status-button revenue-button"
              onClick={() => handleRevenueUser(user)}
              title="매출 입력"
            >
              매출
            </button>
          </td>
        ];

      case '탈퇴':
        return [
          ...commonCells,
          <td key="mobilePhone" onDoubleClick={() => handleDoubleClick(user)} style={{ cursor: 'pointer' }}>{user.mobilePhone || user.phoneNumber || ''}</td>,
          <td key="email" onDoubleClick={() => handleDoubleClick(user)} style={{ cursor: 'pointer' }}>{user.email}</td>,
          <td key="companyType" onDoubleClick={() => handleDoubleClick(user)} style={{ cursor: 'pointer' }}>{user.companyType || ''}</td>,
          <td key="delete">
            <button 
              className="status-button delete-red"
              onClick={() => {
                if (!user.id) {
                  showMessageRef.current('error', '오류', '삭제할 수 없습니다. ID가 없습니다.', {
                    showCancel: false,
                    confirmText: '확인'
                  });
                  return;
                }
                handleDeleteUser(user.id);
              }}
              title="사용자 삭제"
            >
              삭제
            </button>
          </td>
        ];

      case '승인':
        return [
          <td key="userId">{user.user_id_string || user.userId || ''}</td>,
          <td key="companyName">{user.company_name || user.companyName || ''}</td>,
          <td key="userName">{user.user_name || user.userName || ''}</td>,
          <td key="position">{user.manager_position || user.position || ''}</td>,
          <td key="mobilePhone">{user.mobile_phone || user.mobilePhone || user.phoneNumber || ''}</td>,
          <td key="email">{user.email || ''}</td>,
          <td key="companyType">{user.company_type || user.companyType || ''}</td>,
          <td key="pricingPlan">{user.pricing_plan || user.pricingPlan || '무료'}</td>,
          <td key="activeMonths">{user.active_months ? `${user.active_months}개월` : (user.activeMonths ? `${user.activeMonths}개월` : '-')}</td>,
          <td key="startDate">{formatDate(user.start_date || user.startDate)}</td>,
          <td key="endDate">{formatDate(user.end_date || user.endDate)}</td>,
          <td key="delete">
            <button 
              className="status-button delete-red"
              onClick={() => {
                if (!user.id) {
                  showMessageRef.current('error', '오류', '삭제할 수 없습니다. ID가 없습니다.', {
                    showCancel: false,
                    confirmText: '확인'
                  });
                  return;
                }
                // 승인 이력 탭에서는 이력 삭제 함수 사용
                if (activeTab === '승인') {
                  handleDeleteHistory(user.id);
                } else {
                  handleDeleteUser(user.id);
                }
              }}
              title="이력 삭제"
            >
              삭제
            </button>
          </td>
        ];

      default:
        return [
          ...commonCells,
          <td key="mobilePhone" onDoubleClick={() => handleDoubleClick(user)} style={{ cursor: 'pointer' }}>{user.mobilePhone || user.phoneNumber || ''}</td>,
          <td key="email" onDoubleClick={() => handleDoubleClick(user)} style={{ cursor: 'pointer' }}>{user.email}</td>,
          <td key="companyType" onDoubleClick={() => handleDoubleClick(user)} style={{ cursor: 'pointer' }}>{user.companyType || ''}</td>,
          <td key="pricingPlan" onDoubleClick={() => handleDoubleClick(user)} style={{ cursor: 'pointer' }}>{user.pricingPlan || '무료'}</td>,
          <td key="startDate" onDoubleClick={() => handleDoubleClick(user)} style={{ cursor: 'pointer' }}>{user.startDate ? formatDate(user.startDate) : ''}</td>,
          <td key="endDate" onDoubleClick={() => handleDoubleClick(user)} style={{ cursor: 'pointer' }}>{user.endDate ? formatDate(user.endDate) : ''}</td>,
          <td key="approvalStatus">
            <button 
              className={`status-button ${user.approvalStatus === '승인 완료' ? 'approved' : user.approvalStatus === '탈퇴' ? 'withdrawn' : 'pending'}`}
              onClick={() => handleApprovalUser(user)}
              title="승인 관리"
            >
              {user.approvalStatus}
            </button>
          </td>
        ];
    }
  };

  return (
    <tr>
      {renderCells()}
    </tr>
  );
};

export default UserTableRow;
