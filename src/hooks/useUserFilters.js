import { useState, useMemo } from 'react';
import { isUserActive } from '../utils/userUtils';

const useUserFilters = (users) => {
  const [searchFilters, setSearchFilters] = useState({
    id: '',
    name: '',
    companyName: ''
  });
  const [activeTab, setActiveTab] = useState('전체');

  // 필터 변경 핸들러
  const handleFilterChange = (field, value) => {
    setSearchFilters(prev => ({
      ...prev,
      [field]: value
    }));
  };

  // 탭 변경 핸들러
  const handleTabChange = (tab) => {
    setActiveTab(tab);
  };

  // 필터링된 사용자 데이터
  const getFilteredUsers = useMemo(() => {
    // users가 배열이 아니면 빈 배열 반환
    if (!Array.isArray(users)) {
      return [];
    }
    
    let filteredUsers = users;

    // 탭별 필터링 (백업 파일의 탭 카운트 로직과 동일하게 수정)
    switch (activeTab) {
      case '무료':
        // 업체 형태와 상관없이 승인 예정 상태인 모든 사용자
        filteredUsers = users.filter(user => 
          user.approvalStatus === '승인 예정'
        );
        break;
      case '컨설팅':
        filteredUsers = users.filter(user => 
          user.companyType === '컨설팅 업체' &&
          user.approvalStatus === '승인 완료'
        );
        break;
      case '일반':
        filteredUsers = users.filter(user => 
          user.companyType === '일반 업체' &&
          isUserActive({
            approvalStatus: user.approvalStatus,
            companyType: user.companyType,
            pricingPlan: user.pricingPlan,
            startDate: user.startDate,
            endDate: user.endDate
          })
        );
        break;
      case '승인':
        // 승인 이력은 companyHistory 데이터를 사용 (users가 아닌)
        filteredUsers = []; // 승인 이력은 별도 처리
        break;
      case '탈퇴':
        filteredUsers = users.filter(user => 
          user.approvalStatus === '탈퇴' && user.companyType === '탈퇴 사용자'
        );
        break;
      default:
        // 전체 탭 - 모든 사용자
        break;
    }

    // 검색 필터 적용
    if (searchFilters.id) {
      filteredUsers = filteredUsers.filter(user => 
        user.userId && user.userId.toLowerCase().includes(searchFilters.id.toLowerCase())
      );
    }
    if (searchFilters.name) {
      filteredUsers = filteredUsers.filter(user => 
        user.userName && user.userName.toLowerCase().includes(searchFilters.name.toLowerCase())
      );
    }
    if (searchFilters.companyName) {
      filteredUsers = filteredUsers.filter(user => 
        user.companyName && user.companyName.toLowerCase().includes(searchFilters.companyName.toLowerCase())
      );
    }

    // 탭별 정렬 적용
    if (activeTab === '컨설팅' || activeTab === '일반') {
      // 종료일이 빠른 순서대로 정렬 (종료일이 없는 경우 맨 뒤로)
      filteredUsers = filteredUsers.sort((a, b) => {
        const dateA = a.endDate ? new Date(a.endDate) : new Date('9999-12-31');
        const dateB = b.endDate ? new Date(b.endDate) : new Date('9999-12-31');
        return dateA - dateB; // 오름차순 (빠른 날짜가 먼저)
      });
    }

    return filteredUsers;
  }, [users, activeTab, searchFilters]);

  return {
    searchFilters,
    setSearchFilters,
    activeTab,
    setActiveTab,
    handleFilterChange,
    handleTabChange,
    getFilteredUsers
  };
};

export default useUserFilters;
