package user

import "errors"

var (
	ErrInvalidEmail = errors.New("invalid email")
	ErrUserNotFound = errors.New("user not found")
)
