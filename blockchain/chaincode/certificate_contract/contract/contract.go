package contract

import (
	"encoding/json"
	"fmt"
	"time"

	"github.com/hyperledger/fabric-chaincode-go/v2/pkg/cid"
	"github.com/hyperledger/fabric-contract-api-go/v2/contractapi"
	"github.com/sme-cert-platform/certificate-contract/internal/access"
	"github.com/sme-cert-platform/certificate-contract/internal/models"
	"github.com/sme-cert-platform/certificate-contract/internal/validators"
)

// CertificateContract implements the certificate management chaincode
type CertificateContract struct {
	contractapi.Contract
}

const (
	IssuerKeyPrefix      = "ISSUER:"
	CertificateKeyPrefix = "CERT:"
	TemplateKeyPrefix    = "TEMPLATE:"
	DocTypeIssuer        = "issuer"
	DocTypeCertificate   = "certificate"
	DocTypeTemplate      = "template"
)

// ============================================================================
// Initialization
// ============================================================================

// InitLedger initializes the ledger with bootstrap data
func (c *CertificateContract) InitLedger(ctx contractapi.TransactionContextInterface) error {
	fmt.Println("Initializing SME Certificate Trust Platform ledger...")

	// Create access control
	clientID, err := cid.New(ctx.GetStub())
	if err != nil {
		return fmt.Errorf("failed to get client identity: %v", err)
	}
	ac := access.NewAccessControl(clientID)

	// Allow consortium admin OR Org1MSP admin (bootstrap scenario with cryptogen certs)
	isAdmin, _ := ac.HasRole(access.RoleConsortiumAdmin)
	if !isAdmin {
		mspID, err := ac.GetMSPID()
		if err != nil {
			return fmt.Errorf("failed to get MSP ID: %v", err)
		}
		if mspID != "Org1MSP" {
			return fmt.Errorf("access denied: only Org1MSP (Ministry) or consortium_admin can initialize the ledger")
		}
	}

	// Use deterministic transaction timestamp (time.Now() differs across peers)
	txTimestamp, err := ctx.GetStub().GetTxTimestamp()
	if err != nil {
		return fmt.Errorf("failed to get transaction timestamp: %v", err)
	}
	txTime := time.Unix(txTimestamp.Seconds, int64(txTimestamp.Nanos))

	// Bootstrap default issuers (can be customized)
	defaultIssuers := []models.Issuer{
		{
			IssuerOrgID:   "org1",
			DisplayName:   "Ministry of Trade and Industry",
			PublicKeySet:  make(map[string]string),
			Roles:         []string{"government", "certification"},
			Active:        true,
			RegisteredAt:  txTime,
			RegisteredBy:  "system",
			ContactEmail:  "contact@mti.gov.eg",
			ContactPerson: "Admin",
			DocType:       DocTypeIssuer,
		},
	}

	for _, issuer := range defaultIssuers {
		key := IssuerKeyPrefix + issuer.IssuerOrgID
		issuerJSON, err := issuer.ToJSON()
		if err != nil {
			return fmt.Errorf("failed to marshal issuer: %v", err)
		}
		err = ctx.GetStub().PutState(key, issuerJSON)
		if err != nil {
			return fmt.Errorf("failed to put issuer state: %v", err)
		}
	}

	fmt.Println("Ledger initialized successfully")
	return nil
}

// ============================================================================
// Issuer Management
// ============================================================================

