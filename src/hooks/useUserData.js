import { useState, useEffect, useCallback } from 'react';
import { apiCall, API_ENDPOINTS } from '../config/api';

const useUserData = () => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [companyHistory, setCompanyHistory] = useState([]);

  // 사용자 목록 로드
  const loadUsers = useCallback(async () => {
    try {
      setLoading(true);
      const result = await apiCall(API_ENDPOINTS.USERS);
      
      if (result && result.success && Array.isArray(result.data)) {
        const formattedUsers = result.data.map(user => {
          const formattedUser = {
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
            // 회계 관련 필드들 추가
            accountantName: user.accountant_name,
            accountantPosition: user.accountant_position,
            accountantMobile: user.accountant_mobile,
            accountantEmail: user.accountant_email,
            accountInfo: user.account_info,
            representative: user.representative,
            industry: user.industry,
            createdAt: user.created_at,
            updatedAt: user.updated_at
          };
          
          
          return formattedUser;
        });
        
        setUsers(formattedUsers);
      }
    } catch (error) {
      console.error('사용자 데이터 로드 중 오류 발생:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  // 승인 이력 데이터 로드
  const fetchCompanyHistory = useCallback(async () => {
    try {
      const result = await apiCall(API_ENDPOINTS.COMPANY_HISTORY_LIST, {
        headers: {
          'Content-Type': 'application/json',
        }
      });
      
      if (result && result.success && result.data && result.data.history && Array.isArray(result.data.history)) {
        // 종료일이 늦은 순서대로 정렬
        const sortedHistory = result.data.history.sort((a, b) => {
          const dateA = a.end_date ? new Date(a.end_date) : new Date('1900-01-01');
          const dateB = b.end_date ? new Date(b.end_date) : new Date('1900-01-01');
          return dateB - dateA; // 내림차순 (늦은 날짜가 먼저)
        });
        setCompanyHistory(sortedHistory);
      } else {
        console.error('승인 이력 데이터 형식 오류:', result);
        setCompanyHistory([]);
      }
    } catch (error) {
      console.error('승인 이력 데이터 로드 중 오류 발생:', error);
      setCompanyHistory([]);
    }
  }, []);

  // 컴포넌트 마운트 시 데이터 로드
  useEffect(() => {
    loadUsers();
    fetchCompanyHistory();
  }, [loadUsers, fetchCompanyHistory]); // ESLint 경고 해결

  return {
    users,
    setUsers,
    loading,
    setLoading,
    companyHistory,
    setCompanyHistory,
    loadUsers,
    fetchCompanyHistory
  };
};

export default useUserData;
