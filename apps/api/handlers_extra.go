package main

import (
	"math"
	"net/http"
	"strconv"
	"strings"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"gorm.io/gorm"
)

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
		var count int64

		a.DB.
			Model(&Semester{}).
			Where(
				"id = ? AND \"userId\" = ?",
				semesterID,
				user.UserID,
			).
			Count(&count)

		if count == 0 {
			a.abort(
				c,
				http.StatusNotFound,
				"Semester tidak ditemukan",
			)
			return
		}
	}

	query := a.DB.
		Where(
			"\"Grade\".\"userId\" = ?",
			user.UserID,
		)

	if semesterID != "" {
		query = query.
			Joins(
				"JOIN \"Course\" ON \"Course\".id = \"Grade\".\"courseId\"",
			).
			Where(
				"\"Course\".\"semesterId\" = ?",
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
			"\"Grade\".id = ? AND \"Grade\".\"userId\" = ?",
			c.Param("id"),
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

	var req gradeRequest

	if err := c.ShouldBindJSON(&req); err != nil {
		a.abort(
			c,
			http.StatusBadRequest,
			"Payload tidak valid",
		)
		return
	}

	if !validUUID(req.CourseID) ||
		!a.ownsCourse(
			user.UserID,
			req.CourseID,
		) {
		a.abort(
			c,
			http.StatusNotFound,
			"Mata kuliah tidak ditemukan",
		)
		return
	}

	var count int64

	a.DB.
		Model(&Grade{}).
		Where(
			"\"userId\" = ? AND \"courseId\" = ?",
			user.UserID,
			req.CourseID,
		).
		Count(&count)

	if count > 0 {
		a.abort(
			c,
			http.StatusConflict,
			"Nilai untuk mata kuliah tersebut sudah tersedia",
		)
		return
	}

	score, components, message := a.resolveGrade(
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

	err := a.DB.Transaction(
		func(tx *gorm.DB) error {
			if err := tx.Create(&grade).Error; err != nil {
				return err
			}

			for _, component := range components {
				component.ID = uuid.NewString()
				component.GradeID = grade.ID

				if err := tx.Create(
					&component,
				).Error; err != nil {
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

	a.DB.
		Preload("Course.Semester").
		Preload("Components").
		First(
			&grade,
			"id = ?",
			grade.ID,
		)

	c.JSON(
		http.StatusCreated,
		grade,
	)
}

func (a *App) updateGrade(c *gin.Context) {
	user := authUser(c)

	var grade Grade

	if err := a.DB.
		Preload("Components").
		Where(
			"id = ? AND \"userId\" = ?",
			c.Param("id"),
			user.UserID,
		).
		First(&grade).
		Error; err != nil {
		a.fail(c, err)
		return
	}

	var req gradeRequest

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

	if req.Components != nil {
		var message string

		score, components, message = a.resolveGrade(
			nil,
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
	} else if req.FinalScore != nil {
		if *req.FinalScore < 0 ||
			*req.FinalScore > 100 {
			a.abort(
				c,
				http.StatusBadRequest,
				"Nilai akhir harus antara 0 dan 100",
			)
			return
		}

		score = *req.FinalScore
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

			if req.Components != nil {
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
					component.ID =
						uuid.NewString()
					component.GradeID =
						grade.ID

					if err := tx.Create(
						&component,
					).Error; err != nil {
						return err
					}
				}
			}

			return nil
		},
	)

	if err != nil {
		a.fail(c, err)
		return
	}

	a.DB.
		Preload("Course.Semester").
		Preload("Components").
		First(
			&grade,
			"id = ?",
			grade.ID,
		)

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

func (a *App) resolveGrade(
	finalScore *float64,
	inputs []gradeComponentRequest,
) (
	float64,
	[]GradeComponent,
	string,
) {
	if len(inputs) > 0 {
		totalWeight := 0.0
		score := 0.0

		components := make(
			[]GradeComponent,
			0,
			len(inputs),
		)

		for _, input := range inputs {
			name := strings.TrimSpace(
				input.Name,
			)

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

		if math.Abs(
			totalWeight-100,
		) > 0.01 {
			return 0,
				nil,
				"Total bobot komponen nilai harus tepat 100"
		}

		return math.Round(
				score*100,
			) / 100,
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

	return a.Config.GradeScale[
		len(a.Config.GradeScale)-1
	]
}

func (a *App) gpa(c *gin.Context) {
	user := authUser(c)

	data, err := a.gpaData(
		user.UserID,
		c.Query("semesterId"),
	)

	if err != nil {
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

	if err == gorm.ErrRecordNotFound {
		if requestedSemesterID != "" {
			return nil, err
		}

		return gin.H{
			"semesterId":        nil,
			"semesterName":      nil,
			"totalCredits":      0,
			"totalQualityPoints": 0,
			"gpa":               0,
			"grades":            []Grade{},
		}, nil
	}

	if err != nil {
		return nil, err
	}

	var grades []Grade

	if err := a.DB.
		Joins(
			"JOIN \"Course\" ON \"Course\".id = \"Grade\".\"courseId\"",
		).
		Where(
			"\"Grade\".\"userId\" = ? AND \"Course\".\"semesterId\" = ? AND \"Grade\".weight IS NOT NULL",
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
		Find(&grades).
		Error; err != nil {
		return nil, err
	}

	totalCredits := 0
	totalQualityPoints := 0.0

	for _, grade := range grades {
		if grade.Weight == nil {
			continue
		}

		totalCredits += grade.Course.Credits

		totalQualityPoints +=
			float64(
				grade.Course.Credits,
			) * *grade.Weight
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

func (a *App) listNotifications(c *gin.Context) {
	user := authUser(c)

	limit := 30

	if value, err := strconv.Atoi(
		c.Query("limit"),
	); err == nil && value > 0 {
		if value > 100 {
			value = 100
		}

		limit = value
	}

	query := a.DB.
		Where(
			"\"userId\" = ?",
			user.UserID,
		)

	if c.Query("unreadOnly") == "true" {
		query = query.Where(
			"\"readAt\" IS NULL",
		)
	}

	var notifications []Notification

	if err := query.
		Order(
			"\"createdAt\" DESC",
		).
		Limit(limit).
		Find(&notifications).
		Error; err != nil {
		a.fail(c, err)
		return
	}

	c.JSON(
		http.StatusOK,
		notifications,
	)
}

func (a *App) unreadNotificationCount(
	c *gin.Context,
) {
	user := authUser(c)

	var count int64

	if err := a.DB.
		Model(&Notification{}).
		Where(
			"\"userId\" = ? AND \"readAt\" IS NULL",
			user.UserID,
		).
		Count(&count).
		Error; err != nil {
		a.fail(c, err)
		return
	}

	c.JSON(
		http.StatusOK,
		gin.H{
			"count": count,
		},
	)
}

func (a *App) readNotification(c *gin.Context) {
	user := authUser(c)

	var notification Notification

	if err := a.DB.
		Where(
			"id = ? AND \"userId\" = ?",
			c.Param("id"),
			user.UserID,
		).
		First(&notification).
		Error; err != nil {
		a.fail(c, err)
		return
	}

	if notification.ReadAt == nil {
		now := time.Now()
		notification.ReadAt = &now

		if err := a.DB.Save(
			&notification,
		).Error; err != nil {
			a.fail(c, err)
			return
		}
	}

	c.JSON(
		http.StatusOK,
		notification,
	)
}

func (a *App) readAllNotifications(
	c *gin.Context,
) {
	user := authUser(c)

	now := time.Now()

	result := a.DB.
		Model(&Notification{}).
		Where(
			"\"userId\" = ? AND \"readAt\" IS NULL",
			user.UserID,
		).
		Update(
			"readAt",
			now,
		)

	if result.Error != nil {
		a.fail(c, result.Error)
		return
	}

	c.JSON(
		http.StatusOK,
		gin.H{
			"message": "Semua notifikasi berhasil ditandai sebagai dibaca",
			"updated": result.RowsAffected,
		},
	)
}

func (a *App) deleteNotification(
	c *gin.Context,
) {
	a.deleteOwned(
		c,
		&Notification{},
		"Notifikasi",
		"Notifikasi berhasil dihapus",
	)
}

func (a *App) dashboard(c *gin.Context) {
	user := authUser(c)

	a.updateOverdue(user.UserID)

	var profile Profile

	_ = a.DB.
		Where(
			"\"userId\" = ?",
			user.UserID,
		).
		First(&profile).
		Error

	location, err := time.LoadLocation(
		profile.Timezone,
	)

	if err != nil {
		location, _ = time.LoadLocation(
			"Asia/Jakarta",
		)
	}

	dayOfWeek := int(
		time.Now().
			In(location).
			Weekday(),
	)

	if dayOfWeek == 0 {
		dayOfWeek = 7
	}

	var semester Semester

	semesterError := a.DB.
		Where(
			"\"userId\" = ? AND \"isActive\" = true",
			user.UserID,
		).
		Order(
			"\"startDate\" DESC",
		).
		First(&semester).
		Error

	hasSemester := semesterError == nil

	var schedules []Schedule

	scheduleQuery := a.DB.
		Where(
			"\"Schedule\".\"userId\" = ? AND \"dayOfWeek\" = ?",
			user.UserID,
			dayOfWeek,
		)

	if hasSemester {
		scheduleQuery = scheduleQuery.
			Joins(
				"JOIN \"Course\" ON \"Course\".id = \"Schedule\".\"courseId\"",
			).
			Where(
				"\"Course\".\"semesterId\" = ?",
				semester.ID,
			)
	}

	scheduleQuery.
		Preload("Course").
		Order(
			"\"startTime\" ASC",
		).
		Find(&schedules)

	now := time.Now()

	upcomingLimit := now.Add(
		time.Duration(
			a.Config.DashboardUpcomingDays,
		) * 24 * time.Hour,
	)

	var upcomingAssignments []Assignment
	var overdueAssignments []Assignment

	assignmentQuery := a.DB.
		Where(
			"\"Assignment\".\"userId\" = ?",
			user.UserID,
		)

	if hasSemester {
		assignmentQuery = assignmentQuery.
			Joins(
				"JOIN \"Course\" ON \"Course\".id = \"Assignment\".\"courseId\"",
			).
			Where(
				"\"Course\".\"semesterId\" = ?",
				semester.ID,
			)
	}

	assignmentQuery.
		Where(
			"\"deadline\" BETWEEN ? AND ? AND \"status\" IN ?",
			now,
			upcomingLimit,
			[]string{
				"TODO",
				"IN_PROGRESS",
			},
		).
		Preload("Course").
		Order(
			"\"deadline\" ASC",
		).
		Limit(8).
		Find(&upcomingAssignments)

	assignmentQuery.
		Where(
			"\"status\" = ?",
			"OVERDUE",
		).
		Preload("Course").
		Order(
			"\"deadline\" ASC",
		).
		Limit(8).
		Find(&overdueAssignments)

	var exams []Exam

	examQuery := a.DB.
		Where(
			"\"Exam\".\"userId\" = ? AND \"examDate\" BETWEEN ? AND ?",
			user.UserID,
			now,
			upcomingLimit,
		)

	if hasSemester {
		examQuery = examQuery.
			Joins(
				"JOIN \"Course\" ON \"Course\".id = \"Exam\".\"courseId\"",
			).
			Where(
				"\"Course\".\"semesterId\" = ?",
				semester.ID,
			)
	}

	examQuery.
		Preload("Course").
		Order(
			"\"examDate\" ASC, \"startTime\" ASC",
		).
		Limit(8).
		Find(&exams)

	var notifications []Notification

	a.DB.
		Where(
			"\"userId\" = ? AND \"readAt\" IS NULL",
			user.UserID,
		).
		Order(
			"\"createdAt\" DESC",
		).
		Limit(8).
		Find(&notifications)

	attendance := a.attendanceSummaryData(
		user.UserID,
		hasSemester,
		&semester,
	)

	semesterID := ""

	if hasSemester {
		semesterID = semester.ID
	}

	gpa, _ := a.gpaData(
		user.UserID,
		semesterID,
	)

	totalQuery := a.DB.
		Model(&Assignment{}).
		Where(
			"\"Assignment\".\"userId\" = ?",
			user.UserID,
		)

	completedQuery := a.DB.
		Model(&Assignment{}).
		Where(
			"\"Assignment\".\"userId\" = ? AND \"Assignment\".\"status\" IN ?",
			user.UserID,
			[]string{
				"SUBMITTED",
				"COMPLETED",
			},
		)

	if hasSemester {
		totalQuery = totalQuery.
			Joins(
				"JOIN \"Course\" ON \"Course\".id = \"Assignment\".\"courseId\"",
			).
			Where(
				"\"Course\".\"semesterId\" = ?",
				semester.ID,
			)

		completedQuery = completedQuery.
			Joins(
				"JOIN \"Course\" ON \"Course\".id = \"Assignment\".\"courseId\"",
			).
			Where(
				"\"Course\".\"semesterId\" = ?",
				semester.ID,
			)
	}

	var totalAssignments int64
	var completedAssignments int64

	totalQuery.Count(&totalAssignments)
	completedQuery.Count(&completedAssignments)

	completionPercentage := 0.0

	if totalAssignments > 0 {
		completionPercentage = math.Round(
			float64(completedAssignments)/
				float64(totalAssignments)*
				10000,
		) / 100
	}

	var activeSemester any

	if hasSemester {
		var courseCount int64

		a.DB.
			Model(&Course{}).
			Where(
				"\"userId\" = ? AND \"semesterId\" = ?",
				user.UserID,
				semester.ID,
			).
			Count(&courseCount)

		semester.Count = &SemesterCount{
			Courses: courseCount,
		}

		activeSemester = semester
	}

	c.JSON(
		http.StatusOK,
		gin.H{
			"activeSemester":      activeSemester,
			"todaySchedules":      schedules,
			"upcomingAssignments": upcomingAssignments,
			"overdueAssignments":  overdueAssignments,
			"upcomingExams":       exams,
			"attendance":          attendance,
			"gpa":                 gpa,
			"notifications":       notifications,
			"productivity": gin.H{
				"totalAssignments":     totalAssignments,
				"completedAssignments": completedAssignments,
				"completionPercentage": completionPercentage,
			},
		},
	)
}

func (a *App) attendanceSummaryData(
	userID string,
	hasSemester bool,
	semester *Semester,
) gin.H {
	query := a.DB.
		Model(&Attendance{}).
		Where(
			"\"Attendance\".\"userId\" = ?",
			userID,
		)

	if hasSemester {
		query = query.
			Joins(
				"JOIN \"Course\" ON \"Course\".id = \"Attendance\".\"courseId\"",
			).
			Where(
				"\"Course\".\"semesterId\" = ?",
				semester.ID,
			)
	}

	type row struct {
		Status string
		Count  int64
	}

	var rows []row

	query.
		Select(
			"status, count(*) AS count",
		).
		Group("status").
		Scan(&rows)

	values := map[string]int64{}

	for _, row := range rows {
		values[row.Status] = row.Count
	}

	countedMeetings :=
		values["PRESENT"] +
			values["PERMITTED"] +
			values["SICK"] +
			values["ABSENT"] +
			values["REPLACEMENT"]

	attendedMeetings :=
		values["PRESENT"] +
			values["REPLACEMENT"]

	percentage := 0.0

	if countedMeetings > 0 {
		percentage = math.Round(
			float64(attendedMeetings)/
				float64(countedMeetings)*
				10000,
		) / 100
	}

	return gin.H{
		"total": countedMeetings +
			values["CANCELLED"],
		"present":     values["PRESENT"],
		"permitted":   values["PERMITTED"],
		"sick":        values["SICK"],
		"absent":      values["ABSENT"],
		"cancelled":   values["CANCELLED"],
		"replacement": values["REPLACEMENT"],
		"percentage":  percentage,
	}
}