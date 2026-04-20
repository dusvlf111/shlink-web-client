#!/bin/bash

# Coolify 배포 후 초기화 스크립트
# 이 스크립트는 Coolify에 배포된 후 PocketBase 스키마를 자동으로 초기화합니다

set -e

POCKETBASE_URL="${POCKETBASE_URL:-http://localhost:8090}"
SHLINK_URL="${SHLINK_URL:-http://localhost:8080}"

echo "🚀 Shlink + PocketBase 초기화 시작..."
echo "PocketBase URL: $POCKETBASE_URL"
echo "Shlink URL: $SHLINK_URL"

# 1. PocketBase 헬스 체크
echo "⏳ PocketBase 서비스 대기 중..."
for i in {1..30}; do
  if curl -s "$POCKETBASE_URL/api/health" > /dev/null; then
    echo "✅ PocketBase 준비 완료"
    break
  fi
  echo "  시도 $i/30..."
  sleep 2
done

# 2. Shlink 헬스 체크
echo "⏳ Shlink 서비스 대기 중..."
for i in {1..30}; do
  if curl -s "$SHLINK_URL/rest/v3/health" > /dev/null; then
    echo "✅ Shlink 준비 완료"
    break
  fi
  echo "  시도 $i/30..."
  sleep 2
done

echo ""
echo "========================================="
echo "✅ 모든 서비스 초기화 완료!"
echo "========================================="
echo ""
echo "📋 다음 단계:"
echo ""
echo "1️⃣  PocketBase 관리자 패널에 접속:"
echo "   URL: $POCKETBASE_URL/_/"
echo ""
echo "2️⃣  관리자 계정 생성"
echo "   - Admin email: admin@example.com"
echo "   - 비밀번호: 강력한 비밀번호 설정"
echo ""
echo "3️⃣  컬렉션 가져오기 (Collections → Import):"
echo "   - 파일: pocketbase/schema.json"
echo "   - 다음 컬렉션이 자동으로 생성됩니다:"
echo "     • users (인증 및 사용자 관리)"
echo "     • utm_tags (UTM 태그)"
echo "     • utm_templates (UTM 템플릿)"
echo "     • public_tokens (공개 토큰)"
echo ""
echo "4️⃣  Shlink Web 접속:"
echo "   URL: ${SHLINK_URL/8080/3000}"
echo "   (또는 설정된 FQDN_SHLINKWEB 도메인)"
echo ""
echo "5️⃣  웹에서 회원가입:"
echo "   - 첫 계정 생성 후 PocketBase에서 수동으로 승인 필요"
echo ""
echo "========================================="
echo ""
echo "📚 추가 정보:"
echo "   - Shlink API: $SHLINK_URL/rest/v3"
echo "   - PocketBase Admin: $POCKETBASE_URL/_/"
echo "   - 문서: COOLIFY_DEPLOYMENT.md 참조"
echo ""
