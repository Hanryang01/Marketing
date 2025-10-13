import React, { useState, useEffect } from 'react';
import './UserStatus.css';
import { apiCall, API_ENDPOINTS } from '../config/api';
import { isUserActive } from '../utils/userUtils';
import { useCalendar } from '../hooks/useCalendar';

// 분리된 차트 컴포넌트들
import MonthlyActiveCompaniesChart from './charts/MonthlyActiveCompaniesChart';
import MonthlyNewUsersChart from './charts/MonthlyNewUsersChart';
import CompanyTypeUsersChart from './charts/CompanyTypeUsersChart';
import MonthlyActiveTable from './charts/MonthlyActiveTable';


const UserStatus = () => {
  const [loading, setLoading] = useState(true);
  const [userStats, setUserStats] = useState({
    totalUsers: 0,
    paidUsers: 0,
    consultingUsers: 0,
    generalUsers: 0,
    approvedUsers: 0,
    pendingUsers: 0,
    thisMonthNewUsers: 0,
    thisMonthExpiredUsers: 0
  });
  
  // useCalendar 훅 사용
  const { getKoreaYearMonth } = useCalendar();
  
  // isCurrentKoreaYearMonth 함수를 직접 구현하여 무한 루프 방지
  const isCurrentKoreaYearMonth = (dateValue) => {
    if (!dateValue) return false;
    
    try {
      const dateObj = new Date(dateValue);
      if (isNaN(dateObj.getTime())) return false;
      
      const current = new Date();
      return dateObj.getFullYear() === current.getFullYear() && 
             dateObj.getMonth() === current.getMonth();
    } catch (error) {
      console.error('날짜 비교 오류:', error);
      return false;
    }
  };
  const currentKorea = getKoreaYearMonth();
  const [selectedYear, setSelectedYear] = useState(currentKorea.year);
  
  const [monthlyActiveCompanies, setMonthlyActiveCompanies] = useState([]);
  const [monthlyActiveTableData, setMonthlyActiveTableData] = useState({
    consulting: Array(12).fill(0),
    general: Array(12).fill(0),
    total: Array(12).fill(0)
  });
  const [monthlyNewUsers, setMonthlyNewUsers] = useState([]);




  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      
      try {
        // 사용자 통계 데이터
      const usersResult = await apiCall(API_ENDPOINTS.USERS);
        let users = [];
        if (usersResult.success) {
          users = usersResult.data;
          
          const paidUsers = users.filter(user => 
        user.approval_status === '승인 완료' && user.pricing_plan !== '무료'
      );
      const consultingUsers = users.filter(user => 
        user.company_type === '컨설팅 업체' &&
        user.approval_status === '승인 완료' &&
        user.pricing_plan !== '무료' &&
        isUserActive({
          approvalStatus: user.approval_status,
          companyType: user.company_type,
          pricingPlan: user.pricing_plan,
          startDate: user.start_date,
          endDate: user.end_date
        })
      );
      const generalUsers = users.filter(user => 
        user.company_type === '일반 업체' &&
        user.approval_status === '승인 완료' &&
        user.pricing_plan !== '무료' &&
        isUserActive({
          approvalStatus: user.approval_status,
          companyType: user.company_type,
          pricingPlan: user.pricing_plan,
          startDate: user.start_date,
          endDate: user.end_date
        })
      );
      const approvedUsers = users.filter(user => user.approval_status === '승인 완료');
      const pendingUsers = users.filter(user => user.approval_status === '승인 예정');
      
      const thisMonthNewUsers = users.filter(user => {
            if (!user.start_date) return false;
        return isCurrentKoreaYearMonth(user.start_date);
      }).length;

      const thisMonthExpiredUsers = users.filter(user => {
        if ((user.approval_status !== '승인 완료' && user.approval_status !== '승인 예정') || !user.end_date) return false;
        return isCurrentKoreaYearMonth(user.end_date);
      }).length;
      
          setUserStats({
        totalUsers: users.length,
            paidUsers: paidUsers.length,
        consultingUsers: consultingUsers.length,
        generalUsers: generalUsers.length,
        approvedUsers: approvedUsers.length,
        pendingUsers: pendingUsers.length,
        thisMonthNewUsers: thisMonthNewUsers,
            thisMonthExpiredUsers: thisMonthExpiredUsers
          });
        }

        // 히스토리 데이터 가져오기
        const historyResult = await apiCall(API_ENDPOINTS.COMPANY_HISTORY);
        const historyData = historyResult.success ? historyResult.data : [];
        
        // 월별 활성화 업체 수 (프론트엔드에서 직접 계산)
        const monthlyActiveCompaniesData = [];
        const consultingData = Array(12).fill(0);
        const generalData = Array(12).fill(0);
        const totalData = Array(12).fill(0);
        
        for (let month = 1; month <= 12; month++) {
          const monthDate = `${selectedYear}-${month.toString().padStart(2, '0')}-01`;
          
          // 현재 활성화된 업체들 (users 테이블)
          const activeUsers = users.filter(user => {
            if (user.approval_status !== '승인 완료' || user.pricing_plan === '무료') return false;
            if (!user.start_date || !user.end_date) return false;
            
            const startDate = new Date(user.start_date);
            const endDate = new Date(user.end_date);
            const targetDate = new Date(monthDate);
            
            return startDate <= targetDate && endDate >= targetDate;
          });
          
          // 히스토리 활성화된 업체들 (company_history 테이블)
          const activeHistory = historyData.filter(history => {
            if (history.status_type !== '승인 완료' || history.pricing_plan === '무료') return false;
            if (!history.start_date || !history.end_date) return false;
            
            const startDate = new Date(history.start_date);
            const endDate = new Date(history.end_date);
            const targetDate = new Date(monthDate);
            
            return startDate <= targetDate && endDate >= targetDate;
          });
          
          // 업체 형태별 계산 (현재 + 히스토리)
          const consultingCount = activeUsers.filter(user => user.company_type === '컨설팅 업체').length +
                                 activeHistory.filter(history => history.company_type === '컨설팅 업체').length;
          const generalCount = activeUsers.filter(user => user.company_type === '일반 업체').length +
                              activeHistory.filter(history => history.company_type === '일반 업체').length;
          const totalCount = consultingCount + generalCount;
          
          monthlyActiveCompaniesData.push({
            month: month,
            totalActive: totalCount
          });
          
          // 표용 데이터
          const monthIndex = month - 1;
          consultingData[monthIndex] = consultingCount;
          generalData[monthIndex] = generalCount;
          totalData[monthIndex] = totalCount;
        }
        
        setMonthlyActiveCompanies(monthlyActiveCompaniesData);
          setMonthlyActiveTableData({
            consulting: consultingData,
            general: generalData,
            total: totalData
          });

        // 월별 신규 가입자 수 (프론트엔드에서 직접 계산)
        const monthlyNewUsersData = [];
        for (let month = 1; month <= 12; month++) {
          const monthUsers = users.filter(user => {
            if (!user.start_date) return false;
            // 요금제가 무료인 업체는 카운팅에서 제외
            if (user.pricing_plan === '무료') return false;
            const userDate = new Date(user.start_date);
            return userDate.getFullYear() === selectedYear && userDate.getMonth() + 1 === month;
          });
          
          monthlyNewUsersData.push({
            month: month,
            newUsers: monthUsers.length
          });
        }
        setMonthlyNewUsers(monthlyNewUsersData);
      } catch (error) {
        console.error('데이터 로드 오류:', error);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [selectedYear]);

  // 연도 변경 핸들러
  const handleYearChange = (newYear) => {
    setSelectedYear(newYear);
  };







  if (loading) {
    return (
      <div className="user-status-container">
        <div className="loading">로딩 중...</div>
      </div>
    );
  }

  return (
    <div className="user-status-container">
      <div className="user-status-header">
        <h1>사용자 상세 현황</h1>
      </div>

      {/* 메인 콘텐츠 영역 - 좌측 카드, 우측 그래프 */}
      <div className="user-status-main-content">
        {/* 좌측 카드 영역 */}
        <div className="user-status-cards-section">
          <div className="user-status-grid">
            <div className="stat-card total">
              <h3>전체 사용자</h3>
              <div className="stat-number">{userStats.totalUsers}</div>
            </div>

            <div className="stat-card free">
              <h3>유료 사용자</h3>
              <div className="stat-number">{userStats.paidUsers}</div>
            </div>

            <div className="stat-card consulting">
              <h3>컨설팅 업체 (유료) </h3>
              <div className="stat-number">{userStats.consultingUsers}</div>
            </div>

            <div className="stat-card general">
              <h3>일반 업체 (유료) </h3>
              <div className="stat-number">{userStats.generalUsers}</div>
            </div>

            <div className="stat-card new-users">
              <h3>이번달 가입 사용자 (유료) </h3>
              <div className="stat-number">{userStats.thisMonthNewUsers}</div>
            </div>

            <div className="stat-card expired-users">
              <h3>이번달 기간 종료 사용자 (유료) </h3>
              <div className="stat-number">{userStats.thisMonthExpiredUsers}</div>
            </div>
          </div>
        </div>

        {/* 우측 그래프 영역 */}
        <div className="user-status-charts-section">
          <CompanyTypeUsersChart 
            consultingUsers={userStats.consultingUsers}
            generalUsers={userStats.generalUsers}
          />
        </div>
      </div>

      {/* 월별 활성화 업체 수 그래프 */}
      <MonthlyActiveCompaniesChart 
        data={monthlyActiveCompanies}
        selectedYear={selectedYear}
        onYearChange={handleYearChange}
      />

      {/* 월별 활성화 업체 수 표 */}
      <MonthlyActiveTable 
        data={monthlyActiveTableData}
        selectedYear={selectedYear}
        onYearChange={handleYearChange}
      />

      {/* 월별 신규 가입자 수 그래프 */}
      <MonthlyNewUsersChart 
        data={monthlyNewUsers}
        selectedYear={selectedYear}
        onYearChange={handleYearChange}
      />
    </div>
  );
};

export default UserStatus;
