package models

import (
	"encoding/json"
	"time"
)

// CertificateStatus represents the status of a certificate
type CertificateStatus string

const (
	StatusActive  CertificateStatus = "ACTIVE"
	StatusRevoked CertificateStatus = "REVOKED"
)

// Certificate represents the on-chain metadata for a digital certificate
type Certificate struct {
	CertID            string            `json:"cert_id"`
	IssuerOrgID       string            `json:"issuer_org_id"`
	IssuerPublicKeyID string            `json:"issuer_public_key_id"`
	HolderID          string            `json:"holder_id"`
	IssuedAt          time.Time         `json:"issued_at"`
	ExpiresAt         time.Time         `json:"expires_at"`
	CertHash          string            `json:"cert_hash"`
	ContentPointer    string            `json:"content_pointer"`
	Status            CertificateStatus `json:"status"`
	RevocationReason  string            `json:"revocation_reason,omitempty"`
	RevokedAt         *time.Time        `json:"revoked_at,omitempty"`
	SchemaID          string            `json:"schema_id"`
	TemplateVersion   string            `json:"template_version"`
	TxID              string            `json:"tx_id"`
	BlockTime         time.Time         `json:"block_time"`
	DocType           string            `json:"doc_type"`
}

// ToJSON converts Certificate to JSON bytes
func (c *Certificate) ToJSON() ([]byte, error) {
	return json.Marshal(c)
}

// FromJSON creates Certificate from JSON bytes
func CertificateFromJSON(data []byte) (*Certificate, error) {
	var cert Certificate
	err := json.Unmarshal(data, &cert)
	if err != nil {
		return nil, err
	}
	return &cert, nil
}

// Issuer represents a certificate issuing authority
type Issuer struct {
	IssuerOrgID   string            `json:"issuer_org_id"`
	DisplayName   string            `json:"display_name"`
	PublicKeySet  map[string]string `json:"public_key_set"` // key_id -> public_key_pem
	Roles         []string          `json:"roles"`
	Active        bool              `json:"active"`
	RegisteredAt  time.Time         `json:"registered_at"`
	RegisteredBy  string            `json:"registered_by"`
	ContactEmail  string            `json:"contact_email"`
	ContactPerson string            `json:"contact_person"`
	DocType       string            `json:"doc_type"`
}

// ToJSON converts Issuer to JSON bytes
func (i *Issuer) ToJSON() ([]byte, error) {
	return json.Marshal(i)
}

// FromJSON creates Issuer from JSON bytes
func IssuerFromJSON(data []byte) (*Issuer, error) {
	var issuer Issuer
	err := json.Unmarshal(data, &issuer)
	if err != nil {
		return nil, err
	}
	return &issuer, nil
}

// Template represents a certificate template
type Template struct {
	TemplateID          string                 `json:"template_id"`
	Version             string                 `json:"version"`
	DisplayName         string                 `json:"display_name"`
	Description         string                 `json:"description"`
	JSONSchema          map[string]interface{} `json:"json_schema"`
	UISchema            map[string]interface{} `json:"ui_schema"`
	RequiredClaims      []string               `json:"required_claims"`
	IssuerConstraints   []string               `json:"issuer_constraints"`
	Active              bool                   `json:"active"`
	CreatedAt           time.Time              `json:"created_at"`
	CreatedBy           string                 `json:"created_by"`
	ValidityDaysDefault int                    `json:"validity_days_default"`
	Category            string                 `json:"category"`
	DocType             string                 `json:"doc_type"`
}

// ToJSON converts Template to JSON bytes
func (t *Template) ToJSON() ([]byte, error) {
	return json.Marshal(t)
}

// FromJSON creates Template from JSON bytes
func TemplateFromJSON(data []byte) (*Template, error) {
	var template Template
	err := json.Unmarshal(data, &template)
	if err != nil {
		return nil, err
	}
	return &template, nil
}

// VerificationResult represents the result of a verification check
type VerificationResult struct {
	CertID           string            `json:"cert_id"`
	Status           CertificateStatus `json:"status"`
	IssuerOrgID      string            `json:"issuer_org_id"`
	IssuerName       string            `json:"issuer_name"`
	HolderID         string            `json:"holder_id"`
	IssuedAt         time.Time         `json:"issued_at"`
	ExpiresAt        time.Time         `json:"expires_at"`
	IsExpired        bool              `json:"is_expired"`
	IsRevoked        bool              `json:"is_revoked"`
	RevocationReason string            `json:"revocation_reason,omitempty"`
	HashMatches      *bool             `json:"hash_matches,omitempty"`
	OnChainHash      string            `json:"on_chain_hash"`
	VerifiedAt       time.Time         `json:"verified_at"`
}

// ToJSON converts VerificationResult to JSON bytes
func (v *VerificationResult) ToJSON() ([]byte, error) {
	return json.Marshal(v)
}

// PaginationMetadata represents pagination information
type PaginationMetadata struct {
	Bookmark      string `json:"bookmark,omitempty"`
	RecordsCount  int    `json:"records_count"`
	FetchedRecords int   `json:"fetched_records"`
}

// CertificateListResult represents a paginated list of certificates
type CertificateListResult struct {
	Certificates []Certificate      `json:"certificates"`
	Pagination   PaginationMetadata `json:"pagination"`
}

// ToJSON converts CertificateListResult to JSON bytes
func (c *CertificateListResult) ToJSON() ([]byte, error) {
	return json.Marshal(c)
}

// EventCertificateIssued event payload
type EventCertificateIssued struct {
	CertID      string    `json:"cert_id"`
	IssuerOrgID string    `json:"issuer_org_id"`
	HolderID    string    `json:"holder_id"`
	IssuedAt    time.Time `json:"issued_at"`
	ExpiresAt   time.Time `json:"expires_at"`
	TemplateID  string    `json:"template_id"`
}

// EventCertificateRevoked event payload
type EventCertificateRevoked struct {
	CertID           string    `json:"cert_id"`
	IssuerOrgID      string    `json:"issuer_org_id"`
	RevokedAt        time.Time `json:"revoked_at"`
	RevocationReason string    `json:"revocation_reason"`
	RevokedBy        string    `json:"revoked_by"`
}
