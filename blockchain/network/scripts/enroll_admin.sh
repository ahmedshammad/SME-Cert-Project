#!/bin/bash
#
# Create admin wallet identities from crypto-config material
# Generates file-system wallet directories for the Fabric SDK (fabric-network)
#

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
NETWORK_DIR="$(dirname "$SCRIPT_DIR")"
CRYPTO_DIR="$NETWORK_DIR/crypto-config"
# Wallet directory lives at project root so compose.yaml can mount it
WALLETS_DIR="$(dirname "$(dirname "$NETWORK_DIR")")/wallets"

echo "======================================================================"
echo " Creating Admin Wallet Identities"
echo "======================================================================"

if [ ! -d "$CRYPTO_DIR" ]; then
    echo "ERROR: Crypto material not found at $CRYPTO_DIR"
    echo "Run generate_crypto.sh first"
    exit 1
fi

createWalletIdentity() {
    local ORG_NUM=$1
    local ORG_DOMAIN="org${ORG_NUM}.example.com"
    local MSP_ID="Org${ORG_NUM}MSP"
    local WALLET_PATH="$WALLETS_DIR/org${ORG_NUM}"
    local ADMIN_MSP_DIR="$CRYPTO_DIR/peerOrganizations/${ORG_DOMAIN}/users/Admin@${ORG_DOMAIN}/msp"

    echo "  Creating wallet for Org${ORG_NUM} ($MSP_ID)..."

    # Find the admin certificate and private key
    local CERT_FILE=$(ls "$ADMIN_MSP_DIR/signcerts/"*cert.pem 2>/dev/null | head -1)
    local KEY_FILE=$(ls "$ADMIN_MSP_DIR/keystore/"*_sk 2>/dev/null | head -1)

    if [ -z "$CERT_FILE" ] || [ -z "$KEY_FILE" ]; then
        echo "  ERROR: Admin cert or key not found for Org${ORG_NUM}"
        echo "    Cert dir: $ADMIN_MSP_DIR/signcerts/"
        echo "    Key dir: $ADMIN_MSP_DIR/keystore/"
        return 1
    fi

    # Read certificate and key
    local CERT=$(cat "$CERT_FILE")
    local KEY=$(cat "$KEY_FILE")

    # Create wallet directory
    mkdir -p "$WALLET_PATH"

    # Create the wallet identity file (fabric-network SDK file wallet format)
    cat > "$WALLET_PATH/admin.id" <<IDENTITY
{
    "credentials": {
        "certificate": $(echo "$CERT" | python3 -c "import sys,json; print(json.dumps(sys.stdin.read()))" 2>/dev/null || echo "$CERT" | jq -Rs . 2>/dev/null || echo "\"$(echo "$CERT" | sed ':a;N;$!ba;s/\n/\\n/g')\""),
        "privateKey": $(echo "$KEY" | python3 -c "import sys,json; print(json.dumps(sys.stdin.read()))" 2>/dev/null || echo "$KEY" | jq -Rs . 2>/dev/null || echo "\"$(echo "$KEY" | sed ':a;N;$!ba;s/\n/\\n/g')\"")
    },
    "mspId": "$MSP_ID",
    "type": "X.509",
    "version": 1
}
IDENTITY

    echo "    Wallet: $WALLET_PATH/admin.id"
}

# Create wallets for all 4 organizations
for i in 1 2 3 4; do
    createWalletIdentity "$i"
done

echo ""
echo "======================================================================"
echo " Admin Wallets Created"
echo "======================================================================"
echo ""
echo "Location: $WALLETS_DIR"
echo ""
echo "  wallets/org1/admin.id  (Ministry of Trade - Org1MSP)"
echo "  wallets/org2/admin.id  (MSMEDA - Org2MSP)"
echo "  wallets/org3/admin.id  (Training Providers - Org3MSP)"
echo "  wallets/org4/admin.id  (Auditors - Org4MSP)"
echo ""
echo "The API container mounts these at /app/wallets/"
echo "FabricService uses the 'admin' identity from org1 by default."
echo ""
