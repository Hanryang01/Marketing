// 요금제 데이터 상수
export const PRICING_PLANS = {
  general: [
    {
      id: 'free',
      name: '무료',
      price: '월 0원',
      features: [
        '근골격계 근로자 부담작업 관리',
        '제한 없는 MSDS 등록',
        '물질 규제정보 조회',
        '물질 고독성 정보 조회',
        'AI 보고서 생성 (최초 1회)'
      ]
    },
    {
      id: 'standard',
      name: '스탠다드',
      price: '월 100,000원',
      features: [
        '단일 사업장 특화 관리 시스템',
        '베이직의 기본기능 포함',
        '(고객사 관리기능 제외)',
        '조사/평가 (월 2건)',
        'AI 보고서 생성(월 2회)'
      ]
    },
    {
      id: 'premium',
      name: '프리미엄',
      price: '월 200,000원',
      features: [
        '스탠다드 모든 기능 포함',
        '조사/평가 (월 6건)',
        'AI 보고서 생성 (월 6회)'
      ]
    }
  ],
  consulting: [
    {
      id: 'consulting_free',
      name: '무료',
      price: '월 0원',
      features: [
        '고객사 관리 페이지 제공',
        '근골격계 근로자 부담작업 관리',
        '제한 없는 MSDS 등록',
        '화학물질 정보 조회',
        '조사/평가 (최초 1회)',
        'AI 보고서 생성 (최초 1회)'
      ]
    },
    {
      id: 'consulting_standard',
      name: '스탠다드',
      price: '월 300,000원',
      features: [
        '베이직의 모든 기능 포함',
        '조사/평가 (월 10건)',
        'AI 보고서 생성 (월 10회)'
      ]
    },
    {
      id: 'consulting_premium',
      name: '프리미엄',
      price: '월 600,000원',
      features: [
        '스탠다드 모든 기능 포함',
        '조사/평가 (월 30건)',
        'AI 보고서 생성 (월 30회)'
      ]
    }
  ]
};

// 기본 요금제 ID 매핑
export const DEFAULT_PLANS = {
  general: 'standard',
  consulting: 'consulting_standard'
};
