#!/bin/bash
#
# Fabric Network Health Check & Validation Script
# Run this after bootstrap to verify the network is fully operational
#
# Usage:
#   ./fabric-health.sh            # Full health check
#   ./fabric-health.sh quick      # Quick status only (containers + orderer)
#   ./fabric-health.sh smoke      # Full check + chaincode smoke test
#
# Exit codes:
#   0  All checks passed
#   1  One or more checks failed
#

set -uo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
NETWORK_DIR="$(dirname "$SCRIPT_DIR")"
DOCKER_DIR="$NETWORK_DIR/docker"
COMPOSE_FILE="$DOCKER_DIR/docker-compose-fabric.yaml"
CRYPTO_DIR="$NETWORK_DIR/crypto-config"
PROJECT_ROOT="$(dirname "$(dirname "$NETWORK_DIR")")"

CHANNEL_NAME="${CHANNEL_NAME:-certificates}"
CC_NAME="${CC_NAME:-certificate_contract}"

# Set FABRIC_CFG_PATH so the peer CLI can find core.yaml
export FABRIC_CFG_PATH="${FABRIC_CFG_PATH:-$NETWORK_DIR/config}"
if [ ! -f "$FABRIC_CFG_PATH/core.yaml" ]; then
    if [ -f "$PROJECT_ROOT/config/core.yaml" ]; then
        export FABRIC_CFG_PATH="$PROJECT_ROOT/config"
    fi
fi

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
BOLD='\033[1m'
NC='\033[0m'

PASS=0
FAIL=0
WARN=0

banner() {
    echo ""
    echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${BOLD}  $1${NC}"
    echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
}

pass() { echo -e "  ${GREEN}PASS${NC}  $1"; PASS=$((PASS + 1)); }
fail() { echo -e "  ${RED}FAIL${NC}  $1"; FAIL=$((FAIL + 1)); }
warn() { echo -e "  ${YELLOW}WARN${NC}  $1"; WARN=$((WARN + 1)); }
info() { echo -e "  ${CYAN}INFO${NC}  $1"; }

# Helper to set peer environment
setOrgEnv() {
    local ORG_NUM=$1
    local PORT=$2

    export CORE_PEER_TLS_ENABLED=true
    export CORE_PEER_LOCALMSPID="Org${ORG_NUM}MSP"
    export CORE_PEER_ADDRESS="localhost:${PORT}"
    export CORE_PEER_TLS_ROOTCERT_FILE="$CRYPTO_DIR/peerOrganizations/org${ORG_NUM}.example.com/peers/peer0.org${ORG_NUM}.example.com/tls/ca.crt"
    export CORE_PEER_MSPCONFIGPATH="$CRYPTO_DIR/peerOrganizations/org${ORG_NUM}.example.com/users/Admin@org${ORG_NUM}.example.com/msp"
}

ORDERER_CA="$CRYPTO_DIR/ordererOrganizations/example.com/orderers/orderer.example.com/msp/tlscacerts/tlsca.example.com-cert.pem"

# =========================================================================
# 1. Docker Container Health
# =========================================================================
checkContainers() {
    banner "1. Docker Container Health"

    # Check if compose file exists
    if [ ! -f "$COMPOSE_FILE" ]; then
        fail "Compose file not found: $COMPOSE_FILE"
        return
    fi

    # Orderers
    for ORDERER in orderer.example.com orderer2.example.com orderer3.example.com; do
        if docker ps --format '{{.Names}}' | grep -q "^${ORDERER}$"; then
            pass "Orderer: $ORDERER (running)"
        else
            fail "Orderer: $ORDERER (not running)"
        fi
    done

    # Peers
    for ORG in 1 2 3 4; do
        for PEER in 0 1; do
            local NAME="peer${PEER}.org${ORG}.example.com"
            if docker ps --format '{{.Names}}' | grep -q "^${NAME}$"; then
                pass "Peer: $NAME (running)"
            else
                fail "Peer: $NAME (not running)"
            fi
        done
    done

    # CouchDB instances
    for ORG in 1 2 3 4; do
        for DB in 0 1; do
            local NAME="couchdb${DB}.org${ORG}"
            if docker ps --format '{{.Names}}' | grep -q "^${NAME}$"; then
                pass "CouchDB: $NAME (running)"
            else
                fail "CouchDB: $NAME (not running)"
            fi
        done
    done

    # CLI
    if docker ps --format '{{.Names}}' | grep -q "^cli$"; then
        pass "CLI: running"
    else
        warn "CLI: not running (optional)"
    fi

    # Count total
    local TOTAL=$(docker compose -f "$COMPOSE_FILE" ps --status running -q 2>/dev/null | wc -l)
    info "Total running containers: $TOTAL"
}

