package main

import (
	"encoding/json"
	"os"
	"sort"
	"strconv"
	"strings"
	"time"
)

type GradeScaleItem struct {
	Minimum float64 `json:"minimum"`
	Letter  string  `json:"letter"`
	Weight  float64 `json:"weight"`
}

type Config struct {
	DatabaseURL           string
	JWTAccessSecret       string
	JWTRefreshSecret      string
	JWTAccessTTL          time.Duration
	JWTRefreshTTL         time.Duration
	CORSOrigins           []string
	DashboardUpcomingDays int
	Host                  string
	Port                  string
	AppEnv                string
	GradeScale            []GradeScaleItem
}

func loadConfig() Config {
	return Config{
		DatabaseURL:           env("DATABASE_URL", "postgresql://kampushub:kampushub@localhost:5433/kampushub?sslmode=disable"),
		JWTAccessSecret:       env("JWT_ACCESS_SECRET", "dev-access-secret-kampushub-change-me"),
		JWTRefreshSecret:      env("JWT_REFRESH_SECRET", "dev-refresh-secret-kampushub-change-me"),
		JWTAccessTTL:          parseDuration(env("JWT_ACCESS_EXPIRES_IN", "15m"), 15*time.Minute),
		JWTRefreshTTL:         parseDuration(env("JWT_REFRESH_EXPIRES_IN", "30d"), 30*24*time.Hour),
		CORSOrigins:           splitCSV(env("CORS_ORIGINS", "http://localhost:3000,http://localhost:8081")),
		DashboardUpcomingDays: envInt("DASHBOARD_UPCOMING_DAYS", 14, 1, 90),
		Host:                  env("HOST", "0.0.0.0"),
		Port:                  env("PORT", "3001"),
		AppEnv:                env("APP_ENV", env("NODE_ENV", "development")),
		GradeScale:            loadGradeScale(),
	}
}

func env(key string, fallback string) string {
	value := strings.TrimSpace(os.Getenv(key))
	if value == "" {
		return fallback
	}

	return value
}

func envInt(key string, fallback int, minValue int, maxValue int) int {
	value, err := strconv.Atoi(env(key, strconv.Itoa(fallback)))
	if err != nil || value < minValue {
		return fallback
	}

	if value > maxValue {
		return maxValue
	}

	return value
}

func splitCSV(value string) []string {
	parts := strings.Split(value, ",")
	result := make([]string, 0, len(parts))

	for _, part := range parts {
		part = strings.TrimSpace(part)
		if part != "" {
			result = append(result, part)
		}
	}

	return result
}

func parseDuration(value string, fallback time.Duration) time.Duration {
	value = strings.TrimSpace(value)

	if len(value) < 2 {
		return fallback
	}

	amount, err := strconv.Atoi(value[:len(value)-1])
	if err != nil || amount < 1 {
		return fallback
	}

	switch value[len(value)-1] {
	case 's':
		return time.Duration(amount) * time.Second
	case 'm':
		return time.Duration(amount) * time.Minute
	case 'h':
		return time.Duration(amount) * time.Hour
	case 'd':
		return time.Duration(amount) * 24 * time.Hour
	default:
		return fallback
	}
}

func loadGradeScale() []GradeScaleItem {
	defaults := []GradeScaleItem{
		{
			Minimum: 85,
			Letter:  "A",
			Weight:  4,
		},
		{
			Minimum: 80,
			Letter:  "A-",
			Weight:  3.75,
		},
		{
			Minimum: 75,
			Letter:  "B+",
			Weight:  3.5,
		},
		{
			Minimum: 70,
			Letter:  "B",
			Weight:  3,
		},
		{
			Minimum: 65,
			Letter:  "B-",
			Weight:  2.75,
		},
		{
			Minimum: 60,
			Letter:  "C+",
			Weight:  2.5,
		},
		{
			Minimum: 55,
			Letter:  "C",
			Weight:  2,
		},
		{
			Minimum: 40,
			Letter:  "D",
			Weight:  1,
		},
		{
			Minimum: 0,
			Letter:  "E",
			Weight:  0,
		},
	}

	value := strings.TrimSpace(os.Getenv("GRADE_SCALE"))
	if value == "" {
		return defaults
	}

	var parsed []GradeScaleItem

	if json.Unmarshal([]byte(value), &parsed) != nil || len(parsed) == 0 {
		return defaults
	}

	for _, item := range parsed {
		if item.Minimum < 0 || item.Minimum > 100 || strings.TrimSpace(item.Letter) == "" {
			return defaults
		}
	}

	sort.Slice(parsed, func(i int, j int) bool {
		return parsed[i].Minimum > parsed[j].Minimum
	})

	return parsed
}
