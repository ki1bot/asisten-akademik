package main

import (
	"net/http"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"gorm.io/gorm"
)

type createAssignmentRequest struct {
	CourseID      string  `json:"courseId"`
	Title         string  `json:"title"`
	Description   *string `json:"description"`
	Deadline      string  `json:"deadline"`
	Priority      string  `json:"priority"`
	Status        string  `json:"status"`
	AttachmentURL *string `json:"attachmentUrl"`
	ReminderAt    *string `json:"reminderAt"`
}

type updateAssignmentRequest struct {
	CourseID      Optional[string] `json:"courseId"`
	Title         Optional[string] `json:"title"`
	Description   Optional[string] `json:"description"`
	Deadline      Optional[string] `json:"deadline"`
	Priority      Optional[string] `json:"priority"`
	Status        Optional[string] `json:"status"`
	AttachmentURL Optional[string] `json:"attachmentUrl"`
	ReminderAt    Optional[string] `json:"reminderAt"`
}

func (a *App) listAssignments(c *gin.Context) {
	user := authUser(c)

	if err := a.updateOverdue(user.UserID); err != nil {
		a.fail(c, err)
		return
	}

	query := a.DB.
		Where(
			`"Assignment"."userId" = ?`,
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
			`"Assignment"."courseId" = ?`,
			value,
		)
	}

	if value := c.Query("status"); value != "" {
		if !contains(
			[]string{
				"TODO",
				"IN_PROGRESS",
				"SUBMITTED",
				"COMPLETED",
				"OVERDUE",
			},
			value,
		) {
			a.abort(
				c,
				http.StatusBadRequest,
				"Status tugas tidak valid",
			)
			return
		}

		query = query.Where(
			`"Assignment".status = ?`,
			value,
		)
	}

	if value := c.Query("priority"); value != "" {
		if !contains(
			[]string{
				"LOW",
				"MEDIUM",
				"HIGH",
				"URGENT",
			},
			value,
		) {
			a.abort(
				c,
				http.StatusBadRequest,
				"Prioritas tugas tidak valid",
			)
			return
		}

		query = query.Where(
			`"Assignment".priority = ?`,
			value,
		)
	}

	var assignments []Assignment

	if err := query.
		Preload("Course.Semester").
		Order(
			`"Assignment".deadline ASC, "Assignment".priority DESC`,
		).
		Find(&assignments).
		Error; err != nil {
		a.fail(c, err)
		return
	}

	c.JSON(
		http.StatusOK,
		assignments,
	)
}

func (a *App) getAssignment(c *gin.Context) {
	user := authUser(c)

	if err := a.updateOverdue(user.UserID); err != nil {
		a.fail(c, err)
		return
	}

	id := c.Param("id")

	if !validUUID(id) {
		a.abort(
			c,
			http.StatusBadRequest,
			"Tugas tidak valid",
		)
		return
	}

	var assignment Assignment

	if err := a.DB.
		Preload("Course.Semester").
		Where(
			`"Assignment".id = ? AND "Assignment"."userId" = ?`,
			id,
			user.UserID,
		).
		First(&assignment).
		Error; err != nil {
		a.fail(c, err)
		return
	}

	c.JSON(
		http.StatusOK,
		assignment,
	)
}

func (a *App) createAssignment(c *gin.Context) {
	user := authUser(c)

	var req createAssignmentRequest

	if err := c.ShouldBindJSON(&req); err != nil {
		a.abort(
			c,
			http.StatusBadRequest,
			"Payload tidak valid",
		)
		return
	}

	assignment, message, err :=
		a.validateAssignmentValues(
			user.UserID,
			req.CourseID,
			req.Title,
			req.Description,
			req.Deadline,
			req.Priority,
			req.Status,
			req.AttachmentURL,
			req.ReminderAt,
			nil,
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

	assignment.ID = uuid.NewString()
	assignment.UserID = user.UserID

	err = a.DB.Transaction(
		func(tx *gorm.DB) error {
			if err := tx.Create(&assignment).Error; err != nil {
				return err
			}

			if assignment.ReminderAt == nil {
				return nil
			}

			var course Course

			if err := tx.
				Where(
					"id = ?",
					assignment.CourseID,
				).
				First(&course).
				Error; err != nil {
				return err
			}

			notification := Notification{
				ID:     uuid.NewString(),
				UserID: user.UserID,
				Type:   "ASSIGNMENT",
				Title: "Pengingat tugas: " +
					assignment.Title,
				Message: course.Name +
					" memiliki deadline pada " +
					assignment.Deadline.
						UTC().
						Format(time.RFC3339Nano),
				ScheduledFor: assignment.ReminderAt,
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
			assignment.ID,
		).
		First(&assignment).
		Error; err != nil {
		a.fail(c, err)
		return
	}

	c.JSON(
		http.StatusCreated,
		assignment,
	)
}

func (a *App) updateAssignment(c *gin.Context) {
	user := authUser(c)

	id := c.Param("id")

	if !validUUID(id) {
		a.abort(
			c,
			http.StatusBadRequest,
			"Tugas tidak valid",
		)
		return
	}

	var existing Assignment

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

	var req updateAssignmentRequest

	if err := c.ShouldBindJSON(&req); err != nil {
		a.abort(
			c,
			http.StatusBadRequest,
			"Payload tidak valid",
		)
		return
	}

	courseID := existing.CourseID
	title := existing.Title
	description := existing.Description
	deadline := existing.Deadline.
		UTC().
		Format(time.RFC3339Nano)
	priority := existing.Priority
	status := existing.Status
	attachmentURL := existing.AttachmentURL

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

	if req.Title.Set {
		if req.Title.Null {
			a.abort(
				c,
				http.StatusBadRequest,
				"Judul tugas tidak boleh null",
			)
			return
		}

		title = req.Title.Value
	}

	if req.Description.Set {
		if req.Description.Null {
			description = nil
		} else {
			description = &req.Description.Value
		}
	}

	if req.Deadline.Set {
		if req.Deadline.Null {
			a.abort(
				c,
				http.StatusBadRequest,
				"Deadline tidak boleh null",
			)
			return
		}

		deadline = req.Deadline.Value
	}

	if req.Priority.Set {
		if req.Priority.Null {
			a.abort(
				c,
				http.StatusBadRequest,
				"Prioritas tidak boleh null",
			)
			return
		}

		priority = req.Priority.Value
	}

	if req.Status.Set {
		if req.Status.Null {
			a.abort(
				c,
				http.StatusBadRequest,
				"Status tidak boleh null",
			)
			return
		}

		status = req.Status.Value
	}

	if req.AttachmentURL.Set {
		if req.AttachmentURL.Null {
			attachmentURL = nil
		} else {
			attachmentURL =
				&req.AttachmentURL.Value
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

	assignment, message, err :=
		a.validateAssignmentValues(
			user.UserID,
			courseID,
			title,
			description,
			deadline,
			priority,
			status,
			attachmentURL,
			reminderAt,
			existing.SubmittedAt,
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
				"courseId":      assignment.CourseID,
				"title":         assignment.Title,
				"description":   assignment.Description,
				"deadline":      assignment.Deadline,
				"priority":      assignment.Priority,
				"status":        assignment.Status,
				"attachmentUrl": assignment.AttachmentURL,
				"reminderAt":    assignment.ReminderAt,
				"submittedAt":   assignment.SubmittedAt,
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

func (a *App) deleteAssignment(c *gin.Context) {
	a.deleteOwned(
		c,
		&Assignment{},
		"Tugas",
		"Tugas berhasil dihapus",
	)
}
