package user

import "testing"

func TestNewEmailNormalizesValue(t *testing.T) {
	email, err := NewEmail("  USER@Example.COM ")
	if err != nil {
		t.Fatalf("expected email to be created, got %v", err)
	}

	if got := email.String(); got != "user@example.com" {
		t.Fatalf("expected normalized email, got %q", got)
	}
}

func TestNewEmailRejectsInvalidValue(t *testing.T) {
	for _, value := range []string{"", "plain-text", "User <user@example.com>"} {
		if _, err := NewEmail(value); err != ErrInvalidEmail {
			t.Fatalf("expected ErrInvalidEmail for %q, got %v", value, err)
		}
	}
}
