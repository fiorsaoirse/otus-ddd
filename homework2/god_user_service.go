package user

import (
	"database/sql"
	"errors"
	"fmt"
	"net/mail"
	"strings"
	"time"
)

// Что тут плохо:

// S - нарушение принципа единой ответственности, этот сервис занимается тем, чем заниматься не должен, а именно: лезет в бд, отправляет имейлы, пишет аудит лог
// O - чтобы поменять логику отправки имейла, логику валидации, получение данных из бд - необходимо лезть в код класса и исправлять поведение
// L - альтернативной реализации будет трудно сохранить тот же контракт: метод не только создает пользователя, но делает кучу других вещей
// I - класс имеет широкий интерфейс: клиентам, которым нужна только регистрация или смена email, придется зависеть от методов/сайд-эффектов, которые им не нужны
// D - зависит от конкретных инфраструктурных сервисов и типов

// Дополнительно - содержит логику инвариантов прямо здесь, то есть смешано все, что только можно - доменная логика, инфраструктура и т.д.

type GodUserService struct {
	db         *sql.DB
	smtpHost   string
	smtpUser   string
	smtpPass   string
	auditFile  string
	jwtSecret  string
	baseAppURL string
}

type UserResponse struct {
	ID        string
}

type GodUserServiceActions interface {
    RegisterUser(rawEmail string, name string)
    ChangeEmail(userID string, rawEmail string)
    SendWelcomeEmail(email string, verifyLink string)
    WriteAuditEvent(message string)
}

func (s *GodUserService) RegisterUser(rawEmail string, name string) (*UserResponse, error) {
	email := strings.ToLower(strings.TrimSpace(rawEmail))
	if email == "" {
		return nil, errors.New("email is empty")
	}

	parsed, err := mail.ParseAddress(email)
	if err != nil {
		return nil, errors.New("invalid email")
	}
	if parsed.Address != email {
		return nil, errors.New("invalid email")
	}

	if strings.TrimSpace(name) == "" {
		return nil, errors.New("name is empty")
	}

	var existingID string
	err = s.db.QueryRow(
		"SELECT id FROM users WHERE email = ?",
		email,
	).Scan(&existingID)
	if err == nil {
		return nil, fmt.Errorf("user already exists: %s", existingID)
	}
	if err != sql.ErrNoRows {
		return nil, fmt.Errorf("failed to check user: %w", err)
	}

	userID := fmt.Sprintf("user_%d", time.Now().UnixNano())
	now := time.Now().UTC()

	_, err = s.db.Exec(
		"INSERT INTO users (id, email, name, created_at) VALUES (?, ?, ?, ?)",
		userID,
		email,
		name,
		now,
	)
	if err != nil {
		return nil, fmt.Errorf("failed to create user: %w", err)
	}

	token := fmt.Sprintf("fake-jwt.%s.%d.signed-with.%s", userID, now.Unix(), s.jwtSecret)

	verifyLink := s.baseAppURL + "/verify?email=" + email + "&token=" + token
	if err := s.SendWelcomeEmail(email, verifyLink); err != nil {
		return nil, fmt.Errorf("failed to send welcome email: %w", err)
	}

	if err := s.WriteAuditEvent("registered user " + userID + " with email " + email); err != nil {
		return nil, fmt.Errorf("failed to write audit event: %w", err)
	}

	return &UserResponse{
		ID:        userID,
	}, nil
}

func (s *GodUserService) ChangeEmail(userID string, rawEmail string) error {
	email := strings.ToLower(strings.TrimSpace(rawEmail))
	if email == "" {
		return errors.New("email is empty")
	}

	parsed, err := mail.ParseAddress(email)
	if err != nil {
		return errors.New("invalid email")
	}
	if parsed.Address != email {
		return errors.New("invalid email")
	}

	_, err = s.db.Exec(
		"UPDATE users SET email = ?, updated_at = ? WHERE id = ?",
		email,
		time.Now().UTC(),
		userID,
	)
	if err != nil {
		return fmt.Errorf("failed to update email: %w", err)
	}

	return s.WriteAuditEvent("changed email for user " + userID + " to " + email)
}

func (s *GodUserService) SendWelcomeEmail(email string, verifyLink string) error {
	fmt.Printf("send email via %s as %s to %s: %s\n", s.smtpHost, s.smtpUser, email, verifyLink)
	return nil
}

func (s *GodUserService) WriteAuditEvent(message string) error {
	fmt.Printf("append to %s: %s\n", s.auditFile, message)
	return nil
}
