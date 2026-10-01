package main

import (
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"gorm.io/gorm"
)

type gradeComponentRequest struct {
	Name   string  `json:"name"`
	Score  float64 `json:"score"`
	Weight float64 `json:"weight"`
}

type createGradeRequest struct {
	CourseID   string                  `json:"courseId"`
	FinalScore *float64                `json:"finalScore"`
	Components []gradeComponentRequest `json:"components"`
}

type updateGradeRequest struct {
	FinalScore Optional[float64]                 `json:"finalScore"`
	Components Optional[[]gradeComponentRequest] `json:"components"`
}

func (a *App) gradeScale(c *gin.Context) {
	c.JSON(
		http.StatusOK,
		a.Config.GradeScale,
	)
}

func (a *App) listGrades(c *gin.Context) {
	user := authUser(c)

	semesterID := c.Query("semesterId")

	if semesterID != "" {
		if !validUUID(semesterID) {
			a.abort(
				c,
				http.StatusBadRequest,
				"Semester tidak valid",
			)
			return
		}

		owned, err := a.ownsSemester(
			user.UserID,
			semesterID,
		)

		if err != nil {
			a.fail(c, err)
			return
		}

		if !owned {
			a.abort(
				c,
				http.StatusNotFound,
				"Semester tidak ditemukan",
			)
			return
		}
	}

	query := a.DB.
		Model(&Grade{}).
		Joins(
			`JOIN "Course" ON "Course".id = "Grade"."courseId"`,
		).
		Where(
			`"Grade"."userId" = ?`,
			user.UserID,
		)

	if semesterID != "" {
		query = query.Where(
			`"Course"."semesterId" = ?`,
			semesterID,
		)
	}

	var grades []Grade

	if err := query.
		Preload("Course.Semester").
		Preload(
			"Components",
			func(db *gorm.DB) *gorm.DB {
				return db.Order(
					"\"createdAt\" ASC",
				)
			},
		).
		Order(
			`"Course".name ASC`,
		).
		Find(&grades).
		Error; err != nil {
		a.fail(c, err)
		return
	}

	c.JSON(
		http.StatusOK,
		grades,
	)
}

func (a *App) getGrade(c *gin.Context) {
	user := authUser(c)

	id := c.Param("id")

	if !validUUID(id) {
		a.abort(
			c,
			http.StatusBadRequest,
			"Nilai tidak valid",
		)
		return
	}

	var grade Grade

	if err := a.DB.
		Preload("Course.Semester").
		Preload(
			"Components",
			func(db *gorm.DB) *gorm.DB {
				return db.Order(
					"\"createdAt\" ASC",
				)
			},
		).
		Where(
			`"Grade".id = ? AND "Grade"."userId" = ?`,
			id,
			user.UserID,
		).
		First(&grade).
		Error; err != nil {
		a.fail(c, err)
		return
	}

	c.JSON(
		http.StatusOK,
		grade,
	)
}

func (a *App) createGrade(c *gin.Context) {
	user := authUser(c)

	var req createGradeRequest

	if err := c.ShouldBindJSON(&req); err != nil {
		a.abort(
			c,
			http.StatusBadRequest,
			"Payload tidak valid",
		)
		return
	}

	if !validUUID(req.CourseID) {
		a.abort(
			c,
			http.StatusBadRequest,
			"Mata kuliah tidak valid",
		)
		return
	}

	owned, err := a.ownsCourse(
		user.UserID,
		req.CourseID,
	)

	if err != nil {
		a.fail(c, err)
		return
	}

	if !owned {
		a.abort(
			c,
			http.StatusNotFound,
			"Mata kuliah tidak ditemukan",
		)
		return
	}

	var count int64

	if err := a.DB.
		Model(&Grade{}).
		Where(
			"\"userId\" = ? AND \"courseId\" = ?",
			user.UserID,
			req.CourseID,
		).
		Count(&count).
		Error; err != nil {
		a.fail(c, err)
		return
	}

	if count > 0 {
		a.abort(
			c,
			http.StatusConflict,
			"Nilai untuk mata kuliah tersebut sudah tersedia",
		)
		return
	}

	if req.Components != nil &&
		len(req.Components) == 0 {
		a.abort(
			c,
			http.StatusBadRequest,
			"Komponen nilai minimal 1",
		)
		return
	}

	score, components, message :=
		resolveGradeInput(
			req.FinalScore,
			req.Components,
		)

	if message != "" {
		a.abort(
			c,
			http.StatusBadRequest,
			message,
		)
		return
	}

	scale := a.resolveGradeScale(score)

	grade := Grade{
		ID:         uuid.NewString(),
		UserID:     user.UserID,
		CourseID:   req.CourseID,
		FinalScore: &score,
		Letter:     &scale.Letter,
		Weight:     &scale.Weight,
	}

	err = a.DB.Transaction(
		func(tx *gorm.DB) error {
			if err := tx.Create(&grade).Error; err != nil {
				return err
			}

			for _, component := range components {
				component.ID = uuid.NewString()
				component.GradeID = grade.ID

				if err := tx.
					Create(&component).
					Error; err != nil {
					return err
				}
			}

			return nil
		},
	)

	if err != nil {
		if err == gorm.ErrDuplicatedKey {
			a.abort(
				c,
				http.StatusConflict,
				"Nilai untuk mata kuliah tersebut sudah tersedia",
			)
			return
		}

		a.fail(c, err)
		return
	}

	if err := a.DB.
		Preload("Course.Semester").
		Preload("Components").
		Where(
			"id = ?",
			grade.ID,
		).
		First(&grade).
		Error; err != nil {
		a.fail(c, err)
		return
	}

	c.JSON(
		http.StatusCreated,
		grade,
	)
}

