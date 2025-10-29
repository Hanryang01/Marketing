import { useCallback } from 'react'; // useMemo 제거

/**
 * Chart.js 공통 훅
 * @param {Object} options - 차트 옵션
 * @param {Array} options.monthLabels - 월별 라벨 (기본: 1월~12월)
 * @param {Function} options.applyCurrentMonthHighlight - 현재 월 하이라이트 함수
 * @param {number} options.selectedYear - 선택된 연도
 * @returns {Object} 차트 관련 함수들
 */
const useChart = ({ monthLabels, applyCurrentMonthHighlight, selectedYear }) => {
  
  // 기본 월별 라벨
  const defaultMonthLabels = ['1월', '2월', '3월', '4월', '5월', '6월', '7월', '8월', '9월', '10월', '11월', '12월'];
  const labels = monthLabels || defaultMonthLabels;

  /**
   * 차트 데이터 생성 함수
   * @param {string} label - 데이터셋 라벨
   * @param {Array} data - 차트 데이터
   * @param {string} backgroundColor - 배경색
   * @param {string} borderColor - 테두리색
   * @param {Object} options - 추가 옵션
   * @returns {Object} Chart.js 데이터 객체
   */
  const createChartData = useCallback((label, data, backgroundColor, borderColor, options = {}) => {
    const baseData = {
      labels,
      datasets: [
        {
          label,
          data,
          backgroundColor,
          borderColor,
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
          },
          ...options
        },
      ],
    };
    
    // 현재 월 하이라이트 적용 (함수가 있는 경우)
    if (applyCurrentMonthHighlight && selectedYear) {
      return applyCurrentMonthHighlight(baseData, selectedYear);
    }
    
    return baseData;
  }, [labels, applyCurrentMonthHighlight, selectedYear]);

  /**
   * 동적 stepSize 계산 함수
   * @param {number} maxValue - 최대값
   * @returns {number} 계산된 stepSize
   */
  const calculateStepSize = useCallback((maxValue) => {
    if (maxValue <= 0) return 1;
    
    // 최대값을 5개 틱으로 나누어 적절한 stepSize 계산
    const stepSize = Math.ceil(maxValue / 5);
    
    // 10의 배수로 반올림
    const magnitude = Math.pow(10, Math.floor(Math.log10(stepSize)));
    return Math.ceil(stepSize / magnitude) * magnitude;
  }, []);

  /**
   * 차트 옵션 생성 함수
   * @param {number} maxValue - 최대값
   * @param {string} chartType - 차트 타입 (기본: 'bar')
   * @param {boolean} showDataLabels - 데이터 라벨 표시 여부
   * @param {Object} customOptions - 커스텀 옵션
   * @returns {Object} Chart.js 옵션 객체
   */
  const createChartOptions = useCallback((maxValue, chartType = 'bar', showDataLabels = true, customOptions = {}) => {
    const stepSize = calculateStepSize(maxValue);
    
    const baseOptions = {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
        tooltip: {
          enabled: true,
          backgroundColor: 'rgba(0, 0, 0, 0.8)',
          titleColor: '#fff',
          bodyColor: '#fff',
          borderColor: '#ff9800',
          borderWidth: 1,
          callbacks: {
            label: function(context) {
              return context.dataset.label + ': ' + context.parsed.y.toLocaleString() + '원';
            }
          }
        },
        ...(showDataLabels && {
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
        })
      },
      scales: {
        y: {
          beginAtZero: true,
          ticks: {
            stepSize: stepSize,
            maxTicksLimit: 5,
            font: { size: 13 },
            callback: function(value) {
              return value.toLocaleString() + '원';
            }
          }
        },
        x: {
          ticks: { font: { size: 13 } },
          grid: { display: false }
        }
      },
      layout: {
        padding: { top: 30, right: 20, bottom: 20, left: 20 }
      },
      ...customOptions
    };

    return baseOptions;
  }, [calculateStepSize]);

  /**
   * 손익 차트용 데이터 생성 (양수/음수 색상 구분)
   * @param {string} label - 데이터셋 라벨
   * @param {Array} data - 차트 데이터
   * @param {string} positiveColor - 양수 색상
   * @param {string} negativeColor - 음수 색상
   * @returns {Object} Chart.js 데이터 객체
   */
  const createProfitChartData = useCallback((label, data, positiveColor, negativeColor) => {
    const baseData = {
      labels,
      datasets: [
        {
          label,
          data,
          backgroundColor: data.map(value => 
            value >= 0 ? positiveColor : negativeColor
          ),
          borderColor: data.map(value => 
            value >= 0 ? positiveColor.replace('0.8', '1') : negativeColor.replace('0.8', '1')
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
    
    // 현재 월 하이라이트 적용 (함수가 있는 경우)
    if (applyCurrentMonthHighlight && selectedYear) {
      return applyCurrentMonthHighlight(baseData, selectedYear);
    }
    
    return baseData;
  }, [labels, applyCurrentMonthHighlight, selectedYear]);

  return {
    createChartData,
    createChartOptions,
    createProfitChartData,
    calculateStepSize
  };
};

export default useChart;
