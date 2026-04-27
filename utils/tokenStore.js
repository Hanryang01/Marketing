/**
 * tokenStore.js
 * 서버 메모리 기반 토큰 저장소 (싱글턴)
 * server.js 와 routes/users.js 가 동일 인스턴스를 공유합니다.
 */
const crypto = require('crypto');

const validTokens = new Map(); // token -> { user, createdAt }
const TOKEN_TTL_MS = 24 * 60 * 60 * 1000; // 24시간

/** 암호학적으로 안전한 랜덤 토큰 생성 */
const generateToken = () => crypto.randomBytes(32).toString('hex');

/** 토큰 저장 */
const saveToken = (token, user) => {
  validTokens.set(token, { user, createdAt: Date.now() });
};

/** 토큰 삭제 (로그아웃) */
const deleteToken = (token) => {
  validTokens.delete(token);
};

/** 토큰 검증: 유효하면 { user } 반환, 아니면 null */
const verifyToken = (token) => {
  const data = validTokens.get(token);
  if (!data) return null;
  if (Date.now() - data.createdAt > TOKEN_TTL_MS) {
    validTokens.delete(token);
    return null;
  }
  return data;
};

// 만료 토큰 주기적 정리 (1시간마다)
setInterval(() => {
  const now = Date.now();
  for (const [token, data] of validTokens.entries()) {
    if (now - data.createdAt > TOKEN_TTL_MS) {
      validTokens.delete(token);
    }
  }
}, 60 * 60 * 1000);

module.exports = { generateToken, saveToken, deleteToken, verifyToken, TOKEN_TTL_MS };
