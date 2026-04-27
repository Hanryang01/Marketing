import React, { useRef } from 'react';
import './UserManagement.css';

// Import the UserDetailModal component
import UserDetailModal from './UserDetailModal';
import AddUserModal from './AddUserModal';
import MessageModal from './MessageModal';
import RevenueModal from './RevenueModal';
import UserTable from './UserManagement/UserTable';

// 커스텀 훅들
import { useMessage } from '../hooks/useMessage';
import { useCalendar } from '../hooks/useCalendar';
import useUserData from '../hooks/useUserData';
import useUserFilters from '../hooks/useUserFilters';
// import useUserActions from '../hooks/useUserActions'; // 사용하지 않음
import useUserModals from '../hooks/useUserModals';

import { isValidBusinessLicense } from '../utils/businessLicenseUtils';
import { isUserActive } from '../utils/userUtils';
import { apiCall, API_ENDPOINTS } from '../config/api';

const UserManagement = () => {
  // 커스텀 훅들 사용
  const { users, loading, companyHistory, fetchCompanyHistory, loadUsers } = useUserData();
  const {
    searchFilters,
    activeTab,
    handleFilterChange,
    handleTabChange,
    getFilteredUsers
  } = useUserFilters(users);

  // 메시지 관련 로직을 useMessage 훅으로 분리
  const messageProps = useMessage();
  const { showMessage } = messageProps;
  const showMessageRef = useRef(showMessage);

  // showMessage 함수가 변경될 때마다 ref 업데이트
  React.useEffect(() => {
    showMessageRef.current = showMessage;
  }, [showMessage]);

  // 승인 이력 삭제 이벤트 리스너
  React.useEffect(() => {
    const handleHistoryDeleted = () => {
      // 승인 이력 데이터 새로고침
      fetchCompanyHistory();
    };

    const handleUserUpdated = () => {
      // 사용자 정보 업데이트 시 승인 이력도 새로고침
      fetchCompanyHistory();
    };

    window.addEventListener('historyDeleted', handleHistoryDeleted);
    window.addEventListener('userUpdated', handleUserUpdated);

    return () => {
      window.removeEventListener('historyDeleted', handleHistoryDeleted);
      window.removeEventListener('userUpdated', handleUserUpdated);
    };
  }, [fetchCompanyHistory]);

  // 사용자 추가 함수 (백업 파일에서 복원)
  const handleAddUser = async (userData) => {
    try {
      // 사업자등록번호 유효성 검사
      if (userData.businessLicense && !isValidBusinessLicense(userData.businessLicense)) {
        showMessage('error', '사업자등록번호 오류', '사업자등록번호는 숫자 10자리여야 합니다.', {
          showCancel: false,
          confirmText: '확인'
        });
        return;
      }

      // 프론트엔드 필드명을 서버 필드명으로 변환
      const serverData = {
        user_id: userData.userId,
        user_name: userData.userName,
        company_name: userData.companyName,
        email: userData.email,
        department: userData.department,
        mobile_phone: userData.mobilePhone,
        phone_number: userData.phoneNumber,
        fax_number: userData.faxNumber,
        address: userData.address,
        business_license: userData.businessLicense,
        manager_position: userData.position,
        company_type: userData.companyType || null,
        pricing_plan: userData.pricingPlan || '무료',
        start_date: userData.startDate,
        end_date: userData.endDate,
        notes: userData.notes,
        msds_limit: userData.msdsLimit || 0,
        ai_image_limit: userData.aiImageLimit || 0,
        ai_report_limit: userData.aiReportLimit || 0,
        is_active: userData.isActive || false,
        approval_status: userData.approvalStatus || '승인 예정',
        representative: userData.representative,
        industry: userData.industry,
        accountant_name: userData.accountantName,
        accountant_position: userData.accountantPosition,
        accountant_mobile: userData.accountantMobile,
        accountant_email: userData.accountantEmail
      };

      const result = await apiCall(API_ENDPOINTS.USERS, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(serverData)
      });

      if (result && result.success) {
        // 사용자 목록 새로고침
        await loadUsers();

        showMessage('success', '성공', '사용자가 성공적으로 추가되었습니다.', {
          showCancel: false,
          confirmText: '확인'
        });

        handleCloseAddUserModal();
      } else {
        showMessage('error', '오류', result.error || '사용자 추가에 실패했습니다.', {
          showCancel: false,
          confirmText: '확인'
        });
      }
    } catch (error) {
      showMessage('error', '오류', '사용자 추가 중 오류가 발생했습니다.', {
        showCancel: false,
        confirmText: '확인'
      });
    }
  };
  const {
    showAddUserModal,
    showDetailModal,
    showRevenueModal,
    selectedUser,
    revenueUser,
    newUser,
    setNewUser,
    handleOpenAddUserModal,
    handleCloseAddUserModal,
    handleCloseDetailModal,
    handleOpenRevenueModal,
    handleCloseRevenueModal,
    handleDoubleClick
  } = useUserModals();

  // 날짜 처리 관련 로직을 useCalendar 훅으로 분리
  const calendarProps = useCalendar();
  const { formatDate } = calendarProps;



  // 사용자 상세 저장 (백업 파일에서 복원)
  const handleDetailSave = async (userData) => {
    try {
      // 사업자등록번호 유효성 검사
      if (userData.business_license && !isValidBusinessLicense(userData.business_license)) {
        showMessage('error', '사업자등록번호 오류', '사업자등록번호는 숫자 10자리여야 합니다.', {
          showCancel: false,
          confirmText: '확인'
        });
        return;
      }

      // 승인 탭에서 수정하는 경우, 실제 사용자 ID를 찾아서 사용
      let actualUserId = userData.id;

      if (activeTab === '승인' && selectedUser) {
        // 승인 이력에서 실제 사용자 ID 찾기
        const historyItem = companyHistory.find(history =>
          history.user_id_string === selectedUser.userId &&
          history.company_name === selectedUser.companyName
        );

        if (historyItem && historyItem.user_id) {
          actualUserId = historyItem.user_id;
        } else {
          // 승인 이력에서 찾을 수 없는 경우, users 배열에서 찾기
          const actualUser = users.find(user =>
            user.userId === selectedUser.userId &&
            user.companyName === selectedUser.companyName
          );
          if (actualUser) {
            actualUserId = actualUser.id;
          }
        }
      }

      const result = await apiCall(API_ENDPOINTS.USER_DETAIL(actualUserId), {
        method: 'PUT',
        body: JSON.stringify(userData)
      });

      if (result.message) {
        // 사용자 목록 새로고침
        await loadUsers();

        showMessage('success', '성공', '사용자 정보가 성공적으로 저장되었습니다.', {
          showCancel: false,
          confirmText: '확인'
        });
        handleCloseDetailModal();
      } else {
        showMessage('error', '오류', result.error || '사용자 정보 저장에 실패했습니다.', {
          showCancel: false,
          confirmText: '확인'
        });
      }
    } catch (error) {
      showMessage('error', '오류', '사용자 정보 저장 중 오류가 발생했습니다.', {
        showCancel: false,
        confirmText: '확인'
      });
    }
  };


  // 승인 이력 삭제 (UserDetailModal의 함수를 재사용)
  const handleDeleteHistory = async (historyId) => {
    // UserDetailModal의 handleDeleteHistory 로직을 그대로 사용
    showMessage('warning', '이력 삭제', '이 이력을 삭제하시겠습니까?', {
      showCancel: true,
      confirmText: '삭제',
      cancelText: '취소',
      onConfirm: async () => {
        try {
          const result = await apiCall(API_ENDPOINTS.HISTORY_DELETE(historyId), {
            method: 'DELETE'
          });

          if (result.success) {
            // 승인 이력 데이터 새로고침
            fetchCompanyHistory();
            // 승인 이력 탭 새로고침을 위한 이벤트 발생
            window.dispatchEvent(new CustomEvent('historyDeleted'));
          } else {
            showMessage('error', '삭제 실패', result.error || '이력 삭제에 실패했습니다.', {
              showCancel: false,
              confirmText: '확인'
            });
          }
        } catch (error) {
          showMessage('error', '삭제 오류', '이력 삭제 중 오류가 발생했습니다.', {
            showCancel: false,
            confirmText: '확인'
          });
        }
      }
    });
  };

  // 사용자 삭제 (백업 파일에서 복원)
  const handleDeleteUser = async (userId) => {
    // 통일된 메시지 팝업창으로 삭제 확인
    showMessage('warning', '사용자 삭제', '이 사용자를 삭제하시겠습니까?', {
      showCancel: true,
      confirmText: '삭제',
      cancelText: '취소',
      onConfirm: () => executeDeleteUser({ id: userId })
    });
  };

  // 실제 사용자 삭제 실행 함수 (백업 파일에서 복원)
  const executeDeleteUser = async (user) => {
    try {
      const result = await apiCall(API_ENDPOINTS.USER_DETAIL(user.id), {
        method: 'DELETE'
      });

      if (result.success) {
        // 사용자 목록 새로고침
        await loadUsers();

        showMessage('success', '성공', '사용자가 성공적으로 삭제되었습니다.', {
          showCancel: false,
          confirmText: '확인'
        });
      } else {
        showMessage('error', '오류', result.error || '사용자 삭제에 실패했습니다.', {
          showCancel: false,
          confirmText: '확인'
        });
      }
    } catch (error) {
      showMessage('error', '오류', '사용자 삭제 중 오류가 발생했습니다.', {
        showCancel: false,
        confirmText: '확인'
      });
    }
  };

  // 매출 저장
  const handleRevenueSave = async (revenueData) => {
    // 사업자등록번호 유효성 검사
    if (revenueData.businessLicense && !isValidBusinessLicense(revenueData.businessLicense)) {
      messageProps.showMessage('error', '사업자등록번호 오류', '사업자등록번호는 숫자 10자리여야 합니다.', {
        showCancel: false,
        confirmText: '확인'
      });
      return;
    }

    // 필수 필드 검증
    if (!revenueData.companyName || !revenueData.businessLicense || !revenueData.issueDate || !revenueData.paymentMethod || !revenueData.companyType || !revenueData.item || !revenueData.supplyAmount) {
      messageProps.showMessage('error', '오류', '필수 항목을 모두 입력해주세요.', {
        showCancel: false,
        confirmText: '확인'
      });
      return;
    }

    try {
      // 날짜 형식 변환 (8자리 숫자를 DATE 형식으로 변환)
      let formattedIssueDate = revenueData.issueDate || null;
      let formattedPaymentDate = revenueData.paymentDate || null;

      // 콤마 제거하고 숫자로 변환하여 서버 데이터 구성
      const serverData = {
        company_name: revenueData.companyName,
        business_license: revenueData.businessLicense || '',
        issue_date: formattedIssueDate,
        payment_date: formattedPaymentDate,
        payment_method: revenueData.paymentMethod,
        company_type: revenueData.companyType,
        item: revenueData.item,
        supply_amount: parseFloat(revenueData.supplyAmount.replace(/,/g, '')) || 0,
        vat: parseFloat(revenueData.vat.replace(/,/g, '')) || 0,
        total_amount: parseFloat(revenueData.totalAmount.replace(/,/g, '')) || 0
      };

      const result = await apiCall(API_ENDPOINTS.REVENUE, {
        method: 'POST',
        body: JSON.stringify(serverData)
      });

      if (result.success) {
        // 사용자 목록 새로고침
        await loadUsers();

        messageProps.showMessage('success', '성공', '매출이 성공적으로 등록되었습니다.', {
          showCancel: false,
          confirmText: '확인'
        });
        handleCloseRevenueModal();
      } else {
        messageProps.showMessage('error', '오류', result.error || '매출 등록 중 오류가 발생했습니다.', {
          showCancel: false,
          confirmText: '확인'
        });
      }
    } catch (error) {
      messageProps.showMessage('error', '오류', '매출 등록 중 오류가 발생했습니다.', {
        showCancel: false,
        confirmText: '확인'
      });
    }
  };

  if (loading) {
    return <div className="loading">로딩 중...</div>;
  }

  return (
    <div className="user-management">
      {/* 탭 네비게이션 */}
      <div className="user-tabs">
        <div className="user-tabs-left">
          <button
            className={`tab-button ${activeTab === '전체' ? 'active' : ''}`}
            onClick={() => handleTabChange('전체')}
          >
            👥 전체 ({users.length}명)
          </button>
          <button
            className={`tab-button ${activeTab === '구독중' ? 'active' : ''}`}
            onClick={() => handleTabChange('구독중')}
          >
            🏢 구독중 ({users.filter(user =>
              (user.companyType === '컨설팅 업체' && user.approvalStatus === '승인 완료') ||
              (user.companyType === '일반 업체' && isUserActive({
                approvalStatus: user.approvalStatus,
                companyType: user.companyType,
                pricingPlan: user.pricingPlan,
                startDate: user.startDate,
                endDate: user.endDate
              }))
            ).length}명)
          </button>
          <button
            className={`tab-button ${activeTab === '무료' ? 'active' : ''}`}
            onClick={() => handleTabChange('무료')}
          >
            💰 무료 ({users.filter(user =>
              // 업체 형태와 상관없이 승인 예정 상태인 모든 사용자
              user.approvalStatus === '승인 예정'
            ).length}명)
          </button>
          <button
            className={`tab-button ${activeTab === '탈퇴' ? 'active' : ''}`}
            onClick={() => handleTabChange('탈퇴')}
          >
            🚪 탈퇴 ({users.filter(user => user.approvalStatus === '탈퇴' && user.companyType === '탈퇴 사용자').length}명)
          </button>
          <button
            className={`tab-button ${activeTab === '승인' ? 'active' : ''}`}
            onClick={() => handleTabChange('승인')}
          >
            📋 승인 이력 ({Array.isArray(companyHistory) ? companyHistory.length : 0}건)
          </button>
        </div>
        <div className="user-tabs-right">
          <button
            className="add-user-button"
            onClick={handleOpenAddUserModal}
          >
            사용자 추가
          </button>
        </div>
      </div>

      {/* 검색 필터 */}
      <div className="user-search-area">
        <div className="user-search-row">
          <div className="user-search-group">
            <label className="user-search-label">업체명</label>
            <input
              type="text"
              className="user-search-input"
              placeholder="업체명 검색"
              value={searchFilters.companyName}
              onChange={(e) => handleFilterChange('companyName', e.target.value)}
            />
          </div>
          <div className="user-search-group">
            <label className="user-search-label">사용자 ID</label>
            <input
              type="text"
              className="user-search-input"
              placeholder="사용자 ID 검색"
              value={searchFilters.userId}
              onChange={(e) => handleFilterChange('userId', e.target.value)}
            />
          </div>
          <div className="user-search-group">
            <label className="user-search-label">업체 형태</label>
            <div className="user-dropdown-wrapper">
              <select
                className="user-search-dropdown"
                value={searchFilters.companyType}
                onChange={(e) => handleFilterChange('companyType', e.target.value)}
              >
                <option value="">전체</option>
                <option value="컨설팅 업체">컨설팅업체</option>
                <option value="일반 업체">일반업체</option>
              </select>
              <span className="user-dropdown-icon">▼</span>
            </div>
          </div>
          <div className="user-search-group">
            <label className="user-search-label">요금제</label>
            <div className="user-dropdown-wrapper">
              <select
                className="user-search-dropdown"
                value={searchFilters.pricingPlan}
                onChange={(e) => handleFilterChange('pricingPlan', e.target.value)}
              >
                <option value="">전체</option>
                <option value="무료">무료</option>
                <option value="스탠다드">스탠다드</option>
                <option value="프리미엄">프리미엄</option>
              </select>
              <span className="user-dropdown-icon">▼</span>
            </div>
          </div>
          <div className="user-search-group">
            <label className="user-search-label">승인상태</label>
            <div className="user-dropdown-wrapper">
              <select
                className="user-search-dropdown"
                value={searchFilters.approvalStatus}
                onChange={(e) => handleFilterChange('approvalStatus', e.target.value)}
              >
                <option value="">전체</option>
                <option value="승인 완료">승인완료</option>
                <option value="승인 예정">승인예정</option>
                <option value="탈퇴">탈퇴</option>
              </select>
              <span className="user-dropdown-icon">▼</span>
            </div>
          </div>
          {/* 전체 탭, 구독중 탭에서만 결제 주기 필터 표시 */}
          {['전체', '구독중'].includes(activeTab) && (
            <div className="user-search-group">
              <label className="user-search-label">결제 주기</label>
              <div className="user-dropdown-wrapper">
                <select
                  className="user-search-dropdown"
                  value={searchFilters.subscriptionType}
                  onChange={(e) => handleFilterChange('subscriptionType', e.target.value)}
                >
                  <option value="">전체</option>
                  <option value="월간">월간</option>
                  <option value="연간">연간</option>
                  <option value="기타">기타</option>
                </select>
                <span className="user-dropdown-icon">▼</span>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* 사용자 테이블 */}
      <UserTable
        activeTab={activeTab}
        filteredUsers={getFilteredUsers}
        companyHistory={companyHistory}
        formatDate={formatDate}
        handleDoubleClick={handleDoubleClick}
        handleDeleteUser={handleDeleteUser}
        handleDeleteHistory={handleDeleteHistory}
        handleRevenueUser={handleOpenRevenueModal}
        isUserActive={isUserActive}
        showMessageRef={showMessageRef}
      />

      {/* 사용자 추가 모달 */}
      <AddUserModal
        isOpen={showAddUserModal}
        onClose={handleCloseAddUserModal}
        onSave={handleAddUser}
        newUser={newUser}
        setNewUser={setNewUser}
        showMessage={showMessage}
      />

      {/* 사용자 상세 모달 */}
      <UserDetailModal
        isOpen={showDetailModal}
        onClose={handleCloseDetailModal}
        onSave={handleDetailSave}
        user={selectedUser}
        companyHistory={companyHistory}
        activeTab={activeTab}
      />

      {/* 매출 모달 */}
      <RevenueModal
        isOpen={showRevenueModal}
        onClose={handleCloseRevenueModal}
        onSave={handleRevenueSave}
        mode="add"
        initialData={revenueUser}
        title="매출 입력"
      />

      {/* 메시지 모달 */}
      <MessageModal
        isOpen={messageProps.showMessageModal}
        messageData={messageProps.messageData}
        onConfirm={messageProps.handleMessageConfirm}
        onCancel={messageProps.handleMessageCancel}
      />
    </div>
  );
};

export default UserManagement;