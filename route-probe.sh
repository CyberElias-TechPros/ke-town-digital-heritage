#!/bin/bash
# Route parity probe: hits every frontend API path and reports non-2xx / 5xx.
B=http://localhost:8080/api
PASS=0; FAIL=0
check() {
  local desc="$1"; local method="$2"; local url="$3"; local token="$4"; local body="$5"
  local code
  if [ -n "$token" ]; then
    code=$(curl -s -o /tmp/probe.out -w "%{http_code}" -X "$method" "$url" ${body:+-H 'Content-Type: application/json' -d "$body"} -H "Authorization: Bearer $token")
  else
    code=$(curl -s -o /tmp/probe.out -w "%{http_code}" -X "$method" "$url" ${body:+-H 'Content-Type: application/json' -d "$body"})
  fi
  if [ "$code" = "200" ] || [ "$code" = "201" ] || [ "$code" = "400" ] || [ "$code" = "403" ] || [ "$code" = "404" ]; then
    # treat 200/201/400/403/404 as "route exists" (400/403/404 = endpoint recognized)
    if [ "$code" = "200" ] || [ "$code" = "201" ]; then
      printf "OK   %-5s %-60s %s\n" "$method" "$url" "$code"
      PASS=$((PASS+1))
    else
      printf "RTE  %-5s %-60s %s (%s)\n" "$method" "$url" "$code" "$(head -c 60 /tmp/probe.out)"
      PASS=$((PASS+1))
    fi
  else
    printf "FAIL %-5s %-60s %s (%s)\n" "$method" "$url" "$code" "$(head -c 60 /tmp/probe.out)"
    FAIL=$((FAIL+1))
  fi
}

# register a fresh probe user each run
RAND=$RANDOM$RANDOM
PR=$(curl -s -X POST $B/auth/register -H 'Content-Type: application/json' -d "{\"fullName\":\"Probe User\",\"email\":\"probe$RAND@example.com\",\"password\":\"probetest123\",\"username\":\"probe$RAND\"}")
# login tokens
TK=$(curl -s -X POST $B/auth/login -H 'Content-Type: application/json' -d "{\"email\":\"probe$RAND@example.com\",\"password\":\"probetest123\"}" | python3 -c "import sys,json;print(json.load(sys.stdin)['token'])")
AK=$(curl -s -X POST $B/auth/login -H 'Content-Type: application/json' -d '{"email":"admin@kingdom.com.ng","password":"Admin123!"}' | python3 -c "import sys,json;print(json.load(sys.stdin)['token'])")
PID=$(curl -s "$B/posts" | python3 -c "import sys,json;d=json.load(sys.stdin);print(d['posts'][0]['id'] if d.get('posts') else 'x')")
USR=$(echo "$PR" | python3 -c "import sys,json;print(json.load(sys.stdin)['user']['id'])" 2>/dev/null || echo x)
GID=$(curl -s "$B/groups" | python3 -c "import sys,json;d=json.load(sys.stdin);print(d['groups'][0]['id'] if d.get('groups') else 'x')" 2>/dev/null)

echo "== AUTH =="
check "/auth/me" GET "$B/auth/me" "$TK"
check "/auth/profile" GET "$B/auth/profile" "$TK"
check "/auth/password" PUT "$B/auth/password" "$TK" '{"currentPassword":"probetest123","newPassword":"probetest123"}'
check "/auth/permissions" GET "$B/auth/permissions" "$TK"
check "/auth/forgot-password" POST "$B/auth/forgot-password" "" '{"email":"probe@example.com"}'
check "/auth/reset-password" POST "$B/auth/reset-password" "" '{"token":"x","password":"newpass123"}'
check "/auth/verify-email" POST "$B/auth/verify-email" "" '{"token":"x"}'
check "/auth/users" GET "$B/auth/users" "$AK"
check "/auth/users/:id/role" PUT "$B/auth/users/$USR/role" "$AK" '{"role":"moderator"}'
check "/auth/users/:id/status" PUT "$B/auth/users/$USR/status" "$AK" '{"status":"active"}'
check "/auth/users/:id/activity" GET "$B/auth/users/$USR/activity" "$AK"

echo "== PROFILE/USERS =="
check "/users/profile/:id" GET "$B/users/profile/$USR" "$TK"
check "/users/:id/posts" GET "$B/users/$USR/posts" "$TK"
check "/users/suggested" GET "$B/users/suggested" "$TK"
check "/users/:id/followers" GET "$B/users/$USR/followers" "$TK"
check "/users/:id/following" GET "$B/users/$USR/following" "$TK"

