package main

import (
	"crypto/rand"
	"crypto/sha256"
	"encoding/hex"
	"errors"
	"strings"
	"time"

	"github.com/alexedwards/argon2id"
	"github.com/golang-jwt/jwt/v5"
)

type AccessClaims struct {
	Email     string `json:"email"`
	Role      string `json:"role"`
	SessionID string `json:"sessionId"`
	Type      string `json:"type"`
	jwt.RegisteredClaims
}

type RefreshClaims struct {
	SessionID string `json:"sessionId"`
	Type      string `json:"type"`
	jwt.RegisteredClaims
}

func hashPassword(password string) (string, error) {
	return argon2id.CreateHash(password, argon2id.DefaultParams)
}

func verifyPassword(hash string, password string) bool {
	match, err := argon2id.ComparePasswordAndHash(password, hash)

	return err == nil && match
}

func issueAccessToken(
	cfg Config,
	user User,
	sessionID string,
) (string, error) {
	now := time.Now()

	claims := AccessClaims{
		Email:     user.Email,
		Role:      user.Role,
		SessionID: sessionID,
		Type:      "access",
		RegisteredClaims: jwt.RegisteredClaims{
			Subject:   user.ID,
			IssuedAt:  jwt.NewNumericDate(now),
			ExpiresAt: jwt.NewNumericDate(now.Add(cfg.JWTAccessTTL)),
		},
	}

	return jwt.NewWithClaims(
		jwt.SigningMethodHS256,
		claims,
	).SignedString([]byte(cfg.JWTAccessSecret))
}

func issueRefreshToken(
	cfg Config,
	userID string,
	sessionID string,
) (string, error) {
	now := time.Now()

	claims := RefreshClaims{
		SessionID: sessionID,
		Type:      "refresh",
		RegisteredClaims: jwt.RegisteredClaims{
			Subject:   userID,
			IssuedAt:  jwt.NewNumericDate(now),
			ExpiresAt: jwt.NewNumericDate(now.Add(cfg.JWTRefreshTTL)),
		},
	}

	return jwt.NewWithClaims(
		jwt.SigningMethodHS256,
		claims,
	).SignedString([]byte(cfg.JWTRefreshSecret))
}

func parseAccessToken(
	cfg Config,
	tokenString string,
) (*AccessClaims, error) {
	claims := &AccessClaims{}

	token, err := jwt.ParseWithClaims(
		tokenString,
		claims,
		func(token *jwt.Token) (any, error) {
			if token.Method != jwt.SigningMethodHS256 {
				return nil, errors.New("invalid signing method")
			}

			return []byte(cfg.JWTAccessSecret), nil
		},
		jwt.WithExpirationRequired(),
		jwt.WithValidMethods([]string{
			jwt.SigningMethodHS256.Alg(),
		}),
	)

	if err != nil ||
		!token.Valid ||
		claims.Type != "access" ||
		claims.Subject == "" ||
		claims.SessionID == "" {
		return nil, errors.New("invalid access token")
	}

	return claims, nil
}

func parseRefreshToken(
	cfg Config,
	tokenString string,
) (*RefreshClaims, error) {
	claims := &RefreshClaims{}

	token, err := jwt.ParseWithClaims(
		tokenString,
		claims,
		func(token *jwt.Token) (any, error) {
			if token.Method != jwt.SigningMethodHS256 {
				return nil, errors.New("invalid signing method")
			}

			return []byte(cfg.JWTRefreshSecret), nil
		},
		jwt.WithExpirationRequired(),
		jwt.WithValidMethods([]string{
			jwt.SigningMethodHS256.Alg(),
		}),
	)

	if err != nil ||
		!token.Valid ||
		claims.Type != "refresh" ||
		claims.Subject == "" ||
		claims.SessionID == "" {
		return nil, errors.New("invalid refresh token")
	}

	return claims, nil
}

func randomToken(size int) (string, error) {
	buffer := make([]byte, size)

	if _, err := rand.Read(buffer); err != nil {
		return "", err
	}

	return hex.EncodeToString(buffer), nil
}

func hashToken(value string) string {
	sum := sha256.Sum256([]byte(value))

	return hex.EncodeToString(sum[:])
}

func bearerToken(value string) string {
	parts := strings.Fields(value)

	if len(parts) != 2 ||
		!strings.EqualFold(parts[0], "Bearer") {
		return ""
	}

	return parts[1]
}
