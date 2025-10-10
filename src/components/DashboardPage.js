import React, { useState, useEffect } from 'react';
import './DashboardPage.css';
import { apiCall } from '../config/api';
import { transformUserData, transformRevenueData, calculateUserStats, calculateRevenueStats } from '../utils/dashboardUtils';

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

  const fetchDashboardStats = async () => {
    try {
      setLoading(true);
      
      // 사용자 데이터 가져오기
      const usersResult = await apiCall('/api/users');
      let users = [];
      if (usersResult && usersResult.success && Array.isArray(usersResult.data)) {
        users = transformUserData(usersResult.data);
      }

      // 매출 데이터 가져오기
      let revenueResult;
      try {
        revenueResult = await apiCall('/api/revenue');
      } catch (error) {
        console.error('매출 데이터 API 호출 실패:', error);
        revenueResult = null;
      }
      
      let revenueData = [];
      if (revenueResult && revenueResult.success && Array.isArray(revenueResult.data)) {
        revenueData = transformRevenueData(revenueResult.data);
      }

      // 통계 계산
      const userStats = calculateUserStats(users);
      const revenueStats = calculateRevenueStats(revenueData);
      
      setStats({
        ...userStats,
        ...revenueStats
      });

    } catch (error) {
      console.error('대시보드 통계 가져오기 실패:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardStats();
  }, []);

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
