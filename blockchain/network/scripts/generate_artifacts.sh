#!/bin/bash
#
# Generate channel genesis block for Fabric 2.4 Channel Participation API
# No system genesis block needed — orderers use BOOTSTRAPMETHOD=none
#

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
NETWORK_DIR="$(dirname "$SCRIPT_DIR")"
CONFIG_DIR="$NETWORK_DIR/config"
CHANNEL_ARTIFACTS_DIR="$NETWORK_DIR/channel-artifacts"

CHANNEL_NAME=${CHANNEL_NAME:-"certificates"}

# Ensure Fabric binaries are in PATH
export PATH="$PATH:/usr/local/bin"

if ! command -v configtxgen &> /dev/null; then
    echo "ERROR: configtxgen not found in PATH"
    echo "Install Fabric binaries first:"
    echo "  curl -sSLO https://raw.githubusercontent.com/hyperledger/fabric/main/scripts/install-fabric.sh && chmod +x install-fabric.sh"
    echo "  ./install-fabric.sh binary"
    exit 1
fi

echo "======================================================================"
echo " Generating Channel Artifacts (Fabric 2.4 Channel Participation API)"
echo "======================================================================"

export FABRIC_CFG_PATH="$CONFIG_DIR"

# Clean old artifacts
echo "Cleaning old artifacts..."
rm -rf "$CHANNEL_ARTIFACTS_DIR"
rm -rf "$NETWORK_DIR/system-genesis-block"
mkdir -p "$CHANNEL_ARTIFACTS_DIR"

# Generate channel genesis block (Fabric 2.4 method)
# This single block is used with osnadmin channel join
# Anchor peers are embedded from the FourOrgChannel profile
echo "Generating channel genesis block for '$CHANNEL_NAME'..."
configtxgen -profile FourOrgChannel \
    -outputBlock "$CHANNEL_ARTIFACTS_DIR/${CHANNEL_NAME}.block" \
    -channelID "$CHANNEL_NAME"

if [ $? -ne 0 ]; then
    echo "ERROR: Failed to generate channel genesis block"
    exit 1
fi

echo ""
echo "Channel genesis block created: $CHANNEL_ARTIFACTS_DIR/${CHANNEL_NAME}.block"
echo ""
echo "======================================================================"
echo " Artifact Generation Complete"
echo "======================================================================"
echo ""
echo "Note: Anchor peers are embedded in the channel genesis block."
echo "No separate anchor peer TX files are needed with Fabric 2.4."
echo ""
