package main

import (
	"net/http"
	"strings"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"gorm.io/gorm"
)

type forgotPasswordRequest struct {
	Email string `json:"email"`
}

type resetPasswordRequest struct {
	Token    string `json:"token"`
	Password string `json:"password"`
}

type verifyEmailRequest struct {
	Token string `json:"token"`
}

func (a *App) forgotPassword(c *gin.Context) {
	var req forgotPasswordRequest

	if err := c.ShouldBindJSON(&req); err != nil {
		a.abort(
			c,
			http.StatusBadRequest,
			"Payload tidak valid",
		)
		return
	}

	req.Email = strings.ToLower(
		strings.TrimSpace(req.Email),
	)

	if !validEmail(req.Email) {
		a.abort(
			c,
			http.StatusBadRequest,
			"Format email tidak valid",
		)
		return
	}

	response := gin.H{
		"message": "Jika email terdaftar, instruksi reset password akan dikirim",
	}

	var user User

	err := a.DB.
		Where(
			"email = ?",
			req.Email,
		).
		First(&user).
		Error

	if err == gorm.ErrRecordNotFound {
		c.JSON(
			http.StatusCreated,
			response,
		)
		return
	}

	if err != nil {
		a.fail(c, err)
		return
	}

	rawToken, err := randomToken(32)

	if err != nil {
		a.fail(c, err)
		return
	}

	token := PasswordResetToken{
		ID:        uuid.NewString(),
		UserID:    user.ID,
		TokenHash: hashToken(rawToken),
		ExpiresAt: time.Now().Add(time.Hour),
	}

	if err := a.DB.Create(&token).Error; err != nil {
		a.fail(c, err)
		return
	}

	if a.Config.AppEnv != "production" {
		response["resetToken"] = rawToken
	}

	c.JSON(
		http.StatusCreated,
		response,
	)
}

func (a *App) resetPassword(c *gin.Context) {
	var req resetPasswordRequest

	if err := c.ShouldBindJSON(&req); err != nil {
		a.abort(
			c,
			http.StatusBadRequest,
			"Payload tidak valid",
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

	var token PasswordResetToken

	if err := a.DB.
		Where(
			"\"tokenHash\" = ?",
			hashToken(req.Token),
		).
		First(&token).
		Error; err != nil ||
		token.UsedAt != nil ||
		!token.ExpiresAt.After(time.Now()) {
		a.abort(
			c,
			http.StatusBadRequest,
			"Token reset password tidak valid atau kedaluwarsa",
		)
		return
	}

	passwordHash, err := hashPassword(req.Password)

	if err != nil {
		a.fail(c, err)
		return
	}

	now := time.Now()

	err = a.DB.Transaction(
		func(tx *gorm.DB) error {
			if err := tx.
				Model(&User{}).
				Where(
					"id = ?",
					token.UserID,
				).
				Update(
					"passwordHash",
					passwordHash,
				).
				Error; err != nil {
				return err
			}

			if err := tx.
				Model(&PasswordResetToken{}).
				Where(
					"id = ?",
					token.ID,
				).
				Update(
					"usedAt",
					now,
				).
				Error; err != nil {
				return err
			}

			return tx.
				Where(
					"\"userId\" = ?",
					token.UserID,
				).
				Delete(&Session{}).
				Error
		},
	)

	if err != nil {
		a.fail(c, err)
		return
	}

	c.JSON(
		http.StatusCreated,
		gin.H{
			"message": "Password berhasil diperbarui. Silakan login kembali",
		},
	)
}

func (a *App) verifyEmail(c *gin.Context) {
	var req verifyEmailRequest

	if err := c.ShouldBindJSON(&req); err != nil ||
		strings.TrimSpace(req.Token) == "" {
		a.abort(
			c,
			http.StatusBadRequest,
			"Token verifikasi wajib diisi",
		)
		return
	}

	var token VerificationToken

	if err := a.DB.
		Where(
			"\"tokenHash\" = ?",
			hashToken(req.Token),
		).
		First(&token).
		Error; err != nil ||
		token.UsedAt != nil ||
		!token.ExpiresAt.After(time.Now()) {
		a.abort(
			c,
			http.StatusBadRequest,
			"Token verifikasi tidak valid atau kedaluwarsa",
		)
		return
	}

	now := time.Now()

	err := a.DB.Transaction(
		func(tx *gorm.DB) error {
			if err := tx.
				Model(&User{}).
				Where(
					"id = ?",
					token.UserID,
				).
				Update(
					"emailVerifiedAt",
					now,
				).
				Error; err != nil {
				return err
			}

			return tx.
				Model(&VerificationToken{}).
				Where(
					"id = ?",
					token.ID,
				).
				Update(
					"usedAt",
					now,
				).
				Error
		},
	)

	if err != nil {
		a.fail(c, err)
		return
	}

	c.JSON(
		http.StatusCreated,
		gin.H{
			"message": "Email berhasil diverifikasi",
		},
	)
}

func validatePassword(password string) string {
	if len(password) < 8 {
		return "Password minimal 8 karakter"
	}

	if len(password) > 72 {
		return "Password maksimal 72 karakter"
	}

	var uppercase bool
	var lowercase bool
	var number bool

	for _, character := range password {
		switch {
		case character >= 'A' && character <= 'Z':
			uppercase = true
		case character >= 'a' && character <= 'z':
			lowercase = true
		case character >= '0' && character <= '9':
			number = true
		}
	}

	if !uppercase {
		return "Password harus memiliki huruf besar"
	}

	if !lowercase {
		return "Password harus memiliki huruf kecil"
	}

	if !number {
		return "Password harus memiliki angka"
	}

	return ""
}
