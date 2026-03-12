---
description: 운영 서버 빌드 실행 및 완료 확인 방법
---

## 빌드 실행 및 확인

// turbo-all

1. 빌드 전 기존 build 폴더 타임스탬프를 기록합니다:
```bash
stat /home/ubuntu/Marketing/build/index.html 2>/dev/null | grep Modify
```

2. 빌드를 실행합니다 (백그라운드로 실행하고 완료 대기):
```bash
cd /home/ubuntu/Marketing && npm run build 2>&1 | tail -20
```
- `WaitMsBeforeAsync`를 **10000** (10초)으로 설정
- 이후 `command_status`로 **최대 2회**만 폴링 (각 60초)

3. 폴링 2회 후에도 출력이 없으면, 빌드 완료 여부를 **타임스탭프로 직접 확인**합니다:
```bash
stat /home/ubuntu/Marketing/build/index.html 2>/dev/null | grep Modify
```
- 1단계에서 기록한 타임스탬프보다 **새로우면** → 빌드 성공
- **동일하거나 파일이 없으면** → 빌드 미완료 또는 실패 → 잠시 더 대기 후 재확인

4. 빌드 성공 확인 후 사용자에게 결과를 보고합니다.

## 주의사항
- `command_status` 폴링을 무한 반복하지 말 것
- 2회 폴링 후 반드시 타임스탬프 확인으로 전환할 것
