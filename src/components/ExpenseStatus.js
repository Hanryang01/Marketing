import React, { useState, useEffect, useMemo, useCallback } from 'react';
import './ExpenseStatus.css';
import { apiCall, API_ENDPOINTS } from '../config/api';
import { Bar } from 'react-chartjs-2';
import useChart from '../hooks/useChart';
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
import { useCurrentMonth } from '../hooks/useCurrentMonth';

// Chart.js 등록 (중복 등록 방지)
if (!ChartJS.registry.getPlugin('datalabels')) {
  ChartJS.register(
    CategoryScale,
    LinearScale,
    BarElement,
    Title,
    Tooltip,
    Legend,
    ChartDataLabels
  );
}

// YearSelector 컴포넌트 분리
const YearSelector = ({ selectedYear, onYearChange, className = "" }) => {
  return (
    <select 
      value={selectedYear} 
      onChange={(e) => onYearChange(parseInt(e.target.value))}
      className={className}
    >
      {Array.from({ length: 6 }, (_, i) => 2029 - i).map(year => (
        <option key={year} value={year}>
          {year}년
        </option>
      ))}
    </select>
  );
};

const ExpenseStatus = () => {
  const [expenseList, setExpenseList] = useState([]);
  const [revenueList, setRevenueList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const { applyCurrentMonthHighlight, isCurrentMonth } = useCurrentMonth();

  // 숫자 변환 헬퍼 함수
  const parseAmount = (amount) => {
    if (typeof amount === 'string') {
      return parseFloat(amount.replace(/,/g, '')) || 0;
    }
    return amount || 0;
  };

  // 공통 월별 데이터 계산 함수
  const calculateMonthlyData = useCallback((year, month, dataType) => {
    let revenueAmount = 0;
    let incomeFromExpenses = 0;
    let totalExpense = 0;

    // 매출 데이터 계산
    if (dataType === 'income' || dataType === 'profit') {
      revenueAmount = Array.isArray(revenueList) ? revenueList
        .filter(revenue => {
          const paymentDate = revenue.payment_date || revenue.paymentDate;
          if (!paymentDate) return false;
          
          const date = new Date(paymentDate);
          const itemYear = date.getFullYear();
          const itemMonth = date.getMonth() + 1;
          
          return itemMonth === month && itemYear === year;
        })
        .reduce((sum, revenue) => sum + parseAmount(revenue.total_amount), 0) : 0;
    }

    // 입금 데이터 계산
    if (dataType === 'income' || dataType === 'profit') {
      incomeFromExpenses = Array.isArray(expenseList) ? expenseList
        .filter(expense => {
          if (!expense.expenseDate) return false;
          if (expense.transactionType !== 'income') return false;
          
          const date = new Date(expense.expenseDate);
          const itemYear = date.getFullYear();
          const itemMonth = date.getMonth() + 1;
          
          return itemMonth === month && itemYear === year;
        })
        .reduce((sum, expense) => sum + parseAmount(expense.totalAmount), 0) : 0;
    }

    // 지출 데이터 계산
    if (dataType === 'expense' || dataType === 'profit') {
      totalExpense = Array.isArray(expenseList) ? expenseList
        .filter(expense => {
          if (!expense.expenseDate) return false;
          if (expense.transactionType !== 'expense') return false;
          
          const date = new Date(expense.expenseDate);
          const itemYear = date.getFullYear();
          const itemMonth = date.getMonth() + 1;
          
          return itemMonth === month && itemYear === year;
        })
        .reduce((sum, expense) => sum + parseAmount(expense.totalAmount), 0) : 0;
    }

    const totalIncome = revenueAmount + incomeFromExpenses;
    const profit = totalIncome - totalExpense;

    return {
      revenueAmount,
      incomeFromExpenses,
      totalExpense,
      totalIncome,
      profit
    };
  }, [revenueList, expenseList]);

  // 공통 데이터 로딩 함수
  const loadData = async (endpoint, setter, errorMessage) => {
    try {
      if (setter === setExpenseList) setLoading(true);
      const response = await apiCall(endpoint);
      const data = response?.data || response || [];
      setter(data);
    } catch (error) {
      console.error(errorMessage, error);
    } finally {
      if (setter === setExpenseList) setLoading(false);
    }
  };

  // 지출 데이터 로드
  const loadExpenseData = useCallback(() => {
    loadData(API_ENDPOINTS.EXPENSES, setExpenseList, '지출 데이터 로드 실패:');
  }, []);

  // 매출 데이터 로드
  const loadRevenueData = useCallback(() => {
    loadData(API_ENDPOINTS.REVENUE, setRevenueList, '매출 데이터 로드 실패:');
  }, []);

  useEffect(() => {
    loadExpenseData();
    loadRevenueData();
  }, [loadExpenseData, loadRevenueData]);

  // 연도 변경 핸들러
  const handleYearChange = (newYear) => {
    setSelectedYear(newYear);
  };

  // 통합 월별 데이터 계산 함수
  const getMonthlyData = useCallback((dataType, field) => {
    return Array.from({ length: 12 }, (_, i) => {
      const month = i + 1;
      const data = calculateMonthlyData(selectedYear, month, dataType);
      return data[field];
    });
  }, [selectedYear, calculateMonthlyData]);

  // 월별 데이터 계산 함수들
  const getMonthlyExpenseData = useCallback(() => getMonthlyData('expense', 'totalExpense'), [getMonthlyData]);
  const getMonthlyIncomeData = useCallback(() => getMonthlyData('income', 'totalIncome'), [getMonthlyData]);
  const getMonthlyProfitData = useCallback(() => getMonthlyData('profit', 'profit'), [getMonthlyData]);

  // 월별 손익 표 데이터 계산
  const getMonthlyProfitTableData = useCallback(() => {
    const incomeData = Array(12).fill(0);
    const expenseData = Array(12).fill(0);
    const profitData = Array(12).fill(0);
    const cumulativeData = Array(12).fill(0);
    
    for (let month = 1; month <= 12; month++) {
      const data = calculateMonthlyData(selectedYear, month, 'profit');
      
      const monthIndex = month - 1;
      incomeData[monthIndex] = data.totalIncome;
      expenseData[monthIndex] = data.totalExpense;
      profitData[monthIndex] = data.profit;
    }
    
    // 누적 손익 계산 (이전 연도 포함)
    let previousYearCumulative = 0;
    
    // 이전 연도(selectedYear - 1)의 누적 손익 계산
    for (let month = 1; month <= 12; month++) {
      const data = calculateMonthlyData(selectedYear - 1, month, 'profit');
      previousYearCumulative += data.profit;
    }
    
    // 현재 연도의 누적 손익 계산
    for (let month = 1; month <= 12; month++) {
      let cumulative = previousYearCumulative;
      for (let i = 1; i <= month; i++) {
        const monthIndex = i - 1;
        if (monthIndex < incomeData.length) {
          const monthIncome = incomeData[monthIndex] || 0;
          const monthExpense = expenseData[monthIndex] || 0;
          const monthProfit = monthIncome - monthExpense;
          cumulative += monthProfit;
        }
      }
      const monthIndex = month - 1;
      cumulativeData[monthIndex] = cumulative;
    }
    
    return {
      income: incomeData,
      expense: expenseData,
      profit: profitData,
      cumulative: cumulativeData
    };
  }, [selectedYear, calculateMonthlyData]);



  // 연도별 손익 데이터 계산
  const getYearlyProfitData = useCallback(() => {
    const startYear = 2024;
    
    // 실제 데이터에서 존재하는 모든 연도 추출
    const existingYears = new Set();
    
    // 매출 데이터에서 연도 추출
    revenueList.forEach(item => {
      const paymentDate = item.payment_date || item.paymentDate;
      if (paymentDate) {
        const date = new Date(paymentDate);
        const year = date.getFullYear();
        if (year >= startYear) {
          existingYears.add(year);
        }
      }
    });
    
    // 지출 데이터에서 연도 추출
    expenseList.forEach(item => {
      if (item.expenseDate) {
        const date = new Date(item.expenseDate);
        const year = date.getFullYear();
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
      let yearlyProfit = 0;
      
      // 해당 연도의 1월부터 12월까지 손익 계산
      for (let month = 1; month <= 12; month++) {
        const data = calculateMonthlyData(year, month, 'profit');
        yearlyProfit += data.profit;
      }
      
      return yearlyProfit;
    });
    
    return {
      years: years.map(year => `${year}년`),
      profitData: yearlyData
    };
  }, [calculateMonthlyData, expenseList, revenueList]);

  // 공통 Chart.js 훅 사용
  const { createChartData, createChartOptions, createProfitChartData, calculateStepSize } = useChart({
    applyCurrentMonthHighlight,
    selectedYear
  });


  // 공통 차트 옵션 생성 함수
  const createCommonChartOptions = useCallback((data, chartType = 'bar') => {
    const maxValue = data.length > 0 ? Math.max(...data.map(Math.abs)) : 0;
    return createChartOptions(maxValue, chartType);
  }, [createChartOptions]);

  // 월별 지출 그래프 데이터 생성
  const monthlyChartData = useMemo(() => {
    return createChartData(
      '월별 지출',
      getMonthlyExpenseData(),
      'rgba(255, 152, 0, 0.8)',
      'rgba(255, 152, 0, 1)'
    );
  }, [getMonthlyExpenseData, createChartData]);

  // 월별 지출 그래프 옵션
  const monthlyChartOptions = useMemo(() => {
    return createCommonChartOptions(getMonthlyExpenseData());
  }, [getMonthlyExpenseData, createCommonChartOptions]);

  // 월별 손익 그래프 데이터 생성
  const monthlyProfitChartData = useMemo(() => {
    const profitData = getMonthlyProfitData();
    return createProfitChartData(
      '월별 손익',
      profitData,
      'rgba(54, 162, 235, 0.8)',  // 양수: 파란색
      'rgba(255, 99, 132, 0.8)'    // 음수: 연한 빨간색
    );
  }, [getMonthlyProfitData, createProfitChartData]);

  // 월별 손익 그래프 옵션
  const monthlyProfitChartOptions = useMemo(() => {
    return createCommonChartOptions(getMonthlyProfitData());
  }, [getMonthlyProfitData, createCommonChartOptions]);


  // 월별 입금 그래프 옵션
  const monthlyIncomeChartOptions = useMemo(() => {
    return createCommonChartOptions(getMonthlyIncomeData());
  }, [getMonthlyIncomeData, createCommonChartOptions]);

  // 월별 입금 그래프 데이터 생성
  const monthlyIncomeChartData = useMemo(() => {
    return createChartData(
      '월별 입금',
      getMonthlyIncomeData(),
      'rgba(76, 175, 80, 0.8)',
      'rgba(76, 175, 80, 1)'
    );
  }, [getMonthlyIncomeData, createChartData]);

  // 연도별 손익 그래프 데이터 생성
  const yearlyProfitChartData = useMemo(() => {
    const { years, profitData } = getYearlyProfitData();
    
    return {
      labels: years,
      datasets: [
        {
          label: '연도별 손익',
          data: profitData,
          backgroundColor: profitData.map(value => 
            value >= 0 
              ? 'rgba(54, 162, 235, 0.8)'  // 양수: 파란색
              : 'rgba(255, 99, 132, 0.8)'   // 음수: 연한 빨간색
          ),
          borderColor: profitData.map(value => 
            value >= 0 
              ? 'rgba(54, 162, 235, 1)'     // 양수: 파란색 테두리
              : 'rgba(255, 99, 132, 1)'     // 음수: 빨간색 테두리
          ),
          borderWidth: 1,
          borderRadius: 4,
          borderSkipped: false,
          cornerRadius: 4,
          datalabels: {
            display: true,
            color: '#333',
            font: { weight: 'bold', size: 12 },
            formatter: function(value) {
              return value !== 0 ? value.toLocaleString() + '원' : '';
            },
            anchor: 'end',
            align: 'top',
            offset: 4
          }
        },
      ],
    };
  }, [getYearlyProfitData]);

  // 연도별 손익 그래프 옵션
  const yearlyProfitChartOptions = useMemo(() => {
    const { profitData } = getYearlyProfitData();
    const maxValue = profitData.length > 0 ? Math.max(...profitData.map(Math.abs)) : 0;
    const stepSize = calculateStepSize(maxValue);
    
    return {
      responsive: true,
      maintainAspectRatio: true,
      aspectRatio: 2.7,
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
            stepSize: stepSize,
            maxTicksLimit: 5,
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
      },
      categoryPercentage: 0.6,
      barPercentage: 0.9,
      plugins: {
        legend: {
          display: false,
        },
        datalabels: {
          display: true,
          color: '#333',
          font: {
            weight: 'bold',
            size: 12
          },
          formatter: function(value) {
            return value !== 0 ? value.toLocaleString() + '원' : '';
          },
          anchor: 'end',
          align: 'top',
          offset: 4
        }
      }
    };
  }, [getYearlyProfitData, calculateStepSize]);


  
  // 현재 날짜 정보
  const currentDate = new Date();
  const currentMonth = currentDate.getMonth() + 1; // 1부터 시작
  const currentYear = currentDate.getFullYear();

  // 이번달 데이터 계산
  const thisMonthData = useMemo(() => {
    return calculateMonthlyData(currentYear, currentMonth, 'profit');
  }, [currentYear, currentMonth, calculateMonthlyData]);

  // 올해 데이터 계산
  const thisYearData = useMemo(() => {
    let totalIncome = 0;
    let totalExpense = 0;
    
    for (let month = 1; month <= 12; month++) {
      const data = calculateMonthlyData(currentYear, month, 'profit');
      totalIncome += data.totalIncome;
      totalExpense += data.totalExpense;
    }
    
    return { totalIncome, totalExpense };
  }, [currentYear, calculateMonthlyData]);

  if (loading) {
    return <div className="loading">로딩 중...</div>;
  }

  return (
    <div className="expense-status">
      {/* 지출 현황 상세 분석 섹션 */}
      <div className="expense-charts-section">
        <h2>지출 현황 상세</h2>
        
        {/* 요약 통계 섹션 */}
        <div className="expense-summary">
          <div className="summary-layout">
            <div className="summary-cards-grid">
              <div className="summary-card">
                <h3>이번달 입금</h3>
                <p className="summary-number">
                  {thisMonthData.totalIncome.toLocaleString()}원
                </p>
              </div>
              <div className="summary-card">
                <h3>이번달 지출</h3>
                <p className="summary-number">
                  {thisMonthData.totalExpense.toLocaleString()}원
                </p>
              </div>
              <div className="summary-card">
                <h3>올해 입금</h3>
                <p className="summary-number">
                  {thisYearData.totalIncome.toLocaleString()}원
                </p>
              </div>
              <div className="summary-card">
                <h3>올해 지출</h3>
                <p className="summary-number">
                  {thisYearData.totalExpense.toLocaleString()}원
                </p>
              </div>
            </div>
            <div className="yearly-profit-chart">
              <h3>연도별 손익</h3>
              <Bar data={yearlyProfitChartData} options={yearlyProfitChartOptions} />
            </div>
          </div>
        </div>

        {/* 월별 손익 차트 */}
        <div className="monthly-chart-container">
          <div className="monthly-chart-header">
            <h3>월별 손익</h3>
            <div className="monthly-year-selector">
              <label>연도 선택:</label>
              <YearSelector 
                selectedYear={selectedYear} 
                onYearChange={handleYearChange} 
              />
            </div>
          </div>
          <Bar data={monthlyProfitChartData} options={monthlyProfitChartOptions} />
        </div>

        {/* 월별 손익 표 */}
        <div className="monthly-chart-container">
          <div className="monthly-chart-header">
            <h3>월별 손익 (표)</h3>
            <div className="monthly-year-selector">
              <label>연도 선택:</label>
              <YearSelector 
                selectedYear={selectedYear} 
                onYearChange={handleYearChange} 
              />
            </div>
          </div>
          <div className="monthly-revenue-table-wrapper">
            <table className="monthly-revenue-table">
              <thead>
                <tr>
                  <th style={{width: '120px', textAlign: 'left', padding: '12px', background: '#f8f9fa', border: '1px solid #e9ecef'}}>구분</th>
                  {Array.from({ length: 12 }, (_, i) => {
                    const month = i + 1;
                    const isCurrent = isCurrentMonth(month, selectedYear);
                    return (
                      <th 
                        key={i} 
                        style={{
                          minWidth: '60px',
                          textAlign: 'center',
                          padding: '12px',
                          background: isCurrent ? '#64b5f6' : '#f8f9fa',
                          color: isCurrent ? 'white' : '#333',
                          border: '1px solid #e9ecef'
                        }}
                      >
                        {month}월
                      </th>
                    );
                  })}
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td style={{width: '120px', textAlign: 'left', padding: '12px', background: '#f8f9fa', border: '1px solid #e9ecef', fontWeight: '400', fontSize: '14px'}}>입금</td>
                  {getMonthlyProfitTableData().income.map((amount, index) => {
                    const month = index + 1;
                    const isCurrent = isCurrentMonth(month, selectedYear);
                    return (
                      <td 
                        key={index} 
                        style={{
                          minWidth: '60px',
                          textAlign: 'center',
                          padding: '12px',
                          background: isCurrent ? '#e3f2fd' : 'white',
                          border: '1px solid #e9ecef',
                          fontWeight: '400',
                          fontSize: '14px'
                        }}
                      >
                        {amount.toLocaleString()}원
                      </td>
                    );
                  })}
                </tr>
                <tr>
                  <td style={{width: '120px', textAlign: 'left', padding: '12px', background: '#f8f9fa', border: '1px solid #e9ecef', fontWeight: '400', fontSize: '14px'}}>지출</td>
                  {getMonthlyProfitTableData().expense.map((amount, index) => {
                    const month = index + 1;
                    const isCurrent = isCurrentMonth(month, selectedYear);
                    return (
                      <td 
                        key={index} 
                        style={{
                          minWidth: '60px',
                          textAlign: 'center',
                          padding: '12px',
                          background: isCurrent ? '#e3f2fd' : 'white',
                          border: '1px solid #e9ecef',
                          fontWeight: '400',
                          fontSize: '14px'
                        }}
                      >
                        {amount.toLocaleString()}원
                      </td>
                    );
                  })}
                </tr>
                <tr>
                  <td style={{width: '120px', textAlign: 'left', padding: '12px', background: '#f8f9fa', border: '1px solid #e9ecef', fontWeight: '400', fontSize: '14px'}}>손익</td>
                  {getMonthlyProfitTableData().profit.map((amount, index) => {
                    const month = index + 1;
                    const isCurrent = isCurrentMonth(month, selectedYear);
                    return (
                      <td 
                        key={index} 
                        style={{
                          minWidth: '60px',
                          textAlign: 'center',
                          padding: '12px',
                          background: isCurrent ? '#e3f2fd' : 'white',
                          border: '1px solid #e9ecef',
                          fontWeight: '400',
                          fontSize: '14px'
                        }}
                      >
                        {amount.toLocaleString()}원
                      </td>
                    );
                  })}
                </tr>
                <tr className="total-row">
                  <td style={{width: '120px', textAlign: 'left', padding: '12px', background: '#e8f5e8', border: '1px solid #e9ecef', fontWeight: '400', fontSize: '14px'}}>누적손익</td>
                  {getMonthlyProfitTableData().cumulative.map((amount, index) => {
                    const month = index + 1;
                    const isCurrent = isCurrentMonth(month, selectedYear);
                    return (
                      <td 
                        key={index} 
                        style={{
                          minWidth: '60px',
                          textAlign: 'center',
                          padding: '12px',
                          background: isCurrent ? '#e3f2fd' : '#e8f5e8',
                          border: '1px solid #e9ecef',
                          fontWeight: '500',
                          fontSize: '14px'
                        }}
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

        {/* 월별 지출 차트 (매출 그래프와 동일한 구조) */}
        <div className="monthly-chart-container">
          <div className="monthly-chart-header">
            <h3>월별 지출</h3>
            <div className="monthly-year-selector">
              <label>연도 선택:</label>
              <YearSelector 
                selectedYear={selectedYear} 
                onYearChange={handleYearChange} 
              />
            </div>
          </div>
          <Bar data={monthlyChartData} options={monthlyChartOptions} />
        </div>

        {/* 월별 입금 차트 */}
        <div className="monthly-chart-container">
          <div className="monthly-chart-header">
            <h3>월별 입금</h3>
            <div className="monthly-year-selector">
              <label>연도 선택:</label>
              <YearSelector 
                selectedYear={selectedYear} 
                onYearChange={handleYearChange} 
              />
            </div>
          </div>
          <Bar data={monthlyIncomeChartData} options={monthlyIncomeChartOptions} />
        </div>
      </div>
    </div>
  );
};

export default ExpenseStatus;