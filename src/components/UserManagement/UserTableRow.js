import React from 'react';

const UserTableRow = ({
  user,
  activeTab,
  formatDate,
  handleDoubleClick,
  handleDeleteUser,
  handleDeleteHistory,
  handleRevenueUser,
  isUserActive,
  showMessageRef
}) => {
  const getSubscriptionTypeDisplay = (user) => {
    // 월간/연간 값이 있을 경우 값을 그대로 표시
    if (user.subscriptionType === '월간' || user.subscriptionType === '연간') {
      return user.subscriptionType;
    }

    // null(특정기간)인데 승인 완료 상태인 경우는 활성화 기간을 계산해서 개월로 표시
    if ((!user.subscriptionType || user.subscriptionType === '특정기간') && user.approvalStatus === '승인 완료') {
      if (user.startDate && user.endDate) {
        const start = new Date(user.startDate);
        const end = new Date(user.endDate);
        if (!isNaN(start.getTime()) && !isNaN(end.getTime())) {
          // 일수 계산
          const timeDiff = end.getTime() - start.getTime();
          const activeDays = Math.ceil(timeDiff / (1000 * 60 * 60 * 24)) + 1;
          const months = Math.round(activeDays / 30);
          return `${months}개월`;
        }
      }
      return '-';
    }

    // null(특정기간)인데 승인 예정/탈퇴인 경우 값을 표시하지 않음
    return '';
  };

  const renderCells = () => {
    const commonCells = [
      <td key="userId">{user.userId}</td>,
      <td key="companyName">{user.companyName}</td>,
      <td key="userName">{user.userName}</td>
    ];

    // 직책 컬럼 (전체, 무료, 탈퇴, 승인 탭에서만 표시)
    if (['전체', '무료', '탈퇴', '승인'].includes(activeTab)) {
      commonCells.push(
        <td key="position">{user.position || ''}</td>
      );
    }

    switch (activeTab) {
      case '무료':
        return [
          ...commonCells,
          <td key="mobilePhone">{user.mobilePhone || ''}</td>,
          <td key="email">{user.email}</td>,
          <td key="companyType">{user.companyType || ''}</td>,
          <td key="pricingPlan">{user.pricingPlan || '무료'}</td>,
          <td key="startDate">{user.startDate ? formatDate(user.startDate) : ''}</td>,
          <td key="endDate">{user.endDate ? formatDate(user.endDate) : ''}</td>,
          <td key="approvalStatus">
            <button
              className={`status-button ${user.approvalStatus === '승인 완료' ? 'approved' : user.approvalStatus === '탈퇴' ? 'withdrawn' : 'pending'}`}
              title="승인 상태"
            >
              {user.approvalStatus}
            </button>
          </td>
        ];

      case '구독중':
        return [
          ...commonCells,
          <td key="mobilePhone">{user.mobilePhone || ''}</td>,
          <td key="companyType">{user.companyType || ''}</td>,
          <td key="pricingPlan">{user.pricingPlan || '무료'}</td>,
          <td key="subscriptionType">{getSubscriptionTypeDisplay(user)}</td>,
          <td key="startDate">{user.startDate ? formatDate(user.startDate) : ''}</td>,
          <td key="endDate">{user.endDate ? formatDate(user.endDate) : ''}</td>,
          <td key="msdsLimit">{user.msdsLimit || 0}</td>,
          <td key="aiImageLimit">{user.aiImageLimit || 0}</td>,
          <td key="aiReportLimit">{user.aiReportLimit || 0}</td>,
          <td key="approvalStatus">
            <button
              className={`status-button ${user.approvalStatus === '승인 완료' ? 'approved' : user.approvalStatus === '탈퇴' ? 'withdrawn' : 'pending'}`}
              title="승인 상태"
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
          <td key="mobilePhone">{user.mobilePhone || ''}</td>,
          <td key="email">{user.email}</td>,
          <td key="companyType">{user.companyType || ''}</td>,
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
          <td key="mobilePhone">{user.mobile_phone || user.mobilePhone || ''}</td>,
          <td key="email">{user.email || ''}</td>,
          <td key="companyType">{user.company_type || user.companyType || ''}</td>,
          <td key="pricingPlan">{user.pricing_plan || user.pricingPlan || '무료'}</td>,
          <td key="activeMonths">
            {user.active_days ?
              `${Math.round(user.active_days / 30)}개월` :
              (user.active_months ? `${user.active_months}개월` : (user.activeMonths ? `${user.activeMonths}개월` : '-'))
            }
          </td>,
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
          <td key="mobilePhone">{user.mobilePhone || ''}</td>,
          <td key="email">{user.email}</td>,
          <td key="companyType">{user.companyType || ''}</td>,
          <td key="pricingPlan">{user.pricingPlan || '무료'}</td>,
          <td key="subscriptionType">{getSubscriptionTypeDisplay(user)}</td>,
          <td key="startDate">{user.startDate ? formatDate(user.startDate) : ''}</td>,
          <td key="endDate">{user.endDate ? formatDate(user.endDate) : ''}</td>,
          <td key="approvalStatus">
            <button
              className={`status-button ${user.approvalStatus === '승인 완료' ? 'approved' : user.approvalStatus === '탈퇴' ? 'withdrawn' : 'pending'}`}
              title="승인 상태"
            >
              {user.approvalStatus}
            </button>
          </td>
        ];
    }
  };

  return (
    <tr
      onDoubleClick={activeTab === '승인' ? undefined : () => handleDoubleClick(user)}
      style={{ cursor: activeTab === '승인' ? 'default' : 'pointer' }}
      className="user-row"
    >
      {renderCells()}
    </tr>
  );
};

export default UserTableRow;
