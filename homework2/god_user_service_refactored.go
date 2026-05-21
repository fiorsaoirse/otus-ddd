package user

import (
	"fmt"
	"time"
)

type UserService struct {
	userRepository     UserRepository
	notificationSender NotificationSender
	logger             Logger
}

type UserRepository interface {
	FindByEmail(email Email) (*User, error)
	FindById(id string) (*User, error)
	SaveUser(user *User) error
}

type NotificationSender interface {
	SendWelcomeEmail(email Email) error
}

type Logger interface {
	Log(message string)
}

type UserServiceActions interface {
	RegisterUser(rawEmail string, name string) (*UserResponse, error)
	ChangeEmail(userID string, rawEmail string) error
}

func (s *UserService) RegisterUser(rawEmail string, name string) (*UserResponse, error) {
	// Создание через домен, все инварианты - ответственность домена
	email, err := NewEmail(rawEmail)
	if err != nil {
		return nil, err
	}
	// Логикой по получению персистентных данных управляет репозиторий
	user, err := s.userRepository.FindByEmail(email)
	if err != nil {
		return nil, err
	}
	if user != nil {
		return nil, ErrUserAlreadyExists
	}

	// Вся логика по созданию пользователя, все инварианты - ответственность домена
	now := time.Now().UTC()
	newUser := NewUser(fmt.Sprintf("user_%d", now.UnixNano()), email, name, now)

	if err := s.userRepository.SaveUser(newUser); err != nil {
		return nil, err
	}

	if err := s.notificationSender.SendWelcomeEmail(email); err != nil {
		return nil, err
	}

	s.logger.Log("User created")

	return &UserResponse{ID: newUser.ID}, nil
}

func (s *UserService) ChangeEmail(userID string, rawEmail string) error {
	// Логикой по получению персистентных данных управляет репозиторий
	user, err := s.userRepository.FindById(userID)
	if err != nil {
		return err
	}
	if user == nil {
		return ErrUserNotFound
	}

	// Инварианты по проверке имейла спрятаны в домене
	email, err := NewEmail(rawEmail)
	if err != nil {
		return err
	}

	user.ChangeEmail(email, time.Now().UTC())

	// Логикой по записи данных тоже владеет репозиторий
	if err := s.userRepository.SaveUser(user); err != nil {
		return err
	}

	s.logger.Log("User updated")

	return nil
}
