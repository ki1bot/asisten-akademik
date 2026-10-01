package main

import (
	"net/http"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"gorm.io/gorm"
)

type createExamRequest struct {
	CourseID   string  `json:"courseId"`
	Type       string  `json:"type"`
	Title      string  `json:"title"`
	ExamDate   string  `json:"examDate"`
	StartTime  *string `json:"startTime"`
	EndTime    *string `json:"endTime"`
	Room       *string `json:"room"`
	Topics     *string `json:"topics"`
	ReminderAt *string `json:"reminderAt"`
}

type updateExamRequest struct {
	CourseID   Optional[string] `json:"courseId"`
	Type       Optional[string] `json:"type"`
	Title      Optional[string] `json:"title"`
	ExamDate   Optional[string] `json:"examDate"`
	StartTime  Optional[string] `json:"startTime"`
	EndTime    Optional[string] `json:"endTime"`
	Room       Optional[string] `json:"room"`
	Topics     Optional[string] `json:"topics"`
	ReminderAt Optional[string] `json:"reminderAt"`
}

func (a *App) listExams(c *gin.Context) {
	user := authUser(c)

	query := a.DB.
		Where(
			`"Exam"."userId" = ?`,
			user.UserID,
		)

	if value := c.Query("courseId"); value != "" {
		if !validUUID(value) {
			a.abort(
				c,
				http.StatusBadRequest,
				"Mata kuliah tidak valid",
			)
			return
		}

		query = query.Where(
			`"Exam"."courseId" = ?`,
			value,
		)
	}

	if value := c.Query("type"); value != "" {
		if !contains(
			[]string{
				"MIDTERM",
				"FINAL",
				"QUIZ",
				"PRACTICUM",
				"PRESENTATION",
				"THESIS_DEFENSE",
			},
			value,
		) {
			a.abort(
				c,
				http.StatusBadRequest,
				"Jenis ujian tidak valid",
			)
			return
		}

		query = query.Where(
			`"Exam".type = ?`,
			value,
		)
	}

	var exams []Exam

	if err := query.
		Preload("Course.Semester").
		Order(
			`"Exam"."examDate" ASC, "Exam"."startTime" ASC`,
		).
		Find(&exams).
		Error; err != nil {
		a.fail(c, err)
		return
	}

	c.JSON(
		http.StatusOK,
		exams,
	)
}

func (a *App) getExam(c *gin.Context) {
	user := authUser(c)

	id := c.Param("id")

	if !validUUID(id) {
		a.abort(
			c,
			http.StatusBadRequest,
			"Ujian tidak valid",
		)
		return
	}

	var exam Exam

	if err := a.DB.
		Preload("Course.Semester").
		Where(
			`"Exam".id = ? AND "Exam"."userId" = ?`,
			id,
			user.UserID,
		).
		First(&exam).
		Error; err != nil {
		a.fail(c, err)
		return
	}

	c.JSON(
		http.StatusOK,
		exam,
	)
}

func (a *App) createExam(c *gin.Context) {
	user := authUser(c)

	var req createExamRequest

	if err := c.ShouldBindJSON(&req); err != nil {
		a.abort(
			c,
			http.StatusBadRequest,
			"Payload tidak valid",
		)
		return
	}

	exam, message, err :=
		a.validateExamValues(
			user.UserID,
			req.CourseID,
			req.Type,
			req.Title,
			req.ExamDate,
			req.StartTime,
			req.EndTime,
			req.Room,
			req.Topics,
			req.ReminderAt,
		)

	if err != nil {
		a.fail(c, err)
		return
	}

	if message != "" {
		a.abort(
			c,
			http.StatusBadRequest,
			message,
		)
		return
	}

	exam.ID = uuid.NewString()
	exam.UserID = user.UserID

	err = a.DB.Transaction(
		func(tx *gorm.DB) error {
			if err := tx.Create(&exam).Error; err != nil {
				return err
			}

			if exam.ReminderAt == nil {
				return nil
			}

			var course Course

			if err := tx.
				Where(
					"id = ?",
					exam.CourseID,
				).
				First(&course).
				Error; err != nil {
				return err
			}

			notification := Notification{
				ID:     uuid.NewString(),
				UserID: user.UserID,
				Type:   "EXAM",
				Title: "Pengingat ujian: " +
					exam.Title,
				Message: course.Name +
					" memiliki ujian pada " +
					exam.ExamDate.
						UTC().
						Format(time.RFC3339Nano),
				ScheduledFor: exam.ReminderAt,
			}

			return tx.Create(&notification).Error
		},
	)

	if err != nil {
		a.fail(c, err)
		return
	}

	if err := a.DB.
		Preload("Course").
		Where(
			"id = ?",
			exam.ID,
		).
		First(&exam).
		Error; err != nil {
		a.fail(c, err)
		return
	}

	c.JSON(
		http.StatusCreated,
		exam,
	)
}

