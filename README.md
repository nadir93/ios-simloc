# ios-simloc

Node.js에서 **pymobiledevice3**를 이용해 iPhone **Simulated Location**을 자동화합니다.  
터널 기동 → 위치 주입 → 원복까지 한 번에 수행할 수 있습니다.

## 요구사항
- macOS 권장
- Python 3, pip
- `pip install -U pymobiledevice3`
- iPhone: **Developer Mode 활성화** 및 **이 컴퓨터 신뢰(Trust)** 완료
- USB 연결 권장

## 설치
```bash
git clone https://github.com/nadir93 ios-simloc
cd ios-simloc
npm install

## 사용법
```bash
# 위치 설정
node src/ios-location.js --lat 37.56478 --lon 126.9912

# 원복 (pymobiledevice3 버전에 따라 'reset' 또는 'clear' 사용)
node src/ios-location.js --reset

# 이미 tunneld가 떠있으면
node src/ios-location.js --no-tunnel --lat <lat> --lon <lon>

# 컨피그 파일에서 기본값 읽기
# 우선순위: --config 경로 > ./ios-simloc.config.json > ./config.json > ~/.ios-simloc.json
# 예) 현재 폴더의 config.json 사용
node src/ios-location.js --config config.json
```

## 컨피그 예시 (config.json)
```json
{
  "lat": 37.56478,
  "lon": 126.9912,
  "host": "127.0.0.1",
  "port": 49151
}
```

## 참고
- 일부 `pymobiledevice3` 버전에서는 `developer dvt simulate-location`의 원복 서브커맨드가 `reset`가 아닌 `clear`입니다.
  본 스크립트는 `reset → clear → unset → stop` 순으로 자동 시도합니다.
  지원 커맨드는 `pymobiledevice3 developer dvt simulate-location -h`로 확인하세요.