# =========================================================================
# 2. Orderer Operations Health (HTTP endpoints)
# =========================================================================
checkOrdererHealth() {
    banner "2. Orderer Operations Health"

    local PORTS=("9443" "9444" "9445")
    local NAMES=("orderer.example.com" "orderer2.example.com" "orderer3.example.com")

    for i in 0 1 2; do
        local PORT=${PORTS[$i]}
        local NAME=${NAMES[$i]}

        # Check operations endpoint
        local RESPONSE
        RESPONSE=$(curl -sk "https://localhost:${PORT}/healthz" 2>/dev/null) || true
        if echo "$RESPONSE" | grep -qi "OK\|healthy"; then
            pass "$NAME healthz OK (port $PORT)"
        else
            # Try HTTP fallback
            RESPONSE=$(curl -s "http://localhost:${PORT}/healthz" 2>/dev/null) || true
            if echo "$RESPONSE" | grep -qi "OK\|healthy"; then
                pass "$NAME healthz OK (port $PORT, HTTP)"
            else
                fail "$NAME healthz FAILED (port $PORT) — response: $RESPONSE"
            fi
        fi
    done
}

# =========================================================================
# 3. Peer Operations Health
# =========================================================================
checkPeerHealth() {
    banner "3. Peer Operations Health"

    local PEER_OPS_PORTS=("9446" "9447" "9448" "9449" "9450" "9451" "9452" "9453")
    local PEER_NAMES=("peer0.org1" "peer1.org1" "peer0.org2" "peer1.org2" "peer0.org3" "peer1.org3" "peer0.org4" "peer1.org4")

    for i in "${!PEER_OPS_PORTS[@]}"; do
        local PORT=${PEER_OPS_PORTS[$i]}
        local NAME=${PEER_NAMES[$i]}

        local RESPONSE
        RESPONSE=$(curl -s "http://localhost:${PORT}/healthz" 2>/dev/null) || true
        if echo "$RESPONSE" | grep -qi "OK\|healthy\|HEALTHY"; then
            pass "$NAME healthz OK (port $PORT)"
        else
            fail "$NAME healthz FAILED (port $PORT)"
        fi
    done
}

# =========================================================================
# 4. Channel Membership
# =========================================================================
checkChannelMembership() {
    banner "4. Channel Membership"

    if [ ! -d "$CRYPTO_DIR" ]; then
        fail "Crypto material not found — cannot check channel"
        return
    fi

    # Check orderer channels via osnadmin
    local ORDERER_PORTS=("7053" "8053" "9053")
    local ORDERER_NAMES=("orderer" "orderer2" "orderer3")

    for i in 0 1 2; do
        local ADMIN_PORT=${ORDERER_PORTS[$i]}
        local ORDERER_NAME="${ORDERER_NAMES[$i]}.example.com"

        local RESULT
        RESULT=$(osnadmin channel list \
            -o "localhost:$ADMIN_PORT" \
            --ca-file "$CRYPTO_DIR/ordererOrganizations/example.com/orderers/${ORDERER_NAME}/msp/tlscacerts/tlsca.example.com-cert.pem" \
            --client-cert "$CRYPTO_DIR/ordererOrganizations/example.com/orderers/${ORDERER_NAME}/tls/server.crt" \
            --client-key "$CRYPTO_DIR/ordererOrganizations/example.com/orderers/${ORDERER_NAME}/tls/server.key" 2>&1) || true

        if echo "$RESULT" | grep -q "$CHANNEL_NAME"; then
            pass "$ORDERER_NAME joined channel '$CHANNEL_NAME'"
        else
            fail "$ORDERER_NAME NOT in channel '$CHANNEL_NAME'"
            info "  osnadmin output: $RESULT"
        fi
    done

    # Check peer channels
    local PEER_PORTS=("7051" "9051" "11051" "13051")
    for ORG in 1 2 3 4; do
        local PORT=${PEER_PORTS[$((ORG - 1))]}
        setOrgEnv "$ORG" "$PORT"

        local CHANNELS
        CHANNELS=$(peer channel list 2>&1) || true
        if echo "$CHANNELS" | grep -q "$CHANNEL_NAME"; then
            pass "peer0.org${ORG} joined channel '$CHANNEL_NAME'"
        else
            fail "peer0.org${ORG} NOT in channel '$CHANNEL_NAME'"
        fi
    done
}

