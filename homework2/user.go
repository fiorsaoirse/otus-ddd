package user

import "time"

type User struct {
	ID        string
	Email     Email
	Name      string
	CreatedAt time.Time
	UpdatedAt time.Time
}

func NewUser(id string, email Email, name string, now time.Time) *User {
	return &User{
		ID:        id,
		Email:     email,
		Name:      name,
		CreatedAt: now,
		UpdatedAt: now,
	}
}

func (u *User) ChangeEmail(email Email, now time.Time) {
	u.Email = email
	u.UpdatedAt = now
}
