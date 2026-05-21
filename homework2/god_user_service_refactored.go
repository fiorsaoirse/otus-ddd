package user

import (
	"errors"
	"time"

	"github.com/google/uuid"
)

var (
	ErrUserAlreadyExists = errors.New("user already exists")
	ErrUserNotFound      = errors.New("user not found")
)

type UserService struct {
	userRepository     UserRepository
	notificationSender NotificationSender
	logger             Logger
}

type UserResponse struct {
	ID string
}

type UserServiceActions interface {
	RegisterUser(rawEmail string, name string) (*UserResponse, error)
	ChangeEmail(userID string, rawEmail string) error
}

func (s *UserService) RegisterUser(rawEmail string, name string) (*UserResponse, error) {
	// Создание через домен, все инварианты - ответственность домена
	email, err := domainUser.NewEmail(rawEmail)
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
	newUser := domainUser.NewUser(uuid.NewString(), email, time.Now().UTC())

	if err := s.userRepository.SaveUser(newUser); err != nil {
		return nil, err
	}

	if err := s.notificationSender.SendWelcomeEmail(email); err != nil {
		return nil, err
	}

	s.logger.Log("User created")

	return NewUserResponse(newUser), nil
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
	email, err := domainUser.NewEmail(rawEmail)
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
