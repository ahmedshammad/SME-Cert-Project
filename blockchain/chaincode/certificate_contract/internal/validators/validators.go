package validators

import (
	"encoding/hex"
	"fmt"
	"regexp"
	"strings"
	"time"
)

// ValidateCertID validates certificate ID format
func ValidateCertID(certID string) error {
	if certID == "" {
		return fmt.Errorf("cert_id cannot be empty")
	}
	if len(certID) < 10 || len(certID) > 100 {
		return fmt.Errorf("cert_id must be between 10 and 100 characters")
	}
	// Must be alphanumeric with hyphens
	matched, _ := regexp.MatchString("^[a-zA-Z0-9-_]+$", certID)
	if !matched {
		return fmt.Errorf("cert_id must contain only alphanumeric characters, hyphens, and underscores")
	}
	return nil
}

// ValidateOrgID validates organization ID format
func ValidateOrgID(orgID string) error {
	if orgID == "" {
		return fmt.Errorf("org_id cannot be empty")
	}
	if len(orgID) < 3 || len(orgID) > 50 {
		return fmt.Errorf("org_id must be between 3 and 50 characters")
	}
	matched, _ := regexp.MatchString("^[a-zA-Z0-9.-]+$", orgID)
	if !matched {
		return fmt.Errorf("org_id must contain only alphanumeric characters, dots, and hyphens")
	}
	return nil
}

// ValidateHash validates SHA-256 hash format
func ValidateHash(hash string) error {
	if hash == "" {
		return fmt.Errorf("hash cannot be empty")
	}

	// SHA-256 produces a 64-character hex string
	if len(hash) != 64 {
		return fmt.Errorf("hash must be 64 characters (SHA-256)")
	}

	// Validate hex encoding
	_, err := hex.DecodeString(hash)
	if err != nil {
		return fmt.Errorf("hash must be valid hexadecimal: %v", err)
	}

	return nil
}

// ValidateContentPointer validates content pointer format (CID or object key)
func ValidateContentPointer(pointer string) error {
	if pointer == "" {
		return fmt.Errorf("content_pointer cannot be empty")
	}

	// Check if it's an IPFS CID (starts with Qm or ba for CIDv0/v1)
	if strings.HasPrefix(pointer, "Qm") || strings.HasPrefix(pointer, "ba") {
		if len(pointer) < 46 {
			return fmt.Errorf("invalid IPFS CID format")
		}
		return nil
	}

	// Otherwise validate as object storage key
	if len(pointer) < 10 || len(pointer) > 500 {
		return fmt.Errorf("content_pointer must be between 10 and 500 characters")
	}

	return nil
}

// ValidateTimeRange validates time range with issued_at before expires_at
func ValidateTimeRange(issuedAt, expiresAt time.Time) error {
	if issuedAt.IsZero() {
		return fmt.Errorf("issued_at cannot be zero")
	}
	if expiresAt.IsZero() {
		return fmt.Errorf("expires_at cannot be zero")
	}
	if expiresAt.Before(issuedAt) || expiresAt.Equal(issuedAt) {
		return fmt.Errorf("expires_at must be after issued_at")
	}

	// Validate not too far in the past (more than 1 year)
	oneYearAgo := time.Now().AddDate(-1, 0, 0)
	if issuedAt.Before(oneYearAgo) {
		return fmt.Errorf("issued_at cannot be more than 1 year in the past")
	}

	// Validate not too far in the future (more than 10 years from issue)
	tenYearsFromIssue := issuedAt.AddDate(10, 0, 0)
	if expiresAt.After(tenYearsFromIssue) {
		return fmt.Errorf("expires_at cannot be more than 10 years from issued_at")
	}

	return nil
}

// ValidateTemplateID validates template ID format
func ValidateTemplateID(templateID string) error {
	if templateID == "" {
		return fmt.Errorf("template_id cannot be empty")
	}
	if len(templateID) < 3 || len(templateID) > 50 {
		return fmt.Errorf("template_id must be between 3 and 50 characters")
	}
	matched, _ := regexp.MatchString("^[a-zA-Z0-9-_]+$", templateID)
	if !matched {
		return fmt.Errorf("template_id must contain only alphanumeric characters, hyphens, and underscores")
	}
	return nil
}

// ValidateVersion validates semantic version format
func ValidateVersion(version string) error {
	if version == "" {
		return fmt.Errorf("version cannot be empty")
	}
	// Simple semantic version pattern: x.y.z
	matched, _ := regexp.MatchString(`^\d+\.\d+\.\d+$`, version)
	if !matched {
		return fmt.Errorf("version must follow semantic versioning format (e.g., 1.0.0)")
	}
	return nil
}

// ValidatePublicKey validates public key format (PEM)
func ValidatePublicKey(publicKey string) error {
	if publicKey == "" {
		return fmt.Errorf("public_key cannot be empty")
	}
	if !strings.Contains(publicKey, "BEGIN PUBLIC KEY") || !strings.Contains(publicKey, "END PUBLIC KEY") {
		return fmt.Errorf("public_key must be in PEM format")
	}
	if len(publicKey) < 100 || len(publicKey) > 2000 {
		return fmt.Errorf("public_key length is invalid")
	}
	return nil
}

// ValidateEmail validates email format
func ValidateEmail(email string) error {
	if email == "" {
		return fmt.Errorf("email cannot be empty")
	}
	matched, _ := regexp.MatchString(`^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$`, email)
	if !matched {
		return fmt.Errorf("invalid email format")
	}
	return nil
}

// ValidateNonEmpty validates that a string is not empty
func ValidateNonEmpty(value, fieldName string) error {
	if strings.TrimSpace(value) == "" {
		return fmt.Errorf("%s cannot be empty", fieldName)
	}
	return nil
}

// ValidatePageSize validates pagination page size
func ValidatePageSize(pageSize int32) error {
	if pageSize <= 0 {
		return fmt.Errorf("page_size must be greater than 0")
	}
	if pageSize > 100 {
		return fmt.Errorf("page_size cannot exceed 100")
	}
	return nil
}

// ValidateRevocationReason validates revocation reason code
func ValidateRevocationReason(reasonCode string) error {
	validReasons := map[string]bool{
		"COMPROMISED":      true,
		"SUPERSEDED":       true,
		"CESSATION":        true,
		"PRIVILEGE_WITHDRAWN": true,
		"AFFILIATION_CHANGED": true,
		"ERROR_IN_DATA":    true,
		"OTHER":            true,
	}

	if !validReasons[reasonCode] {
		return fmt.Errorf("invalid revocation reason code: %s", reasonCode)
	}
	return nil
}
