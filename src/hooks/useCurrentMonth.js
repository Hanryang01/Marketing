import { useState, useEffect, useCallback } from 'react';

/**
 * 현재 월을 감지하고 자동으로 업데이트하는 훅
 * @returns {Object} 현재 월 정보와 관련 유틸리티 함수들
 */
export const useCurrentMonth = () => {
  const [currentMonth, setCurrentMonth] = useState(() => {
    return new Date().getMonth() + 1; // 1-12
  });
  
  const [currentYear, setCurrentYear] = useState(() => {
    return new Date().getFullYear();
  });

  // 현재 월이 특정 월과 일치하는지 확인
  const isCurrentMonth = useCallback((month, year = currentYear) => {
    return month === currentMonth && year === currentYear;
  }, [currentMonth, currentYear]);

  // 월별 데이터에 현재 월 정보 추가
  const addCurrentMonthInfo = useCallback((monthlyData) => {
    return monthlyData.map((item, index) => ({
      ...item,
      month: item.month || (index + 1),
      isCurrentMonth: isCurrentMonth(item.month || (index + 1), item.year || currentYear)
    }));
  }, [isCurrentMonth, currentYear]);

  // 12개월 배열 생성 (현재 월 정보 포함)
  const generateMonthlyArray = useCallback((year = currentYear) => {
    return Array.from({ length: 12 }, (_, i) => {
      const month = i + 1;
      return {
        month,
        year,
        isCurrentMonth: isCurrentMonth(month, year)
      };
    });
  }, [currentYear, isCurrentMonth]);

  // 월별 차트 데이터에 현재 월 강조 적용
  const applyCurrentMonthHighlight = useCallback((chartData, year = currentYear) => {
    if (!chartData || !chartData.datasets) return chartData;

    const updatedDatasets = chartData.datasets.map(dataset => {
      const backgroundColor = Array.isArray(dataset.backgroundColor) 
        ? [...dataset.backgroundColor] 
        : new Array(12).fill(dataset.backgroundColor);
      
      const borderColor = Array.isArray(dataset.borderColor) 
        ? [...dataset.borderColor] 
        : new Array(12).fill(dataset.borderColor);

      // 현재 월 강조 (10월이 현재 월이라면)
      for (let i = 0; i < 12; i++) {
        const month = i + 1;
        if (isCurrentMonth(month, year)) {
          backgroundColor[i] = 'rgba(0, 123, 255, 0.8)'; // 파란색 강조
          borderColor[i] = 'rgba(0, 123, 255, 1)';
        }
      }

      return {
        ...dataset,
        backgroundColor,
        borderColor
      };
    });

    return {
      ...chartData,
      datasets: updatedDatasets
    };
  }, [currentYear, isCurrentMonth]);

  // 월별 테이블 데이터에 현재 월 강조 적용
  const applyCurrentMonthTableHighlight = useCallback((tableData, year = currentYear) => {
    if (!tableData || !Array.isArray(tableData)) return tableData;

    return tableData.map((item, index) => {
      const month = item.month || (index + 1);
      return {
        ...item,
        month,
        isCurrentMonth: isCurrentMonth(month, year)
      };
    });
  }, [currentYear, isCurrentMonth]);

  // 월이 변경되었는지 확인하고 업데이트
  useEffect(() => {
    const checkMonthChange = () => {
      const now = new Date();
      const newMonth = now.getMonth() + 1;
      const newYear = now.getFullYear();
      
      if (newMonth !== currentMonth || newYear !== currentYear) {
        setCurrentMonth(newMonth);
        setCurrentYear(newYear);
      }
    };

    // 컴포넌트 마운트 시 현재 월 설정
    checkMonthChange();

    // 1분마다 월 변경 확인 (실시간성 필요시)
    const interval = setInterval(checkMonthChange, 60000);

    return () => clearInterval(interval);
  }, [currentMonth, currentYear]);

  return {
    currentMonth,
    currentYear,
    isCurrentMonth,
    addCurrentMonthInfo,
    generateMonthlyArray,
    applyCurrentMonthHighlight,
    applyCurrentMonthTableHighlight
  };
};

export default useCurrentMonth;
