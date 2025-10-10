const express = require('express');
const router = express.Router();
const TaxInvoiceService = require('../services/taxInvoiceService');
const { handleApiError } = require('../utils/helpers');

// 세금계산서 알림 설정 조회 API
router.get('/', async (req, res) => {
  try {
    const settings = await TaxInvoiceService.getSettings();
    
    res.json({
      success: true,
      settings: settings
    });
  } catch (error) {
    handleApiError(res, error, '세금계산서 설정 조회 실패');
  }
});

// 세금계산서 알림 설정 추가 API
router.post('/', async (req, res) => {
  try {
    const { company_name, day_of_month } = req.body;
    
    if (!company_name || !day_of_month) {
      return res.status(400).json({
        success: false,
        error: '회사명과 발행일을 모두 입력해주세요.'
      });
    }
    
    const result = await TaxInvoiceService.createSetting(company_name, day_of_month);
    
    res.json({
      success: true,
      message: '세금계산서 알림 설정이 추가되었습니다.',
      id: result.insertId
    });
  } catch (error) {
    if (error.message.includes('이미 동일한')) {
      res.status(400).json({
        success: false,
        error: error.message
      });
    } else {
      handleApiError(res, error, '세금계산서 설정 추가 실패');
    }
  }
});

// 세금계산서 알림 설정 수정 API
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { company_name, day_of_month, is_active } = req.body;
    
    const result = await TaxInvoiceService.updateSetting(id, company_name, day_of_month, is_active);
    
    if (result.affectedRows > 0) {
      res.json({
        success: true,
        message: '세금계산서 알림 설정이 수정되었습니다.'
      });
    } else {
      res.status(404).json({
        success: false,
        error: '설정을 찾을 수 없습니다.'
      });
    }
  } catch (error) {
    handleApiError(res, error, '세금계산서 설정 수정 실패');
  }
});

// 세금계산서 알림 설정 삭제 API
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    const result = await TaxInvoiceService.deleteSetting(id);
    
    if (result.affectedRows > 0) {
      res.json({
        success: true,
        message: '세금계산서 알림 설정이 삭제되었습니다.'
      });
    } else {
      res.status(404).json({
        success: false,
        error: '설정을 찾을 수 없습니다.'
      });
    }
  } catch (error) {
    handleApiError(res, error, '세금계산서 설정 삭제 실패');
  }
});

module.exports = router;


