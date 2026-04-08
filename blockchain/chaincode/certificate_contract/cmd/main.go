package main

import (
	"fmt"
	"log"

	"github.com/hyperledger/fabric-contract-api-go/v2/contractapi"
	"github.com/sme-cert-platform/certificate-contract/contract"
)

func main() {
	certificateContract := new(contract.CertificateContract)

	chaincode, err := contractapi.NewChaincode(certificateContract)
	if err != nil {
		log.Panicf("Error creating certificate chaincode: %v", err)
	}

	if err := chaincode.Start(); err != nil {
		log.Panicf("Error starting certificate chaincode: %v", err)
	}

	fmt.Println("Certificate Contract chaincode started successfully")
}
