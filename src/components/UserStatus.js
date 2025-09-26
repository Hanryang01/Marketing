import React, { useState, useEffect, useCallback, useMemo } from 'react';
import './UserStatus.css';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js';
import ChartDataLabels from 'chartjs-plugin-datalabels';
import { Bar } from 'react-chartjs-2';
import { isUserActive } from '../utils/userUtils';
import { useCalendar } from '../hooks/useCalendar';

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ChartDataLabels
);

const UserStatus = () => {
  const [loading, setLoading] = useState(true);
  const [userStats, setUserStats] = useState({
    totalUsers: 0,
    freeUsers: 0,
    consultingUsers: 0,
    generalUsers: 0,
    approvedUsers: 0,
    pendingUsers: 0,
    approvalHistoryCount: 0,
    thisMonthNewUsers: 0,
    thisMonthExpiredUsers: 0
  });
  
  // useCalendar 훅 사용
  const { getKoreaYearMonth, isCurrentKoreaYearMonth } = useCalendar();
  const currentKorea = getKoreaYearMonth();
  const [selectedYear, setSelectedYear] = useState(currentKorea.year);
  const [monthlyActiveCompanies, setMonthlyActiveCompanies] = useState([]);
  const [monthlyActiveTableData, setMonthlyActiveTableData] = useState({
    consulting: Array(12).fill(0),
    general: Array(12).fill(0),
    total: Array(12).fill(0)
  });

  // 월별 활성화 업체 수 데이터 가져오기 (그래프용)
  const loadMonthlyActiveCompanies = useCallback(async () => {
    try {
      const response = await fetch(`http://localhost:3001/api/revenue?type=monthly-active-companies&year=${selectedYear}`);
      const result = await response.json();
      
      if (result.success) {
        setMonthlyActiveCompanies(result.data.monthlyData);
      } else {
        console.error('월별 활성화 업체 수 데이터 로드 실패:', result.error);
        setMonthlyActiveCompanies([]);
      }
    } catch (error) {
      console.error('월별 활성화 업체 수 데이터 로드 오류:', error);
      setMonthlyActiveCompanies([]);
    }
  }, [selectedYear]);

  // 월별 활성화 업체 수 데이터 가져오기 (표용 - 업체 형태별 구분)
  const loadMonthlyActiveTableData = useCallback(async () => {
    try {
      const response = await fetch(`http://localhost:3001/api/revenue?type=monthly-active-companies-by-type&year=${selectedYear}`);
      const result = await response.json();
      
      if (result.success) {
        const monthlyData = result.data.monthlyData;
        const consultingData = Array(12).fill(0);
        const generalData = Array(12).fill(0);
        const totalData = Array(12).fill(0);
        
        monthlyData.forEach(item => {
          const monthIndex = item.month - 1; // 0-based index
          consultingData[monthIndex] = item.consultingActive || 0;
          generalData[monthIndex] = item.generalActive || 0;
          totalData[monthIndex] = item.totalActive || 0;
        });
        
        setMonthlyActiveTableData({
          consulting: consultingData,
          general: generalData,
          total: totalData
        });
      } else {
        console.error('월별 활성화 업체 수 표 데이터 로드 실패:', result.error);
        setMonthlyActiveTableData({
          consulting: Array(12).fill(0),
          general: Array(12).fill(0),
          total: Array(12).fill(0)
        });
      }
    } catch (error) {
      console.error('월별 활성화 업체 수 표 데이터 로드 오류:', error);
      setMonthlyActiveTableData({
        consulting: Array(12).fill(0),
        general: Array(12).fill(0),
        total: Array(12).fill(0)
      });
    }
  }, [selectedYear]);

  const fetchUserStats = useCallback(async () => {
    try {
      setLoading(true);
      
      // 사용자 데이터만 가져오기
      const usersResponse = await fetch('http://localhost:3001/api/users');
      const usersResult = await usersResponse.json();
      
      if (!usersResult.success) {
        throw new Error(usersResult.error || '사용자 API 호출 실패');
      }
      
      const users = usersResult.data;
      
      
      // 공통 isUserActive 함수 사용 (import된 함수)
      
      // 사용자 통계 계산 (사용자 관리 페이지 탭 조건과 동일)
      // 서버에서 반환하는 실제 필드명 사용
      const freeUsers = users.filter(user => 
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
      
      // 승인 이력 개수는 별도로 계산하지 않음 (무한 루프 방지)
      const approvalHistoryCount = 0;
      
      // 이번달 가입 사용자 수 계산 (승인 완료 + 시작일이 이번달인 사용자)
      const thisMonthNewUsers = users.filter(user => {
        if (user.approval_status !== '승인 완료' || !user.start_date) return false;
        
        // 한국 시간대 기준으로 현재 년월과 같은지 확인
        return isCurrentKoreaYearMonth(user.start_date);
      }).length;

      // 이번달 기간 종료 사용자 수 계산 (승인 완료 또는 승인 예정 + 종료일이 이번달인 사용자)
      const thisMonthExpiredUsers = users.filter(user => {
        if ((user.approval_status !== '승인 완료' && user.approval_status !== '승인 예정') || !user.end_date) return false;
        
        // 한국 시간대 기준으로 현재 년월과 같은지 확인
        return isCurrentKoreaYearMonth(user.end_date);
      }).length;
      
      
      // 업체 형태별 가입자 수 계산 (승인 완료 + 요금제가 무료가 아닌 사용자)
      const consultingPaidUsers = users.filter(user => 
        user.company_type === '컨설팅 업체' && 
        user.approval_status === '승인 완료' && 
        user.pricing_plan !== '무료'
      ).length;
      
      const generalPaidUsers = users.filter(user => 
        user.company_type === '일반 업체' && 
        user.approval_status === '승인 완료' && 
        user.pricing_plan !== '무료'
      ).length;
      
      const stats = {
        totalUsers: users.length,
        freeUsers: freeUsers.length,
        consultingUsers: consultingUsers.length,
        generalUsers: generalUsers.length,
        approvedUsers: approvedUsers.length,
        pendingUsers: pendingUsers.length,
        approvalHistoryCount: approvalHistoryCount,
        thisMonthNewUsers: thisMonthNewUsers,
        thisMonthExpiredUsers: thisMonthExpiredUsers,
        consultingPaidUsers: consultingPaidUsers,
        generalPaidUsers: generalPaidUsers
      };
      
      setUserStats(stats);
    } catch (error) {
      console.error('사용자 통계 조회 실패:', error);
    } finally {
      setLoading(false);
    }
  }, [isCurrentKoreaYearMonth]);

  useEffect(() => {
    fetchUserStats();
    loadMonthlyActiveCompanies();
    loadMonthlyActiveTableData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedYear]);

  // 연도 변경 핸들러
  const handleYearChange = (newYear) => {
    setSelectedYear(newYear);
  };


  // 월별 활성화 업체 수 그래프 데이터 (단순 막대 차트)
  const monthlyActiveCompaniesChartData = useMemo(() => {
    return {
      labels: monthlyActiveCompanies && monthlyActiveCompanies.length > 0 
        ? monthlyActiveCompanies.map(item => `${item.month}월`)
        : ['1월', '2월', '3월', '4월', '5월', '6월', '7월', '8월', '9월', '10월', '11월', '12월'],
      datasets: [
        {
          type: 'bar',
          label: '활성화 업체 수',
          data: monthlyActiveCompanies && monthlyActiveCompanies.length > 0 
            ? monthlyActiveCompanies.map(item => item.totalActive || 0)
            : Array(12).fill(0),
          backgroundColor: 'rgba(75, 192, 192, 0.8)',
          borderColor: 'rgba(75, 192, 192, 1)',
          borderWidth: 1,
          borderRadius: 4,
          cornerRadius: 4,
          datalabels: {
            display: true,
            color: '#333',
            font: {
              weight: 'bold',
              size: 12
            },
            formatter: function(value) {
              return value > 0 ? value + '개' : '';
            },
            anchor: 'end',
            align: 'top',
            offset: 2
          }
        }
      ]
    };
  }, [monthlyActiveCompanies]);

  // 업체 형태별 가입자 수 그래프 데이터
  const companyTypeUsersChartData = useMemo(() => {
    return {
      labels: ['컨설팅 업체', '일반 업체'],
      datasets: [
        {
          label: '가입자 수',
          data: [
            userStats.consultingPaidUsers || 0,
            userStats.generalPaidUsers || 0
          ],
          backgroundColor: [
            'rgba(54, 162, 235, 0.8)',
            'rgba(255, 99, 132, 0.8)',
          ],
          borderColor: [
            'rgba(54, 162, 235, 1)',
            'rgba(255, 99, 132, 1)',
          ],
          borderWidth: 1,
          datalabels: {
            display: true,
            color: '#333',
            font: {
              weight: 'bold',
              size: 12
            },
            formatter: function(value) {
              return value > 0 ? value + '명' : '';
            },
            anchor: 'end',
            align: 'top',
            offset: 4
          }
        },
      ],
    };
  }, [userStats.consultingPaidUsers, userStats.generalPaidUsers]);

  // 업체 형태별 가입자 수 그래프 옵션
  const companyTypeUsersChartOptions = useMemo(() => ({
    responsive: true,
    maintainAspectRatio: false,
    elements: {
      bar: {
        borderRadius: 4
      }
    },
    categoryPercentage: 0.6, // 카테고리(업체 형태) 범위에서 막대가 차지하는 비율 (60%)
    barPercentage: 0.9, // 카테고리 내에서 막대가 차지하는 비율 (90%)
    plugins: {
      legend: {
        display: false,
      }
    },
    tooltip: {
      enabled: false,
      mode: null,
      intersect: false,
      events: []
    },
    hover: {
      mode: null,
      animationDuration: 0,
      intersect: false,
      events: []
    },
    scales: {
      y: {
        beginAtZero: true,
        ticks: {
          callback: function(value) {
            return value + '명';
          }
        }
      }
    },
    layout: {
      padding: {
        top: 30,
        right: 20,
        bottom: 20,
        left: 20
      }
    }
  }), []);

  // 월별 활성화 업체 수 그래프 옵션 (막대 차트)
  const monthlyActiveCompaniesChartOptions = useMemo(() => ({
    responsive: true,
    maintainAspectRatio: false,
    elements: {
      bar: {
        borderRadius: 4
      }
    },
    categoryPercentage: 0.6, // 카테고리(월) 범위에서 막대가 차지하는 비율 (60%)
    barPercentage: 0.9, // 카테고리 내에서 막대가 차지하는 비율 (90%)
    plugins: {
      legend: {
        display: true,
        position: 'top',
        align: 'start',
        labels: {
          usePointStyle: true,
          padding: 20,
          font: {
            size: 12,
            weight: 'bold'
          }
        },
        margin: {
          top: 20,
          bottom: 40
        }
      },
      layout: {
        padding: {
          top: 30,
          right: 20,
          bottom: 20,
          left: 20
        }
      },
      datalabels: {
        display: true,
        color: '#333',
        font: {
          weight: 'bold',
          size: 11
        },
        formatter: function(value) {
          return value > 0 ? value + '개' : '';
        },
        anchor: 'end',
        align: 'top',
        offset: 4
      }
    },
    scales: {
      x: {
        display: true,
        title: {
          display: false
        },
        grid: {
          display: false
        },
        ticks: {
          font: {
            size: 11,
            weight: 'bold'
          },
          color: '#666'
        }
      },
      y: {
        display: true,
        title: {
          display: false
        },
        grid: {
          display: true,
          color: 'rgba(0, 0, 0, 0.1)'
        },
        ticks: {
          font: {
            size: 11,
            weight: 'bold'
          },
          color: '#666',
          stepSize: 1,
          callback: function(value) {
            return value + '개';
          }
        },
        beginAtZero: true
      }
    }
  }), []);

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
              <div className="stat-number">{userStats.freeUsers}</div>
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
          <div className="company-type-users-chart-container">
            <h3>업체 형태별 가입자 수</h3>
            <Bar data={companyTypeUsersChartData} options={companyTypeUsersChartOptions} />
          </div>
        </div>
      </div>

      {/* 월별 활성화 업체 수 그래프 */}
      <div className="monthly-active-companies-chart-container">
        <div className="monthly-chart-header">
          <h3>월별 활성화 업체 수</h3>
          <div className="monthly-year-selector">
            <label>연도 선택:</label>
            <select 
              value={selectedYear} 
              onChange={(e) => handleYearChange(parseInt(e.target.value))}
            >
              {Array.from({ length: 6 }, (_, i) => 2029 - i).map(year => (
                <option key={year} value={year}>{year}년</option>
              ))}
            </select>
          </div>
        </div>
        <Bar data={monthlyActiveCompaniesChartData} options={monthlyActiveCompaniesChartOptions} />
      </div>

      {/* 월별 활성화 업체 수 표 */}
      <div className="monthly-active-table-container">
        <div className="monthly-active-table-header">
          <h3>월별 활성화 업체 수 (표)</h3>
          <div className="year-selector">
            <label htmlFor="year-select">연도 선택:</label>
            <select 
              id="year-select" 
              value={selectedYear} 
              onChange={(e) => handleYearChange(parseInt(e.target.value))}
              className="year-select"
            >
              {Array.from({ length: 5 }, (_, i) => {
                const year = new Date().getFullYear() - 2 + i;
                return (
                  <option key={year} value={year}>
                    {year}년
                  </option>
                );
              })}
            </select>
          </div>
        </div>
        
        <div className="monthly-active-table-wrapper">
          <table className="monthly-active-table">
            <thead>
              <tr>
                <th className="category-header">구분</th>
                {Array.from({ length: 12 }, (_, i) => (
                  <th key={i} className="month-header">
                    {i + 1}월
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              <tr>
                <td className="category-cell">컨설팅 업체</td>
                {monthlyActiveTableData.consulting.map((count, index) => (
                  <td key={index} className="data-cell">
                    {count}
                  </td>
                ))}
              </tr>
              <tr>
                <td className="category-cell">일반 업체</td>
                {monthlyActiveTableData.general.map((count, index) => (
                  <td key={index} className="data-cell">
                    {count}
                  </td>
                ))}
              </tr>
              <tr className="total-row">
                <td className="category-cell total-label">합계</td>
                {monthlyActiveTableData.total.map((count, index) => (
                  <td key={index} className="data-cell total-data">
                    {count}
                  </td>
                ))}
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default UserStatus;
