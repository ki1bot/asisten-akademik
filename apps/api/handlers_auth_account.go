package main

import (
	"net/http"
	"strings"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"gorm.io/gorm"
)

type registerRequest struct {
	Name       string `json:"name"`
	Email      string `json:"email"`
	Password   string `json:"password"`
	DeviceName string `json:"deviceName"`
}

type loginRequest struct {
	Email      string `json:"email"`
	Password   string `json:"password"`
	DeviceName string `json:"deviceName"`
}

func (a *App) register(c *gin.Context) {
	var req registerRequest

	if err := c.ShouldBindJSON(&req); err != nil {
		a.abort(
			c,
			http.StatusBadRequest,
			"Payload tidak valid",
		)
		return
	}

	req.Name = strings.TrimSpace(req.Name)
	req.Email = strings.ToLower(strings.TrimSpace(req.Email))
	req.DeviceName = strings.TrimSpace(req.DeviceName)

	if len(req.Name) < 2 || len(req.Name) > 100 {
		a.abort(
			c,
			http.StatusBadRequest,
			"Nama harus memiliki 2 sampai 100 karakter",
		)
		return
	}

	if !validEmail(req.Email) {
		a.abort(
			c,
			http.StatusBadRequest,
			"Format email tidak valid",
		)
		return
	}

	if len(req.DeviceName) > 100 {
		a.abort(
			c,
			http.StatusBadRequest,
			"Nama perangkat maksimal 100 karakter",
		)
		return
	}

	if message := validatePassword(req.Password); message != "" {
		a.abort(
			c,
			http.StatusBadRequest,
			message,
		)
		return
	}

	var count int64

	if err := a.DB.
		Model(&User{}).
		Where(
			"email = ?",
			req.Email,
		).
		Count(&count).
		Error; err != nil {
		a.fail(c, err)
		return
	}

	if count > 0 {
		a.abort(
			c,
			http.StatusConflict,
			"Email sudah terdaftar",
		)
		return
	}

	passwordHash, err := hashPassword(req.Password)
	if err != nil {
		a.fail(c, err)
		return
	}

	user := User{
		ID:           uuid.NewString(),
		Email:        req.Email,
		PasswordHash: passwordHash,
		Role:         "STUDENT",
	}

	profile := Profile{
		ID:       uuid.NewString(),
		UserID:   user.ID,
		Name:     req.Name,
		Timezone: "Asia/Jakarta",
	}

	verificationToken, err := randomToken(32)
	if err != nil {
		a.fail(c, err)
		return
	}

	verification := VerificationToken{
		ID:        uuid.NewString(),
		UserID:    user.ID,
		TokenHash: hashToken(verificationToken),
		ExpiresAt: time.Now().Add(24 * time.Hour),
	}

	var accessToken string
	var refreshToken string

	err = a.DB.Transaction(
		func(tx *gorm.DB) error {
			if err := tx.Create(&user).Error; err != nil {
				return err
			}

			if err := tx.Create(&profile).Error; err != nil {
				return err
			}

			welcome := Notification{
				ID:     uuid.NewString(),
				UserID: user.ID,
				Type:   "SYSTEM",
				Title:  "Selamat datang di KampusHub",
				Message: "Akun Anda siap digunakan untuk mengatur " +
					"aktivitas akademik.",
			}

			if err := tx.Create(&welcome).Error; err != nil {
				return err
			}

			if err := tx.Create(&verification).Error; err != nil {
				return err
			}

			var err error

			accessToken, refreshToken, err =
				a.createSessionAndTokens(
					tx,
					user,
					req.DeviceName,
					c.ClientIP(),
					c.GetHeader("User-Agent"),
				)

			return err
		},
	)

	if err != nil {
		a.fail(c, err)
		return
	}

	user.Profile = &profile

	response := gin.H{
		"user":         user,
		"accessToken":  accessToken,
		"refreshToken": refreshToken,
	}

	if a.Config.AppEnv != "production" {
		response["verificationToken"] = verificationToken
	}

	c.JSON(
		http.StatusCreated,
		response,
	)
}

func (a *App) login(c *gin.Context) {
	var req loginRequest

	if err := c.ShouldBindJSON(&req); err != nil {
		a.abort(
			c,
			http.StatusBadRequest,
			"Payload tidak valid",
		)
		return
	}

	req.Email = strings.ToLower(strings.TrimSpace(req.Email))
	req.DeviceName = strings.TrimSpace(req.DeviceName)

	if !validEmail(req.Email) ||
		len(req.Password) < 8 ||
		len(req.Password) > 72 {
		a.abort(
			c,
			http.StatusUnauthorized,
			"Email atau password salah",
		)
		return
	}

	if len(req.DeviceName) > 100 {
		a.abort(
			c,
			http.StatusBadRequest,
			"Nama perangkat maksimal 100 karakter",
		)
		return
	}

	var user User

	if err := a.DB.
		Preload("Profile").
		Where(
			"email = ?",
			req.Email,
		).
		First(&user).
		Error; err != nil {
		if err == gorm.ErrRecordNotFound {
			a.abort(
				c,
				http.StatusUnauthorized,
				"Email atau password salah",
			)
			return
		}

		a.fail(c, err)
		return
	}

	if !verifyPassword(
		user.PasswordHash,
		req.Password,
	) {
		a.abort(
			c,
			http.StatusUnauthorized,
			"Email atau password salah",
		)
		return
	}

	accessToken, refreshToken, err :=
		a.createSessionAndTokens(
			a.DB,
			user,
			req.DeviceName,
			c.ClientIP(),
			c.GetHeader("User-Agent"),
		)

	if err != nil {
		a.fail(c, err)
		return
	}

	c.JSON(
		http.StatusCreated,
		gin.H{
			"user":         user,
			"accessToken":  accessToken,
			"refreshToken": refreshToken,
		},
	)
}