// RegisterIssuer registers a new certificate issuer
func (c *CertificateContract) RegisterIssuer(
	ctx contractapi.TransactionContextInterface,
	issuerOrgID string,
	displayName string,
	publicKeySetJSON string,
	rolesJSON string,
	contactEmail string,
	contactPerson string,
) error {
	// Access control: only consortium admin
	clientID, err := cid.New(ctx.GetStub())
	if err != nil {
		return fmt.Errorf("failed to get client identity: %v", err)
	}
	ac := access.NewAccessControl(clientID)
	if err := ac.RequireConsortiumAdmin(); err != nil {
		return err
	}

	// Validate inputs
	if err := validators.ValidateOrgID(issuerOrgID); err != nil {
		return err
	}
	if err := validators.ValidateNonEmpty(displayName, "display_name"); err != nil {
		return err
	}
	if err := validators.ValidateEmail(contactEmail); err != nil {
		return err
	}

	// Check if issuer already exists
	key := IssuerKeyPrefix + issuerOrgID
	existing, err := ctx.GetStub().GetState(key)
	if err != nil {
		return fmt.Errorf("failed to read state: %v", err)
	}
	if existing != nil {
		return fmt.Errorf("issuer %s already exists", issuerOrgID)
	}

	// Parse public key set
	var publicKeySet map[string]string
	if err := json.Unmarshal([]byte(publicKeySetJSON), &publicKeySet); err != nil {
		return fmt.Errorf("invalid public_key_set JSON: %v", err)
	}

	// Validate each public key
	for _, pubKey := range publicKeySet {
		if err := validators.ValidatePublicKey(pubKey); err != nil {
			return fmt.Errorf("invalid public key: %v", err)
		}
	}

	// Parse roles
	var roles []string
	if err := json.Unmarshal([]byte(rolesJSON), &roles); err != nil {
		return fmt.Errorf("invalid roles JSON: %v", err)
	}

	// Get caller ID
	callerID, err := ac.GetID()
	if err != nil {
		return err
	}

	// Use deterministic transaction timestamp
	txTimestamp, err := ctx.GetStub().GetTxTimestamp()
	if err != nil {
		return fmt.Errorf("failed to get transaction timestamp: %v", err)
	}
	txTime := time.Unix(txTimestamp.Seconds, int64(txTimestamp.Nanos))

	// Create issuer
	issuer := models.Issuer{
		IssuerOrgID:   issuerOrgID,
		DisplayName:   displayName,
		PublicKeySet:  publicKeySet,
		Roles:         roles,
		Active:        true,
		RegisteredAt:  txTime,
		RegisteredBy:  callerID,
		ContactEmail:  contactEmail,
		ContactPerson: contactPerson,
		DocType:       DocTypeIssuer,
	}

	// Save to state
	issuerJSON, err := issuer.ToJSON()
	if err != nil {
		return fmt.Errorf("failed to marshal issuer: %v", err)
	}

	err = ctx.GetStub().PutState(key, issuerJSON)
	if err != nil {
		return fmt.Errorf("failed to put state: %v", err)
	}

	// Emit event
	eventPayload, _ := json.Marshal(map[string]string{
		"event_type":    "IssuerRegistered",
		"issuer_org_id": issuerOrgID,
		"display_name":  displayName,
	})
	ctx.GetStub().SetEvent("IssuerRegistered", eventPayload)

	return nil
}

// GetIssuer retrieves an issuer by organization ID
func (c *CertificateContract) GetIssuer(
	ctx contractapi.TransactionContextInterface,
	issuerOrgID string,
) (*models.Issuer, error) {
	key := IssuerKeyPrefix + issuerOrgID
	issuerJSON, err := ctx.GetStub().GetState(key)
	if err != nil {
		return nil, fmt.Errorf("failed to read state: %v", err)
	}
	if issuerJSON == nil {
		return nil, fmt.Errorf("issuer %s not found", issuerOrgID)
	}

	return models.IssuerFromJSON(issuerJSON)
}

// ============================================================================
// Template Management
// ============================================================================

