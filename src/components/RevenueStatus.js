import React, { useState, useEffect, useCallback, useMemo } from 'react';
import './RevenueStatus.css';
import { apiCall, API_ENDPOINTS } from '../config/api';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement,
  PointElement,
  LineElement,
  Filler,
} from 'chart.js';
import ChartDataLabels from 'chartjs-plugin-datalabels';
import { Bar, Doughnut } from 'react-chartjs-2';
import { useCalendar } from '../hooks/useCalendar';
import { useCurrentMonth } from '../hooks/useCurrentMonth';

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement,
  PointElement,
  LineElement,
  Filler,
  ChartDataLabels
);

const RevenueStatus = () => {
  const [revenueList, setRevenueList] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // useCalendar 훅 사용
  const { getKoreaYearMonth, isCurrentKoreaYearMonth } = useCalendar();
  const currentKorea = getKoreaYearMonth();
  const [selectedYear, setSelectedYear] = useState(currentKorea.year);
  
  // 현재 월 강조 훅 사용
  const { 
    isCurrentMonth, 
    applyCurrentMonthHighlight
  } = useCurrentMonth();
  const [monthlyRevenueTableData, setMonthlyRevenueTableData] = useState({
    consulting: Array(12).fill(0),
    general: Array(12).fill(0),
    other: Array(12).fill(0),
    total: Array(12).fill(0)
  });

  // 매출 데이터 가져오기
  const loadRevenueData = async () => {
    try {
      const result = await apiCall(API_ENDPOINTS.REVENUE);
      
      if (result.success) {
        // DB 데이터를 프론트엔드 형식으로 변환 (snake_case → camelCase)
        const formattedData = result.data.map(revenue => ({
          id: revenue.id,
          issueDate: revenue.issue_date,
          companyName: revenue.company_name,
          businessLicense: revenue.business_license,
          paymentDate: revenue.payment_date || '',
          paymentMethod: revenue.payment_method,
          companyType: revenue.company_type,
          item: revenue.item,
          supplyAmount: Number(revenue.supply_amount) || 0,
          vat: Number(revenue.vat) || 0,
          totalAmount: Number(revenue.total_amount) || 0,
          createdAt: revenue.created_at,
          updatedAt: revenue.updated_at
        }));
        
        setRevenueList(formattedData);
      } else {
        console.error('매출 데이터 로드 실패:', result.error);
      }
    } catch (error) {
      console.error('매출 데이터 로드 중 오류:', error);
    } finally {
      setLoading(false);
    }
  };


  // 월별 매출 표 데이터 계산 (프론트엔드에서 직접 계산)
  const calculateMonthlyRevenueTableData = useCallback(() => {
    const consultingData = Array(12).fill(0);
    const generalData = Array(12).fill(0);
    const otherData = Array(12).fill(0);
    const totalData = Array(12).fill(0);
    
    // 12개월 각각에 대해 계산
    for (let month = 1; month <= 12; month++) {
      const monthData = revenueList.filter(item => {
        const itemDate = parseDate(item.issueDate);
        if (!itemDate) return false;
        
        // 한국 시간 기준으로 월과 연도 비교
        const itemYear = itemDate.getFullYear();
        const itemMonth = itemDate.getMonth() + 1; // getMonth()는 0부터 시작하므로 +1
        
        return itemMonth === month && itemYear === selectedYear;
      });
      
      // 업체 형태별로 매출 계산
      const monthIndex = month - 1; // 0-based index
      
      consultingData[monthIndex] = monthData
        .filter(item => item.companyType === '컨설팅 업체')
        .reduce((sum, item) => sum + (item.supplyAmount || 0), 0);
      
      generalData[monthIndex] = monthData
        .filter(item => item.companyType === '일반 업체')
        .reduce((sum, item) => sum + (item.supplyAmount || 0), 0);
      
      otherData[monthIndex] = monthData
        .filter(item => item.companyType && !['컨설팅 업체', '일반 업체'].includes(item.companyType))
        .reduce((sum, item) => sum + (item.supplyAmount || 0), 0);
      
      totalData[monthIndex] = monthData
        .reduce((sum, item) => sum + (item.supplyAmount || 0), 0);
    }
    
    setMonthlyRevenueTableData({
      consulting: consultingData,
      general: generalData,
      other: otherData,
      total: totalData
    });
  }, [revenueList, selectedYear]);

  // 연도 변경 핸들러
  const handleYearChange = (newYear) => {
    setSelectedYear(newYear);
  };

  // 날짜 파싱 유틸리티 함수
  const parseDate = (dateValue) => {
    if (!dateValue) return null;
    
    let itemDate;
    if (typeof dateValue === 'string') {
      itemDate = new Date(dateValue);
    } else if (dateValue instanceof Date) {
      itemDate = dateValue;
    } else if (typeof dateValue === 'number') {
      // 8자리 숫자 형식 (예: 20250826)을 Date 객체로 변환
      const dateStr = String(dateValue);
      if (dateStr.length === 8) {
        const year = parseInt(dateStr.substring(0, 4));
        const month = parseInt(dateStr.substring(4, 6)) - 1; // getMonth()는 0부터 시작
        const day = parseInt(dateStr.substring(6, 8));
        itemDate = new Date(year, month, day);
      } else {
        return null;
      }
    } else {
      return null;
    }
    
    // 유효한 날짜인지 확인
    return isNaN(itemDate.getTime()) ? null : itemDate;
  };

  // 누적 매출 계산 함수
  const calculateCumulativeRevenue = (monthlyData) => {
    const cumulative = [];
    let sum = 0;
    
    for (let i = 0; i < 12; i++) {
      sum += monthlyData[i] || 0;
      cumulative.push(sum);
    }
    
    return cumulative;
  };

  useEffect(() => {
    loadRevenueData();
  }, []);

  useEffect(() => {
    if (revenueList.length > 0) {
      calculateMonthlyRevenueTableData();
    }
  }, [calculateMonthlyRevenueTableData, revenueList.length]);

  // 업체 형태별 매출 계산 (공급가액 기준)
  const getCompanyTypeRevenue = useCallback(() => {
    const companyTypeData = {};
    
    revenueList.forEach(revenue => {
      const companyType = revenue.companyType || '기타';
      if (!companyTypeData[companyType]) {
        companyTypeData[companyType] = 0;
      }
      companyTypeData[companyType] += revenue.supplyAmount;
    });
    
    return companyTypeData;
  }, [revenueList]);


  // 그래프 데이터 준비
  const barChartData = useMemo(() => {
    const companyTypeData = getCompanyTypeRevenue();
    return {
      labels: ['컨설팅 업체', '일반 업체', '기타'],
      datasets: [
        {
          label: '매출 (공급가액)',
          data: [
            companyTypeData['컨설팅 업체'] || 0,
            companyTypeData['일반 업체'] || 0,
            companyTypeData['기타'] || 0
          ],
          backgroundColor: [
            'rgba(54, 162, 235, 0.8)',
            'rgba(255, 99, 132, 0.8)',
            'rgba(255, 205, 86, 0.8)',
          ],
          borderColor: [
            'rgba(54, 162, 235, 1)',
            'rgba(255, 99, 132, 1)',
            'rgba(255, 205, 86, 1)',
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
              return value > 0 ? value.toLocaleString() + '원' : '';
            },
            anchor: 'end',
            align: 'top',
            offset: 4
          }
        },
      ],
    };
  }, [getCompanyTypeRevenue]);

  const doughnutChartData = {
    labels: ['컨설팅 업체', '일반 업체', '기타'],
    datasets: [
      {
        data: (() => {
          const companyTypeData = getCompanyTypeRevenue();
          return [
            companyTypeData['컨설팅 업체'] || 0,
            companyTypeData['일반 업체'] || 0,
            companyTypeData['기타'] || 0
          ];
        })(),
        backgroundColor: [
          'rgba(54, 162, 235, 0.8)',
          'rgba(255, 99, 132, 0.8)',
          'rgba(255, 205, 86, 0.8)',
        ],
        borderColor: [
          'rgba(54, 162, 235, 1)',
          'rgba(255, 99, 132, 1)',
          'rgba(255, 205, 86, 1)',
        ],
        borderWidth: 2,
        datalabels: {
          display: true,
          color: '#333',
          font: {
            weight: 'bold',
            size: 12
          },
          formatter: function(value, context) {
            const label = context.chart.data.labels[context.dataIndex];
            if (value > 0) {
              // 전체 매출 계산
              const totalRevenue = context.chart.data.datasets[0].data.reduce((sum, val) => sum + val, 0);
              // 비율 계산 (소수점 첫째 자리까지)
              const percentage = ((value / totalRevenue) * 100).toFixed(1);
              return [label, percentage + '%'];
            }
            return '';
          },
          anchor: 'center',
          align: 'center',
          offset: 0
        }
      },
    ],
  };

  const monthlyChartData = useMemo(() => {
    const baseData = {
      labels: ['1월', '2월', '3월', '4월', '5월', '6월', '7월', '8월', '9월', '10월', '11월', '12월'],
      datasets: [
        {
          label: '월별 매출 (공급가액)',
          data: Array.from({ length: 12 }, (_, i) => {
            const month = i + 1;
            const monthData = revenueList
              .filter(item => {
                const itemDate = parseDate(item.issueDate);
                if (!itemDate) return false;
                
                // 한국 시간 기준으로 월과 연도 비교
                const itemYear = itemDate.getFullYear();
                const itemMonth = itemDate.getMonth() + 1; // getMonth()는 0부터 시작하므로 +1
                
                return itemMonth === month && itemYear === selectedYear;
              })
              .reduce((sum, item) => sum + item.supplyAmount, 0);
            
            return monthData;
          }),
          backgroundColor: 'rgba(75, 192, 192, 0.8)',
          borderColor: 'rgba(75, 192, 192, 1)',
          borderWidth: 1,
          borderRadius: 4,
          borderSkipped: false,
          cornerRadius: 4,
          datalabels: {
            display: true,
            color: '#333',
            font: { weight: 'bold', size: 12 },
            formatter: function(value) {
              return value > 0 ? value.toLocaleString() + '원' : '';
            },
            anchor: 'end',
            align: 'top',
            offset: 4
          }
        },
      ],
    };
    
    // 현재 월 강조 적용
    return applyCurrentMonthHighlight(baseData, selectedYear);
  }, [revenueList, selectedYear, applyCurrentMonthHighlight]);

  // 연도별 매출 차트 데이터
  const getYearlyRevenueData = () => {
    const startYear = 2024;
    
    // 실제 데이터에서 존재하는 모든 연도 추출
    const existingYears = new Set();
    revenueList.forEach(item => {
      const itemDate = parseDate(item.issueDate);
      if (itemDate) {
        const year = itemDate.getFullYear();
        if (year >= startYear) {
          existingYears.add(year);
        }
      }
    });
    
    // 2024년부터 현재 연도까지의 연도와 실제 데이터 연도를 모두 포함
    const currentYear = new Date().getFullYear();
    const allYears = new Set();
    
    // 2024년부터 현재 연도까지 추가
    for (let year = startYear; year <= currentYear; year++) {
      allYears.add(year);
    }
    
    // 실제 데이터에 있는 연도들 추가
    existingYears.forEach(year => allYears.add(year));
    
    const years = Array.from(allYears).sort();
    
    const yearlyData = years.map(year => {
      return revenueList
        .filter(item => {
          const itemDate = parseDate(item.issueDate);
          return itemDate && itemDate.getFullYear() === year;
        })
        .reduce((sum, item) => sum + item.supplyAmount, 0);
    });

    return {
      labels: years.map(year => `${year}년`),
      datasets: [{
        label: '연도별 매출',
        data: yearlyData,
        backgroundColor: 'rgba(54, 162, 235, 0.8)',
        borderColor: 'rgba(54, 162, 235, 1)',
        borderWidth: 1,
        borderRadius: 4,
        borderSkipped: false,
        cornerRadius: 4,
        datalabels: {
          display: true,
          color: '#333',
          font: { weight: 'bold', size: 12 },
          formatter: function(value) {
            return value > 0 ? value.toLocaleString() + '원' : '';
          },
          anchor: 'end',
          align: 'top',
          offset: 4
        }
      }]
    };
  };

  const yearlyRevenueChartData = getYearlyRevenueData();

  // 동적 stepSize 계산 함수
  const calculateStepSize = (maxValue) => {
    if (maxValue <= 0) return 1;
    
    // 최대값을 5개 틱으로 나누어 적절한 stepSize 계산
    const baseStep = maxValue / 5;
    
    // 10의 거듭제곱으로 반올림
    const magnitude = Math.pow(10, Math.floor(Math.log10(baseStep)));
    const normalizedStep = baseStep / magnitude;
    
    let stepSize;
    if (normalizedStep <= 1) stepSize = 1 * magnitude;
    else if (normalizedStep <= 2) stepSize = 2 * magnitude;
    else if (normalizedStep <= 5) stepSize = 5 * magnitude;
    else stepSize = 10 * magnitude;
    
    return Math.max(stepSize, 1);
  };

  // 연도별 매출 차트 옵션
  const yearlyRevenueChartOptions = useMemo(() => {
    const maxValue = Math.max(...getYearlyRevenueData().datasets[0].data);
    const stepSize = calculateStepSize(maxValue);
    
    return {
      responsive: true,
      maintainAspectRatio: true,
      aspectRatio: 2.7,
      categoryPercentage: 0.6, // 카테고리(연도) 범위에서 막대가 차지하는 비율 (60%)
      barPercentage: 0.9, // 카테고리 내에서 막대가 차지하는 비율 (90%)
      layout: {
        padding: {
          top: 30,
          right: 20,
          bottom: 20,
          left: 20
        }
      },
      plugins: {
        legend: {
          display: false,
        }
      },
      scales: {
        y: {
          beginAtZero: true,
          ticks: {
            stepSize: stepSize, // 동적으로 계산된 간격
            maxTicksLimit: 5, // 최대 5개만 표시
            callback: function(value) {
              return value.toLocaleString() + '원';
            }
          }
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
      }
    };
  }, [revenueList, getYearlyRevenueData]);

  const barChartOptions = useMemo(() => {
    const maxValue = Math.max(...monthlyChartData.datasets[0].data);
    const stepSize = calculateStepSize(maxValue);
    
    return {
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
            stepSize: stepSize, // 동적으로 계산된 간격
            maxTicksLimit: 5, // 최대 5개만 표시
            callback: function(value) {
              return value.toLocaleString() + '원';
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
    };
  }, [revenueList, monthlyChartData]);

  const doughnutChartOptions = {
    responsive: true,
    plugins: {
      legend: {
        position: 'right',
        labels: {
          usePointStyle: true,
          padding: 20,
          font: {
            size: 12
          }
        }
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
    layout: {
      padding: {
        top: 30,
        right: 20,
        bottom: 20,
        left: 20
      }
    }
  };

  const monthlyChartOptions = useMemo(() => {
    const maxValue = Math.max(...monthlyChartData.datasets[0].data);
    const stepSize = calculateStepSize(maxValue);
    
    return {
      responsive: true,
      elements: {
        bar: {
          borderRadius: 4
        }
      },
      categoryPercentage: 0.6, // 카테고리(월) 범위에서 막대가 차지하는 비율 (60%)
      barPercentage: 0.9, // 카테고리 내에서 막대가 차지하는 비율 (90%)
      plugins: {
        legend: {
          display: false,
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
        datalabels: {
          display: true,
          color: '#333',
          font: {
            weight: 'bold',
            size: 12
          },
          formatter: function(value) {
            return value > 0 ? value.toLocaleString() + '원' : '';
          },
          anchor: 'end',
          align: 'top',
          offset: 4
        }
      },
      scales: {
        y: {
          beginAtZero: true,
          ticks: {
            stepSize: stepSize, // 동적으로 계산된 간격
            maxTicksLimit: 5, // 최대 5개만 표시
            callback: function(value) {
              return value.toLocaleString() + '원';
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
    };
  }, [revenueList, monthlyChartData]);


  // 연도 변경 시 차트 새로고침









  if (loading) {
    return <div className="loading">로딩 중...</div>;
  }

  return (
    <div className="revenue-status">
      {/* 매출 현황 상세 분석 섹션 */}
      <div className="revenue-charts-section">
        <h2>매출 현황 상세</h2>
        
        {/* 요약 통계 섹션 */}
        <div className="revenue-summary">
          <div className="summary-layout">
            <div className="summary-cards-grid">
              <div className="summary-card">
                <h3>총 매출</h3>
                <p className="summary-number">
                  {revenueList.reduce((sum, item) => sum + item.supplyAmount, 0).toLocaleString()}원
                </p>
              </div>
              <div className="summary-card">
                <h3>이번달 매출</h3>
                <p className="summary-number">
                  {revenueList
                    .filter(item => {
                      if (!item.issueDate) return false;
                      
                      // 한국 시간대 기준으로 현재 년월과 같은지 확인
                      return isCurrentKoreaYearMonth(item.issueDate);
                    })
                    .reduce((sum, item) => sum + item.supplyAmount, 0)
                    .toLocaleString()}원
                </p>
              </div>
              <div className="summary-card">
                <h3>올해 매출</h3>
                <p className="summary-number">
                  {revenueList
                    .filter(item => {
                      const itemDate = parseDate(item.issueDate);
                      return itemDate && itemDate.getFullYear() === new Date().getFullYear();
                    })
                    .reduce((sum, item) => sum + item.supplyAmount, 0)
                    .toLocaleString()}원
                </p>
              </div>
              <div className="summary-card">
                <h3>올해 매출 건수</h3>
                <p className="summary-number">
                  {revenueList
                    .filter(item => {
                      const itemDate = parseDate(item.issueDate);
                      return itemDate && itemDate.getFullYear() === new Date().getFullYear();
                    }).length}건
                </p>
              </div>
            </div>
            
            <div className="yearly-revenue-chart">
              <h3>연도별 매출</h3>
              <Bar data={yearlyRevenueChartData} options={yearlyRevenueChartOptions} />
            </div>
          </div>
        </div>
        
        {/* 월별 매출 추이 차트 */}
        <div className="monthly-chart-container">
          <div className="monthly-chart-header">
            <h3>월별 매출</h3>
            <div className="monthly-year-selector">
              <label>연도 선택:</label>
              <select 
                value={selectedYear} 
                onChange={(e) => handleYearChange(parseInt(e.target.value))}
              >
                {Array.from({ length: 6 }, (_, i) => 2029 - i).map(year => (
                  <option key={year} value={year}>
                    {year}년
                  </option>
                ))}
              </select>
            </div>
          </div>
          <Bar data={monthlyChartData} options={monthlyChartOptions} />
        </div>

        {/* 월별 매출 표 */}
        <div className="monthly-revenue-table-container">
          <div className="monthly-revenue-table-header">
            <h3>월별 매출 (표)</h3>
            <div className="year-selector">
              <label htmlFor="revenue-year-select">연도 선택:</label>
              <select 
                id="revenue-year-select" 
                value={selectedYear} 
                onChange={(e) => handleYearChange(parseInt(e.target.value))}
                className="year-select"
              >
                {Array.from({ length: 6 }, (_, i) => 2029 - i).map(year => (
                  <option key={year} value={year}>
                    {year}년
                  </option>
                ))}
              </select>
            </div>
          </div>
          
          <div className="monthly-revenue-table-wrapper">
            <table className="monthly-revenue-table">
              <thead>
                <tr>
                  <th className="category-header">구분</th>
                  {Array.from({ length: 12 }, (_, i) => {
                    const month = i + 1;
                    const isCurrent = isCurrentMonth(month, selectedYear);
                    return (
                      <th 
                        key={i} 
                        className={`month-header ${isCurrent ? 'current-month' : ''}`}
                      >
                        {month}월
                      </th>
                    );
                  })}
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td className="category-cell">컨설팅 업체</td>
                  {monthlyRevenueTableData.consulting.map((amount, index) => {
                    const month = index + 1;
                    const isCurrent = isCurrentMonth(month, selectedYear);
                    return (
                      <td 
                        key={index} 
                        className={`data-cell ${isCurrent ? 'current-month' : ''}`}
                      >
                        {amount.toLocaleString()}원
                      </td>
                    );
                  })}
                </tr>
                <tr>
                  <td className="category-cell">일반 업체</td>
                  {monthlyRevenueTableData.general.map((amount, index) => {
                    const month = index + 1;
                    const isCurrent = isCurrentMonth(month, selectedYear);
                    return (
                      <td 
                        key={index} 
                        className={`data-cell ${isCurrent ? 'current-month' : ''}`}
                      >
                        {amount.toLocaleString()}원
                      </td>
                    );
                  })}
                </tr>
                <tr>
                  <td className="category-cell">기타</td>
                  {monthlyRevenueTableData.other.map((amount, index) => {
                    const month = index + 1;
                    const isCurrent = isCurrentMonth(month, selectedYear);
                    return (
                      <td 
                        key={index} 
                        className={`data-cell ${isCurrent ? 'current-month' : ''}`}
                      >
                        {amount.toLocaleString()}원
                      </td>
                    );
                  })}
                </tr>
                <tr className="total-row">
                  <td className="category-cell total-label">매출 금액</td>
                  {monthlyRevenueTableData.total.map((amount, index) => {
                    const month = index + 1;
                    const isCurrent = isCurrentMonth(month, selectedYear);
                    return (
                      <td 
                        key={index} 
                        className={`data-cell total-data ${isCurrent ? 'current-month' : ''}`}
                      >
                        {amount.toLocaleString()}원
                      </td>
                    );
                  })}
                </tr>
                <tr className="total-row">
                  <td className="category-cell total-label">누적 매출</td>
                  {calculateCumulativeRevenue(monthlyRevenueTableData.total).map((amount, index) => {
                    const month = index + 1;
                    const isCurrent = isCurrentMonth(month, selectedYear);
                    return (
                      <td 
                        key={index} 
                        className={`data-cell total-data ${isCurrent ? 'current-month' : ''}`}
                      >
                        {amount.toLocaleString()}원
                      </td>
                    );
                  })}
                </tr>
              </tbody>
            </table>
          </div>
        </div>
        
        {/* 업체 형태별 매출 그래프 */}
        <div className="charts-grid">
          <div className="chart-container">
            <h3>업체 형태별 매출</h3>
            <Bar data={barChartData} options={barChartOptions} />
          </div>
          
          <div className="chart-container">
            <h3>업체 형태별 매출 비율</h3>
            <Doughnut data={doughnutChartData} options={doughnutChartOptions} />
          </div>
        </div>
      </div>
    </div>
  );
};

export default RevenueStatus;
