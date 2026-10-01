package main

import (
	"errors"
	"math"
	"net/http"
	"time"

	"github.com/gin-gonic/gin"
	"gorm.io/gorm"
)

func (a *App) dashboard(c *gin.Context) {
	user := authUser(c)

	if err := a.updateOverdue(user.UserID); err != nil {
		a.fail(c, err)
		return
	}

	location := a.userLocation(user.UserID)

	dayOfWeek := int(
		time.Now().
			In(location).
			Weekday(),
	)

	if dayOfWeek == 0 {
		dayOfWeek = 7
	}

	semester, hasSemester, err :=
		a.activeSemester(user.UserID)

	if err != nil {
		a.fail(c, err)
		return
	}

	todaySchedules, err :=
		a.dashboardSchedules(
			user.UserID,
			dayOfWeek,
			semester,
			hasSemester,
		)

	if err != nil {
		a.fail(c, err)
		return
	}

	now := time.Now()

	upcomingLimit := now.Add(
		time.Duration(
			a.Config.DashboardUpcomingDays,
		) * 24 * time.Hour,
	)

	upcomingAssignments, err :=
		a.dashboardAssignments(
			user.UserID,
			semester,
			hasSemester,
			now,
			upcomingLimit,
			false,
		)

	if err != nil {
		a.fail(c, err)
		return
	}

	overdueAssignments, err :=
		a.dashboardAssignments(
			user.UserID,
			semester,
			hasSemester,
			now,
			upcomingLimit,
			true,
		)

	if err != nil {
		a.fail(c, err)
		return
	}

	upcomingExams, err :=
		a.dashboardExams(
			user.UserID,
			semester,
			hasSemester,
			now,
			upcomingLimit,
		)

	if err != nil {
		a.fail(c, err)
		return
	}

	var notifications []Notification

	if err := a.DB.
		Where(
			"\"userId\" = ? AND \"readAt\" IS NULL",
			user.UserID,
		).
		Order(
			"\"createdAt\" DESC",
		).
		Limit(8).
		Find(&notifications).
		Error; err != nil {
		a.fail(c, err)
		return
	}

	attendance, err :=
		a.dashboardAttendance(
			user.UserID,
			semester,
			hasSemester,
		)

	if err != nil {
		a.fail(c, err)
		return
	}

	semesterID := ""

	if hasSemester {
		semesterID = semester.ID
	}

	gpa, err := a.gpaData(
		user.UserID,
		semesterID,
	)

	if err != nil {
		a.fail(c, err)
		return
	}

	productivity, err :=
		a.dashboardProductivity(
			user.UserID,
			semester,
			hasSemester,
		)

	if err != nil {
		a.fail(c, err)
		return
	}

	var activeSemester any

	if hasSemester {
		var courseCount int64

		if err := a.DB.
			Model(&Course{}).
			Where(
				"\"userId\" = ? AND \"semesterId\" = ?",
				user.UserID,
				semester.ID,
			).
			Count(&courseCount).
			Error; err != nil {
			a.fail(c, err)
			return
		}

		semester.Count = &SemesterCount{
			Courses: courseCount,
		}

		activeSemester = semester
	}

	c.JSON(
		http.StatusOK,
		gin.H{
			"activeSemester":      activeSemester,
			"todaySchedules":      todaySchedules,
			"upcomingAssignments": upcomingAssignments,
			"overdueAssignments":  overdueAssignments,
			"upcomingExams":       upcomingExams,
			"attendance":          attendance,
			"gpa":                 gpa,
			"notifications":       notifications,
			"productivity":        productivity,
		},
	)
}

func (a *App) userLocation(
	userID string,
) *time.Location {
	var profile Profile

	_ = a.DB.
		Where(
			"\"userId\" = ?",
			userID,
		).
		First(&profile).
		Error

	location, err := time.LoadLocation(
		profile.Timezone,
	)

	if err == nil {
		return location
	}

	location, err = time.LoadLocation(
		"Asia/Jakarta",
	)

	if err == nil {
		return location
	}

	return time.FixedZone(
		"Asia/Jakarta",
		7*60*60,
	)
}

func (a *App) activeSemester(
	userID string,
) (Semester, bool, error) {
	var semester Semester

	err := a.DB.
		Where(
			"\"userId\" = ? AND \"isActive\" = true",
			userID,
		).
		Order(
			"\"startDate\" DESC",
		).
		First(&semester).
		Error

	if err == nil {
		return semester, true, nil
	}

	if errors.Is(
		err,
		gorm.ErrRecordNotFound,
	) {
		return Semester{}, false, nil
	}

	return Semester{}, false, err
}

