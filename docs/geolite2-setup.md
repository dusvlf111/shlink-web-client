# GeoLite2 City 설정 가이드

통계 공유 페이지의 **국가 / 도시 / 지도** 가 표시되려면 Shlink 서버가
방문자 IP 를 위치로 변환할 수 있어야 합니다. Shlink 는 **MaxMind GeoLite2 City**
데이터베이스를 사용하는데, 이 DB 는 무료지만 라이센스 키가 필요합니다.

## 한 줄 요약

1. MaxMind 무료 가입 → 라이센스 키 발급
2. Coolify 환경변수 `GEOLITE_LICENSE_KEY` 에 그 키 등록
3. Shlink 컨테이너 재시작
4. 기존 방문은 한 번 수동으로 `shlink visit:locate` 실행 (또는 cron)

전체 단계는 5~10 분.

---

## 1. MaxMind 라이센스 키 발급 (무료)

1. <https://www.maxmind.com/en/geolite2/signup> 접속
2. 이름 / 이메일 / 회사 / 사용 목적 입력 후 **Continue**
   - "Intended Use of MaxMind Products" 는 `Other` 또는 본인 상황에 맞춰
   - 약관 체크 → **Continue**
3. 이메일로 비밀번호 설정 링크 도착 → 비밀번호 만든 뒤 로그인
4. 좌측 메뉴 **My License Keys** → **Generate new license key**
5. 다이얼로그에서:
   - **Description**: `shlink-letscareer` (구분만 가능하면 OK)
   - **Will this key be used for GeoIP Update?** → **Yes**
6. 발급된 키 복사 (한 번만 표시되므로 안전한 곳에 저장)

> 키는 `40자 hex` 비슷한 문자열입니다. 외부에 노출되면 다른 사람이 쓸 수 있으니
> Git 에 커밋하지 마세요. `.env.coolify.example` 에는 빈 값으로 두고 실제 키는
> Coolify 환경변수에서만 관리합니다.

---

## 2. Coolify 환경변수 등록

배포 환경(Coolify, Docker Compose 어느 쪽이든) 에서 다음 환경변수를 설정합니다.

### Coolify 대시보드
1. 프로젝트 → 해당 Shlink 서비스 → **Environment Variables** 탭
2. **Add new** 클릭
3. Key: `GEOLITE_LICENSE_KEY` / Value: `<발급받은 키>`
4. **Save** → 우측 상단 **Redeploy**

### docker-compose 직접 사용 시
프로젝트 root 의 `.env` 또는 `.env.local` 에:
```env
GEOLITE_LICENSE_KEY=발급받은_키
```
그 후 컨테이너 재시작:
```bash
docker compose down shlink
docker compose up -d shlink
```

본 저장소의 `docker-compose.yaml` 은 이미 `GEOLITE_LICENSE_KEY=${GEOLITE_LICENSE_KEY:-}` 매핑이 들어가 있으므로 환경변수만 채우면 됩니다.

---

## 3. Shlink 가 DB 다운로드했는지 확인

Shlink 컨테이너 재시작 후 약 10~30 초 안에 GeoLite2 DB 를 자동 다운로드합니다.
로그로 확인:

```bash
docker logs shlink-backend 2>&1 | grep -iE 'geolite|download|maxmind' | tail
```

성공 메시지 예시:
```
Downloading GeoLite2 db... [OK]
GeoLite2 database properly updated to version <date>
```

실패 패턴:
| 메시지 | 원인 / 조치 |
|--------|-------------|
| `License key is required` | `GEOLITE_LICENSE_KEY` 환경변수 미설정 또는 빈 값 |
| `Invalid license key` | 키 오타. MaxMind 콘솔에서 다시 복사 |
| `Could not connect to MaxMind` | 컨테이너의 outbound 네트워크 차단. 방화벽 확인 |
| `not enough space` | 컨테이너 디스크 공간 부족 |

---

## 4. 기존 방문 위치 채우기

GeoLite2 가 활성화되기 *전에* 들어온 방문은 위치 정보가 비어 있습니다.
한 번 수동으로 일괄 위치 추적을 돌리세요.

```bash
# Coolify Terminal 또는 SSH 접근 가능한 환경에서
docker exec shlink-backend shlink visit:locate
```

진행 표시 예:
```
Processing visit "abc" from "203.0.113.10"...   [seoul, KR]
Processing visit "def" from "198.51.100.5"...   [tokyo, JP]
Done.
```

이후 들어오는 새 방문은 자동으로 위치가 붙습니다.

---

## 5. 작동 확인

1. 통계 공유 페이지(예: `/share/stats/<id>?token=...`) 새로고침
2. **위치** 탭 → 국가 도넛 / 도시 ranking 에 실제 국가/도시 표시
3. **방문 기록** 탭 → 각 행에 국가 / 도시 채워짐

여전히 `(알 수 없음)` 만 보이면:
- Shlink admin API 직접 호출로 데이터 자체에 위치가 없는 것인지 확인
  ```bash
  curl -H 'X-Api-Key: <키>' \
    'https://l.letscareer.co.kr/rest/v3/short-urls/abc/visits?itemsPerPage=5' \
    | jq '.visits.data[].visitLocation'
  ```
  결과가 `null` 이거나 `{ "isEmpty": true }` 면 Shlink 가 아직 위치를 못 찾은 것 → 위 4단계 재실행
- 결과에 `countryName` 등이 있으면 클라이언트 표시 문제 → 별도 보고

---

## 보안 메모

- 라이센스 키는 비밀입니다. 코드/문서/스크린샷에 평문 노출 금지
- Coolify 의 환경변수 또는 비밀 저장소(예: Vault) 만 사용
- 회전(rotate) 가능 — MaxMind 콘솔에서 새 키 발급 후 환경변수 갱신 → 컨테이너 재시작
