#!/bin/bash
#
# Generate connection profiles for the Fabric SDK (fabric-network)
# Creates JSON connection profiles for each organization
#

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
NETWORK_DIR="$(dirname "$SCRIPT_DIR")"
CRYPTO_DIR="$NETWORK_DIR/crypto-config"
PROFILES_DIR="$NETWORK_DIR/connection-profiles"

echo "======================================================================"
echo " Generating Connection Profiles"
echo "======================================================================"

# Verify crypto material exists
if [ ! -d "$CRYPTO_DIR" ]; then
    echo "ERROR: Crypto material not found at $CRYPTO_DIR"
    echo "Run generate_crypto.sh first"
    exit 1
fi

mkdir -p "$PROFILES_DIR"

# Helper: read a cert file and output as single-line PEM (escaped newlines)
readCert() {
    awk 'NF {sub(/\r/, ""); printf "%s\\n",$0;}' "$1"
}

# Generate connection profile for Org1
generateOrgProfile() {
    local ORG_NUM=$1
    local ORG_DOMAIN="org${ORG_NUM}.example.com"
    local MSP_ID="Org${ORG_NUM}MSP"
    local PEER0_PORT PEER1_PORT

    if [ "$ORG_NUM" == "1" ]; then PEER0_PORT=7051; PEER1_PORT=8051;
    elif [ "$ORG_NUM" == "2" ]; then PEER0_PORT=9051; PEER1_PORT=10051;
    elif [ "$ORG_NUM" == "3" ]; then PEER0_PORT=11051; PEER1_PORT=12051;
    else PEER0_PORT=13051; PEER1_PORT=14051; fi

    local ORDERER_TLS_CERT=$(readCert "$CRYPTO_DIR/ordererOrganizations/example.com/orderers/orderer.example.com/tls/ca.crt")
    local PEER0_TLS_CERT=$(readCert "$CRYPTO_DIR/peerOrganizations/${ORG_DOMAIN}/peers/peer0.${ORG_DOMAIN}/tls/ca.crt")
    local PEER1_TLS_CERT=$(readCert "$CRYPTO_DIR/peerOrganizations/${ORG_DOMAIN}/peers/peer1.${ORG_DOMAIN}/tls/ca.crt")
    local CA_CERT=$(readCert "$CRYPTO_DIR/peerOrganizations/${ORG_DOMAIN}/ca/ca.${ORG_DOMAIN}-cert.pem")

    cat > "$PROFILES_DIR/connection-org${ORG_NUM}.json" <<PROFILE
{
    "name": "sme-cert-network-org${ORG_NUM}",
    "version": "1.0.0",
    "client": {
        "organization": "${MSP_ID}",
        "connection": {
            "timeout": {
                "peer": { "endorser": "300" },
                "orderer": "300"
            }
        }
    },
    "organizations": {
        "${MSP_ID}": {
            "mspid": "${MSP_ID}",
            "peers": [
                "peer0.${ORG_DOMAIN}",
                "peer1.${ORG_DOMAIN}"
            ],
            "certificateAuthorities": [
                "ca.${ORG_DOMAIN}"
            ]
        }
    },
    "peers": {
        "peer0.${ORG_DOMAIN}": {
            "url": "grpcs://peer0.${ORG_DOMAIN}:${PEER0_PORT}",
            "tlsCACerts": {
                "pem": "${PEER0_TLS_CERT}"
            },
            "grpcOptions": {
                "ssl-target-name-override": "peer0.${ORG_DOMAIN}",
                "hostnameOverride": "peer0.${ORG_DOMAIN}"
            }
        },
        "peer1.${ORG_DOMAIN}": {
            "url": "grpcs://peer1.${ORG_DOMAIN}:${PEER1_PORT}",
            "tlsCACerts": {
                "pem": "${PEER1_TLS_CERT}"
            },
            "grpcOptions": {
                "ssl-target-name-override": "peer1.${ORG_DOMAIN}",
                "hostnameOverride": "peer1.${ORG_DOMAIN}"
            }
        }
    },
    "orderers": {
        "orderer.example.com": {
            "url": "grpcs://orderer.example.com:7050",
            "tlsCACerts": {
                "pem": "${ORDERER_TLS_CERT}"
            },
            "grpcOptions": {
                "ssl-target-name-override": "orderer.example.com",
                "hostnameOverride": "orderer.example.com"
            }
        }
    },
    "certificateAuthorities": {
        "ca.${ORG_DOMAIN}": {
            "url": "https://ca.${ORG_DOMAIN}:7054",
            "caName": "ca-org${ORG_NUM}",
            "tlsCACerts": {
                "pem": ["${CA_CERT}"]
            },
            "httpOptions": {
                "verify": false
            }
        }
    }
}
PROFILE

    echo "  Created: connection-org${ORG_NUM}.json"
}

# Generate profiles for all 4 orgs
for i in 1 2 3 4; do
    generateOrgProfile "$i"
done

echo ""
echo "======================================================================"
echo " Connection Profiles Generated"
echo "======================================================================"
echo ""
echo "Location: $PROFILES_DIR"
echo "Files:"
echo "  - connection-org1.json (Ministry of Trade)"
echo "  - connection-org2.json (MSMEDA)"
echo "  - connection-org3.json (Training Providers)"
echo "  - connection-org4.json (Auditors)"
echo ""
echo "The API container mounts these at /app/fabric/profiles/"
echo ""
