import { useCallback } from 'react';
import { apiCall, API_ENDPOINTS } from '../config/api';
import { isValidBusinessLicense } from '../utils/businessLicenseUtils';

const useUserActions = (setUsers, showMessageRef) => {
  // 사용자 추가
  const handleAddUser = useCallback(async (userData) => {
    try {
      // 사업자등록번호 유효성 검사
      if (userData.businessLicense && !isValidBusinessLicense(userData.businessLicense)) {
        showMessageRef.current('error', '오류', '올바른 사업자등록번호를 입력해주세요.', {
          showCancel: false,
          confirmText: '확인'
        });
        return;
      }

      const result = await apiCall(API_ENDPOINTS.USERS, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(userData)
      });

      if (result && result.success) {
        showMessageRef.current('success', '성공', '사용자가 성공적으로 추가되었습니다.', {
          showCancel: false,
          confirmText: '확인'
        });
        
        // 사용자 목록 새로고침
        const usersResult = await apiCall(API_ENDPOINTS.USERS);
        if (usersResult && usersResult.success) {
          const formattedUsers = usersResult.data.map(user => ({
            id: user.id,
            userId: user.user_id,
            companyName: user.company_name,
            userName: user.user_name,
            email: user.email,
            department: user.department,
            mobilePhone: user.mobile_phone,
            phoneNumber: user.phone_number,
            faxNumber: user.fax_number,
            address: user.address,
            notes: user.notes,
            position: user.manager_position,
            approvalStatus: user.approval_status || (user.is_active ? '승인 완료' : (user.company_type === '탈퇴 사용자' ? '탈퇴' : '승인 예정')),
            companyType: user.company_type,
            pricingPlan: user.pricing_plan,
            startDate: user.start_date,
            endDate: user.end_date,
            msdsLimit: user.msds_limit,
            aiImageLimit: user.ai_image_limit,
            aiReportLimit: user.ai_report_limit,
            businessLicense: user.business_license,
            createdAt: user.created_at,
            updatedAt: user.updated_at
          }));
          setUsers(formattedUsers);
        }
      } else {
        showMessageRef.current('error', '오류', result?.error || '사용자 추가에 실패했습니다.', {
          showCancel: false,
          confirmText: '확인'
        });
      }
    } catch (error) {
      console.error('사용자 추가 중 오류 발생:', error);
      showMessageRef.current('error', '오류', '사용자 추가 중 오류가 발생했습니다.', {
        showCancel: false,
        confirmText: '확인'
      });
    }
  }, [setUsers, showMessageRef]);

  // 사용자 상세 정보 저장
  const handleDetailSave = useCallback(async (userData) => {
    try {
      const result = await apiCall(`${API_ENDPOINTS.USERS}/${userData.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(userData)
      });

      if (result && result.success) {
        showMessageRef.current('success', '성공', '사용자 정보가 성공적으로 수정되었습니다.', {
          showCancel: false,
          confirmText: '확인'
        });
        
        // 사용자 목록 새로고침
        const usersResult = await apiCall(API_ENDPOINTS.USERS);
        if (usersResult && usersResult.success) {
          const formattedUsers = usersResult.data.map(user => ({
            id: user.id,
            userId: user.user_id,
            companyName: user.company_name,
            userName: user.user_name,
            email: user.email,
            department: user.department,
            mobilePhone: user.mobile_phone,
            phoneNumber: user.phone_number,
            faxNumber: user.fax_number,
            address: user.address,
            notes: user.notes,
            position: user.manager_position,
            approvalStatus: user.approval_status || (user.is_active ? '승인 완료' : (user.company_type === '탈퇴 사용자' ? '탈퇴' : '승인 예정')),
            companyType: user.company_type,
            pricingPlan: user.pricing_plan,
            startDate: user.start_date,
            endDate: user.end_date,
            msdsLimit: user.msds_limit,
            aiImageLimit: user.ai_image_limit,
            aiReportLimit: user.ai_report_limit,
            businessLicense: user.business_license,
            createdAt: user.created_at,
            updatedAt: user.updated_at
          }));
          setUsers(formattedUsers);
        }
      } else {
        showMessageRef.current('error', '오류', result?.error || '사용자 정보 수정에 실패했습니다.', {
          showCancel: false,
          confirmText: '확인'
        });
      }
    } catch (error) {
      console.error('사용자 정보 수정 중 오류 발생:', error);
      showMessageRef.current('error', '오류', '사용자 정보 수정 중 오류가 발생했습니다.', {
        showCancel: false,
        confirmText: '확인'
      });
    }
  }, [setUsers, showMessageRef]);

  // 사용자 삭제
  const handleDeleteUser = useCallback(async (user) => {
    try {
      const result = await apiCall(`${API_ENDPOINTS.USERS}/${user.id}`, {
        method: 'DELETE'
      });

      if (result && result.success) {
        showMessageRef.current('success', '성공', '사용자가 성공적으로 삭제되었습니다.', {
          showCancel: false,
          confirmText: '확인'
        });
        
        // 사용자 목록 새로고침
        const usersResult = await apiCall(API_ENDPOINTS.USERS);
        if (usersResult && usersResult.success) {
          const formattedUsers = usersResult.data.map(user => ({
            id: user.id,
            userId: user.user_id,
            companyName: user.company_name,
            userName: user.user_name,
            email: user.email,
            department: user.department,
            mobilePhone: user.mobile_phone,
            phoneNumber: user.phone_number,
            faxNumber: user.fax_number,
            address: user.address,
            notes: user.notes,
            position: user.manager_position,
            approvalStatus: user.approval_status || (user.is_active ? '승인 완료' : (user.company_type === '탈퇴 사용자' ? '탈퇴' : '승인 예정')),
            companyType: user.company_type,
            pricingPlan: user.pricing_plan,
            startDate: user.start_date,
            endDate: user.end_date,
            msdsLimit: user.msds_limit,
            aiImageLimit: user.ai_image_limit,
            aiReportLimit: user.ai_report_limit,
            businessLicense: user.business_license,
            createdAt: user.created_at,
            updatedAt: user.updated_at
          }));
          setUsers(formattedUsers);
        }
      } else {
        showMessageRef.current('error', '오류', result?.error || '사용자 삭제에 실패했습니다.', {
          showCancel: false,
          confirmText: '확인'
        });
      }
    } catch (error) {
      console.error('사용자 삭제 중 오류 발생:', error);
      showMessageRef.current('error', '오류', '사용자 삭제 중 오류가 발생했습니다.', {
        showCancel: false,
        confirmText: '확인'
      });
    }
  }, [setUsers, showMessageRef]);

  return {
    handleAddUser,
    handleDetailSave,
    handleDeleteUser
  };
};

export default useUserActions;