// CreateTemplate creates a new certificate template
func (c *CertificateContract) CreateTemplate(
	ctx contractapi.TransactionContextInterface,
	templateID string,
	version string,
	displayName string,
	description string,
	jsonSchemaJSON string,
	uiSchemaJSON string,
	requiredClaimsJSON string,
	issuerConstraintsJSON string,
	validityDaysDefault int,
	category string,
) error {
	// Access control: only issuer admin
	clientID, err := cid.New(ctx.GetStub())
	if err != nil {
		return fmt.Errorf("failed to get client identity: %v", err)
	}
	ac := access.NewAccessControl(clientID)
	if err := ac.RequireAnyRole(access.RoleIssuerAdmin, access.RoleConsortiumAdmin); err != nil {
		return err
	}

	// Validate inputs
	if err := validators.ValidateTemplateID(templateID); err != nil {
		return err
	}
	if err := validators.ValidateVersion(version); err != nil {
		return err
	}

	// Create composite key
	key := TemplateKeyPrefix + templateID + ":" + version

	// Check if template version already exists
	existing, err := ctx.GetStub().GetState(key)
	if err != nil {
		return fmt.Errorf("failed to read state: %v", err)
	}
	if existing != nil {
		return fmt.Errorf("template %s version %s already exists", templateID, version)
	}

	// Parse JSON fields
	var jsonSchema map[string]interface{}
	if err := json.Unmarshal([]byte(jsonSchemaJSON), &jsonSchema); err != nil {
		return fmt.Errorf("invalid json_schema: %v", err)
	}

	var uiSchema map[string]interface{}
	if err := json.Unmarshal([]byte(uiSchemaJSON), &uiSchema); err != nil {
		return fmt.Errorf("invalid ui_schema: %v", err)
	}

	var requiredClaims []string
	if err := json.Unmarshal([]byte(requiredClaimsJSON), &requiredClaims); err != nil {
		return fmt.Errorf("invalid required_claims: %v", err)
	}

	var issuerConstraints []string
	if err := json.Unmarshal([]byte(issuerConstraintsJSON), &issuerConstraints); err != nil {
		return fmt.Errorf("invalid issuer_constraints: %v", err)
	}

	// Get caller ID
	callerID, err := ac.GetID()
	if err != nil {
		return err
	}

	// Use deterministic transaction timestamp
	txTimestamp, err := ctx.GetStub().GetTxTimestamp()
	if err != nil {
		return fmt.Errorf("failed to get transaction timestamp: %v", err)
	}
	txTime := time.Unix(txTimestamp.Seconds, int64(txTimestamp.Nanos))

	// Create template
	template := models.Template{
		TemplateID:          templateID,
		Version:             version,
		DisplayName:         displayName,
		Description:         description,
		JSONSchema:          jsonSchema,
		UISchema:            uiSchema,
		RequiredClaims:      requiredClaims,
		IssuerConstraints:   issuerConstraints,
		Active:              true,
		CreatedAt:           txTime,
		CreatedBy:           callerID,
		ValidityDaysDefault: validityDaysDefault,
		Category:            category,
		DocType:             DocTypeTemplate,
	}

	// Save to state
	templateJSON, err := template.ToJSON()
	if err != nil {
		return fmt.Errorf("failed to marshal template: %v", err)
	}

	err = ctx.GetStub().PutState(key, templateJSON)
	if err != nil {
		return fmt.Errorf("failed to put state: %v", err)
	}

	return nil
}

// GetTemplate retrieves a template by ID and version
func (c *CertificateContract) GetTemplate(
	ctx contractapi.TransactionContextInterface,
	templateID string,
	version string,
) (*models.Template, error) {
	key := TemplateKeyPrefix + templateID + ":" + version
	templateJSON, err := ctx.GetStub().GetState(key)
	if err != nil {
		return nil, fmt.Errorf("failed to read state: %v", err)
	}
	if templateJSON == nil {
		return nil, fmt.Errorf("template %s version %s not found", templateID, version)
	}

	return models.TemplateFromJSON(templateJSON)
}

// ============================================================================
// Certificate Issuance
// ============================================================================

