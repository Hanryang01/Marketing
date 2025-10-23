import { useState } from 'react';

export const useCalendar = () => {
  // 달력 관련 상태들
  const [showStartDatePicker, setShowStartDatePicker] = useState(false);
  const [showEndDatePicker, setShowEndDatePicker] = useState(false);
  const [showIssueDatePicker, setShowIssueDatePicker] = useState(false);
  const [showPaymentDatePicker, setShowPaymentDatePicker] = useState(false);
  const [showDetailStartDatePicker, setShowDetailStartDatePicker] = useState(false);
  const [showDetailEndDatePicker, setShowDetailEndDatePicker] = useState(false);
  const [calendarPosition, setCalendarPosition] = useState({ top: 0, left: 0 });

  // 현재 날짜 초기화 (한국 시간대로 강제 변환)
  const getCurrentKoreaDate = () => {
    const koreaTime = new Date(new Date().toLocaleString("en-US", {timeZone: "Asia/Seoul"}));
    return new Date(koreaTime.getFullYear(), koreaTime.getMonth(), koreaTime.getDate());
  };

  const [startDatePickerDate, setStartDatePickerDate] = useState(getCurrentKoreaDate());
  const [endDatePickerDate, setEndDatePickerDate] = useState(getCurrentKoreaDate());
  const [issueDatePickerDate, setIssueDatePickerDate] = useState(getCurrentKoreaDate());
  const [paymentDatePickerDate, setPaymentDatePickerDate] = useState(getCurrentKoreaDate());
  const [detailStartDatePickerDate, setDetailStartDatePickerDate] = useState(getCurrentKoreaDate());
  const [detailEndDatePickerDate, setDetailEndDatePickerDate] = useState(getCurrentKoreaDate());

  // 달력 위치 계산
  const calculateCalendarPosition = (inputElement, type) => {
    if (!inputElement) return;
    
    const rect = inputElement.getBoundingClientRect();
    const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
    const scrollLeft = window.pageXOffset || document.documentElement.scrollLeft;
    
    // 입력창 아래에 위치하도록 계산
    let top = rect.bottom + scrollTop + 5; // 5px 여백
    let left = rect.left + scrollLeft;
    
    // 화면 경계 체크
    const calendarWidth = 320; // 달력 너비
    const calendarHeight = 400; // 달력 높이 (대략적)
    
    // 오른쪽 경계 체크
    if (left + calendarWidth > window.innerWidth) {
      left = window.innerWidth - calendarWidth - 10;
    }
    
    // 아래쪽 경계 체크 (화면 아래로 넘어가는 경우)
    if (top + calendarHeight > window.innerHeight + scrollTop) {
      // 입력창 위에 표시
      top = rect.top + scrollTop - calendarHeight - 5;
    }
    
    // 왼쪽 경계 체크
    if (left < 0) {
      left = 10;
    }
    
    // 위쪽 경계 체크
    if (top < scrollTop) {
      top = scrollTop + 10;
    }
    
    setCalendarPosition({ top, left });
  };

  // 달력 열기 (위치 계산 포함)
  const handleOpenCalendar = (type, inputElement, currentDate = null) => {
    calculateCalendarPosition(inputElement, type);
    
    // 기존 날짜가 있으면 그 날짜를 사용하고, 없으면 오늘 날짜 사용
    let targetDate;
    if (currentDate) {
      // YYYY-MM-DD 형식의 문자열을 Date 객체로 변환
      if (typeof currentDate === 'string' && currentDate.includes('-')) {
        const [year, month, day] = currentDate.split('-').map(Number);
        targetDate = new Date(year, month - 1, day);
      } else if (typeof currentDate === 'number') {
        // 8자리 숫자 형식 (YYYYMMDD)을 Date 객체로 변환
        const dateStr = currentDate.toString();
        if (dateStr.length === 8) {
          const year = parseInt(dateStr.substring(0, 4));
          const month = parseInt(dateStr.substring(4, 6));
          const day = parseInt(dateStr.substring(6, 8));
          targetDate = new Date(year, month - 1, day);
        } else {
          targetDate = getCurrentKoreaDate();
        }
      } else {
        targetDate = getCurrentKoreaDate();
      }
    } else {
      targetDate = getCurrentKoreaDate();
    }
    
    if (type === 'start') {
      setStartDatePickerDate(targetDate);
      setShowStartDatePicker(true);
      setShowEndDatePicker(false);
    } else if (type === 'end') {
      setEndDatePickerDate(targetDate);
      setShowEndDatePicker(true);
      setShowStartDatePicker(false);
    } else if (type === 'issue') {
      setIssueDatePickerDate(targetDate);
      setShowIssueDatePicker(true);
      setShowPaymentDatePicker(false);
    } else if (type === 'payment') {
      setPaymentDatePickerDate(targetDate);
      setShowPaymentDatePicker(true);
      setShowIssueDatePicker(false);
    } else if (type === 'detailStart') {
      setDetailStartDatePickerDate(targetDate);
      setShowDetailStartDatePicker(true);
      setShowDetailEndDatePicker(false);
    } else if (type === 'detailEnd') {
      setDetailEndDatePickerDate(targetDate);
      setShowDetailEndDatePicker(true);
      setShowDetailStartDatePicker(false);
    }
  };

  // 달력에서 날짜 선택 (YYYY-MM-DD 형식으로 통일)
  const handleDateSelect = (date, type, onDateChange) => {
    // 선택한 날짜를 YYYY-MM-DD 형식으로 변환
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const formattedDate = `${year}-${month}-${day}`;
    
    if (type === 'start') {
      onDateChange('startDate', formattedDate);
      setShowStartDatePicker(false);
    } else if (type === 'end') {
      onDateChange('endDate', formattedDate);
      setShowEndDatePicker(false);
    } else if (type === 'issue') {
      onDateChange('issueDate', formattedDate);
      setShowIssueDatePicker(false);
    } else if (type === 'payment') {
      onDateChange('paymentDate', formattedDate);
      setShowPaymentDatePicker(false);
    } else if (type === 'detailStart') {
      onDateChange('startDate', formattedDate);
      setShowDetailStartDatePicker(false);
    } else if (type === 'detailEnd') {
      onDateChange('endDate', formattedDate);
      setShowDetailEndDatePicker(false);
    }
  };

  // 월 변경 처리
  const handleMonthChange = (type, direction) => {
    if (type === 'start') {
      setStartDatePickerDate(prev => {
        const newDate = new Date(prev);
        newDate.setMonth(newDate.getMonth() + direction);
        return newDate;
      });
    } else if (type === 'end') {
      setEndDatePickerDate(prev => {
        const newDate = new Date(prev);
        newDate.setMonth(newDate.getMonth() + direction);
        return newDate;
      });
    } else if (type === 'issue') {
      setIssueDatePickerDate(prev => {
        const newDate = new Date(prev);
        newDate.setMonth(newDate.getMonth() + direction);
        return newDate;
      });
    } else if (type === 'payment') {
      setPaymentDatePickerDate(prev => {
        const newDate = new Date(prev);
        newDate.setMonth(newDate.getMonth() + direction);
        return newDate;
      });
    } else if (type === 'detailStart') {
      setDetailStartDatePickerDate(prev => {
        const newDate = new Date(prev);
        newDate.setMonth(newDate.getMonth() + direction);
        return newDate;
      });
    } else if (type === 'detailEnd') {
      setDetailEndDatePickerDate(prev => {
        const newDate = new Date(prev);
        newDate.setMonth(newDate.getMonth() + direction);
        return newDate;
      });
    }
  };

  // 현재 월/년도 표시
  const getCurrentMonthYear = (type) => {
    let date;
    if (type === 'start') {
      date = startDatePickerDate;
    } else if (type === 'end') {
      date = endDatePickerDate;
    } else if (type === 'issue') {
      date = issueDatePickerDate;
    } else if (type === 'payment') {
      date = paymentDatePickerDate;
    } else if (type === 'detailStart') {
      date = detailStartDatePickerDate;
    } else if (type === 'detailEnd') {
      date = detailEndDatePickerDate;
    }
    const year = date.getFullYear();
    const month = date.getMonth() + 1;
    return `${year}년 ${month}월`;
  };

  // 달력 날짜 생성
  const getCalendarDays = (type, selectedDate = null) => {
    let date;
    if (type === 'start') {
      date = startDatePickerDate;
    } else if (type === 'end') {
      date = endDatePickerDate;
    } else if (type === 'issue') {
      date = issueDatePickerDate;
    } else if (type === 'payment') {
      date = paymentDatePickerDate;
    } else if (type === 'detailStart') {
      date = detailStartDatePickerDate;
    } else if (type === 'detailEnd') {
      date = detailEndDatePickerDate;
    }
    
    const year = date.getFullYear();
    const month = date.getMonth();
    
    const firstDay = new Date(year, month, 1);
    const startDate = new Date(firstDay);
    startDate.setDate(startDate.getDate() - firstDay.getDay());
    
    const days = [];
    // 한국 시간 기준으로 오늘 날짜 생성 (이미 한국 시간으로 초기화됨)
    const today = getCurrentKoreaDate();
    
    // 선택된 날짜를 Date 객체로 변환 (한국 시간대 기준)
    let selectedDateObj = null;
    if (selectedDate) {
      if (typeof selectedDate === 'string' && selectedDate.includes('-')) {
        // YYYY-MM-DD 형식
        const [year, month, day] = selectedDate.split('-').map(Number);
        const tempDate = new Date(year, month - 1, day);
        const koreaTime = new Date(tempDate.toLocaleString("en-US", {timeZone: "Asia/Seoul"}));
        selectedDateObj = new Date(koreaTime.getFullYear(), koreaTime.getMonth(), koreaTime.getDate());
      } else if (typeof selectedDate === 'number') {
        // YYYYMMDD 형식
        const dateStr = selectedDate.toString();
        if (dateStr.length === 8) {
          const year = parseInt(dateStr.substring(0, 4));
          const month = parseInt(dateStr.substring(4, 6));
          const day = parseInt(dateStr.substring(6, 8));
          const tempDate = new Date(year, month - 1, day);
          const koreaTime = new Date(tempDate.toLocaleString("en-US", {timeZone: "Asia/Seoul"}));
          selectedDateObj = new Date(koreaTime.getFullYear(), koreaTime.getMonth(), koreaTime.getDate());
        }
      }
    }
    
    for (let i = 0; i < 42; i++) {
      const currentDate = new Date(startDate);
      currentDate.setDate(startDate.getDate() + i);
      
      const isCurrentMonth = currentDate.getMonth() === month;
      // 한국 시간 기준으로 오늘 날짜 비교
      const isToday = currentDate.toDateString() === today.toDateString();
      // 선택된 날짜와 비교
      const isSelected = selectedDateObj ? currentDate.toDateString() === selectedDateObj.toDateString() : false;
      
      days.push({
        day: currentDate.getDate(),
        date: currentDate,
        isCurrentMonth,
        isToday,
        isSelected
      });
    }
    
    return days;
  };

  // 오늘 날짜로 이동
  const goToToday = (type) => {
    const today = getCurrentKoreaDate();
    
    if (type === 'start') {
      setStartDatePickerDate(today);
    } else if (type === 'end') {
      setEndDatePickerDate(today);
    } else if (type === 'issue') {
      setIssueDatePickerDate(today);
    } else if (type === 'payment') {
      setPaymentDatePickerDate(today);
    } else if (type === 'detailStart') {
      setDetailStartDatePickerDate(today);
    } else if (type === 'detailEnd') {
      setDetailEndDatePickerDate(today);
    }
  };

  // 달력 닫기
  const closeAllCalendars = () => {
    setShowStartDatePicker(false);
    setShowEndDatePicker(false);
    setShowIssueDatePicker(false);
    setShowPaymentDatePicker(false);
    setShowDetailStartDatePicker(false);
    setShowDetailEndDatePicker(false);
  };

  // 통합된 날짜 처리 함수들
  const formatDate = (dateValue) => {
    if (!dateValue) return '-';
    
    try {
      // 8자리 숫자 형식 (YYYYMMDD)을 YYYY-MM-DD로 변환
      if (typeof dateValue === 'number' && dateValue.toString().length === 8) {
        const dateStr = dateValue.toString();
        return `${dateStr.substring(0, 4)}-${dateStr.substring(4, 6)}-${dateStr.substring(6, 8)}`;
      } 
      // 이미 YYYY-MM-DD 형식인 경우 - 그대로 반환
      else if (typeof dateValue === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(dateValue)) {
        return dateValue;
      } 
      // ISO 날짜 형식 또는 다른 형식 - 단순 변환
      else {
        const date = new Date(dateValue);
        if (isNaN(date.getTime())) return '-';
        
        // 단순 날짜 추출 (시간대 변환 없음)
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
      }
    } catch (error) {
      console.error('날짜 형식 변환 오류:', error, dateValue);
      return '-';
    }
  };

  // 현재 날짜 반환
  const getKoreaDate = () => {
    return new Date();
  };

  // 현재 년월 반환
  const getKoreaYearMonth = () => {
    const date = new Date();
    return {
      year: date.getFullYear(),
      month: date.getMonth() + 1
    };
  };

  // 날짜를 Date 객체로 변환
  const parseKoreaDate = (dateValue) => {
    if (!dateValue || dateValue === null || dateValue === undefined) return null;
    
    try {
      if (typeof dateValue === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(dateValue)) {
        // YYYY-MM-DD 형식
        const [year, month] = dateValue.split('-').map(Number);
        return new Date(year, month - 1);
      } else if (typeof dateValue === 'number' && dateValue.toString().length === 8) {
        // YYYYMMDD 형식
        const dateStr = dateValue.toString();
        const year = parseInt(dateStr.substring(0, 4));
        const month = parseInt(dateStr.substring(4, 6));
        return new Date(year, month - 1);
      } else if (typeof dateValue === 'string' && dateValue.length > 0) {
        // 다른 문자열 형식 - 안전한 변환
        const date = new Date(dateValue);
        if (isNaN(date.getTime())) return null;
        return date;
      } else if (dateValue instanceof Date) {
        // Date 객체
        return dateValue;
      } else {
        // 예상하지 못한 타입
        console.warn('예상하지 못한 날짜 타입:', typeof dateValue, dateValue);
        return null;
      }
    } catch (error) {
      console.error('날짜 파싱 오류:', error, dateValue);
      return null;
    }
  };

  // 두 날짜가 같은 년월인지 확인
  const isSameKoreaYearMonth = (date1, date2) => {
    const date1Obj = parseKoreaDate(date1);
    const date2Obj = parseKoreaDate(date2);
    
    if (!date1Obj || !date2Obj) return false;
    
    return date1Obj.getFullYear() === date2Obj.getFullYear() && 
           date1Obj.getMonth() === date2Obj.getMonth();
  };

  // 현재 년월과 같은지 확인
  const isCurrentKoreaYearMonth = (dateValue) => {
    const dateObj = parseKoreaDate(dateValue);
    if (!dateObj) return false;
    
    const current = getKoreaYearMonth();
    return dateObj.getFullYear() === current.year && 
           dateObj.getMonth() + 1 === current.month;
  };


  const convertTo8Digit = (dateValue) => {
    if (!dateValue) return null;
    
    try {
      if (typeof dateValue === 'number' && dateValue.toString().length === 8) {
        return dateValue;
      } else if (typeof dateValue === 'string' && /^\d{8}$/.test(dateValue)) {
        return parseInt(dateValue);
      } else if (typeof dateValue === 'string' && dateValue.includes('-')) {
        return parseInt(dateValue.replace(/-/g, ''));
      } else {
        const date = new Date(dateValue);
        if (isNaN(date.getTime())) return null;
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        return parseInt(`${year}${month}${day}`);
      }
    } catch (error) {
      console.error('8자리 날짜 변환 오류:', error, dateValue);
      return null;
    }
  };

  const formatDateForInput = (dateValue) => {
    if (!dateValue) return '';
    
    // 이미 YYYY-MM-DD 형식인 경우
    if (typeof dateValue === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(dateValue)) {
      return dateValue;
    }
    // ISO 문자열(예: 2025-10-20T00:00:00.000Z)인 경우 Date로 변환 후 YYYY-MM-DD 반환
    if (typeof dateValue === 'string' && /T\d{2}:\d{2}:\d{2}/.test(dateValue)) {
      const d = new Date(dateValue);
      if (!isNaN(d.getTime())) {
        const y = d.getFullYear();
        const m = String(d.getMonth() + 1).padStart(2, '0');
        const day = String(d.getDate()).padStart(2, '0');
        return `${y}-${m}-${day}`;
      }
    }
    
    // 8자리 숫자 형식인 경우
    if (typeof dateValue === 'number' && dateValue.toString().length === 8) {
      const dateStr = dateValue.toString();
      return `${dateStr.substring(0, 4)}-${dateStr.substring(4, 6)}-${dateStr.substring(6, 8)}`;
    }
    
    // Date 객체인 경우
    if (dateValue instanceof Date && !isNaN(dateValue.getTime())) {
      const year = dateValue.getFullYear();
      const month = String(dateValue.getMonth() + 1).padStart(2, '0');
      const day = String(dateValue.getDate()).padStart(2, '0');
      return `${year}-${month}-${day}`;
    }
    
    return '';
  };

  // UserDetailModal.js의 날짜 입력 처리 로직 통합
  const handleDateInputChange = (field, value, setStateFunction) => {
    // 빈 값 처리
    if (!value || value.trim() === '') {
      setStateFunction(prev => {
        const updated = { ...prev, [field]: '' };
        return updated;
      });
      return;
    }

    // 정확한 YYYY-MM-DD 형식인 경우에만 그대로 저장
    if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
      setStateFunction(prev => {
        const updated = { ...prev, [field]: value };
        return updated;
      });
      return;
    }
    
    // 숫자만 입력 허용 (하이픈 제거)
    const numericValue = value.replace(/\D/g, '');
    
    // 8자리 초과면 8자리까지만 자르기
    const limitedNumericValue = numericValue.substring(0, 8);
    
    setStateFunction(prev => {
      let updatedValue = limitedNumericValue;
      
      // 8자리 완성되면 YYYY-MM-DD 형식으로 변환
      if (limitedNumericValue.length === 8) {
        const year = limitedNumericValue.substring(0, 4);
        const month = limitedNumericValue.substring(4, 6);
        const day = limitedNumericValue.substring(6, 8);
        
        // 유효한 날짜인지 확인
        const date = new Date(year, month - 1, day);
        if (date.getFullYear() === parseInt(year) && date.getMonth() === parseInt(month) - 1 && date.getDate() === parseInt(day)) {
          updatedValue = `${year}-${month}-${day}`;
        } else {
          // 유효하지 않은 날짜면 숫자 그대로 저장
          updatedValue = limitedNumericValue;
        }
      }
      
      const updated = { ...prev, [field]: updatedValue };
      return updated;
    });
  };

  return {
    // 상태들
    showStartDatePicker,
    setShowStartDatePicker,
    showEndDatePicker,
    setShowEndDatePicker,
    showIssueDatePicker,
    setShowIssueDatePicker,
    showPaymentDatePicker,
    setShowPaymentDatePicker,
    showDetailStartDatePicker,
    setShowDetailStartDatePicker,
    showDetailEndDatePicker,
    setShowDetailEndDatePicker,
    calendarPosition,
    startDatePickerDate,
    endDatePickerDate,
    issueDatePickerDate,
    paymentDatePickerDate,
    detailStartDatePickerDate,
    detailEndDatePickerDate,
    
    // 함수들
    getCurrentKoreaDate,
    calculateCalendarPosition,
    handleOpenCalendar,
    handleDateSelect,
    handleMonthChange,
    getCurrentMonthYear,
    getCalendarDays,
    goToToday,
    closeAllCalendars,
    handleDateInputChange,
    
    // 통합된 날짜 처리 함수들
    formatDate,
    convertTo8Digit,
    formatDateForInput,
    
    // 한국 시간대 기준 공통 함수들
    getKoreaDate,
    getKoreaYearMonth,
    parseKoreaDate,
    isSameKoreaYearMonth,
    isCurrentKoreaYearMonth
  };
};