# =========================================================================
# 5. Block Height
# =========================================================================
checkBlockHeight() {
    banner "5. Block Height (Ledger Status)"

    if [ ! -d "$CRYPTO_DIR" ]; then
        fail "Crypto material not found"
        return
    fi

    local PEER_PORTS=("7051" "9051" "11051" "13051")
    for ORG in 1 2 3 4; do
        local PORT=${PEER_PORTS[$((ORG - 1))]}
        setOrgEnv "$ORG" "$PORT"

        local INFO
        INFO=$(peer channel getinfo -c "$CHANNEL_NAME" 2>&1) || true
        local HEIGHT=""
        # Fabric outputs JSON: {"height":N,...} — try multiple parse patterns
        HEIGHT=$(echo "$INFO" | grep -oP '"height":\s*\K[0-9]+' 2>/dev/null || true)
        if [ -z "$HEIGHT" ]; then
            HEIGHT=$(echo "$INFO" | sed -n 's/.*"height":\([0-9]*\).*/\1/p' 2>/dev/null || true)
        fi
        if [ -z "$HEIGHT" ]; then
            HEIGHT=$(echo "$INFO" | grep -o 'height:[0-9]*' 2>/dev/null | cut -d: -f2 || true)
        fi

        if [ -n "$HEIGHT" ] && [ "$HEIGHT" -gt 0 ] 2>/dev/null; then
            pass "peer0.org${ORG} block height: $HEIGHT"
        else
            warn "peer0.org${ORG} could not retrieve block height"
            info "  Output: $(echo "$INFO" | head -1)"
        fi
    done
}

# =========================================================================
# 6. Chaincode Lifecycle
# =========================================================================
checkChaincode() {
    banner "6. Chaincode Lifecycle"

    if [ ! -d "$CRYPTO_DIR" ]; then
        fail "Crypto material not found"
        return
    fi

    # Check committed chaincode
    setOrgEnv 1 7051

    local COMMITTED
    COMMITTED=$(peer lifecycle chaincode querycommitted \
        --channelID "$CHANNEL_NAME" \
        --name "$CC_NAME" 2>&1) || true

    if echo "$COMMITTED" | grep -q "Version\|Sequence\|version"; then
        pass "Chaincode '$CC_NAME' is committed on channel '$CHANNEL_NAME'"
        info "  $(echo "$COMMITTED" | grep -i "version\|sequence" | head -2)"
    else
        fail "Chaincode '$CC_NAME' NOT committed"
        info "  Output: $COMMITTED"
    fi

    # Check installed on each org's peer0
    local PEER_PORTS=("7051" "9051" "11051" "13051")
    for ORG in 1 2 3 4; do
        local PORT=${PEER_PORTS[$((ORG - 1))]}
        setOrgEnv "$ORG" "$PORT"

        local INSTALLED
        INSTALLED=$(peer lifecycle chaincode queryinstalled 2>&1) || true
        if echo "$INSTALLED" | grep -q "$CC_NAME"; then
            pass "Chaincode installed on peer0.org${ORG}"
        else
            fail "Chaincode NOT installed on peer0.org${ORG}"
        fi
    done
}

