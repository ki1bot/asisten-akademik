package main

import (
	"net/http"
	"strings"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"gorm.io/gorm"
)

type createSemesterRequest struct {
	Name         string `json:"name"`
	AcademicYear string `json:"academicYear"`
	Type         string `json:"type"`
	StartDate    string `json:"startDate"`
	EndDate      string `json:"endDate"`
	IsActive     *bool  `json:"isActive"`
}

type updateSemesterRequest struct {
	Name         Optional[string] `json:"name"`
	AcademicYear Optional[string] `json:"academicYear"`
	Type         Optional[string] `json:"type"`
	StartDate    Optional[string] `json:"startDate"`
	EndDate      Optional[string] `json:"endDate"`
	IsActive     Optional[bool]   `json:"isActive"`
}

func (a *App) listSemesters(c *gin.Context) {
	user := authUser(c)

	var semesters []Semester

	if err := a.DB.
		Where(
			"\"userId\" = ?",
			user.UserID,
		).
		Order(
			"\"isActive\" DESC, \"startDate\" DESC",
		).
		Find(&semesters).
		Error; err != nil {
		a.fail(c, err)
		return
	}

	for index := range semesters {
		var count int64

		if err := a.DB.
			Model(&Course{}).
			Where(
				"\"userId\" = ? AND \"semesterId\" = ?",
				user.UserID,
				semesters[index].ID,
			).
			Count(&count).
			Error; err != nil {
			a.fail(c, err)
			return
		}

		semesters[index].Count = &SemesterCount{
			Courses: count,
		}
	}

	c.JSON(
		http.StatusOK,
		semesters,
	)
}

func (a *App) getSemester(c *gin.Context) {
	user := authUser(c)

	id := c.Param("id")

	if !validUUID(id) {
		a.abort(
			c,
			http.StatusBadRequest,
			"Semester tidak valid",
		)
		return
	}

	var semester Semester

	if err := a.DB.
		Preload(
			"Courses",
			func(db *gorm.DB) *gorm.DB {
				return db.Order("name ASC")
			},
		).
		Where(
			"id = ? AND \"userId\" = ?",
			id,
			user.UserID,
		).
		First(&semester).
		Error; err != nil {
		a.fail(c, err)
		return
	}

	var count int64

	if err := a.DB.
		Model(&Course{}).
		Where(
			"\"userId\" = ? AND \"semesterId\" = ?",
			user.UserID,
			semester.ID,
		).
		Count(&count).
		Error; err != nil {
		a.fail(c, err)
		return
	}

	semester.Count = &SemesterCount{
		Courses: count,
	}

	c.JSON(
		http.StatusOK,
		semester,
	)
}

func (a *App) createSemester(c *gin.Context) {
	user := authUser(c)

	var req createSemesterRequest

	if err := c.ShouldBindJSON(&req); err != nil {
		a.abort(
			c,
			http.StatusBadRequest,
			"Payload tidak valid",
		)
		return
	}

	semester, message := parseSemesterValues(
		strings.TrimSpace(req.Name),
		strings.TrimSpace(req.AcademicYear),
		req.Type,
		req.StartDate,
		req.EndDate,
		false,
	)

	if message != "" {
		a.abort(
			c,
			http.StatusBadRequest,
			message,
		)
		return
	}

	if req.IsActive != nil {
		semester.IsActive = *req.IsActive
	}

	semester.ID = uuid.NewString()
	semester.UserID = user.UserID

	duplicate, err := a.semesterDuplicate(
		user.UserID,
		semester.Name,
		semester.AcademicYear,
		"",
	)

	if err != nil {
		a.fail(c, err)
		return
	}

	if duplicate {
		a.abort(
			c,
			http.StatusConflict,
			"Semester dengan nama dan tahun akademik tersebut sudah tersedia",
		)
		return
	}

	err = a.DB.Transaction(
		func(tx *gorm.DB) error {
			if semester.IsActive {
				if err := tx.
					Model(&Semester{}).
					Where(
						"\"userId\" = ? AND \"isActive\" = true",
						user.UserID,
					).
					Update(
						"isActive",
						false,
					).
					Error; err != nil {
					return err
				}
			}

			return tx.Create(&semester).Error
		},
	)

	if err != nil {
		a.fail(c, err)
		return
	}

	c.JSON(
		http.StatusCreated,
		semester,
	)
}

