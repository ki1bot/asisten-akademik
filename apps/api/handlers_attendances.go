package main

import (
	"net/http"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"gorm.io/gorm"
)

type createAttendanceRequest struct {
	CourseID    string  `json:"courseId"`
	MeetingDate string  `json:"meetingDate"`
	Status      string  `json:"status"`
	Notes       *string `json:"notes"`
}

type updateAttendanceRequest struct {
	CourseID    Optional[string] `json:"courseId"`
	MeetingDate Optional[string] `json:"meetingDate"`
	Status      Optional[string] `json:"status"`
	Notes       Optional[string] `json:"notes"`
}

func (a *App) listAttendances(c *gin.Context) {
	user := authUser(c)

	query, ok := a.attendanceFilterQuery(
		c,
		a.DB.Where(
			`"Attendance"."userId" = ?`,
			user.UserID,
		),
	)

	if !ok {
		return
	}

	var attendances []Attendance

	if err := query.
		Preload("Course.Semester").
		Order(
			`"Attendance"."meetingDate" DESC`,
		).
		Find(&attendances).
		Error; err != nil {
		a.fail(c, err)
		return
	}

	c.JSON(
		http.StatusOK,
		attendances,
	)
}

func (a *App) getAttendance(c *gin.Context) {
	user := authUser(c)

	id := c.Param("id")

	if !validUUID(id) {
		a.abort(
			c,
			http.StatusBadRequest,
			"Presensi tidak valid",
		)
		return
	}

	var attendance Attendance

	if err := a.DB.
		Preload("Course.Semester").
		Where(
			`"Attendance".id = ? AND "Attendance"."userId" = ?`,
			id,
			user.UserID,
		).
		First(&attendance).
		Error; err != nil {
		a.fail(c, err)
		return
	}

	c.JSON(
		http.StatusOK,
		attendance,
	)
}

func (a *App) createAttendance(c *gin.Context) {
	user := authUser(c)

	var req createAttendanceRequest

	if err := c.ShouldBindJSON(&req); err != nil {
		a.abort(
			c,
			http.StatusBadRequest,
			"Payload tidak valid",
		)
		return
	}

	attendance, message, err :=
		a.validateAttendanceValues(
			user.UserID,
			req.CourseID,
			req.MeetingDate,
			req.Status,
			req.Notes,
			"",
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

	attendance.ID = uuid.NewString()
	attendance.UserID = user.UserID

	if err := a.DB.Create(&attendance).Error; err != nil {
		if err == gorm.ErrDuplicatedKey {
			a.abort(
				c,
				http.StatusConflict,
				"Presensi pada mata kuliah dan tanggal tersebut sudah tersedia",
			)
			return
		}

		a.fail(c, err)
		return
	}

	if err := a.DB.
		Preload("Course").
		Where(
			"id = ?",
			attendance.ID,
		).
		First(&attendance).
		Error; err != nil {
		a.fail(c, err)
		return
	}

	c.JSON(
		http.StatusCreated,
		attendance,
	)
}

func (a *App) updateAttendance(c *gin.Context) {
	user := authUser(c)

	id := c.Param("id")

	if !validUUID(id) {
		a.abort(
			c,
			http.StatusBadRequest,
			"Presensi tidak valid",
		)
		return
	}

	var existing Attendance

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

	var req updateAttendanceRequest

	if err := c.ShouldBindJSON(&req); err != nil {
		a.abort(
			c,
			http.StatusBadRequest,
			"Payload tidak valid",
		)
		return
	}

	courseID := existing.CourseID
	meetingDate := existing.MeetingDate.
		UTC().
		Format(time.RFC3339Nano)
	status := existing.Status
	notes := existing.Notes

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

	if req.MeetingDate.Set {
		if req.MeetingDate.Null {
			a.abort(
				c,
				http.StatusBadRequest,
				"Tanggal presensi tidak boleh null",
			)
			return
		}

		meetingDate = req.MeetingDate.Value
	}

	if req.Status.Set {
		if req.Status.Null {
			a.abort(
				c,
				http.StatusBadRequest,
				"Status presensi tidak boleh null",
			)
			return
		}

		status = req.Status.Value
	}

	if req.Notes.Set {
		if req.Notes.Null {
			notes = nil
		} else {
			notes = &req.Notes.Value
		}
	}

	attendance, message, err :=
		a.validateAttendanceValues(
			user.UserID,
			courseID,
			meetingDate,
			status,
			notes,
			existing.ID,
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
				"courseId":    attendance.CourseID,
				"meetingDate": attendance.MeetingDate,
				"status":      attendance.Status,
				"notes":       attendance.Notes,
			},
		).
		Error; err != nil {
		if err == gorm.ErrDuplicatedKey {
			a.abort(
				c,
				http.StatusConflict,
				"Presensi pada mata kuliah dan tanggal tersebut sudah tersedia",
			)
			return
		}

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

func (a *App) deleteAttendance(c *gin.Context) {
	a.deleteOwned(
		c,
		&Attendance{},
		"Presensi",
		"Presensi berhasil dihapus",
	)
}

func (a *App) attendanceSummary(c *gin.Context) {
	user := authUser(c)

	query, ok := a.attendanceFilterQuery(
		c,
		a.DB.
			Model(&Attendance{}).
			Where(
				`"Attendance"."userId" = ?`,
				user.UserID,
			),
	)

	if !ok {
		return
	}

	summary, err := attendanceSummaryFromQuery(query)

	if err != nil {
		a.fail(c, err)
		return
	}

	c.JSON(
		http.StatusOK,
		summary,
	)
}