func (a *App) updateGrade(c *gin.Context) {
	user := authUser(c)

	id := c.Param("id")

	if !validUUID(id) {
		a.abort(
			c,
			http.StatusBadRequest,
			"Nilai tidak valid",
		)
		return
	}

	var grade Grade

	if err := a.DB.
		Preload("Components").
		Where(
			"id = ? AND \"userId\" = ?",
			id,
			user.UserID,
		).
		First(&grade).
		Error; err != nil {
		a.fail(c, err)
		return
	}

	var req updateGradeRequest

	if err := c.ShouldBindJSON(&req); err != nil {
		a.abort(
			c,
			http.StatusBadRequest,
			"Payload tidak valid",
		)
		return
	}

	score := 0.0

	var components []GradeComponent

	replaceComponents := false

	if req.Components.Set &&
		!req.Components.Null {
		if len(req.Components.Value) == 0 {
			a.abort(
				c,
				http.StatusBadRequest,
				"Komponen nilai minimal 1",
			)
			return
		}

		var message string

		score, components, message =
			resolveGradeInput(
				nil,
				req.Components.Value,
			)

		if message != "" {
			a.abort(
				c,
				http.StatusBadRequest,
				message,
			)
			return
		}

		replaceComponents = true
	} else if req.FinalScore.Set {
		if req.FinalScore.Null {
			a.abort(
				c,
				http.StatusBadRequest,
				"Nilai akhir atau komponen nilai harus diberikan",
			)
			return
		}

		if req.FinalScore.Value < 0 ||
			req.FinalScore.Value > 100 {
			a.abort(
				c,
				http.StatusBadRequest,
				"Nilai akhir harus antara 0 dan 100",
			)
			return
		}

		score = req.FinalScore.Value
	} else if grade.FinalScore != nil {
		score = *grade.FinalScore
	} else {
		a.abort(
			c,
			http.StatusBadRequest,
			"Nilai akhir atau komponen nilai harus diberikan",
		)
		return
	}

	scale := a.resolveGradeScale(score)

	err := a.DB.Transaction(
		func(tx *gorm.DB) error {
			if err := tx.
				Model(&grade).
				Updates(
					map[string]any{
						"finalScore": score,
						"letter":     scale.Letter,
						"weight":     scale.Weight,
					},
				).
				Error; err != nil {
				return err
			}

			if !replaceComponents {
				return nil
			}

			if err := tx.
				Where(
					"\"gradeId\" = ?",
					grade.ID,
				).
				Delete(&GradeComponent{}).
				Error; err != nil {
				return err
			}

			for _, component := range components {
				component.ID = uuid.NewString()
				component.GradeID = grade.ID

				if err := tx.
					Create(&component).
					Error; err != nil {
					return err
				}
			}

			return nil
		},
	)

	if err != nil {
		a.fail(c, err)
		return
	}

	if err := a.DB.
		Preload("Course.Semester").
		Preload(
			"Components",
			func(db *gorm.DB) *gorm.DB {
				return db.Order(
					"\"createdAt\" ASC",
				)
			},
		).
		Where(
			"id = ?",
			grade.ID,
		).
		First(&grade).
		Error; err != nil {
		a.fail(c, err)
		return
	}

	c.JSON(
		http.StatusOK,
		grade,
	)
}

func (a *App) deleteGrade(c *gin.Context) {
	a.deleteOwned(
		c,
		&Grade{},
		"Nilai",
		"Nilai berhasil dihapus",
	)
}