// IssueCertificate issues a new certificate
func (c *CertificateContract) IssueCertificate(
	ctx contractapi.TransactionContextInterface,
	certID string,
	templateID string,
	templateVersion string,
	holderID string,
	certHash string,
	contentPointer string,
	issuedAtRFC3339 string,
	expiresAtRFC3339 string,
	signatureProofRef string,
) error {
	// Access control: only issuer roles
	clientID, err := cid.New(ctx.GetStub())
	if err != nil {
		return fmt.Errorf("failed to get client identity: %v", err)
	}
	ac := access.NewAccessControl(clientID)
	if err := ac.RequireAnyRole(access.RoleIssuerAdmin, access.RoleIssuerOperator); err != nil {
		return err
	}

	// Validate inputs
	if err := validators.ValidateCertID(certID); err != nil {
		return err
	}
	if err := validators.ValidateHash(certHash); err != nil {
		return err
	}
	if err := validators.ValidateContentPointer(contentPointer); err != nil {
		return err
	}

	// Parse timestamps
	issuedAt, err := time.Parse(time.RFC3339, issuedAtRFC3339)
	if err != nil {
		return fmt.Errorf("invalid issued_at format: %v", err)
	}
	expiresAt, err := time.Parse(time.RFC3339, expiresAtRFC3339)
	if err != nil {
		return fmt.Errorf("invalid expires_at format: %v", err)
	}

	// Validate time range
	if err := validators.ValidateTimeRange(issuedAt, expiresAt); err != nil {
		return err
	}

	// Check if certificate already exists
	key := CertificateKeyPrefix + certID
	existing, err := ctx.GetStub().GetState(key)
	if err != nil {
		return fmt.Errorf("failed to read state: %v", err)
	}
	if existing != nil {
		return fmt.Errorf("certificate %s already exists", certID)
	}

	// Verify template exists
	template, err := c.GetTemplate(ctx, templateID, templateVersion)
	if err != nil {
		return fmt.Errorf("template validation failed: %v", err)
	}
	if !template.Active {
		return fmt.Errorf("template %s version %s is not active", templateID, templateVersion)
	}

	// Get issuer org ID from caller
	issuerOrgID, err := ac.GetOrgID()
	if err != nil {
		return err
	}

	// Verify issuer exists and is active
	issuer, err := c.GetIssuer(ctx, issuerOrgID)
	if err != nil {
		return fmt.Errorf("issuer validation failed: %v", err)
	}
	if !issuer.Active {
		return fmt.Errorf("issuer %s is not active", issuerOrgID)
	}

	// Get transaction details
	txID := ctx.GetStub().GetTxID()
	txTimestamp, err := ctx.GetStub().GetTxTimestamp()
	if err != nil {
		return fmt.Errorf("failed to get transaction timestamp: %v", err)
	}
	blockTime := time.Unix(txTimestamp.Seconds, int64(txTimestamp.Nanos))

	// Create certificate record
	certificate := models.Certificate{
		CertID:            certID,
		IssuerOrgID:       issuerOrgID,
		IssuerPublicKeyID: signatureProofRef,
		HolderID:          holderID,
		IssuedAt:          issuedAt,
		ExpiresAt:         expiresAt,
		CertHash:          certHash,
		ContentPointer:    contentPointer,
		Status:            models.StatusActive,
		SchemaID:          templateID,
		TemplateVersion:   templateVersion,
		TxID:              txID,
		BlockTime:         blockTime,
		DocType:           DocTypeCertificate,
	}

	// Save to state
	certJSON, err := certificate.ToJSON()
	if err != nil {
		return fmt.Errorf("failed to marshal certificate: %v", err)
	}

	err = ctx.GetStub().PutState(key, certJSON)
	if err != nil {
		return fmt.Errorf("failed to put state: %v", err)
	}

	// Emit event
	event := models.EventCertificateIssued{
		CertID:      certID,
		IssuerOrgID: issuerOrgID,
		HolderID:    holderID,
		IssuedAt:    issuedAt,
		ExpiresAt:   expiresAt,
		TemplateID:  templateID,
	}
	eventPayload, _ := json.Marshal(event)
	ctx.GetStub().SetEvent("CertificateIssued", eventPayload)

	return nil
}

// ============================================================================
// Certificate Retrieval and Verification
// ============================================================================

// GetCertificateRecord retrieves a certificate by ID
func (c *CertificateContract) GetCertificateRecord(
	ctx contractapi.TransactionContextInterface,
	certID string,
) (*models.Certificate, error) {
	key := CertificateKeyPrefix + certID
	certJSON, err := ctx.GetStub().GetState(key)
	if err != nil {
		return nil, fmt.Errorf("failed to read state: %v", err)
	}
	if certJSON == nil {
		return nil, fmt.Errorf("certificate %s not found", certID)
	}

	cert, err := models.CertificateFromJSON(certJSON)
	if err != nil {
		return nil, err
	}

	// Access control check
	clientID, err := cid.New(ctx.GetStub())
	if err != nil {
		return nil, fmt.Errorf("failed to get client identity: %v", err)
	}
	ac := access.NewAccessControl(clientID)
	canRead, err := ac.CanReadCertificate(cert.IssuerOrgID, cert.HolderID)
	if err != nil {
		return nil, err
	}
	if !canRead {
		return nil, fmt.Errorf("access denied: insufficient permissions to read certificate")
	}

	return cert, nil
}

