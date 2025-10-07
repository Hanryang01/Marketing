// 사업자등록번호 유틸리티 함수들

/**
 * 사업자등록번호를 XXX-XX-XXXXX 형식으로 포맷팅
 * @param {string} businessLicense - 사업자등록번호 (다양한 형식 가능)
 * @returns {string} - 포맷팅된 사업자등록번호 (XXX-XX-XXXXX) 또는 원본 데이터
 */
export const formatBusinessLicense = (businessLicense) => {
  if (!businessLicense) return '';
  
  // 숫자만 추출
  const numbers = businessLicense.replace(/\D/g, '');
  
  // 10자리가 아니면 원본 데이터 그대로 반환 (기존 데이터 보존)
  if (numbers.length !== 10) return businessLicense;
  
  // XXX-XX-XXXXX 형식으로 포맷팅
  return `${numbers.slice(0, 3)}-${numbers.slice(3, 5)}-${numbers.slice(5, 10)}`;
};

/**
 * 사업자등록번호에서 숫자만 추출
 * @param {string} businessLicense - 사업자등록번호
 * @returns {string} - 숫자만 추출된 문자열
 */
export const extractNumbersFromBusinessLicense = (businessLicense) => {
  if (!businessLicense) return '';
  return businessLicense.replace(/\D/g, '');
};

/**
 * 사업자등록번호 유효성 검사
 * @param {string} businessLicense - 사업자등록번호
 * @returns {boolean} - 유효한 사업자등록번호인지 여부
 */
export const isValidBusinessLicense = (businessLicense) => {
  if (!businessLicense) return true; // null 값 허용
  
  const numbers = extractNumbersFromBusinessLicense(businessLicense);
  return numbers.length === 10;
};

/**
 * 사업자등록번호 입력 처리 (숫자만 입력 허용, 정확히 10자리)
 * @param {string} value - 입력된 값
 * @returns {string} - 처리된 값
 */
export const handleBusinessLicenseInput = (value) => {
  // 숫자만 추출
  const numbers = value.replace(/\D/g, '');
  
  // 정확히 10자리로 제한 (10자리 초과 시 잘라냄)
  return numbers.slice(0, 10);
};

/**
 * 사업자등록번호 입력 시 실시간 유효성 검사 및 피드백
 * @param {string} value - 입력된 값
 * @returns {object} - { value: string, isValid: boolean, message: string }
 */
export const validateBusinessLicenseInput = (value) => {
  const numbers = value.replace(/\D/g, '');
  
  if (!value) {
    return {
      value: '',
      isValid: true,
      message: ''
    };
  }
  
  if (numbers.length === 0) {
    return {
      value: '',
      isValid: false,
      message: '숫자만 입력해주세요.'
    };
  }
  
  if (numbers.length < 10) {
    return {
      value: numbers,
      isValid: false,
      message: `${numbers.length}/10자리 (숫자만 입력)`
    };
  }
  
  if (numbers.length === 10) {
    return {
      value: numbers,
      isValid: true,
      message: '✓ 올바른 형식입니다.'
    };
  }
  
  // 10자리 초과 - 저장 불가
  return {
    value: numbers.slice(0, 10),
    isValid: false,
    message: '10자리를 초과했습니다. (숫자만 입력)'
  };
};
