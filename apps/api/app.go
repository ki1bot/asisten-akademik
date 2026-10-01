package main

import (
	"errors"
	"fmt"
	"net/http"
	"net/mail"
	"net/url"
	"regexp"
	"strings"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"gorm.io/driver/postgres"
	"gorm.io/gorm"
	"gorm.io/gorm/logger"
)

type App struct {
	DB     *gorm.DB
	Config Config
}

type AuthUser struct {
	UserID    string
	Email     string
	Role      string
	SessionID string
}

type APIError struct {
	StatusCode int    `json:"statusCode"`
	Message    any    `json:"message"`
	Error      string `json:"error,omitempty"`
}

var timePattern = regexp.MustCompile(
	`^([01]\d|2[0-3]):[0-5]\d$`,
)

var academicYearPattern = regexp.MustCompile(
	`^\d{4}/\d{4}$`,
)

var colorPattern = regexp.MustCompile(
	`^#[0-9a-fA-F]{6}$`,
)

func newApp(cfg Config) (*App, error) {
	level := logger.Warn

	if cfg.AppEnv == "development" {
		level = logger.Info
	}

	db, err := gorm.Open(
		postgres.Open(cfg.DatabaseURL),
		&gorm.Config{
			Logger:         logger.Default.LogMode(level),
			TranslateError: true,
		},
	)

	if err != nil {
		return nil, err
	}

	sqlDB, err := db.DB()
	if err != nil {
		return nil, err
	}

	sqlDB.SetMaxOpenConns(20)
	sqlDB.SetMaxIdleConns(10)
	sqlDB.SetConnMaxLifetime(30 * time.Minute)

	if err := sqlDB.Ping(); err != nil {
		return nil, err
	}

	return &App{
		DB:     db,
		Config: cfg,
	}, nil
}

func (a *App) router() *gin.Engine {
	if a.Config.AppEnv == "production" {
		gin.SetMode(gin.ReleaseMode)
	}

	router := gin.New()

	router.Use(
		gin.Logger(),
		gin.Recovery(),
		a.corsMiddleware(),
	)

	api := router.Group("/api")

	api.GET("/health", a.health)

	api.POST("/auth/register", a.register)
	api.POST("/auth/login", a.login)
	api.POST("/auth/refresh", a.refresh)
	api.POST("/auth/forgot-password", a.forgotPassword)
	api.POST("/auth/reset-password", a.resetPassword)
	api.POST("/auth/verify-email", a.verifyEmail)

	secured := api.Group("")
	secured.Use(a.authMiddleware())

	secured.POST("/auth/logout", a.logout)
	secured.POST("/auth/logout-all", a.logoutAll)
	secured.GET("/auth/me", a.me)
	secured.GET("/auth/sessions", a.sessions)
	secured.DELETE("/auth/sessions/:id", a.revokeSession)

	secured.GET("/semesters", a.listSemesters)
	secured.GET("/semesters/:id", a.getSemester)
	secured.POST("/semesters", a.createSemester)
	secured.PATCH("/semesters/:id", a.updateSemester)
	secured.DELETE("/semesters/:id", a.deleteSemester)

	secured.GET("/courses", a.listCourses)
	secured.GET("/courses/:id", a.getCourse)
	secured.POST("/courses", a.createCourse)
	secured.PATCH("/courses/:id", a.updateCourse)
	secured.DELETE("/courses/:id", a.deleteCourse)

	secured.GET("/schedules", a.listSchedules)
	secured.GET("/schedules/:id", a.getSchedule)
	secured.POST("/schedules", a.createSchedule)
	secured.PATCH("/schedules/:id", a.updateSchedule)
	secured.DELETE("/schedules/:id", a.deleteSchedule)

	secured.GET("/assignments", a.listAssignments)
	secured.GET("/assignments/:id", a.getAssignment)
	secured.POST("/assignments", a.createAssignment)
	secured.PATCH("/assignments/:id", a.updateAssignment)
	secured.DELETE("/assignments/:id", a.deleteAssignment)

	secured.GET("/exams", a.listExams)
	secured.GET("/exams/:id", a.getExam)
	secured.POST("/exams", a.createExam)
	secured.PATCH("/exams/:id", a.updateExam)
	secured.DELETE("/exams/:id", a.deleteExam)

	secured.GET("/attendances/summary", a.attendanceSummary)
	secured.GET("/attendances", a.listAttendances)
	secured.GET("/attendances/:id", a.getAttendance)
	secured.POST("/attendances", a.createAttendance)
	secured.PATCH("/attendances/:id", a.updateAttendance)
	secured.DELETE("/attendances/:id", a.deleteAttendance)

	secured.GET("/grades/scale", a.gradeScale)
	secured.GET("/grades/gpa", a.gpa)
	secured.GET("/grades", a.listGrades)
	secured.GET("/grades/:id", a.getGrade)
	secured.POST("/grades", a.createGrade)
	secured.PATCH("/grades/:id", a.updateGrade)
	secured.DELETE("/grades/:id", a.deleteGrade)

	secured.GET(
		"/notifications/unread-count",
		a.unreadNotificationCount,
	)
	secured.GET("/notifications", a.listNotifications)
	secured.PATCH(
		"/notifications/read-all",
		a.readAllNotifications,
	)
	secured.PATCH(
		"/notifications/:id/read",
		a.readNotification,
	)
	secured.DELETE(
		"/notifications/:id",
		a.deleteNotification,
	)

	secured.GET("/dashboard", a.dashboard)

	return router
}

