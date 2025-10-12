const NotificationService = require('../services/notificationService');
const { logger } = require('./logger');
const DateUtils = require('./dateUtils');

class NotificationScheduler {
  constructor() {
    this.lastNotificationDate = null;
  }

  // 정기 배치 알림 생성 함수
  startScheduledNotifications() {
    logger.info('정기 배치 알림 시스템 시작...');
    logger.info(`스케줄러 초기화: lastNotificationDate = ${this.lastNotificationDate}`);
    
    // 매일 오전 9시에 알림 생성
    const runDailyNotification = () => {
      const todayString = DateUtils.getTodayString();
      
      // 오전 9시 이후에 알림 생성 (중복 방지는 Scheduler에서만 처리)
      if (DateUtils.isAfter9AM() && this.lastNotificationDate !== todayString) {
        logger.info('정기 배치 알림 생성 시작...');
        this.lastNotificationDate = todayString; // 오늘 날짜로 설정
        
        NotificationService.createNotifications()
          .then(result => {
            if (result.success) {
              logger.success(`정기 배치 알림 생성 완료: ${result.count}개 생성`);
            } else {
              logger.error(`정기 배치 알림 생성 실패: ${result.message}`);
            }
          })
          .catch(error => {
            logger.error('정기 배치 알림 생성 중 오류:', error);
          });
      } else if (DateUtils.isAfter9AM()) {
        logger.warning('오늘 이미 알림이 생성되었습니다. (중복 방지)');
      }
    };
    
    // 스마트 스케줄링: 상황에 따라 체크 주기 조정
    const scheduleNext = () => {
      const todayString = DateUtils.getTodayString();
      let interval;
      if (!DateUtils.isAfter9AM()) {
        // 9시 이전: 체크하지 않음 (요구사항)
        interval = 60 * 60 * 1000; // 1시간마다 체크 (9시가 되면 실행되도록)
      } else if (this.lastNotificationDate === todayString) {
        // 이미 실행됨: 24시간 후 체크 (다음날)
        interval = 24 * 60 * 60 * 1000;
      } else {
        // 9시 이후 아직 실행 안됨: 5분마다 체크
        interval = 5 * 60 * 1000;
      }
      
      this.hourlyCheck = setTimeout(() => {
        runDailyNotification();
        scheduleNext(); // 다음 스케줄 설정
      }, interval);
    };
    
    // 스케줄링 시작 (즉시 실행 제거)
    scheduleNext();
    
    logger.info('정기 배치 시스템이 설정되었습니다. (매일 오전 9시)');
    
    return this.hourlyCheck;
  }
}

module.exports = NotificationScheduler;