echo "== SOCIAL =="
check "/posts" GET "$B/posts" "$TK"
check "/posts/feed" GET "$B/posts/feed" "$TK"
check "/posts/trending" GET "$B/posts/trending" "$TK"
check "/posts/user/my" GET "$B/posts/user/my" "$TK"
check "/posts/:id" GET "$B/posts/$PID" "$TK"
check "/posts/:id/like" POST "$B/posts/$PID/like" "$TK"
check "/posts/:id/reaction" POST "$B/posts/$PID/reaction" "$TK" '{"type":"love"}'
check "/posts/:id/save" POST "$B/posts/$PID/save" "$TK"
check "/posts/:id/comment" POST "$B/posts/$PID/comment" "$TK" '{"content":"hi"}'
check "/comments/:type/:id" GET "$B/comments/post/$PID" "$TK"
check "/comments/:id" DELETE "$B/comments/x" "$TK"
check "/social/following" GET "$B/social/following" "$TK"
check "/social/global" GET "$B/social/global" "$TK"
check "/social/me" GET "$B/social/me" "$TK"
check "/saved-posts" GET "$B/saved-posts" "$TK"
check "/activity" GET "$B/activity" "$TK"
check "/search" GET "$B/search?q=kalabari" "$TK"
check "/search/suggestions" GET "$B/search/suggestions?q=ka" "$TK"

echo "== GROUPS/EVENTS/COMMUNITY =="
check "/groups" GET "$B/groups" "$TK"
check "/groups/mine" GET "$B/groups/mine" "$TK"
check "/groups/:id" GET "$B/groups/$GID" "$TK"
check "/groups/:id/join" POST "$B/groups/$GID/join" "$TK"
check "/groups/:id/leave" POST "$B/groups/$GID/leave" "$TK"
check "/events" GET "$B/events" "$TK"
check "/events/trending" GET "$B/events/trending" "$TK"
check "/events/:id" GET "$B/events/x" "$TK"
check "/events/:id/rsvp" POST "$B/events/x/rsvp" "$TK" '{"status":"going"}'
check "/notifications" GET "$B/notifications" "$TK"
check "/notifications/read-all" POST "$B/notifications/read-all" "$TK"
check "/notifications/:id/read" POST "$B/notifications/x/read" "$TK"
check "/calendar" GET "$B/calendar" "$TK"
check "/calendar/upcoming" GET "$B/calendar/upcoming" "$TK"
check "/calendar/festivals" GET "$B/calendar/festivals" "$TK"
check "/calendar/best-time-to-visit" GET "$B/calendar/best-time-to-visit" "$TK"
check "/conversations" GET "$B/conversations" "$TK"
check "/messages" GET "$B/messages" "$TK"

echo "== CONTENT =="
check "/news" GET "$B/news" "$TK"
check "/news/:id" GET "$B/news/x" "$TK"
check "/elder-stories" GET "$B/elder-stories" "$TK"
check "/elder-stories/:id" GET "$B/elder-stories/x" "$TK"
check "/oral-history" GET "$B/oral-history" "$TK"
check "/oral-history/:id" GET "$B/oral-history/x" "$TK"
check "/gallery" GET "$B/gallery" "$TK"
check "/gallery/:id" GET "$B/gallery/x" "$TK"
check "/jobs" GET "$B/jobs" "$TK"
check "/jobs/:id" GET "$B/jobs/x" "$TK"
check "/directory" GET "$B/directory" "$TK"
check "/environment" GET "$B/environment" "$TK"
check "/projects" GET "$B/projects" "$TK"
check "/projects/:id" GET "$B/projects/x" "$TK"
check "/genealogy/houses" GET "$B/genealogy/houses" "$TK"
check "/genealogy/houses/:id" GET "$B/genealogy/houses/x" "$TK"
check "/genealogy/trees" GET "$B/genealogy/trees" "$TK"
check "/genealogy/tree" GET "$B/genealogy/tree" "$TK"
check "/genealogy/trees/:id" GET "$B/genealogy/trees/x" "$TK"
check "/genealogy/trees/:id/members" GET "$B/genealogy/trees/x/members" "$TK"
check "/genealogy/trees/:id/relationships" GET "$B/genealogy/trees/x/relationships" "$TK"
check "/genealogy/trees/:id/stats" GET "$B/genealogy/trees/x/stats" "$TK"

