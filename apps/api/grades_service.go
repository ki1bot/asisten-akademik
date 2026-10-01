package main

import (
	"math"
	"net/http"
	"strings"

	"github.com/gin-gonic/gin"
	"gorm.io/gorm"
)

func resolveGradeInput(
	finalScore *float64,
	inputs []gradeComponentRequest,
) (float64, []GradeComponent, string) {
	if len(inputs) > 0 {
		if len(inputs) > 30 {
			return 0,
				nil,
				"Komponen nilai maksimal 30"
		}

		totalWeight := 0.0
		score := 0.0

		components := make(
			[]GradeComponent,
			0,
			len(inputs),
		)

		for _, input := range inputs {
			name := strings.TrimSpace(input.Name)

			if name == "" ||
				len(name) > 100 ||
				input.Score < 0 ||
				input.Score > 100 ||
				input.Weight <= 0 ||
				input.Weight > 100 {
				return 0,
					nil,
					"Komponen nilai tidak valid"
			}

			totalWeight += input.Weight

			score += input.Score *
				(input.Weight / 100)

			components = append(
				components,
				GradeComponent{
					Name:   name,
					Score:  input.Score,
					Weight: input.Weight,
				},
			)
		}

		if math.Abs(totalWeight-100) > 0.01 {
			return 0,
				nil,
				"Total bobot komponen nilai harus tepat 100"
		}

		return math.Round(score*100) / 100,
			components,
			""
	}

	if finalScore == nil {
		return 0,
			nil,
			"Nilai akhir atau komponen nilai harus diberikan"
	}

	if *finalScore < 0 ||
		*finalScore > 100 {
		return 0,
			nil,
			"Nilai akhir harus antara 0 dan 100"
	}

	return *finalScore,
		nil,
		""
}

func (a *App) resolveGradeScale(
	score float64,
) GradeScaleItem {
	for _, item := range a.Config.GradeScale {
		if score >= item.Minimum {
			return item
		}
	}

	return a.Config.GradeScale[len(a.Config.GradeScale)-1]
}

func (a *App) gpa(c *gin.Context) {
	user := authUser(c)

	data, err := a.gpaData(
		user.UserID,
		c.Query("semesterId"),
	)

	if err != nil {
		if err == gorm.ErrRecordNotFound {
			a.abort(
				c,
				http.StatusNotFound,
				"Semester tidak ditemukan",
			)
			return
		}

		a.fail(c, err)
		return
	}

	c.JSON(
		http.StatusOK,
		data,
	)
}

func (a *App) gpaData(
	userID string,
	requestedSemesterID string,
) (gin.H, error) {
	var semester Semester

	query := a.DB.
		Where(
			"\"userId\" = ?",
			userID,
		)

	if requestedSemesterID != "" {
		if !validUUID(requestedSemesterID) {
			return nil,
				gorm.ErrRecordNotFound
		}

		query = query.Where(
			"id = ?",
			requestedSemesterID,
		)
	} else {
		query = query.
			Where(
				"\"isActive\" = true",
			).
			Order(
				"\"startDate\" DESC",
			)
	}

	err := query.First(&semester).Error

	if err == gorm.ErrRecordNotFound &&
		requestedSemesterID == "" {
		return gin.H{
			"semesterId":         nil,
			"semesterName":       nil,
			"totalCredits":       0,
			"totalQualityPoints": 0,
			"gpa":                0,
			"grades":             []Grade{},
		}, nil
	}

	if err != nil {
		return nil, err
	}

	var grades []Grade

	if err := a.DB.
		Model(&Grade{}).
		Joins(
			`JOIN "Course" ON "Course".id = "Grade"."courseId"`,
		).
		Where(
			`"Grade"."userId" = ? AND "Course"."semesterId" = ? AND "Grade".weight IS NOT NULL`,
			userID,
			semester.ID,
		).
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
		return nil, err
	}

	totalCredits := 0

	totalQualityPoints := 0.0

	for _, grade := range grades {
		if grade.Weight == nil ||
			grade.Course == nil {
			continue
		}

		totalCredits += grade.Course.Credits

		totalQualityPoints +=
			float64(grade.Course.Credits) *
				*grade.Weight
	}

	gpa := 0.0

	if totalCredits > 0 {
		gpa = math.Round(
			totalQualityPoints/
				float64(totalCredits)*
				100,
		) / 100
	}

	totalQualityPoints = math.Round(
		totalQualityPoints*100,
	) / 100

	return gin.H{
		"semesterId":         semester.ID,
		"semesterName":       semester.Name,
		"totalCredits":       totalCredits,
		"totalQualityPoints": totalQualityPoints,
		"gpa":                gpa,
		"grades":             grades,
	}, nil
}
