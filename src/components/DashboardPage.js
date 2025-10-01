import React, { useState, useEffect, useCallback } from 'react';
import './DashboardPage.css';

const DashboardPage = () => {
  const [stats, setStats] = useState({
    totalUsers: 0,
    pendingUsers: 0,
    approvedUsers: 0,
    totalFreeUsers: 0,
    consultingUsers: 0,
    generalUsers: 0,
    withdrawnUsers: 0,
    totalRevenue: 0,
    consultingRevenue: 0,
    generalRevenue: 0,
    otherRevenue: 0
  });
  const [loading, setLoading] = useState(true);

  // API 호출 함수들
  const apiCall = async (url, options = {}) => {
    try {
      // 프록시 설정이 작동하지 않으므로 직접 백엔드 URL 사용
      const fullUrl = url.startsWith('http') ? url : `${process.env.REACT_APP_API_BASE_URL || 'http://localhost:3003'}${url}`;
            const response = await fetch(fullUrl, {
        headers: {
          'Content-Type': 'application/json',
          ...options.headers,
        },
        ...options,
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      return await response.json();
    } catch (error) {
      throw error;
    }
  };

  const fetchDashboardStats = useCallback(async () => {
    try {
      setLoading(true);
      
      // 사용자 데이터 가져오기
      const usersResult = await apiCall('/api/users');
      let users = [];
      if (usersResult && usersResult.success && Array.isArray(usersResult.data)) {
        // DB 데이터를 프론트엔드 형식으로 변환
        users = usersResult.data.map(user => ({
          id: user.id,
          companyName: user.company_name,
          userId: user.user_id,
          userName: user.user_name || user.user_id,
          email: user.email,
          companyType: user.company_type,
                     registrationDate: user.registration_date,
           endDate: user.end_date,
           department: user.department || '',
           mobilePhone: user.mobile_phone || '',
           startDate: user.start_date || user.registration_date || '',
          msdsUsage: { current: 0, total: user.msds_limit || 0 },
          aiImageUsage: { current: 0, total: user.ai_image_limit || 0 },
          aiReportUsage: { current: 0, total: user.ai_report_limit || 0 },
          businessLicense: user.business_license || '',
          phoneNumber: user.phone_number || '',
          faxNumber: user.fax_number || '',
          address: user.address || '',
          notes: user.notes || '',
            position: user.manager_position || '',
          approvalStatus: user.approval_status || (user.is_active ? '승인 완료' : (user.company_type === '탈퇴 사용자' ? '탈퇴' : '승인 예정'))
        }));
        // setUsers(users); // 사용되지 않는 변수 제거
      }

      // 매출 데이터 가져오기
      const revenueResult = await apiCall('/api/revenue');
      let revenueData = [];
      if (revenueResult && revenueResult.success && Array.isArray(revenueResult.data)) {
        // DB 데이터를 프론트엔드 형식으로 변환 (snake_case → camelCase)
        revenueData = revenueResult.data.map(revenue => ({
          id: revenue.id,
          issueDate: revenue.issue_date,
          companyName: revenue.company_name,
          businessLicense: revenue.business_license,
          paymentDate: revenue.payment_date || '', // null이면 빈 문자열로 변환
          paymentMethod: revenue.payment_method,
          companyType: revenue.company_type, // userPermission 대신 companyType 사용
          item: revenue.item,
          supplyAmount: Number(revenue.supply_amount) || 0, // 명시적으로 숫자로 변환
          vat: Number(revenue.vat) || 0,                   // 명시적으로 숫자로 변환
          totalAmount: Number(revenue.total_amount) || 0,   // 명시적으로 숫자로 변환
          createdAt: revenue.created_at,
          updatedAt: revenue.updated_at
        }));
      }

      // 통계 계산
      const totalUsers = users.length;
      const pendingUsers = users.filter(user => user.approvalStatus === '승인 예정').length;
      const approvedUsers = users.filter(user => user.approvalStatus === '승인 완료').length;
      
      // 공통 isUserActive 함수 사용 (import된 함수) - 활성화 업체 수 계산에 사용됨

      // 무료 사용자 계산 (무료 탭과 동일한 조건)
      const totalFreeUsers = users.filter(user => 
        // 업체 형태와 상관없이 승인 예정 상태인 모든 사용자
        user.approvalStatus === '승인 예정'
      ).length;
      
      // 컨설팅 업체 (무료 요금제 포함)
      const consultingUsers = users.filter(user => 
        user.companyType === '컨설팅 업체' &&
        user.approvalStatus === '승인 완료'
      ).length;
      
      // 일반 업체 (무료 요금제 포함)
      const generalUsers = users.filter(user => 
        user.companyType === '일반 업체' &&
        user.approvalStatus === '승인 완료'
      ).length;
      
      // 탈퇴 사용자 (업체 형태가 '탈퇴 사용자'인 사용자)
      const withdrawnUsers = users.filter(user => 
        user.companyType === '탈퇴 사용자'
      ).length;
      
      const totalRevenue = revenueData.reduce((sum, item) => sum + (item.supplyAmount || 0), 0);
      
      // 업체 형태별 매출 계산 (공급가액 기준)
      const consultingRevenue = revenueData
        .filter(item => item.companyType === '컨설팅 업체')
        .reduce((sum, item) => sum + (item.supplyAmount || 0), 0);
      
      const generalRevenue = revenueData
        .filter(item => item.companyType === '일반 업체')
        .reduce((sum, item) => sum + (item.supplyAmount || 0), 0);
      
      const otherRevenue = revenueData
        .filter(item => item.companyType === '기타')
        .reduce((sum, item) => sum + (item.supplyAmount || 0), 0);
      
      setStats({
        totalUsers,
        pendingUsers,
        approvedUsers,
        totalFreeUsers,
        consultingUsers,
        generalUsers,
        withdrawnUsers,
        totalRevenue,
        consultingRevenue,
        generalRevenue,
        otherRevenue
      });

    } catch (error) {
      // 대시보드 통계 가져오기 실패
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchDashboardStats();
  }, [fetchDashboardStats]);

  if (loading) {
    return <div className="loading">로딩 중...</div>;
  }

  return (
    <div className="dashboard-page">

             {/* 윗부분 - 사용자 현황 */}
       <div className="dashboard-section user-stats-section">
         <h2>사용자 현황</h2>
                  <div className="stats-grid user-stats-grid">
           <div className="stat-card">
             <div className="stat-content">
               <div className="stat-title-row">
                 <div className="stat-icon">📊</div>
                 <h3>전체 사용자</h3>
               </div>
               <p className="stat-number">{stats.totalUsers.toLocaleString()}개</p>
             </div>
           </div>

           <div className="stat-card">
             <div className="stat-content">
               <div className="stat-title-row">
                 <div className="stat-icon">👤</div>
                 <h3>무료 사용자</h3>
               </div>
               <p className="stat-number">
                 {stats.totalFreeUsers}개
               </p>
             </div>
           </div>

           <div className="stat-card">
             <div className="stat-content">
               <div className="stat-title-row">
                 <div className="stat-icon">🏢</div>
                 <h3>컨설팅 업체</h3>
               </div>
               <p className="stat-number">
                 {stats.consultingUsers}개
               </p>
             </div>
           </div>

           <div className="stat-card">
             <div className="stat-content">
               <div className="stat-title-row">
                 <div className="stat-icon">🏭</div>
                 <h3>일반 업체</h3>
               </div>
               <p className="stat-number">
                 {stats.generalUsers}개
               </p>
             </div>
           </div>

           <div className="stat-card">
             <div className="stat-content">
               <div className="stat-title-row">
                 <div className="stat-icon">🚪</div>
                 <h3>탈퇴 사용자</h3>
               </div>
               <p className="stat-number">
                 {stats.withdrawnUsers}개
               </p>
             </div>
           </div>

         </div>
       </div>

       {/* 매출 현황 - 별도 독립 컨테이너 */}
       <div className="dashboard-section revenue-stats-section">
         <h2>매출 현황</h2>
         
         {/* 매출 통계 카드 */}
         <div className="stats-grid revenue-stats-grid">
           <div className="stat-card">
             <div className="stat-content">
               <div className="stat-title-row">
                 <div className="stat-icon">💰</div>
                 <h3>총 매출</h3>
               </div>
               <p className="stat-number">{stats.totalRevenue.toLocaleString()}원</p>
             </div>
           </div>

           <div className="stat-card">
             <div className="stat-content">
               <div className="stat-title-row">
                 <div className="stat-icon">🏢</div>
                 <h3>컨설팅 업체</h3>
               </div>
               <p className="stat-number">{stats.consultingRevenue.toLocaleString()}원</p>
             </div>
           </div>

           <div className="stat-card">
             <div className="stat-content">
               <div className="stat-title-row">
                 <div className="stat-icon">🏭</div>
                 <h3>일반 업체</h3>
               </div>
               <p className="stat-number">{stats.generalRevenue.toLocaleString()}원</p>
             </div>
           </div>

           <div className="stat-card">
             <div className="stat-content">
               <div className="stat-title-row">
                 <div className="stat-icon">📊</div>
                 <h3>기타 (용역 등)</h3>
               </div>
               <p className="stat-number">{stats.otherRevenue.toLocaleString()}원</p>
             </div>
           </div>
         </div>
       </div>
    </div>
  );
};

export default DashboardPage;
