// 공통 로거
const logger = {
  success: (message) => console.log(`✅ ${message}`),
  error: (message, error) => console.error(`❌ ${message}:`, error),
  info: (message) => console.log(`ℹ️ ${message}`),
  warning: (message) => console.log(`⚠️ ${message}`)
};

module.exports = { logger };


