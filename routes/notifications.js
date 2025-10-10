const express = require('express');
const router = express.Router();
const NotificationService = require('../services/notificationService');

// 알림 목록 조회
router.get('/', async (req, res) => {
  try {
    const result = await NotificationService.getNotifications();
    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// 알림 생성 (수동)
router.post('/create', async (req, res) => {
  try {
    const result = await NotificationService.createNotifications();
    res.json({
      success: result.success,
      message: result.message,
      count: result.count || 0,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});


// 알림 읽음 처리
router.put('/:id/read', async (req, res) => {
  try {
    const { id } = req.params;
    const result = await NotificationService.markAsRead(id);
    res.json({
      success: true,
      message: '알림이 읽음 처리되었습니다.',
      data: result
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// 알림 삭제
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const result = await NotificationService.deleteNotification(id);
    res.json({
      success: true,
      message: '알림이 삭제되었습니다.',
      data: result
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

module.exports = router;
