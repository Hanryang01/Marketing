import React, { useMemo } from 'react';
import { Bar } from 'react-chartjs-2';
import { useCurrentMonth } from '../../hooks/useCurrentMonth';

const MonthlyActiveCompaniesChart = ({ data, selectedYear, onYearChange }) => {
  const { applyCurrentMonthHighlight } = useCurrentMonth();

  // 월별 활성화 업체 수 그래프 데이터
  const chartData = useMemo(() => {
    const baseData = {
      labels: data && data.length > 0 
        ? data.map(item => `${item.month}월`)
        : ['1월', '2월', '3월', '4월', '5월', '6월', '7월', '8월', '9월', '10월', '11월', '12월'],
      datasets: [
        {
          type: 'bar',
          label: '활성화 업체 수',
          data: data && data.length > 0 
            ? data.map(item => item.totalActive || 0)
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
    
    // 현재 월 강조 적용
    return applyCurrentMonthHighlight(baseData, selectedYear);
  }, [data, selectedYear, applyCurrentMonthHighlight]);

  // 차트 옵션
  const chartOptions = useMemo(() => ({
    responsive: true,
    maintainAspectRatio: false,
    elements: {
      bar: {
        borderRadius: 4
      }
    },
    categoryPercentage: 0.6,
    barPercentage: 0.9,
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
            size: 13,
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
            size: 13,
            weight: 'bold'
          },
          color: '#666',
          stepSize: 1,
          maxTicksLimit: 5,
          callback: function(value) {
            return value + '개';
          }
        },
        beginAtZero: true
      }
    }
  }), []);

  return (
    <div className="monthly-active-companies-chart-container">
      <div className="monthly-chart-header">
        <h3>월별 활성화 업체 수</h3>
        <div className="monthly-year-selector">
          <label>연도 선택:</label>
          <select 
            value={selectedYear} 
            onChange={(e) => onYearChange(parseInt(e.target.value))}
          >
            {Array.from({ length: 6 }, (_, i) => 2029 - i).map(year => (
              <option key={year} value={year}>{year}년</option>
            ))}
          </select>
        </div>
      </div>
      <Bar data={chartData} options={chartOptions} />
    </div>
  );
};

export default MonthlyActiveCompaniesChart;
