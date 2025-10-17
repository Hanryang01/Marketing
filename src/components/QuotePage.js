import React, { useState, useEffect, useCallback } from 'react';
import './QuotePage.css';
import { PRICING_PLANS, DEFAULT_PLANS } from '../constants/pricingPlans';

const QuotePage = () => {
  const [companyType, setCompanyType] = useState('consulting');
  const [pricingPlan, setPricingPlan] = useState(DEFAULT_PLANS.consulting);
  const [paymentType, setPaymentType] = useState('annual');
  const [companyName, setCompanyName] = useState('');
  const [usagePeriod, setUsagePeriod] = useState(12);
  const [monthlyPrice, setMonthlyPrice] = useState(0);

  // 컴포넌트 마운트 확인
  useEffect(() => {
    console.log('✅ QuotePage 컴포넌트 마운트됨');
    return () => {
      console.log('❌ QuotePage 컴포넌트 언마운트됨');
    };
  }, []);

  // 월 요금 설정 공통 함수
  const updateMonthlyPrice = (plan) => {
    if (plan && plan.price !== '무료') {
      const price = parseInt(plan.price.replace(/[^0-9]/g, ''));
      setMonthlyPrice(price);
    } else {
      setMonthlyPrice(0);
    }
  };

  // 현재 요금제 목록 가져오기
  const getCurrentPlans = useCallback(() => {
    return PRICING_PLANS[companyType] || [];
  }, [companyType]);

  // 선택된 요금제 가져오기
  const getSelectedPlan = useCallback(() => {
    const plans = getCurrentPlans();
    return plans.find(plan => plan.id === pricingPlan);
  }, [getCurrentPlans, pricingPlan]);

  // 컴포넌트 마운트 시 초기 월 요금 설정
  useEffect(() => {
    const selectedPlan = getSelectedPlan();
    updateMonthlyPrice(selectedPlan);
  }, [companyType, pricingPlan, getSelectedPlan]);

  const handleCompanyTypeChange = (type) => {
    setCompanyType(type);
    // 업체 형태에 따라 적절한 기본 요금제 설정
    const planId = DEFAULT_PLANS[type];
    setPricingPlan(planId);
    // 월 요금 업데이트는 useEffect에서 자동 처리됨
  };

  const handlePricingPlanChange = (plan) => {
    setPricingPlan(plan);
    // 월 요금 업데이트는 useEffect에서 자동 처리됨
  };

  const handlePaymentTypeChange = (type) => {
    setPaymentType(type);
    // 결제 주기에 따라 사용기간 자동 설정
    setUsagePeriod(type === 'annual' ? 12 : 1);
  };

  const calculatePrice = () => {
    const selectedPlan = getSelectedPlan();
    if (!selectedPlan || !paymentType) return null;

    // 무료 요금제인 경우
    if (selectedPlan.price === '무료' || monthlyPrice === 0) {
      return {
        totalAmount: 0,
        annualDiscount: 0,
        supplyAmount: 0,
        vat: 0,
        finalAmount: 0
      };
    }

    const totalAmount = monthlyPrice * usagePeriod; // 전체 금액 = 월 요금 * 사용기간
    const annualDiscount = usagePeriod === 12 ? monthlyPrice * 2 : 0; // 연간 할인 (12개월일 경우 2개월 무료)
    const supplyAmount = totalAmount - annualDiscount; // 공급가액 = 전체금액 - 연간할인
    const vat = Math.round(supplyAmount * 0.1); // 부가세 = 공급가액 * 10%
    const finalAmount = supplyAmount + vat; // 견적금액 = 공급가액 + 부가세
    
    return {
      totalAmount,
      annualDiscount,
      supplyAmount,
      vat,
      finalAmount
    };
  };

  // PDF 생성 함수
  const generatePDF = async () => {
    try {
      // 현재 날짜 (YYYY-MM-DD 형식)
      const today = new Date();
      const year = today.getFullYear();
      const month = String(today.getMonth() + 1).padStart(2, '0');
      const day = String(today.getDate()).padStart(2, '0');
      const dateString = `${year}-${month}-${day}`;
      
      // 견적 정보
      const priceInfo = calculatePrice();
      const selectedPlan = getSelectedPlan();
      
      
      // 견적서 데이터 준비
      const quoteData = {
        // 날짜 (YYYY-MM-DD 형식)
        date: dateString,
        
        // 금액 (견적 금액) - 영어로 변환하여 인코딩 문제 해결
        amount: priceInfo ? priceInfo.finalAmount.toLocaleString() : '0',
        amountWithUnit: priceInfo ? `${priceInfo.finalAmount.toLocaleString()} KRW` : '0 KRW',
        
        // 서비스 정보
        serviceName: `SIHM (${selectedPlan?.name || ''}) (${companyType === 'consulting' ? '컨설팅업체' : '일반업체'})`,
        serviceType: companyType === 'consulting' ? '컨설팅업체' : '일반업체',
        planName: selectedPlan?.name || '',
        
        // 서비스 비용 (부가세 포함) - 영어로 변환하여 인코딩 문제 해결
        serviceCost: priceInfo ? `${priceInfo.finalAmount.toLocaleString()} KRW` : '0 KRW',
        
        // 서비스 기간
        servicePeriod: `${usagePeriod}개월`,
        servicePeriodFull: `From approval date: ${usagePeriod} months`,
        
        // 회사명
        companyName: companyName || '고객'
      };
      
      console.log('견적서 데이터:', quoteData);
      
      // 서버에서 PDF 생성 요청
      try {
        console.log('서버에서 PDF 생성 요청 시작...');
        
        const response = await fetch('http://localhost:3003/api/generate-pdf', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            companyName: companyName || '고객',
            date: dateString,
            priceInfo: priceInfo,
            selectedPlan: selectedPlan,
            companyType: companyType,
            usagePeriod: usagePeriod
          })
        });

        if (!response.ok) {
          throw new Error(`PDF 생성 실패: ${response.status}`);
        }

        const pdfBlob = await response.blob();
        console.log('서버에서 PDF 생성 완료');
        
        // PDF 다운로드
        const url = URL.createObjectURL(pdfBlob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `견적서_${companyName}_${dateString}.pdf`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
        
      } catch (pdfError) {
        console.error('PDF 템플릿 처리 중 오류:', pdfError);
        alert('견적서 생성 중 오류가 발생했습니다.');
      }
      
    } catch (error) {
      console.error('PDF 생성 중 오류:', error);
      alert('견적서 생성 중 오류가 발생했습니다.');
    }
  };

  const priceInfo = calculatePrice();

  return (
    <div className="quote-page">
      <div className="quote-container">
        <h1 className="quote-title">견적서</h1>
        
        {/* 결제형태 선택 */}
        <div className="quote-section">
          <h2 className="section-title">결제형태</h2>
          <div className="payment-type-buttons">
            <button
              className={`payment-type-btn ${paymentType === 'annual' ? 'active' : ''}`}
              onClick={() => handlePaymentTypeChange('annual')}
            >
              연간 결제 (2개월 무료)
            </button>
            <button
              className={`payment-type-btn ${paymentType === 'monthly' ? 'active' : ''}`}
              onClick={() => handlePaymentTypeChange('monthly')}
            >
              월간 결제
            </button>
          </div>
          
          {/* 업체형태 버튼을 다음 줄로 이동 */}
          <div className="company-type-buttons">
            <button
              className={`company-type-btn ${companyType === 'consulting' ? 'active' : ''}`}
              onClick={() => handleCompanyTypeChange('consulting')}
            >
              컨설팅 업체
            </button>
            <button
              className={`company-type-btn ${companyType === 'general' ? 'active' : ''}`}
              onClick={() => handleCompanyTypeChange('general')}
            >
              일반업체
            </button>
          </div>
        </div>

        {/* 요금제 선택 */}
        {companyType && (
          <div className="quote-section">
            <h2 className="section-title">요금제</h2>
            <div className="pricing-plans">
              {getCurrentPlans().map((plan) => (
                <div
                  key={plan.id}
                  className={`pricing-plan-card ${pricingPlan === plan.id ? 'selected' : ''}`}
                  onClick={() => handlePricingPlanChange(plan.id)}
                >
                  <div className="plan-header">
                    <h3 className="plan-name">{plan.name}</h3>
                    <div className="plan-price">{plan.price}</div>
                  </div>
                  <ul className="plan-features">
                    {plan.features.map((feature, index) => (
                      <li key={index} className="feature-item">
                        ✓ {feature}
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </div>
        )}


        {/* 견적 결과 */}
        {priceInfo && (
          <div className="quote-section">
            <h2 className="section-title">견적 결과</h2>
            <div className="quote-result">
              <div className="result-card">
                <h3>견적 정보</h3>
                <div className="quote-info">
                  <div className="info-row">
                    <label>업체명:</label>
                    <input
                      type="text"
                      value={companyName}
                      onChange={(e) => setCompanyName(e.target.value)}
                      placeholder="업체명을 입력하세요"
                      className="company-name-input"
                    />
                  </div>
                  <div className="info-row">
                    <label>업체 형태:</label>
                    <span className="info-value">
                      {companyType === 'general' ? '일반업체' : '컨설팅 업체'}
                    </span>
                  </div>
                  <div className="info-row">
                    <label>요금제:</label>
                    <span className="info-value">{getSelectedPlan()?.name}</span>
                  </div>
                  <div className="info-row">
                    <label>결제 주기:</label>
                    <span className="info-value">
                      {paymentType === 'monthly' ? '월간 결제' : '연간 결제'}
                    </span>
                  </div>
                  <div className="info-row">
                    <label>월 요금:</label>
                    <div className="price-input-container">
                      <input
                        type="text"
                        value={monthlyPrice.toLocaleString()}
                        onChange={(e) => {
                          const value = e.target.value.replace(/[^0-9]/g, '');
                          setMonthlyPrice(parseInt(value) || 0);
                        }}
                        className="monthly-price-input"
                        placeholder="월 요금을 입력하세요"
                      />
                      <span className="price-unit">원</span>
                    </div>
                  </div>
                  <div className="info-row">
                    <label>서비스 기간:</label>
                    <select
                      value={usagePeriod}
                      onChange={(e) => setUsagePeriod(parseInt(e.target.value))}
                      className="usage-period-select"
                      disabled={paymentType === 'annual'}
                    >
                      {Array.from({ length: 12 }, (_, i) => i + 1).map(month => (
                        <option key={month} value={month}>{month}개월</option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>
              
              <div className="result-card">
                <h3>결제 정보</h3>
                <div className="payment-info">
                  <div className="payment-row">
                    <span>전체 금액:</span>
                    <span>{priceInfo.totalAmount.toLocaleString()}원</span>
                  </div>
                  <div className="payment-row">
                    <span>연간 할인:</span>
                    <span>{priceInfo.annualDiscount > 0 ? `-${priceInfo.annualDiscount.toLocaleString()}원` : '0원'}</span>
                  </div>
                  <div className="payment-row">
                    <span>공급가액:</span>
                    <span>{priceInfo.supplyAmount.toLocaleString()}원</span>
                  </div>
                  <div className="payment-row">
                    <span>부가세 (10%):</span>
                    <span>{priceInfo.vat.toLocaleString()}원</span>
                  </div>
                  <div className="payment-row total">
                    <span>견적 금액:</span>
                    <span>{priceInfo.finalAmount.toLocaleString()}원</span>
                  </div>
                  <div className="quote-generate-btn-container">
                    <button className="quote-generate-btn" onClick={generatePDF}>
                      견적서 발행
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default QuotePage;
