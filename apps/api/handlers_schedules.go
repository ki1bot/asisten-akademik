package main

import (
	"net/http"
	"strconv"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
)

type createScheduleRequest struct {
	CourseID        string  `json:"courseId"`
	DayOfWeek       int     `json:"dayOfWeek"`
	StartTime       string  `json:"startTime"`
	EndTime         string  `json:"endTime"`
	Room            *string `json:"room"`
	LectureType     string  `json:"lectureType"`
	OnlineURL       *string `json:"onlineUrl"`
	ReminderMinutes *int    `json:"reminderMinutes"`
}

type updateScheduleRequest struct {
	CourseID        Optional[string] `json:"courseId"`
	DayOfWeek       Optional[int]    `json:"dayOfWeek"`
	StartTime       Optional[string] `json:"startTime"`
	EndTime         Optional[string] `json:"endTime"`
	Room            Optional[string] `json:"room"`
	LectureType     Optional[string] `json:"lectureType"`
	OnlineURL       Optional[string] `json:"onlineUrl"`
	ReminderMinutes Optional[int]    `json:"reminderMinutes"`
}

func (a *App) listSchedules(c *gin.Context) {
	user := authUser(c)

	query := a.DB.
		Where(
			`"Schedule"."userId" = ?`,
			user.UserID,
		)

	if courseID := c.Query("courseId"); courseID != "" {
		if !validUUID(courseID) {
			a.abort(
				c,
				http.StatusBadRequest,
				"Mata kuliah tidak valid",
			)
			return
		}

		query = query.Where(
			`"Schedule"."courseId" = ?`,
			courseID,
		)
	}

	if dayRaw := c.Query("dayOfWeek"); dayRaw != "" {
		day, err := strconv.Atoi(dayRaw)

		if err != nil ||
			day < 1 ||
			day > 7 {
			a.abort(
				c,
				http.StatusBadRequest,
				"Hari tidak valid",
			)
			return
		}

		query = query.Where(
			`"Schedule"."dayOfWeek" = ?`,
			day,
		)
	}

	var schedules []Schedule

	if err := query.
		Preload("Course.Semester").
		Order(
			`"Schedule"."dayOfWeek" ASC, "Schedule"."startTime" ASC`,
		).
		Find(&schedules).
		Error; err != nil {
		a.fail(c, err)
		return
	}

	c.JSON(
		http.StatusOK,
		schedules,
	)
}

func (a *App) getSchedule(c *gin.Context) {
	user := authUser(c)

	id := c.Param("id")

	if !validUUID(id) {
		a.abort(
			c,
			http.StatusBadRequest,
			"Jadwal tidak valid",
		)
		return
	}

	var schedule Schedule

	if err := a.DB.
		Preload("Course.Semester").
		Where(
			`"Schedule".id = ? AND "Schedule"."userId" = ?`,
			id,
			user.UserID,
		).
		First(&schedule).
		Error; err != nil {
		a.fail(c, err)
		return
	}

	c.JSON(
		http.StatusOK,
		schedule,
	)
}

func (a *App) createSchedule(c *gin.Context) {
	user := authUser(c)

	var req createScheduleRequest

	if err := c.ShouldBindJSON(&req); err != nil {
		a.abort(
			c,
			http.StatusBadRequest,
			"Payload tidak valid",
		)
		return
	}

	schedule, message, err :=
		a.validateScheduleValues(
			user.UserID,
			req.CourseID,
			req.DayOfWeek,
			req.StartTime,
			req.EndTime,
			req.Room,
			req.LectureType,
			req.OnlineURL,
			req.ReminderMinutes,
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

	schedule.ID = uuid.NewString()
	schedule.UserID = user.UserID

	if err := a.DB.Create(&schedule).Error; err != nil {
		a.fail(c, err)
		return
	}

	if err := a.DB.
		Preload("Course").
		Where(
			"id = ?",
			schedule.ID,
		).
		First(&schedule).
		Error; err != nil {
		a.fail(c, err)
		return
	}

	c.JSON(
		http.StatusCreated,
		schedule,
	)
}

func (a *App) updateSchedule(c *gin.Context) {
	user := authUser(c)

	id := c.Param("id")

	if !validUUID(id) {
		a.abort(
			c,
			http.StatusBadRequest,
			"Jadwal tidak valid",
		)
		return
	}

	var existing Schedule

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

	var req updateScheduleRequest

	if err := c.ShouldBindJSON(&req); err != nil {
		a.abort(
			c,
			http.StatusBadRequest,
			"Payload tidak valid",
		)
		return
	}

	courseID := existing.CourseID
	dayOfWeek := existing.DayOfWeek
	startTime := existing.StartTime
	endTime := existing.EndTime
	room := existing.Room
	lectureType := existing.LectureType
	onlineURL := existing.OnlineURL
	reminderMinutes := existing.ReminderMinutes

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

	if req.DayOfWeek.Set {
		if req.DayOfWeek.Null {
			a.abort(
				c,
				http.StatusBadRequest,
				"Hari tidak boleh null",
			)
			return
		}

		dayOfWeek = req.DayOfWeek.Value
	}

	if req.StartTime.Set {
		if req.StartTime.Null {
			a.abort(
				c,
				http.StatusBadRequest,
				"Jam mulai tidak boleh null",
			)
			return
		}

		startTime = req.StartTime.Value
	}

	if req.EndTime.Set {
		if req.EndTime.Null {
			a.abort(
				c,
				http.StatusBadRequest,
				"Jam selesai tidak boleh null",
			)
			return
		}

		endTime = req.EndTime.Value
	}

	if req.Room.Set {
		if req.Room.Null {
			room = nil
		} else {
			room = &req.Room.Value
		}
	}

	if req.LectureType.Set {
		if req.LectureType.Null {
			a.abort(
				c,
				http.StatusBadRequest,
				"Jenis perkuliahan tidak boleh null",
			)
			return
		}

		lectureType = req.LectureType.Value
	}

	if req.OnlineURL.Set {
		if req.OnlineURL.Null {
			onlineURL = nil
		} else {
			onlineURL = &req.OnlineURL.Value
		}
	}

	if req.ReminderMinutes.Set {
		if req.ReminderMinutes.Null {
			reminderMinutes = nil
		} else {
			reminderMinutes =
				&req.ReminderMinutes.Value
		}
	}

	schedule, message, err :=
		a.validateScheduleValues(
			user.UserID,
			courseID,
			dayOfWeek,
			startTime,
			endTime,
			room,
			lectureType,
			onlineURL,
			reminderMinutes,
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
				"courseId":        schedule.CourseID,
				"dayOfWeek":       schedule.DayOfWeek,
				"startTime":       schedule.StartTime,
				"endTime":         schedule.EndTime,
				"room":            schedule.Room,
				"lectureType":     schedule.LectureType,
				"onlineUrl":       schedule.OnlineURL,
				"reminderMinutes": schedule.ReminderMinutes,
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

func (a *App) deleteSchedule(c *gin.Context) {
	a.deleteOwned(
		c,
		&Schedule{},
		"Jadwal",
		"Jadwal berhasil dihapus",
	)
}
