# Coolify 배포 설정 가이드

## 개요
이 docker-compose 파일은 Coolify에서 다음 4개 서비스를 배포합니다:
1. **PostgreSQL** - Shlink 데이터 저장소
2. **Shlink Backend** - URL 단축 서비스
3. **PocketBase** - 사용자 인증 및 관리
4. **Shlink Web Client** - 웹 인터페이스

## Coolify 환경 변수 설정

Coolify 대시보드에서 다음 환경 변수를 설정하세요:

### 필수 변수

```
SERVICE_PASSWORD_POSTGRES=강력한_비밀번호_입력

SERVICE_BASE64_SHLINKAPIKEY=Base64로_인코딩된_API키
# 예시: echo -n "your-secret-key" | base64

SERVICE_FQDN_SHLINK=your-shlink-domain.com
SERVICE_FQDN_POCKETBASE=your-pocketbase-domain.com
SERVICE_FQDN_SHLINKWEB=your-shlink-web-domain.com

IS_HTTPS_ENABLED=false  # 기본값. Coolify가 SSL 처리하면 true로 변경
```

### 자동 생성 변수 (Coolify가 자동으로 설정)

```
SERVICE_URL_SHLINK_8080=http://shlink:8080  # 또는 SERVICE_FQDN_SHLINK에서 자동 생성
SERVICE_URL_SHLINKWEB_8080=http://shlink-web:8080  # 또는 SERVICE_FQDN_SHLINKWEB에서 자동 생성
SERVICE_URL_POCKETBASE_8090=http://pocketbase:8090  # 또는 SERVICE_FQDN_POCKETBASE에서 자동 생성
```

## 배포 단계

### 1단계: Docker Compose 파일 업로드
- `docker-compose.coolify.yml` 파일을 Coolify 프로젝트에 업로드
- 파일명을 `docker-compose.yml`로 변경하거나 Coolify에서 이 파일을 선택

### 2단계: 환경 변수 설정
1. Coolify 대시보드 → Project Settings
2. Environment Variables 탭에서 위의 필수 변수들을 입력
3. 저장

### 3단계: 배포 시작
1. Deploy 버튼 클릭
2. 모든 서비스가 healthy 상태가 될 때까지 대기 (약 1-2분)

### 4단계: PocketBase 초기 설정
1. `http://your-pocketbase-domain.com/_/` 에 접속
2. 관리자 계정 생성
3. Collections 가져오기:
   - Settings → Import collections
   - `/pocketbase/schema.json` 파일 내용 복사 후 붙여넣기
   - Import 클릭

### 5단계: Shlink Web Client 설정
1. `http://your-shlink-web-domain.com` 에 접속
2. 첫 번째 사용자 가입 (admin으로 승인될 예정)
3. PocketBase 설정 완료 후 로그인

## 서비스 포트 매핑

| 서비스 | 컨테이너 포트 | Coolify 외부 포트 | 용도 |
|--------|--------------|-------------------|------|
| PostgreSQL | 5432 | 5432 | 내부 전용 |
| Shlink | 8080 | 8080 | API 엔드포인트 |
| PocketBase | 8090 | 8090 | 인증 서버 |
| Shlink Web | 8080 | 3000 | 웹 인터페이스 |

## 서비스 간 통신

모든 서비스는 같은 Docker 네트워크(`shlink-network`)에 연결되므로:
- Shlink Web은 `http://shlink:8080`으로 Shlink 접근
- Shlink Web은 `http://pocketbase:8090`으로 PocketBase 접근
- Shlink는 `postgres` 호스트명으로 DB 접근

## 데이터 지속성

다음 볼륨이 자동으로 생성되고 관리됩니다:
- `postgres-data` - PostgreSQL 데이터
- `shlink-data` - Shlink 설정 및 QR 코드
- `pocketbase-data` - PocketBase 데이터 및 파일

## 문제 해결

### 서비스가 시작되지 않는 경우
1. Coolify 로그 확인: Dashboard → Logs
2. 환경 변수가 올바르게 설정되었는지 확인
3. 포트 충돌 확인 (이미 사용 중인 포트 없는지)

### PocketBase에 접근할 수 없는 경우
1. PocketBase 서비스 health check 확인
2. 방화벽 규칙에서 8090 포트 허용
3. DNS 설정 확인

### Shlink Web에서 API 호출 실패
1. Shlink 서비스 health check 확인
2. `SHLINK_SERVER_URL` 환경 변수 확인
3. `SHLINK_SERVER_API_KEY` (Base64 인코딩) 확인

## 보안 권장사항

1. **데이터베이스 비밀번호**: 강력한 비밀번호 사용 (최소 16자)
2. **API 키**: 충분히 길고 복잡한 문자열 사용
3. **HTTPS**: 프로덕션 환경에서는 Coolify의 SSL/TLS 설정 활성화
4. **방화벽**: 필요한 포트만 공개 (8080, 8090, 3000)

## 백업

1. **데이터베이스 백업**: PostgreSQL 데이터는 `postgres-data` 볼륨에 저장
2. **PocketBase 백업**: `pocketbase-data` 볼륨에 저장
3. **Shlink 설정 백업**: `shlink-data` 볼륨에 저장

정기적인 백업을 위해 Coolify의 백업 기능을 사용하세요.

## 스케일링

이 구성은 소규모~중규모 트래픽을 처리할 수 있습니다:
- PostgreSQL: 기본 설정으로 충분
- Shlink: 필요시 `deployment.replicas` 조정
- PocketBase: 단일 인스턴스로 충분

대규모 트래픽은 각 서비스의 리소스 할당을 증가시키거나 로드 밸런서 추가 필요.
