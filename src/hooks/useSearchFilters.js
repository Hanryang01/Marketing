import { useState, useCallback, useMemo } from 'react';

/**
 * 검색 필터 공통 훅
 * @param {Array} filterFields - 필터 필드 정의 배열
 * @param {Array} data - 필터링할 데이터 배열
 * @param {Function} customFilter - 커스텀 필터 함수 (선택사항)
 * @returns {Object} 검색 필터 관련 상태와 함수들
 */
const useSearchFilters = (filterFields, data, customFilter = null) => {
  // 초기 필터 상태 생성
  const initialFilters = filterFields.reduce((acc, field) => {
    acc[field.name] = '';
    return acc;
  }, {});

  const [searchFilters, setSearchFilters] = useState(initialFilters);

  // 필터 변경 핸들러
  const handleFilterChange = useCallback((field, value) => {
    setSearchFilters(prev => ({
      ...prev,
      [field]: value
    }));
  }, []);

  // 필터 초기화
  const resetFilters = useCallback(() => {
    setSearchFilters(initialFilters);
  }, [initialFilters]);

  // 필터링된 데이터 계산
  const filteredData = useMemo(() => {
    if (!data || data.length === 0) return [];

    // 커스텀 필터가 있으면 사용
    if (customFilter) {
      return data.filter(customFilter);
    }

    // 기본 필터 로직
    return data.filter(item => {
      return filterFields.every(field => {
        const filterValue = searchFilters[field.name];
        if (!filterValue) return true; // 빈 필터는 모든 값 허용

        const itemValue = item[field.name];
        if (!itemValue) return false; // 아이템에 해당 필드가 없으면 제외

        // 대소문자 구분 없이 포함 검색
        return itemValue.toString().toLowerCase().includes(filterValue.toLowerCase());
      });
    });
  }, [data, searchFilters, filterFields, customFilter]);

  // 활성 필터 개수
  const activeFilterCount = useMemo(() => {
    return Object.values(searchFilters).filter(value => value && value.trim() !== '').length;
  }, [searchFilters]);

  // 필터가 적용되었는지 확인
  const hasActiveFilters = activeFilterCount > 0;

  return {
    searchFilters,
    setSearchFilters,
    handleFilterChange,
    resetFilters,
    filteredData,
    activeFilterCount,
    hasActiveFilters
  };
};

export default useSearchFilters;