func (a *App) updateExam(c *gin.Context) {
	user := authUser(c)

	id := c.Param("id")

	if !validUUID(id) {
		a.abort(
			c,
			http.StatusBadRequest,
			"Ujian tidak valid",
		)
		return
	}

	var existing Exam

	if err := a.DB.
		Where(
			"id = ? AND \"userId\" = ?",
			id,
			user.UserID,
		).
		First(&existing).
		Error; err != nil {
		a.fail(c, err)
		return
	}

	var req updateExamRequest

	if err := c.ShouldBindJSON(&req); err != nil {
		a.abort(
			c,
			http.StatusBadRequest,
			"Payload tidak valid",
		)
		return
	}

	courseID := existing.CourseID
	examType := existing.Type
	title := existing.Title
	examDate := existing.ExamDate.
		UTC().
		Format(time.RFC3339Nano)
	startTime := existing.StartTime
	endTime := existing.EndTime
	room := existing.Room
	topics := existing.Topics

	var reminderAt *string

	if existing.ReminderAt != nil {
		value := existing.ReminderAt.
			UTC().
			Format(time.RFC3339Nano)

		reminderAt = &value
	}

	if req.CourseID.Set {
		if req.CourseID.Null {
			a.abort(
				c,
				http.StatusBadRequest,
				"Mata kuliah tidak boleh null",
			)
			return
		}

		courseID = req.CourseID.Value
	}

	if req.Type.Set {
		if req.Type.Null {
			a.abort(
				c,
				http.StatusBadRequest,
				"Jenis ujian tidak boleh null",
			)
			return
		}

		examType = req.Type.Value
	}

	if req.Title.Set {
		if req.Title.Null {
			a.abort(
				c,
				http.StatusBadRequest,
				"Judul ujian tidak boleh null",
			)
			return
		}

		title = req.Title.Value
	}

	if req.ExamDate.Set {
		if req.ExamDate.Null {
			a.abort(
				c,
				http.StatusBadRequest,
				"Tanggal ujian tidak boleh null",
			)
			return
		}

		examDate = req.ExamDate.Value
	}

	if req.StartTime.Set {
		if req.StartTime.Null {
			startTime = nil
		} else {
			startTime = &req.StartTime.Value
		}
	}

	if req.EndTime.Set {
		if req.EndTime.Null {
			endTime = nil
		} else {
			endTime = &req.EndTime.Value
		}
	}

	if req.Room.Set {
		if req.Room.Null {
			room = nil
		} else {
			room = &req.Room.Value
		}
	}

	if req.Topics.Set {
		if req.Topics.Null {
			topics = nil
		} else {
			topics = &req.Topics.Value
		}
	}

	if req.ReminderAt.Set {
		if req.ReminderAt.Null {
			reminderAt = nil
		} else {
			reminderAt =
				&req.ReminderAt.Value
		}
	}

	exam, message, err :=
		a.validateExamValues(
			user.UserID,
			courseID,
			examType,
			title,
			examDate,
			startTime,
			endTime,
			room,
			topics,
			reminderAt,
		)

	if err != nil {
		a.fail(c, err)
		return
	}

	if message != "" {
		a.abort(
			c,
			http.StatusBadRequest,
			message,
		)
		return
	}

	if err := a.DB.
		Model(&existing).
		Updates(
			map[string]any{
				"courseId":   exam.CourseID,
				"type":       exam.Type,
				"title":      exam.Title,
				"examDate":   exam.ExamDate,
				"startTime":  exam.StartTime,
				"endTime":    exam.EndTime,
				"room":       exam.Room,
				"topics":     exam.Topics,
				"reminderAt": exam.ReminderAt,
			},
		).
		Error; err != nil {
		a.fail(c, err)
		return
	}

	if err := a.DB.
		Preload("Course").
		Where(
			"id = ?",
			existing.ID,
		).
		First(&existing).
		Error; err != nil {
		a.fail(c, err)
		return
	}

	c.JSON(
		http.StatusOK,
		existing,
	)
}

func (a *App) deleteExam(c *gin.Context) {
	a.deleteOwned(
		c,
		&Exam{},
		"Ujian",
		"Ujian berhasil dihapus",
	)
}