# =========================================================================
# 7. Chaincode Smoke Test
# =========================================================================
smokeTestChaincode() {
    banner "7. Chaincode Smoke Test"

    if [ ! -d "$CRYPTO_DIR" ]; then
        fail "Crypto material not found"
        return
    fi

    setOrgEnv 1 7051

    # Test query (should not error even if result is empty)
    info "Testing chaincode query: GetIssuer('test-issuer')..."
    local QUERY_RESULT
    QUERY_RESULT=$(peer chaincode query \
        -C "$CHANNEL_NAME" \
        -n "$CC_NAME" \
        -c '{"function":"GetIssuer","Args":["test-issuer"]}' 2>&1) || true

    if echo "$QUERY_RESULT" | grep -qi "error\|panic"; then
        # "not found" type errors are expected for non-existent data
        if echo "$QUERY_RESULT" | grep -qi "not found\|does not exist\|no issuer"; then
            pass "Chaincode query works (GetIssuer returned 'not found' as expected)"
        else
            fail "Chaincode query error: $QUERY_RESULT"
        fi
    else
        pass "Chaincode query successful"
    fi

    # Test invoke: register a test issuer, then query it
    info "Testing chaincode invoke: RegisterIssuer..."
    local INVOKE_RESULT
    INVOKE_RESULT=$(peer chaincode invoke \
        -o localhost:7050 \
        --ordererTLSHostnameOverride orderer.example.com \
        --tls --cafile "$ORDERER_CA" \
        -C "$CHANNEL_NAME" \
        -n "$CC_NAME" \
        --peerAddresses localhost:7051 \
        --tlsRootCertFiles "$CRYPTO_DIR/peerOrganizations/org1.example.com/peers/peer0.org1.example.com/tls/ca.crt" \
        --peerAddresses localhost:9051 \
        --tlsRootCertFiles "$CRYPTO_DIR/peerOrganizations/org2.example.com/peers/peer0.org2.example.com/tls/ca.crt" \
        -c '{"function":"RegisterIssuer","Args":["health-check-issuer","Health Check Test Org","{\"sign\":\"test-key\"}","[\"ISSUER\"]","test@example.com","Test Admin"]}' 2>&1) || true

    if echo "$INVOKE_RESULT" | grep -qi "committed\|success\|status:200\|chaincodeInvokeOrQuery"; then
        pass "Chaincode invoke successful (RegisterIssuer)"
    elif echo "$INVOKE_RESULT" | grep -qi "already exists\|already registered"; then
        pass "Chaincode invoke works (issuer already registered from previous run)"
    else
        warn "Chaincode invoke may have failed: $(echo "$INVOKE_RESULT" | tail -1)"
    fi

    # Wait for block commit
    sleep 2

    # Verify the registered issuer can be queried
    info "Verifying invoke result: GetIssuer('health-check-issuer')..."
    local VERIFY_RESULT
    VERIFY_RESULT=$(peer chaincode query \
        -C "$CHANNEL_NAME" \
        -n "$CC_NAME" \
        -c '{"function":"GetIssuer","Args":["health-check-issuer"]}' 2>&1) || true

    if echo "$VERIFY_RESULT" | grep -qi "health-check-issuer\|Health Check Test"; then
        pass "Chaincode read-after-write verified (GetIssuer)"
    elif echo "$VERIFY_RESULT" | grep -qi "error\|panic"; then
        warn "Could not verify read-after-write: $VERIFY_RESULT"
    else
        pass "Chaincode query returned data"
    fi
}

# =========================================================================
# 8. Artifacts & Config Validation
# =========================================================================
checkArtifacts() {
    banner "8. Artifacts & Configuration"

    # Crypto material
    if [ -d "$CRYPTO_DIR/ordererOrganizations" ]; then
        pass "Orderer crypto material present"
    else
        fail "Orderer crypto material missing"
    fi

    for ORG in 1 2 3 4; do
        if [ -d "$CRYPTO_DIR/peerOrganizations/org${ORG}.example.com" ]; then
            pass "Org${ORG} crypto material present"
        else
            fail "Org${ORG} crypto material missing"
        fi
    done

    # Channel artifacts
    if [ -f "$NETWORK_DIR/channel-artifacts/${CHANNEL_NAME}.block" ]; then
        pass "Channel genesis block present"
    else
        fail "Channel genesis block missing"
    fi

    # Connection profiles
    for ORG in 1 2 3 4; do
        if [ -f "$NETWORK_DIR/connection-profiles/connection-org${ORG}.json" ]; then
            pass "Connection profile Org${ORG} present"
        else
            fail "Connection profile Org${ORG} missing"
        fi
    done

    # Wallets
    for ORG in 1 2 3 4; do
        if [ -f "$PROJECT_ROOT/wallets/org${ORG}/admin.id" ]; then
            pass "Admin wallet Org${ORG} present"
        else
            fail "Admin wallet Org${ORG} missing"
        fi
    done
}

