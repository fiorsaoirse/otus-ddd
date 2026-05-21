package user

import "errors"

var (
	ErrInvalidEmail      = errors.New("invalid email")
	ErrUserAlreadyExists = errors.New("user already exists")
	ErrUserNotFound      = errors.New("user not found")
)
