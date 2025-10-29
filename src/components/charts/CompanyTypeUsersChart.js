import React, { useMemo } from 'react';
import { Bar } from 'react-chartjs-2';

const CompanyTypeUsersChart = ({ consultingUsers, generalUsers }) => {
  // 업체 형태별 가입자 수 그래프 데이터
  const chartData = useMemo(() => {
    return {
      labels: ['컨설팅 업체', '일반 업체'],
      datasets: [
        {
          label: '가입자 수',
          data: [
            consultingUsers || 0,
            generalUsers || 0
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
  }, [consultingUsers, generalUsers]);

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
          font: { size: 13 },
          callback: function(value) {
            return value + '명';
          }
        }
      },
      x: {
        ticks: {
          font: { size: 13 }
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

  return (
    <div className="company-type-users-chart-container">
      <h3>업체 형태별 가입자 수</h3>
      <Bar data={chartData} options={chartOptions} />
    </div>
  );
};

export default CompanyTypeUsersChart;