// VerifyCertificateRecord performs verification checks on a certificate
func (c *CertificateContract) VerifyCertificateRecord(
	ctx contractapi.TransactionContextInterface,
	certID string,
	presentedHash string,
) (string, error) {
	// Get certificate
	cert, err := c.GetCertificateRecord(ctx, certID)
	if err != nil {
		return "", err
	}

	// Get issuer
	issuer, err := c.GetIssuer(ctx, cert.IssuerOrgID)
	if err != nil {
		return "", fmt.Errorf("failed to get issuer: %v", err)
	}

	// Use deterministic transaction timestamp
	txTimestamp, err := ctx.GetStub().GetTxTimestamp()
	if err != nil {
		return "", fmt.Errorf("failed to get transaction timestamp: %v", err)
	}
	txTime := time.Unix(txTimestamp.Seconds, int64(txTimestamp.Nanos))

	// Build verification result
	result := models.VerificationResult{
		CertID:       certID,
		Status:       cert.Status,
		IssuerOrgID:  cert.IssuerOrgID,
		IssuerName:   issuer.DisplayName,
		HolderID:     cert.HolderID,
		IssuedAt:     cert.IssuedAt,
		ExpiresAt:    cert.ExpiresAt,
		IsExpired:    txTime.After(cert.ExpiresAt),
		IsRevoked:    cert.Status == models.StatusRevoked,
		OnChainHash:  cert.CertHash,
		VerifiedAt:   txTime,
	}

	if cert.Status == models.StatusRevoked {
		result.RevocationReason = cert.RevocationReason
	}

	// If hash is provided, validate it
	if presentedHash != "" {
		if err := validators.ValidateHash(presentedHash); err == nil {
			hashMatches := presentedHash == cert.CertHash
			result.HashMatches = &hashMatches
		}
	}

	// Convert result to JSON
	resultJSON, err := result.ToJSON()
	if err != nil {
		return "", fmt.Errorf("failed to marshal result: %v", err)
	}

	return string(resultJSON), nil
}

// ============================================================================
// Certificate Revocation
// ============================================================================

// RevokeCertificate revokes a certificate
func (c *CertificateContract) RevokeCertificate(
	ctx contractapi.TransactionContextInterface,
	certID string,
	reasonCode string,
	reasonText string,
) error {
	// Get certificate
	key := CertificateKeyPrefix + certID
	certJSON, err := ctx.GetStub().GetState(key)
	if err != nil {
		return fmt.Errorf("failed to read state: %v", err)
	}
	if certJSON == nil {
		return fmt.Errorf("certificate %s not found", certID)
	}

	cert, err := models.CertificateFromJSON(certJSON)
	if err != nil {
		return err
	}

	// Check if already revoked
	if cert.Status == models.StatusRevoked {
		return fmt.Errorf("certificate %s is already revoked", certID)
	}

	// Access control: only issuer who issued the certificate
	clientID, err := cid.New(ctx.GetStub())
	if err != nil {
		return fmt.Errorf("failed to get client identity: %v", err)
	}
	ac := access.NewAccessControl(clientID)
	if err := ac.RequireIssuerForOrg(cert.IssuerOrgID); err != nil {
		return err
	}

	// Validate reason code
	if err := validators.ValidateRevocationReason(reasonCode); err != nil {
		return err
	}

	// Get caller ID
	callerID, err := ac.GetID()
	if err != nil {
		return err
	}

	// Use deterministic transaction timestamp
	txTimestamp, err := ctx.GetStub().GetTxTimestamp()
	if err != nil {
		return fmt.Errorf("failed to get transaction timestamp: %v", err)
	}
	now := time.Unix(txTimestamp.Seconds, int64(txTimestamp.Nanos))

	// Update certificate
	cert.Status = models.StatusRevoked
	cert.RevocationReason = reasonCode
	if reasonText != "" {
		cert.RevocationReason += ": " + reasonText
	}
	cert.RevokedAt = &now

	// Save updated state
	updatedCertJSON, err := cert.ToJSON()
	if err != nil {
		return fmt.Errorf("failed to marshal certificate: %v", err)
	}

	err = ctx.GetStub().PutState(key, updatedCertJSON)
	if err != nil {
		return fmt.Errorf("failed to put state: %v", err)
	}

	// Emit event
	event := models.EventCertificateRevoked{
		CertID:           certID,
		IssuerOrgID:      cert.IssuerOrgID,
		RevokedAt:        now,
		RevocationReason: cert.RevocationReason,
		RevokedBy:        callerID,
	}
	eventPayload, _ := json.Marshal(event)
	ctx.GetStub().SetEvent("CertificateRevoked", eventPayload)

	return nil
}

// ============================================================================
// Query Functions
// ============================================================================