func (a *App) health(c *gin.Context) {
	c.JSON(
		http.StatusOK,
		gin.H{
			"status":    "ok",
			"service":   "kampushub-api",
			"timestamp": time.Now().UTC().Format(time.RFC3339Nano),
		},
	)
}

func (a *App) corsMiddleware() gin.HandlerFunc {
	allowed := map[string]bool{}

	for _, origin := range a.Config.CORSOrigins {
		allowed[origin] = true
	}

	return func(c *gin.Context) {
		origin := c.GetHeader("Origin")

		if origin != "" && allowed[origin] {
			c.Header(
				"Access-Control-Allow-Origin",
				origin,
			)
			c.Header("Vary", "Origin")
			c.Header(
				"Access-Control-Allow-Credentials",
				"true",
			)
			c.Header(
				"Access-Control-Allow-Headers",
				"Authorization, Content-Type",
			)
			c.Header(
				"Access-Control-Allow-Methods",
				"GET, POST, PATCH, DELETE, OPTIONS",
			)
		}

		if c.Request.Method == http.MethodOptions {
			c.AbortWithStatus(http.StatusNoContent)
			return
		}

		c.Next()
	}
}

func (a *App) authMiddleware() gin.HandlerFunc {
	return func(c *gin.Context) {
		raw := bearerToken(
			c.GetHeader("Authorization"),
		)

		if raw == "" {
			a.abort(
				c,
				http.StatusUnauthorized,
				"Token akses tidak valid",
			)
			return
		}

		claims, err := parseAccessToken(
			a.Config,
			raw,
		)

		if err != nil {
			a.abort(
				c,
				http.StatusUnauthorized,
				"Token akses tidak valid",
			)
			return
		}

		var count int64

		err = a.DB.
			Model(&Session{}).
			Where(
				"id = ? AND \"userId\" = ? AND \"expiresAt\" > ?",
				claims.SessionID,
				claims.Subject,
				time.Now(),
			).
			Count(&count).
			Error

		if err != nil || count == 0 {
			a.abort(
				c,
				http.StatusUnauthorized,
				"Sesi sudah berakhir atau telah dihentikan",
			)
			return
		}

		c.Set(
			"auth",
			AuthUser{
				UserID:    claims.Subject,
				Email:     claims.Email,
				Role:      claims.Role,
				SessionID: claims.SessionID,
			},
		)

		c.Next()
	}
}

func authUser(c *gin.Context) AuthUser {
	value, _ := c.Get("auth")
	user, _ := value.(AuthUser)

	return user
}

func (a *App) abort(
	c *gin.Context,
	status int,
	message any,
) {
	c.AbortWithStatusJSON(
		status,
		APIError{
			StatusCode: status,
			Message:    message,
			Error:      http.StatusText(status),
		},
	)
}

func (a *App) fail(
	c *gin.Context,
	err error,
) {
	if errors.Is(err, gorm.ErrRecordNotFound) {
		a.abort(
			c,
			http.StatusNotFound,
			"Data tidak ditemukan",
		)
		return
	}

	if errors.Is(err, gorm.ErrDuplicatedKey) {
		a.abort(
			c,
			http.StatusConflict,
			"Data dengan nilai tersebut sudah tersedia",
		)
		return
	}

	if a.Config.AppEnv == "development" ||
		a.Config.AppEnv == "test" {
		a.abort(
			c,
			http.StatusInternalServerError,
			err.Error(),
		)
		return
	}

	a.abort(
		c,
		http.StatusInternalServerError,
		"Terjadi kesalahan pada server",
	)
}

func validUUID(value string) bool {
	_, err := uuid.Parse(value)

	return err == nil
}

func validEmail(value string) bool {
	address, err := mail.ParseAddress(value)

	return err == nil &&
		strings.EqualFold(
			address.Address,
			value,
		)
}

func validURL(value string) bool {
	parsed, err := url.ParseRequestURI(value)

	return err == nil &&
		(parsed.Scheme == "http" ||
			parsed.Scheme == "https") &&
		parsed.Host != ""
}

func contains(
	values []string,
	value string,
) bool {
	for _, item := range values {
		if item == value {
			return true
		}
	}

	return false
}

func trimNullable(value *string) *string {
	if value == nil {
		return nil
	}

	trimmed := strings.TrimSpace(*value)

	if trimmed == "" {
		return nil
	}

	return &trimmed
}

func parseISOTime(value string) (time.Time, error) {
	if parsed, err := time.Parse(
		time.RFC3339Nano,
		value,
	); err == nil {
		return parsed, nil
	}

	if parsed, err := time.Parse(
		"2006-01-02",
		value,
	); err == nil {
		return parsed, nil
	}

	return time.Time{},
		fmt.Errorf("format tanggal tidak valid")
}
