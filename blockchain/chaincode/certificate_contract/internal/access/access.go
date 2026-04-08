package access

import (
	"fmt"
	"strings"

	"github.com/hyperledger/fabric-chaincode-go/v2/pkg/cid"
)

// Role represents a user role in the system
type Role string

const (
	RoleConsortiumAdmin Role = "consortium_admin"
	RoleIssuerAdmin     Role = "issuer_admin"
	RoleIssuerOperator  Role = "issuer_operator"
	RoleSMEUser         Role = "sme_user"
	RoleVerifier        Role = "verifier"
	RoleAuditor         Role = "auditor"
)

// AccessControl provides authorization functions
type AccessControl struct {
	stub cid.ClientIdentity
}

// NewAccessControl creates a new AccessControl instance
func NewAccessControl(stub cid.ClientIdentity) *AccessControl {
	return &AccessControl{stub: stub}
}

// GetMSPID returns the MSP ID of the caller
func (ac *AccessControl) GetMSPID() (string, error) {
	mspID, err := ac.stub.GetMSPID()
	if err != nil {
		return "", fmt.Errorf("failed to get MSP ID: %v", err)
	}
	return mspID, nil
}

// GetID returns the ID of the caller
func (ac *AccessControl) GetID() (string, error) {
	id, err := ac.stub.GetID()
	if err != nil {
		return "", fmt.Errorf("failed to get caller ID: %v", err)
	}
	return id, nil
}

// GetAttributeValue returns the value of a specific attribute
func (ac *AccessControl) GetAttributeValue(attrName string) (string, bool, error) {
	value, found, err := ac.stub.GetAttributeValue(attrName)
	if err != nil {
		return "", false, fmt.Errorf("failed to get attribute %s: %v", attrName, err)
	}
	return value, found, nil
}

// HasRole checks if the caller has a specific role
func (ac *AccessControl) HasRole(role Role) (bool, error) {
	roleValue, found, err := ac.GetAttributeValue("role")
	if err != nil {
		return false, err
	}
	if !found {
		return false, nil
	}

	// Support multiple roles separated by comma
	roles := strings.Split(roleValue, ",")
	for _, r := range roles {
		if strings.TrimSpace(r) == string(role) {
			return true, nil
		}
	}

	return false, nil
}

// HasAnyRole checks if the caller has any of the specified roles
func (ac *AccessControl) HasAnyRole(roles ...Role) (bool, error) {
	for _, role := range roles {
		hasRole, err := ac.HasRole(role)
		if err != nil {
			return false, err
		}
		if hasRole {
			return true, nil
		}
	}
	return false, nil
}

// RequireRole enforces that the caller has a specific role
func (ac *AccessControl) RequireRole(role Role) error {
	hasRole, err := ac.HasRole(role)
	if err != nil {
		return err
	}
	if !hasRole {
		callerID, _ := ac.GetID()
		return fmt.Errorf("access denied: caller %s does not have required role %s", callerID, role)
	}
	return nil
}

// RequireAnyRole enforces that the caller has at least one of the specified roles
func (ac *AccessControl) RequireAnyRole(roles ...Role) error {
	hasRole, err := ac.HasAnyRole(roles...)
	if err != nil {
		return err
	}
	if !hasRole {
		callerID, _ := ac.GetID()
		roleNames := make([]string, len(roles))
		for i, r := range roles {
			roleNames[i] = string(r)
		}
		return fmt.Errorf("access denied: caller %s does not have any of required roles: %s",
			callerID, strings.Join(roleNames, ", "))
	}
	return nil
}

// GetOrgID returns the organization ID from attributes or MSP ID
func (ac *AccessControl) GetOrgID() (string, error) {
	// First try to get from attribute
	orgID, found, err := ac.GetAttributeValue("org_id")
	if err != nil {
		return "", err
	}
	if found && orgID != "" {
		return orgID, nil
	}

	// Fallback to MSP ID
	mspID, err := ac.GetMSPID()
	if err != nil {
		return "", err
	}

	// Convert MSP ID to org ID (e.g., Org1MSP -> org1)
	orgID = strings.ToLower(strings.TrimSuffix(mspID, "MSP"))
	return orgID, nil
}

// IsIssuerForOrg checks if the caller is an issuer for a specific organization
func (ac *AccessControl) IsIssuerForOrg(targetOrgID string) (bool, error) {
	// Must have issuer role
	isIssuer, err := ac.HasAnyRole(RoleIssuerAdmin, RoleIssuerOperator)
	if err != nil {
		return false, err
	}
	if !isIssuer {
		return false, nil
	}

	// Must belong to the same organization
	callerOrgID, err := ac.GetOrgID()
	if err != nil {
		return false, err
	}

	return callerOrgID == targetOrgID, nil
}

// RequireIssuerForOrg enforces that the caller is an issuer for a specific organization
func (ac *AccessControl) RequireIssuerForOrg(targetOrgID string) error {
	isIssuer, err := ac.IsIssuerForOrg(targetOrgID)
	if err != nil {
		return err
	}
	if !isIssuer {
		callerID, _ := ac.GetID()
		callerOrgID, _ := ac.GetOrgID()
		return fmt.Errorf("access denied: caller %s from org %s is not an issuer for org %s",
			callerID, callerOrgID, targetOrgID)
	}
	return nil
}

// CanReadCertificate checks if the caller can read a specific certificate
func (ac *AccessControl) CanReadCertificate(issuerOrgID, holderID string) (bool, error) {
	// Consortium admins can read everything
	isAdmin, err := ac.HasRole(RoleConsortiumAdmin)
	if err != nil {
		return false, err
	}
	if isAdmin {
		return true, nil
	}

	// Auditors can read everything
	isAuditor, err := ac.HasRole(RoleAuditor)
	if err != nil {
		return false, err
	}
	if isAuditor {
		return true, nil
	}

	// Issuers can read their own certificates
	isIssuerForOrg, err := ac.IsIssuerForOrg(issuerOrgID)
	if err != nil {
		return false, err
	}
	if isIssuerForOrg {
		return true, nil
	}

	// Holders can read their own certificates
	callerID, err := ac.GetID()
	if err != nil {
		return false, err
	}
	if callerID == holderID {
		return true, nil
	}

	// Verifiers can read basic info (handled at function level)
	isVerifier, err := ac.HasRole(RoleVerifier)
	if err != nil {
		return false, err
	}
	if isVerifier {
		return true, nil
	}

	return false, nil
}

// RequireConsortiumAdmin enforces consortium admin role
func (ac *AccessControl) RequireConsortiumAdmin() error {
	return ac.RequireRole(RoleConsortiumAdmin)
}
