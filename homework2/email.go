package user

import (
	"net/mail"
	"strings"
)

type Email struct {
	value string
}

func NewEmail(value string) (Email, error) {
	normalized := normalizeEmail(value)
	if err := validateNormalizedEmail(normalized); err != nil {
		return Email{}, err
	}

	return Email{value: normalized}, nil
}

func (e Email) String() string {
	return e.value
}

func (e Email) Validate() error {
	return validateNormalizedEmail(e.value)
}

func normalizeEmail(value string) string {
	return strings.ToLower(strings.TrimSpace(value))
}

func validateNormalizedEmail(value string) error {
	if value == "" {
		return ErrInvalidEmail
	}

	parsed, err := mail.ParseAddress(value)
	if err != nil {
		return ErrInvalidEmail
	}
	if parsed.Address != value {
		return ErrInvalidEmail
	}

	return nil
}
