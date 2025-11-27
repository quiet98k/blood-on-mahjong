#!/bin/bash

# MongoDB CRUD Operations Test Script
# Make sure your Nuxt server is running (npm run dev)

BASE_URL="http://localhost:3000/api"
echo "=== MongoDB CRUD Operations Test ==="
echo ""

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# 1. Check MongoDB Status
echo -e "${BLUE}1. Checking MongoDB Status...${NC}"
curl -s "$BASE_URL/test-mongo-status" | jq '.'
echo ""
echo "---"
echo ""

# 2. Insert a new user
echo -e "${BLUE}2. Inserting a new user...${NC}"
INSERT_RESPONSE=$(curl -s -X POST "$BASE_URL/test-insert")
echo "$INSERT_RESPONSE" | jq '.'
USER_ID=$(echo "$INSERT_RESPONSE" | jq -r '.userId')
echo -e "${GREEN}Created User ID: $USER_ID${NC}"
echo ""
echo "---"
echo ""

# 3. List all users
echo -e "${BLUE}3. Listing all users...${NC}"
curl -s "$BASE_URL/test-users" | jq '.'
echo ""
echo "---"
echo ""

# 4. Get specific user
echo -e "${BLUE}4. Getting specific user by userId...${NC}"
curl -s "$BASE_URL/test-get-user?userId=$USER_ID" | jq '.'
echo ""
echo "---"
echo ""

# 5. Update user
echo -e "${BLUE}5. Updating user (changing name and stats)...${NC}"
curl -s -X POST "$BASE_URL/test-update" \
  -H "Content-Type: application/json" \
  -d "{
    \"userId\": \"$USER_ID\",
    \"updates\": {
      \"name\": \"Updated Test User\",
      \"stats\": {
        \"gamesPlayed\": 10,
        \"gamesWon\": 5,
        \"totalScore\": 250,
        \"highestFan\": 5,
        \"winRate\": 0.5
      }
    }
  }" | jq '.'
echo ""
echo "---"
echo ""

# 6. Verify update
echo -e "${BLUE}6. Verifying update...${NC}"
curl -s "$BASE_URL/test-get-user?userId=$USER_ID" | jq '.'
echo ""
echo "---"
echo ""

# 7. Delete user
echo -e "${BLUE}7. Deleting user...${NC}"
curl -s -X POST "$BASE_URL/test-delete" \
  -H "Content-Type: application/json" \
  -d "{\"userId\": \"$USER_ID\"}" | jq '.'
echo ""
echo "---"
echo ""

# 8. Verify deletion
echo -e "${BLUE}8. Verifying deletion (should return 404)...${NC}"
curl -s "$BASE_URL/test-get-user?userId=$USER_ID" | jq '.'
echo ""
echo "---"
echo ""

# 9. Final user count
echo -e "${BLUE}9. Final user count...${NC}"
curl -s "$BASE_URL/test-users" | jq '.count'
echo ""

echo -e "${GREEN}=== Test Complete ===${NC}"