# =========================================================================
# 9. API Fabric Connectivity
# =========================================================================
checkAPIConnectivity() {
    banner "9. API ↔ Fabric Connectivity"

    # Check if API container is running
    if docker ps --format '{{.Names}}' | grep -q "sme-cert-api"; then
        pass "API container running"

        # Check API health endpoint
        local HEALTH
        HEALTH=$(curl -s "http://localhost:3000/api/health" 2>/dev/null) || true
        if echo "$HEALTH" | grep -qi "ok\|healthy\|status"; then
            pass "API health endpoint responding"
        else
            warn "API health endpoint not responding"
        fi

        # Check blockchain health
        local BC_HEALTH
        BC_HEALTH=$(curl -s "http://localhost:3000/api/health/blockchain" 2>/dev/null) || true
        if echo "$BC_HEALTH" | grep -qi "connected.*true\|\"connected\":true"; then
            pass "API connected to Fabric network"
        elif echo "$BC_HEALTH" | grep -qi "connected"; then
            warn "API blockchain status: $(echo "$BC_HEALTH" | head -c 200)"
        else
            fail "API not connected to Fabric network"
        fi
    else
        info "API container not running — skipping API connectivity check"
        info "Start with: cd infra/compose && docker compose up -d api"
    fi
}

# =========================================================================
# Summary
# =========================================================================
printSummary() {
    banner "Health Check Summary"

    local TOTAL=$((PASS + FAIL + WARN))

    echo -e "  ${GREEN}PASS: $PASS${NC}  ${RED}FAIL: $FAIL${NC}  ${YELLOW}WARN: $WARN${NC}  Total: $TOTAL"
    echo ""

    if [ "$FAIL" -eq 0 ]; then
        echo -e "  ${GREEN}${BOLD}All critical checks passed!${NC}"
        if [ "$WARN" -gt 0 ]; then
            echo -e "  ${YELLOW}Review warnings above for potential improvements.${NC}"
        fi
        echo ""
        return 0
    else
        echo -e "  ${RED}${BOLD}$FAIL check(s) failed. Review the output above.${NC}"
        echo ""
        echo -e "  ${CYAN}Common fixes:${NC}"
        echo "    - Containers not running:  cd blockchain/network && ./scripts/bootstrap.sh restart"
        echo "    - Channel not joined:      ./scripts/create_channel.sh"
        echo "    - Chaincode not committed: ./scripts/deploy_chaincode.sh"
        echo "    - Profiles/wallets:        ./scripts/generate_connection_profiles.sh && ./scripts/enroll_admin.sh"
        echo ""
        return 1
    fi
}

# =========================================================================
# Main
# =========================================================================
main() {
    echo ""
    echo -e "${BOLD}SME Certificate Trust Platform — Fabric Network Health Check${NC}"
    echo -e "  Channel: ${CHANNEL_NAME}  |  Chaincode: ${CC_NAME}"
    echo -e "  Time: $(date '+%Y-%m-%d %H:%M:%S')"

    local MODE=${1:-full}

    case "$MODE" in
        quick)
            checkContainers
            checkOrdererHealth
            checkArtifacts
            ;;
        smoke)
            checkContainers
            checkOrdererHealth
            checkPeerHealth
            checkChannelMembership
            checkBlockHeight
            checkChaincode
            smokeTestChaincode
            checkArtifacts
            checkAPIConnectivity
            ;;
        full|*)
            checkContainers
            checkOrdererHealth
            checkPeerHealth
            checkChannelMembership
            checkBlockHeight
            checkChaincode
            checkArtifacts
            checkAPIConnectivity
            ;;
    esac

    printSummary
}

main "${1:-full}"
