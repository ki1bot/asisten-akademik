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

type refreshRequest struct {
	RefreshToken string `json:"refreshToken"`
}

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
	req.Email = strings.ToLower(
		strings.TrimSpace(req.Email),
	)

	if len(req.Name) < 2 ||
		len(req.Name) > 100 {
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
		Where("email = ?", req.Email).
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

	device := strings.TrimSpace(req.DeviceName)
	if device == "" {
		device = "Perangkat tidak dikenal"
	}

	ip := c.ClientIP()
	userAgent := c.GetHeader("User-Agent")

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
				ID:      uuid.NewString(),
				UserID:  user.ID,
				Type:    "SYSTEM",
				Title:   "Selamat datang di KampusHub",
				Message: "Akun Anda siap digunakan untuk mengatur aktivitas akademik.",
			}

			if err := tx.Create(&welcome).Error; err != nil {
				return err
			}

			if err := tx.Create(&verification).Error; err != nil {
				return err
			}

			session := Session{
				ID:               uuid.NewString(),
				UserID:           user.ID,
				RefreshTokenHash: "pending",
				DeviceName:       &device,
				IPAddress:        &ip,
				UserAgent:        &userAgent,
				ExpiresAt: time.Now().Add(
					a.Config.JWTRefreshTTL,
				),
				LastUsedAt: time.Now(),
			}

			if err := tx.Create(&session).Error; err != nil {
				return err
			}

			accessToken, err = issueAccessToken(
				a.Config,
				user,
				session.ID,
			)

			if err != nil {
				return err
			}

			refreshToken, err = issueRefreshToken(
				a.Config,
				user.ID,
				session.ID,
			)

			if err != nil {
				return err
			}

			refreshHash, err := hashPassword(
				refreshToken,
			)

			if err != nil {
				return err
			}

			return tx.
				Model(&Session{}).
				Where(
					"id = ?",
					session.ID,
				).
				Updates(
					map[string]any{
						"refreshTokenHash": refreshHash,
						"lastUsedAt":       time.Now(),
						"expiresAt": time.Now().Add(
							a.Config.JWTRefreshTTL,
						),
					},
				).
				Error
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
		response["verificationToken"] =
			verificationToken
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

	req.Email = strings.ToLower(
		strings.TrimSpace(req.Email),
	)

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

	device := strings.TrimSpace(req.DeviceName)

	if device == "" {
		device = "Perangkat tidak dikenal"
	}

	ip := c.ClientIP()
	userAgent := c.GetHeader("User-Agent")

	session := Session{
		ID:               uuid.NewString(),
		UserID:           user.ID,
		RefreshTokenHash: "pending",
		DeviceName:       &device,
		IPAddress:        &ip,
		UserAgent:        &userAgent,
		ExpiresAt: time.Now().Add(
			a.Config.JWTRefreshTTL,
		),
		LastUsedAt: time.Now(),
	}

	if err := a.DB.Create(&session).Error; err != nil {
		a.fail(c, err)
		return
	}

	accessToken, err := issueAccessToken(
		a.Config,
		user,
		session.ID,
	)

	if err != nil {
		a.fail(c, err)
		return
	}

	refreshToken, err := issueRefreshToken(
		a.Config,
		user.ID,
		session.ID,
	)

	if err != nil {
		a.fail(c, err)
		return
	}

	refreshHash, err := hashPassword(
		refreshToken,
	)

	if err != nil {
		a.fail(c, err)
		return
	}

	if err := a.DB.
		Model(&Session{}).
		Where(
			"id = ?",
			session.ID,
		).
		Updates(
			map[string]any{
				"refreshTokenHash": refreshHash,
				"lastUsedAt":       time.Now(),
			},
		).
		Error; err != nil {
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

func (a *App) refresh(c *gin.Context) {
	var req refreshRequest

	if err := c.ShouldBindJSON(&req); err != nil ||
		strings.TrimSpace(req.RefreshToken) == "" {
		a.abort(
			c,
			http.StatusBadRequest,
			"Refresh token wajib diisi",
		)
		return
	}

	claims, err := parseRefreshToken(
		a.Config,
		req.RefreshToken,
	)

	if err != nil {
		a.abort(
			c,
			http.StatusUnauthorized,
			"Refresh token tidak valid atau kedaluwarsa",
		)
		return
	}

	var session Session

	if err := a.DB.
		Preload("User").
		Where(
			"id = ? AND \"userId\" = ?",
			claims.SessionID,
			claims.Subject,
		).
		First(&session).
		Error; err != nil ||
		!session.ExpiresAt.After(time.Now()) {
		a.abort(
			c,
			http.StatusUnauthorized,
			"Sesi tidak ditemukan atau sudah berakhir",
		)
		return
	}

	if !verifyPassword(
		session.RefreshTokenHash,
		req.RefreshToken,
	) {
		_ = a.DB.
			Where(
				"\"userId\" = ?",
				claims.Subject,
			).
			Delete(&Session{}).
			Error

		a.abort(
			c,
			http.StatusUnauthorized,
			"Refresh token sudah tidak berlaku",
		)
		return
	}

	accessToken, err := issueAccessToken(
		a.Config,
		session.User,
		session.ID,
	)

	if err != nil {
		a.fail(c, err)
		return
	}

	refreshToken, err := issueRefreshToken(
		a.Config,
		session.UserID,
		session.ID,
	)

	if err != nil {
		a.fail(c, err)
		return
	}

	refreshHash, err := hashPassword(
		refreshToken,
	)

	if err != nil {
		a.fail(c, err)
		return
	}

	if err := a.DB.
		Model(&Session{}).
		Where(
			"id = ?",
			session.ID,
		).
		Updates(
			map[string]any{
				"refreshTokenHash": refreshHash,
				"expiresAt": time.Now().Add(
					a.Config.JWTRefreshTTL,
				),
				"lastUsedAt": time.Now(),
			},
		).
		Error; err != nil {
		a.fail(c, err)
		return
	}

	c.JSON(
		http.StatusCreated,
		gin.H{
			"accessToken":  accessToken,
			"refreshToken": refreshToken,
		},
	)
}

func (a *App) logout(c *gin.Context) {
	user := authUser(c)

	if err := a.DB.
		Where(
			"id = ? AND \"userId\" = ?",
			user.SessionID,
			user.UserID,
		).
		Delete(&Session{}).
		Error; err != nil {
		a.fail(c, err)
		return
	}

	c.JSON(
		http.StatusCreated,
		gin.H{
			"message": "Berhasil logout",
		},
	)
}

func (a *App) logoutAll(c *gin.Context) {
	user := authUser(c)

	if err := a.DB.
		Where(
			"\"userId\" = ?",
			user.UserID,
		).
		Delete(&Session{}).
		Error; err != nil {
		a.fail(c, err)
		return
	}

	c.JSON(
		http.StatusCreated,
		gin.H{
			"message": "Semua sesi berhasil dihentikan",
		},
	)
}

func (a *App) me(c *gin.Context) {
	user := authUser(c)

	var found User

	if err := a.DB.
		Preload("Profile").
		Where(
			"id = ?",
			user.UserID,
		).
		First(&found).
		Error; err != nil {
		a.abort(
			c,
			http.StatusUnauthorized,
			"Akun tidak ditemukan",
		)
		return
	}

	c.JSON(
		http.StatusOK,
		found,
	)
}

func (a *App) sessions(c *gin.Context) {
	user := authUser(c)

	var sessions []Session

	if err := a.DB.
		Where(
			"\"userId\" = ?",
			user.UserID,
		).
		Order(
			"\"lastUsedAt\" DESC",
		).
		Find(&sessions).
		Error; err != nil {
		a.fail(c, err)
		return
	}

	c.JSON(
		http.StatusOK,
		sessions,
	)
}

func (a *App) revokeSession(c *gin.Context) {
	user := authUser(c)

	id := c.Param("id")

	if !validUUID(id) {
		a.abort(
			c,
			http.StatusBadRequest,
			"Sesi tidak ditemukan",
		)
		return
	}

	result := a.DB.
		Where(
			"id = ? AND \"userId\" = ?",
			id,
			user.UserID,
		).
		Delete(&Session{})

	if result.Error != nil {
		a.fail(c, result.Error)
		return
	}

	if result.RowsAffected == 0 {
		a.abort(
			c,
			http.StatusBadRequest,
			"Sesi tidak ditemukan",
		)
		return
	}

	c.JSON(
		http.StatusOK,
		gin.H{
			"message": "Sesi berhasil dihentikan",
		},
	)
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

	var user User

	err := a.DB.
		Where(
			"email = ?",
			req.Email,
		).
		First(&user).
		Error

	response := gin.H{
		"message": "Jika email terdaftar, instruksi reset password akan dikirim",
	}

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
		case character >= 'A' &&
			character <= 'Z':
			uppercase = true
		case character >= 'a' &&
			character <= 'z':
			lowercase = true
		case character >= '0' &&
			character <= '9':
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