// ListCertificatesByHolder lists all certificates for a specific holder
func (c *CertificateContract) ListCertificatesByHolder(
	ctx contractapi.TransactionContextInterface,
	holderID string,
	pageSize int32,
	bookmark string,
) (string, error) {
	// Build query
	queryString := fmt.Sprintf(`{
		"selector": {
			"doc_type": "certificate",
			"holder_id": "%s"
		},
		"sort": [{"issued_at": "desc"}]
	}`, holderID)

	return c.executeQuery(ctx, queryString, pageSize, bookmark)
}

// ListCertificatesByIssuer lists all certificates issued by a specific organization
func (c *CertificateContract) ListCertificatesByIssuer(
	ctx contractapi.TransactionContextInterface,
	issuerOrgID string,
	pageSize int32,
	bookmark string,
) (string, error) {
	// Access control: only issuer for that org or admin
	clientID, err := cid.New(ctx.GetStub())
	if err != nil {
		return "", fmt.Errorf("failed to get client identity: %v", err)
	}
	ac := access.NewAccessControl(clientID)
	canList, err := ac.IsIssuerForOrg(issuerOrgID)
	if err != nil {
		return "", err
	}
	if !canList {
		isAdmin, err := ac.HasAnyRole(access.RoleConsortiumAdmin, access.RoleAuditor)
		if err != nil {
			return "", err
		}
		if !isAdmin {
			return "", fmt.Errorf("access denied")
		}
	}

	// Build query
	queryString := fmt.Sprintf(`{
		"selector": {
			"doc_type": "certificate",
			"issuer_org_id": "%s"
		},
		"sort": [{"issued_at": "desc"}]
	}`, issuerOrgID)

	return c.executeQuery(ctx, queryString, pageSize, bookmark)
}

// GetCertificateHistory retrieves the transaction history for a certificate
func (c *CertificateContract) GetCertificateHistory(
	ctx contractapi.TransactionContextInterface,
	certID string,
) (string, error) {
	key := CertificateKeyPrefix + certID

	// Get history
	resultsIterator, err := ctx.GetStub().GetHistoryForKey(key)
	if err != nil {
		return "", fmt.Errorf("failed to get history: %v", err)
	}
	defer resultsIterator.Close()

	// Build history array
	var history []map[string]interface{}
	for resultsIterator.HasNext() {
		response, err := resultsIterator.Next()
		if err != nil {
			return "", err
		}

		var record map[string]interface{}
		if len(response.Value) > 0 {
			json.Unmarshal(response.Value, &record)
		}

		historyEntry := map[string]interface{}{
			"tx_id":     response.TxId,
			"timestamp": time.Unix(response.Timestamp.Seconds, int64(response.Timestamp.Nanos)),
			"is_delete": response.IsDelete,
			"value":     record,
		}
		history = append(history, historyEntry)
	}

	historyJSON, err := json.Marshal(history)
	if err != nil {
		return "", fmt.Errorf("failed to marshal history: %v", err)
	}

	return string(historyJSON), nil
}

// executeQuery executes a CouchDB rich query
func (c *CertificateContract) executeQuery(
	ctx contractapi.TransactionContextInterface,
	queryString string,
	pageSize int32,
	bookmark string,
) (string, error) {
	if pageSize <= 0 {
		pageSize = 20
	}
	if pageSize > 100 {
		pageSize = 100
	}

	resultsIterator, responseMetadata, err := ctx.GetStub().GetQueryResultWithPagination(
		queryString, pageSize, bookmark)
	if err != nil {
		return "", fmt.Errorf("failed to execute query: %v", err)
	}
	defer resultsIterator.Close()

	// Build results array
	var results []models.Certificate
	for resultsIterator.HasNext() {
		queryResponse, err := resultsIterator.Next()
		if err != nil {
			return "", err
		}

		var cert models.Certificate
		err = json.Unmarshal(queryResponse.Value, &cert)
		if err != nil {
			return "", err
		}
		results = append(results, cert)
	}

	// Build response
	response := models.CertificateListResult{
		Certificates: results,
		Pagination: models.PaginationMetadata{
			Bookmark:      responseMetadata.Bookmark,
			RecordsCount:  int(responseMetadata.FetchedRecordsCount),
			FetchedRecords: len(results),
		},
	}

	responseJSON, err := response.ToJSON()
	if err != nil {
		return "", fmt.Errorf("failed to marshal response: %v", err)
	}

	return string(responseJSON), nil
}
