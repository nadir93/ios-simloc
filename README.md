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