func (a *App) updateSemester(c *gin.Context) {
	user := authUser(c)

	id := c.Param("id")

	if !validUUID(id) {
		a.abort(
			c,
			http.StatusBadRequest,
			"Semester tidak valid",
		)
		return
	}

	var existing Semester

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

	var req updateSemesterRequest

	if err := c.ShouldBindJSON(&req); err != nil {
		a.abort(
			c,
			http.StatusBadRequest,
			"Payload tidak valid",
		)
		return
	}

	name := existing.Name
	academicYear := existing.AcademicYear
	semesterType := existing.Type
	startDate := existing.StartDate
	endDate := existing.EndDate
	isActive := existing.IsActive

	if req.Name.Set {
		if req.Name.Null {
			a.abort(
				c,
				http.StatusBadRequest,
				"Nama semester tidak boleh null",
			)
			return
		}

		name = strings.TrimSpace(req.Name.Value)
	}

	if req.AcademicYear.Set {
		if req.AcademicYear.Null {
			a.abort(
				c,
				http.StatusBadRequest,
				"Tahun akademik tidak boleh null",
			)
			return
		}

		academicYear = strings.TrimSpace(
			req.AcademicYear.Value,
		)
	}

	if req.Type.Set {
		if req.Type.Null {
			a.abort(
				c,
				http.StatusBadRequest,
				"Jenis semester tidak boleh null",
			)
			return
		}

		semesterType = req.Type.Value
	}

	if req.StartDate.Set {
		if req.StartDate.Null {
			a.abort(
				c,
				http.StatusBadRequest,
				"Tanggal mulai tidak boleh null",
			)
			return
		}

		parsed, err := parseISOTime(
			req.StartDate.Value,
		)

		if err != nil {
			a.abort(
				c,
				http.StatusBadRequest,
				"Tanggal mulai tidak valid",
			)
			return
		}

		startDate = parsed
	}

	if req.EndDate.Set {
		if req.EndDate.Null {
			a.abort(
				c,
				http.StatusBadRequest,
				"Tanggal selesai tidak boleh null",
			)
			return
		}

		parsed, err := parseISOTime(
			req.EndDate.Value,
		)

		if err != nil {
			a.abort(
				c,
				http.StatusBadRequest,
				"Tanggal selesai tidak valid",
			)
			return
		}

		endDate = parsed
	}

	if req.IsActive.Set {
		if req.IsActive.Null {
			a.abort(
				c,
				http.StatusBadRequest,
				"Status semester aktif tidak boleh null",
			)
			return
		}

		isActive = req.IsActive.Value
	}

	if len(name) < 2 || len(name) > 50 {
		a.abort(
			c,
			http.StatusBadRequest,
			"Nama semester harus memiliki 2 sampai 50 karakter",
		)
		return
	}

	if !academicYearPattern.MatchString(academicYear) {
		a.abort(
			c,
			http.StatusBadRequest,
			"Tahun akademik harus menggunakan format 2026/2027",
		)
		return
	}

	if !contains(
		[]string{
			"ODD",
			"EVEN",
		},
		semesterType,
	) {
		a.abort(
			c,
			http.StatusBadRequest,
			"Jenis semester tidak valid",
		)
		return
	}

	if !startDate.Before(endDate) {
		a.abort(
			c,
			http.StatusBadRequest,
			"Tanggal selesai semester harus setelah tanggal mulai",
		)
		return
	}

	duplicate, err := a.semesterDuplicate(
		user.UserID,
		name,
		academicYear,
		existing.ID,
	)

	if err != nil {
		a.fail(c, err)
		return
	}

	if duplicate {
		a.abort(
			c,
			http.StatusConflict,
			"Semester dengan nama dan tahun akademik tersebut sudah tersedia",
		)
		return
	}

	err = a.DB.Transaction(
		func(tx *gorm.DB) error {
			if isActive {
				if err := tx.
					Model(&Semester{}).
					Where(
						"\"userId\" = ? AND id <> ? AND \"isActive\" = true",
						user.UserID,
						existing.ID,
					).
					Update(
						"isActive",
						false,
					).
					Error; err != nil {
					return err
				}
			}

			return tx.
				Model(&existing).
				Updates(
					map[string]any{
						"name":         name,
						"academicYear": academicYear,
						"type":         semesterType,
						"startDate":    startDate,
						"endDate":      endDate,
						"isActive":     isActive,
					},
				).
				Error
		},
	)

	if err != nil {
		a.fail(c, err)
		return
	}

	if err := a.DB.
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

func (a *App) deleteSemester(c *gin.Context) {
	a.deleteOwned(
		c,
		&Semester{},
		"Semester",
		"Semester berhasil dihapus",
	)
}
