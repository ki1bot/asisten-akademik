package main

import (
	"net/http"
	"strings"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"gorm.io/gorm"
)

type refreshRequest struct {
	RefreshToken string `json:"refreshToken"`
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
		Error; err != nil {
		a.abort(
			c,
			http.StatusUnauthorized,
			"Sesi tidak ditemukan atau sudah berakhir",
		)
		return
	}

	if !session.ExpiresAt.After(time.Now()) {
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

	refreshHash, err := hashPassword(refreshToken)

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

func (a *App) createSessionAndTokens(
	db *gorm.DB,
	user User,
	deviceName string,
	ipAddress string,
	userAgent string,
) (string, string, error) {
	if deviceName == "" {
		deviceName = "Perangkat tidak dikenal"
	}

	session := Session{
		ID:               uuid.NewString(),
		UserID:           user.ID,
		RefreshTokenHash: "pending",
		DeviceName:       &deviceName,
		IPAddress:        &ipAddress,
		UserAgent:        &userAgent,
		ExpiresAt: time.Now().Add(
			a.Config.JWTRefreshTTL,
		),
		LastUsedAt: time.Now(),
	}

	if err := db.Create(&session).Error; err != nil {
		return "", "", err
	}

	accessToken, err := issueAccessToken(
		a.Config,
		user,
		session.ID,
	)

	if err != nil {
		return "", "", err
	}

	refreshToken, err := issueRefreshToken(
		a.Config,
		user.ID,
		session.ID,
	)

	if err != nil {
		return "", "", err
	}

	refreshHash, err := hashPassword(refreshToken)

	if err != nil {
		return "", "", err
	}

	if err := db.
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
		Error; err != nil {
		return "", "", err
	}

	return accessToken, refreshToken, nil
}