func (a *App) dashboardSchedules(
	userID string,
	dayOfWeek int,
	semester Semester,
	hasSemester bool,
) ([]Schedule, error) {
	query := a.DB.
		Model(&Schedule{}).
		Where(
			`"Schedule"."userId" = ? AND "Schedule"."dayOfWeek" = ?`,
			userID,
			dayOfWeek,
		)

	if hasSemester {
		query = query.
			Joins(
				`JOIN "Course" ON "Course".id = "Schedule"."courseId"`,
			).
			Where(
				`"Course"."semesterId" = ?`,
				semester.ID,
			)
	}

	var schedules []Schedule

	err := query.
		Preload("Course").
		Order(
			`"Schedule"."startTime" ASC`,
		).
		Find(&schedules).
		Error

	return schedules, err
}

func (a *App) dashboardAssignments(
	userID string,
	semester Semester,
	hasSemester bool,
	now time.Time,
	upcomingLimit time.Time,
	overdue bool,
) ([]Assignment, error) {
	query := a.DB.
		Model(&Assignment{}).
		Where(
			`"Assignment"."userId" = ?`,
			userID,
		)

	if hasSemester {
		query = query.
			Joins(
				`JOIN "Course" ON "Course".id = "Assignment"."courseId"`,
			).
			Where(
				`"Course"."semesterId" = ?`,
				semester.ID,
			)
	}

	if overdue {
		query = query.Where(
			`"Assignment".status = ?`,
			"OVERDUE",
		)
	} else {
		query = query.Where(
			`"Assignment".deadline >= ? AND "Assignment".deadline <= ? AND "Assignment".status IN ?`,
			now,
			upcomingLimit,
			[]string{
				"TODO",
				"IN_PROGRESS",
			},
		)
	}

	var assignments []Assignment

	err := query.
		Preload("Course").
		Order(
			`"Assignment".deadline ASC`,
		).
		Limit(8).
		Find(&assignments).
		Error

	return assignments, err
}

func (a *App) dashboardExams(
	userID string,
	semester Semester,
	hasSemester bool,
	now time.Time,
	upcomingLimit time.Time,
) ([]Exam, error) {
	query := a.DB.
		Model(&Exam{}).
		Where(
			`"Exam"."userId" = ? AND "Exam"."examDate" >= ? AND "Exam"."examDate" <= ?`,
			userID,
			now,
			upcomingLimit,
		)

	if hasSemester {
		query = query.
			Joins(
				`JOIN "Course" ON "Course".id = "Exam"."courseId"`,
			).
			Where(
				`"Course"."semesterId" = ?`,
				semester.ID,
			)
	}

	var exams []Exam

	err := query.
		Preload("Course").
		Order(
			`"Exam"."examDate" ASC, "Exam"."startTime" ASC`,
		).
		Limit(8).
		Find(&exams).
		Error

	return exams, err
}

func (a *App) dashboardAttendance(
	userID string,
	semester Semester,
	hasSemester bool,
) (gin.H, error) {
	query := a.DB.
		Model(&Attendance{}).
		Where(
			`"Attendance"."userId" = ?`,
			userID,
		)

	if hasSemester {
		query = query.Where(
			`"Attendance"."meetingDate" >= ? AND "Attendance"."meetingDate" <= ?`,
			semester.StartDate,
			semester.EndDate,
		)
	}

	return attendanceSummaryFromQuery(query)
}

func (a *App) dashboardProductivity(
	userID string,
	semester Semester,
	hasSemester bool,
) (gin.H, error) {
	totalQuery := a.DB.
		Model(&Assignment{}).
		Where(
			`"Assignment"."userId" = ?`,
			userID,
		)

	completedQuery := a.DB.
		Model(&Assignment{}).
		Where(
			`"Assignment"."userId" = ? AND "Assignment".status IN ?`,
			userID,
			[]string{
				"SUBMITTED",
				"COMPLETED",
			},
		)

	if hasSemester {
		totalQuery = totalQuery.
			Joins(
				`JOIN "Course" ON "Course".id = "Assignment"."courseId"`,
			).
			Where(
				`"Course"."semesterId" = ?`,
				semester.ID,
			)

		completedQuery = completedQuery.
			Joins(
				`JOIN "Course" ON "Course".id = "Assignment"."courseId"`,
			).
			Where(
				`"Course"."semesterId" = ?`,
				semester.ID,
			)
	}

	var totalAssignments int64
	var completedAssignments int64

	if err := totalQuery.
		Count(&totalAssignments).
		Error; err != nil {
		return nil, err
	}

	if err := completedQuery.
		Count(&completedAssignments).
		Error; err != nil {
		return nil, err
	}

	completionPercentage := 0.0

	if totalAssignments > 0 {
		completionPercentage = math.Round(
			float64(completedAssignments)/
				float64(totalAssignments)*
				10000,
		) / 100
	}

	return gin.H{
		"totalAssignments":     totalAssignments,
		"completedAssignments": completedAssignments,
		"completionPercentage": completionPercentage,
	}, nil
}