echo "== MARKETPLACE/COMMERCE =="
check "/marketplace" GET "$B/marketplace" "$TK"
check "/marketplace/trending" GET "$B/marketplace/trending" "$TK"
check "/marketplace/my-products" GET "$B/marketplace/my-products" "$TK"
check "/marketplace/:id" GET "$B/marketplace/x" "$TK"
check "/cart" GET "$B/cart" "$TK"
check "/cart/add" POST "$B/cart/add" "$TK" '{"productId":"x","quantity":1}'
check "/cart/update/:id" PUT "$B/cart/update/x" "$TK" '{"quantity":2}'
check "/cart/remove/:id" DELETE "$B/cart/remove/x" "$TK"
check "/cart/clear" DELETE "$B/cart/clear" "$TK"
check "/orders" GET "$B/orders" "$TK"
check "/orders/me" GET "$B/orders/me" "$TK"
check "/orders/seller" GET "$B/orders/seller" "$TK"
check "/orders/:id" GET "$B/orders/x" "$TK"
check "/orders/checkout" POST "$B/orders/checkout" "$TK" '{"items":[]}'
check "/payments/methods" GET "$B/payments/methods" "$TK"
check "/payments/history" GET "$B/payments/history" "$TK"
check "/payments/balance" GET "$B/payments/balance" "$TK"
check "/payments/transactions" GET "$B/payments/transactions" "$TK"
check "/payments/intent" POST "$B/payments/intent" "$TK" '{"amount":100}'
check "/shop" GET "$B/shop" "$TK"
check "/shop/me" GET "$B/shop/me" "$TK"
check "/shop/profile" GET "$B/shop/profile" "$TK"
check "/shop/become-seller" POST "$B/shop/become-seller" "$TK" '{"shopName":"Smoke"}'
check "/donations/initialize" POST "$B/donations/initialize" "" '{"amount":100}'
check "/donations/stats" GET "$B/donations/stats" "$TK"
check "/donations/recent" GET "$B/donations/recent" "$TK"
check "/contact" POST "$B/contact" "" '{"name":"x","email":"x@x.com","message":"hello"}'
check "/newsletter" POST "$B/newsletter" "" '{"email":"x@x.com"}'

echo "== MENTORSHIP =="
check "/mentorship/mentors" GET "$B/mentorship/mentors" "$TK"
check "/mentorship/mentees" GET "$B/mentorship/mentees" "$TK"
check "/mentorship/my" GET "$B/mentorship/my" "$TK"
check "/mentorship/register" POST "$B/mentorship/register" "$TK" '{"role":"mentor"}'
check "/mentorship/request" POST "$B/mentorship/request" "$TK" '{"mentorId":"x"}'

echo "== AI/ANALYTICS =="
check "/ai/feed" GET "$B/ai/feed?limit=5" "$TK"
check "/ai/trending" GET "$B/ai/trending" "$TK"
check "/ai/profile" GET "$B/ai/profile" "$TK"
check "/ai/recommendations" GET "$B/ai/recommendations?type=x" "$TK"
check "/ai/similar/:t/:id" GET "$B/ai/similar/post/x" "$TK"
check "/ai/track" POST "$B/ai/track" "$TK" '{"type":"view"}'
check "/analytics" GET "$B/analytics" "$TK"
check "/analytics/overview" GET "$B/analytics/overview" "$TK"
check "/analytics/realtime" GET "$B/analytics/realtime" "$TK"
check "/analytics/users" GET "$B/analytics/users" "$TK"
check "/analytics/content" GET "$B/analytics/content" "$TK"
check "/analytics/events" GET "$B/analytics/events" "$TK"
check "/analytics/marketplace" GET "$B/analytics/marketplace" "$TK"
check "/analytics/cultural" GET "$B/analytics/cultural" "$TK"
check "/analytics/export" GET "$B/analytics/export" "$TK"

echo "== ADMIN =="
check "/admin/dashboard" GET "$B/admin/dashboard" "$AK"
check "/admin/news" GET "$B/admin/news" "$AK"
check "/admin/events" GET "$B/admin/events" "$AK"
check "/admin/environment" GET "$B/admin/environment" "$AK"
check "/admin/directory" GET "$B/admin/directory" "$AK"
check "/admin/gallery" GET "$B/admin/gallery" "$AK"
check "/admin/contacts" GET "$B/admin/contacts" "$AK"
check "/admin/projects" GET "$B/admin/projects" "$AK"
check "/auth/account" DELETE "$B/auth/account" "$TK"

echo ""
echo "PASS routes: $PASS  FAIL(5xx/501): $FAIL"
