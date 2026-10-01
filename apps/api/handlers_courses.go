package main

import (
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"gorm.io/gorm"
)

type createCourseRequest struct {
	SemesterID string  `json:"semesterId"`
	Code       string  `json:"code"`
	Name       string  `json:"name"`
	Credits    int     `json:"credits"`
	Lecturer   *string `json:"lecturer"`
	Room       *string `json:"room"`
	Color      string  `json:"color"`
	Notes      *string `json:"notes"`
}

type updateCourseRequest struct {
	SemesterID Optional[string] `json:"semesterId"`
	Code       Optional[string] `json:"code"`
	Name       Optional[string] `json:"name"`
	Credits    Optional[int]    `json:"credits"`
	Lecturer   Optional[string] `json:"lecturer"`
	Room       Optional[string] `json:"room"`
	Color      Optional[string] `json:"color"`
	Notes      Optional[string] `json:"notes"`
}

func (a *App) listCourses(c *gin.Context) {
	user := authUser(c)

	query := a.DB.
		Model(&Course{}).
		Joins(
			`JOIN "Semester" ON "Semester".id = "Course"."semesterId"`,
		).
		Where(
			`"Course"."userId" = ?`,
			user.UserID,
		)

	if semesterID := c.Query("semesterId"); semesterID != "" {
		if !validUUID(semesterID) {
			a.abort(
				c,
				http.StatusBadRequest,
				"Semester tidak valid",
			)
			return
		}

		query = query.Where(
			`"Course"."semesterId" = ?`,
			semesterID,
		)
	}

	var courses []Course

	if err := query.
		Preload("Semester").
		Order(
			`"Semester"."startDate" DESC, "Course".name ASC`,
		).
		Find(&courses).
		Error; err != nil {
		a.fail(c, err)
		return
	}

	for index := range courses {
		count, err := a.courseCounts(
			courses[index].ID,
			false,
		)

		if err != nil {
			a.fail(c, err)
			return
		}

		courses[index].Count = count
	}

	c.JSON(
		http.StatusOK,
		courses,
	)
}

func (a *App) getCourse(c *gin.Context) {
	user := authUser(c)

	id := c.Param("id")

	if !validUUID(id) {
		a.abort(
			c,
			http.StatusBadRequest,
			"Mata kuliah tidak valid",
		)
		return
	}

	var course Course

	if err := a.DB.
		Preload("Semester").
		Preload(
			"Schedules",
			func(db *gorm.DB) *gorm.DB {
				return db.Order(
					"\"dayOfWeek\" ASC, \"startTime\" ASC",
				)
			},
		).
		Preload(
			"Assignments",
			func(db *gorm.DB) *gorm.DB {
				return db.Order("deadline ASC")
			},
		).
		Preload(
			"Exams",
			func(db *gorm.DB) *gorm.DB {
				return db.Order(
					"\"examDate\" ASC",
				)
			},
		).
		Where(
			`"Course".id = ? AND "Course"."userId" = ?`,
			id,
			user.UserID,
		).
		First(&course).
		Error; err != nil {
		a.fail(c, err)
		return
	}

	count, err := a.courseCounts(
		course.ID,
		true,
	)

	if err != nil {
		a.fail(c, err)
		return
	}

	course.Count = count

	c.JSON(
		http.StatusOK,
		course,
	)
}

func (a *App) createCourse(c *gin.Context) {
	user := authUser(c)

	var req createCourseRequest

	if err := c.ShouldBindJSON(&req); err != nil {
		a.abort(
			c,
			http.StatusBadRequest,
			"Payload tidak valid",
		)
		return
	}

	course, message, err := a.validateCourseValues(
		user.UserID,
		req.SemesterID,
		req.Code,
		req.Name,
		req.Credits,
		req.Lecturer,
		req.Room,
		req.Color,
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

	course.ID = uuid.NewString()
	course.UserID = user.UserID

	if err := a.DB.Create(&course).Error; err != nil {
		if err == gorm.ErrDuplicatedKey {
			a.abort(
				c,
				http.StatusConflict,
				"Kode mata kuliah sudah digunakan pada semester tersebut",
			)
			return
		}

		a.fail(c, err)
		return
	}

	if err := a.DB.
		Preload("Semester").
		Where(
			"id = ?",
			course.ID,
		).
		First(&course).
		Error; err != nil {
		a.fail(c, err)
		return
	}

	c.JSON(
		http.StatusCreated,
		course,
	)
}

func (a *App) updateCourse(c *gin.Context) {
	user := authUser(c)

	id := c.Param("id")

	if !validUUID(id) {
		a.abort(
			c,
			http.StatusBadRequest,
			"Mata kuliah tidak valid",
		)
		return
	}

	var existing Course

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

	var req updateCourseRequest

	if err := c.ShouldBindJSON(&req); err != nil {
		a.abort(
			c,
			http.StatusBadRequest,
			"Payload tidak valid",
		)
		return
	}

	semesterID := existing.SemesterID
	code := existing.Code
	name := existing.Name
	credits := existing.Credits
	lecturer := existing.Lecturer
	room := existing.Room
	color := existing.Color
	notes := existing.Notes

	if req.SemesterID.Set {
		if req.SemesterID.Null {
			a.abort(
				c,
				http.StatusBadRequest,
				"Semester tidak boleh null",
			)
			return
		}

		semesterID = req.SemesterID.Value
	}

	if req.Code.Set {
		if req.Code.Null {
			a.abort(
				c,
				http.StatusBadRequest,
				"Kode mata kuliah tidak boleh null",
			)
			return
		}

		code = req.Code.Value
	}

	if req.Name.Set {
		if req.Name.Null {
			a.abort(
				c,
				http.StatusBadRequest,
				"Nama mata kuliah tidak boleh null",
			)
			return
		}

		name = req.Name.Value
	}

	if req.Credits.Set {
		if req.Credits.Null {
			a.abort(
				c,
				http.StatusBadRequest,
				"SKS tidak boleh null",
			)
			return
		}

		credits = req.Credits.Value
	}

	if req.Lecturer.Set {
		if req.Lecturer.Null {
			lecturer = nil
		} else {
			lecturer = &req.Lecturer.Value
		}
	}

	if req.Room.Set {
		if req.Room.Null {
			room = nil
		} else {
			room = &req.Room.Value
		}
	}

	if req.Color.Set {
		if req.Color.Null {
			a.abort(
				c,
				http.StatusBadRequest,
				"Warna tidak boleh null",
			)
			return
		}

		color = req.Color.Value
	}

	if req.Notes.Set {
		if req.Notes.Null {
			notes = nil
		} else {
			notes = &req.Notes.Value
		}
	}

	course, message, err := a.validateCourseValues(
		user.UserID,
		semesterID,
		code,
		name,
		credits,
		lecturer,
		room,
		color,
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
				"semesterId": course.SemesterID,
				"code":       course.Code,
				"name":       course.Name,
				"credits":    course.Credits,
				"lecturer":   course.Lecturer,
				"room":       course.Room,
				"color":      course.Color,
				"notes":      course.Notes,
			},
		).
		Error; err != nil {
		if err == gorm.ErrDuplicatedKey {
			a.abort(
				c,
				http.StatusConflict,
				"Kode mata kuliah sudah digunakan pada semester tersebut",
			)
			return
		}

		a.fail(c, err)
		return
	}

	if err := a.DB.
		Preload("Semester").
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

func (a *App) deleteCourse(c *gin.Context) {
	a.deleteOwned(
		c,
		&Course{},
		"Mata kuliah",
		"Mata kuliah berhasil dihapus",
	)
}
