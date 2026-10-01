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

type semesterRequest struct {
	Name         string `json:"name"`
	AcademicYear string `json:"academicYear"`
	Type         string `json:"type"`
	StartDate    string `json:"startDate"`
	EndDate      string `json:"endDate"`
	IsActive     *bool  `json:"isActive"`
}

type courseRequest struct {
	SemesterID string  `json:"semesterId"`
	Code       string  `json:"code"`
	Name       string  `json:"name"`
	Credits    int     `json:"credits"`
	Lecturer   *string `json:"lecturer"`
	Room       *string `json:"room"`
	Color      string  `json:"color"`
	Notes      *string `json:"notes"`
}

type scheduleRequest struct {
	CourseID        string  `json:"courseId"`
	DayOfWeek       int     `json:"dayOfWeek"`
	StartTime       string  `json:"startTime"`
	EndTime         string  `json:"endTime"`
	Room            *string `json:"room"`
	LectureType     string  `json:"lectureType"`
	OnlineURL       *string `json:"onlineUrl"`
	ReminderMinutes *int    `json:"reminderMinutes"`
}

type assignmentRequest struct {
	CourseID      string  `json:"courseId"`
	Title         string  `json:"title"`
	Description   *string `json:"description"`
	Deadline      string  `json:"deadline"`
	Priority      string  `json:"priority"`
	Status        string  `json:"status"`
	AttachmentURL *string `json:"attachmentUrl"`
	ReminderAt    *string `json:"reminderAt"`
}

type examRequest struct {
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

type attendanceRequest struct {
	CourseID    string  `json:"courseId"`
	MeetingDate string  `json:"meetingDate"`
	Status      string  `json:"status"`
	Notes       *string `json:"notes"`
}

type gradeComponentRequest struct {
	Name   string  `json:"name"`
	Score  float64 `json:"score"`
	Weight float64 `json:"weight"`
}

type gradeRequest struct {
	CourseID   string                  `json:"courseId"`
	FinalScore *float64                `json:"finalScore"`
	Components []gradeComponentRequest `json:"components"`
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
			c.Param("id"),
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

	var req semesterRequest

	if err := c.ShouldBindJSON(&req); err != nil {
		a.abort(
			c,
			http.StatusBadRequest,
			"Payload tidak valid",
		)
		return
	}

	item, message := a.parseSemesterRequest(req)
	if message != "" {
		a.abort(
			c,
			http.StatusBadRequest,
			message,
		)
		return
	}

	item.ID = uuid.NewString()
	item.UserID = user.UserID

	var duplicate int64

	if err := a.DB.
		Model(&Semester{}).
		Where(
			"\"userId\" = ? AND name = ? AND \"academicYear\" = ?",
			user.UserID,
			item.Name,
			item.AcademicYear,
		).
		Count(&duplicate).
		Error; err != nil {
		a.fail(c, err)
		return
	}

	if duplicate > 0 {
		a.abort(
			c,
			http.StatusConflict,
			"Semester dengan nama dan tahun akademik tersebut sudah tersedia",
		)
		return
	}

	err := a.DB.Transaction(
		func(tx *gorm.DB) error {
			if item.IsActive {
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

			return tx.Create(&item).Error
		},
	)

	if err != nil {
		a.fail(c, err)
		return
	}

	c.JSON(
		http.StatusCreated,
		item,
	)
}

func (a *App) updateSemester(c *gin.Context) {
	user := authUser(c)

	var existing Semester

	if err := a.DB.
		Where(
			"id = ? AND \"userId\" = ?",
			c.Param("id"),
			user.UserID,
		).
		First(&existing).
		Error; err != nil {
		a.fail(c, err)
		return
	}

	var req semesterRequest

	if err := c.ShouldBindJSON(&req); err != nil {
		a.abort(
			c,
			http.StatusBadRequest,
			"Payload tidak valid",
		)
		return
	}

	item, message := a.parseSemesterRequest(req)
	if message != "" {
		a.abort(
			c,
			http.StatusBadRequest,
			message,
		)
		return
	}

	var duplicate int64

	if err := a.DB.
		Model(&Semester{}).
		Where(
			"\"userId\" = ? AND name = ? AND \"academicYear\" = ? AND id <> ?",
			user.UserID,
			item.Name,
			item.AcademicYear,
			existing.ID,
		).
		Count(&duplicate).
		Error; err != nil {
		a.fail(c, err)
		return
	}

	if duplicate > 0 {
		a.abort(
			c,
			http.StatusConflict,
			"Semester dengan nama dan tahun akademik tersebut sudah tersedia",
		)
		return
	}

	err := a.DB.Transaction(
		func(tx *gorm.DB) error {
			if item.IsActive {
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
						"name":         item.Name,
						"academicYear": item.AcademicYear,
						"type":         item.Type,
						"startDate":    item.StartDate,
						"endDate":      item.EndDate,
						"isActive":     item.IsActive,
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

func (a *App) parseSemesterRequest(
	req semesterRequest,
) (Semester, string) {
	name := strings.TrimSpace(req.Name)

	if len(name) < 2 || len(name) > 50 {
		return Semester{},
			"Nama semester harus memiliki 2 sampai 50 karakter"
	}

	if !academicYearPattern.MatchString(
		req.AcademicYear,
	) {
		return Semester{},
			"Tahun akademik harus menggunakan format 2026/2027"
	}

	if !contains(
		[]string{
			"ODD",
			"EVEN",
		},
		req.Type,
	) {
		return Semester{},
			"Jenis semester tidak valid"
	}

	startDate, err := parseISOTime(req.StartDate)
	if err != nil {
		return Semester{},
			"Tanggal mulai tidak valid"
	}

	endDate, err := parseISOTime(req.EndDate)
	if err != nil ||
		!startDate.Before(endDate) {
		return Semester{},
			"Tanggal selesai semester harus setelah tanggal mulai"
	}

	active := false

	if req.IsActive != nil {
		active = *req.IsActive
	}

	return Semester{
		Name:         name,
		AcademicYear: req.AcademicYear,
		Type:         req.Type,
		StartDate:    startDate,
		EndDate:      endDate,
		IsActive:     active,
	}, ""
}

func (a *App) listCourses(c *gin.Context) {
	user := authUser(c)

	query := a.DB.
		Where(
			"\"Course\".\"userId\" = ?",
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
			"\"Course\".\"semesterId\" = ?",
			semesterID,
		)
	}

	var courses []Course

	if err := query.
		Preload("Semester").
		Order("\"Course\".name ASC").
		Find(&courses).
		Error; err != nil {
		a.fail(c, err)
		return
	}

	for index := range courses {
		count := &CourseCount{}

		a.DB.
			Model(&Schedule{}).
			Where(
				"\"courseId\" = ?",
				courses[index].ID,
			).
			Count(&count.Schedules)

		a.DB.
			Model(&Assignment{}).
			Where(
				"\"courseId\" = ?",
				courses[index].ID,
			).
			Count(&count.Assignments)

		a.DB.
			Model(&Exam{}).
			Where(
				"\"courseId\" = ?",
				courses[index].ID,
			).
			Count(&count.Exams)

		a.DB.
			Model(&Attendance{}).
			Where(
				"\"courseId\" = ?",
				courses[index].ID,
			).
			Count(&count.Attendances)

		courses[index].Count = count
	}

	c.JSON(
		http.StatusOK,
		courses,
	)
}

func (a *App) getCourse(c *gin.Context) {
	user := authUser(c)

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
				return db.Order(
					"deadline ASC",
				)
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
			"\"Course\".id = ? AND \"Course\".\"userId\" = ?",
			c.Param("id"),
			user.UserID,
		).
		First(&course).
		Error; err != nil {
		a.fail(c, err)
		return
	}

	count := &CourseCount{}

	a.DB.
		Model(&Attendance{}).
		Where(
			"\"courseId\" = ?",
			course.ID,
		).
		Count(&count.Attendances)

	a.DB.
		Model(&Grade{}).
		Where(
			"\"courseId\" = ?",
			course.ID,
		).
		Count(&count.Grades)

	course.Count = count

	c.JSON(
		http.StatusOK,
		course,
	)
}

func (a *App) createCourse(c *gin.Context) {
	user := authUser(c)

	var req courseRequest

	if err := c.ShouldBindJSON(&req); err != nil {
		a.abort(
			c,
			http.StatusBadRequest,
			"Payload tidak valid",
		)
		return
	}

	item, message := a.parseCourseRequest(
		user.UserID,
		req,
		"",
	)

	if message != "" {
		a.abort(
			c,
			http.StatusBadRequest,
			message,
		)
		return
	}

	item.ID = uuid.NewString()
	item.UserID = user.UserID

	if err := a.DB.Create(&item).Error; err != nil {
		a.fail(c, err)
		return
	}

	a.DB.
		Preload("Semester").
		Where(
			"id = ?",
			item.ID,
		).
		First(&item)

	c.JSON(
		http.StatusCreated,
		item,
	)
}

func (a *App) updateCourse(c *gin.Context) {
	user := authUser(c)

	var existing Course

	if err := a.DB.
		Where(
			"id = ? AND \"userId\" = ?",
			c.Param("id"),
			user.UserID,
		).
		First(&existing).
		Error; err != nil {
		a.fail(c, err)
		return
	}

	var req courseRequest

	if err := c.ShouldBindJSON(&req); err != nil {
		a.abort(
			c,
			http.StatusBadRequest,
			"Payload tidak valid",
		)
		return
	}

	item, message := a.parseCourseRequest(
		user.UserID,
		req,
		existing.ID,
	)

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
				"semesterId": item.SemesterID,
				"code":       item.Code,
				"name":       item.Name,
				"credits":    item.Credits,
				"lecturer":   item.Lecturer,
				"room":       item.Room,
				"color":      item.Color,
				"notes":      item.Notes,
			},
		).
		Error; err != nil {
		a.fail(c, err)
		return
	}

	a.DB.
		Preload("Semester").
		Where(
			"id = ?",
			existing.ID,
		).
		First(&existing)

	c.JSON(
		http.StatusOK,
		existing,
	)
}

func (a *App) parseCourseRequest(
	userID string,
	req courseRequest,
	ignoredID string,
) (Course, string) {
	if !validUUID(req.SemesterID) {
		return Course{},
			"Semester tidak valid"
	}

	var semesterCount int64

	a.DB.
		Model(&Semester{}).
		Where(
			"id = ? AND \"userId\" = ?",
			req.SemesterID,
			userID,
		).
		Count(&semesterCount)

	if semesterCount == 0 {
		return Course{},
			"Semester tidak ditemukan"
	}

	code := strings.ToUpper(
		strings.TrimSpace(req.Code),
	)

	if len(code) < 2 || len(code) > 20 {
		return Course{},
			"Kode mata kuliah harus memiliki 2 sampai 20 karakter"
	}

	name := strings.TrimSpace(req.Name)

	if len(name) < 2 || len(name) > 120 {
		return Course{},
			"Nama mata kuliah harus memiliki 2 sampai 120 karakter"
	}

	if req.Credits < 1 || req.Credits > 12 {
		return Course{},
			"SKS harus antara 1 sampai 12"
	}

	if !colorPattern.MatchString(req.Color) {
		return Course{},
			"Format warna tidak valid"
	}

	var duplicate int64

	query := a.DB.
		Model(&Course{}).
		Where(
			"\"userId\" = ? AND \"semesterId\" = ? AND code = ?",
			userID,
			req.SemesterID,
			code,
		)

	if ignoredID != "" {
		query = query.Where(
			"id <> ?",
			ignoredID,
		)
	}

	query.Count(&duplicate)

	if duplicate > 0 {
		return Course{},
			"Kode mata kuliah sudah digunakan pada semester tersebut"
	}

	return Course{
		SemesterID: req.SemesterID,
		Code:       code,
		Name:       name,
		Credits:    req.Credits,
		Lecturer:   trimNullable(req.Lecturer),
		Room:       trimNullable(req.Room),
		Color: strings.ToUpper(
			req.Color,
		),
		Notes: trimNullable(req.Notes),
	}, ""
}

func (a *App) deleteCourse(c *gin.Context) {
	a.deleteOwned(
		c,
		&Course{},
		"Mata kuliah",
		"Mata kuliah berhasil dihapus",
	)
}

func (a *App) listSchedules(c *gin.Context) {
	user := authUser(c)

	query := a.DB.
		Where(
			"\"Schedule\".\"userId\" = ?",
			user.UserID,
		)

	if courseID := c.Query("courseId"); courseID != "" {
		query = query.Where(
			"\"Schedule\".\"courseId\" = ?",
			courseID,
		)
	}

	if day := c.Query("dayOfWeek"); day != "" {
		value, err := strconv.Atoi(day)

		if err != nil ||
			value < 1 ||
			value > 7 {
			a.abort(
				c,
				http.StatusBadRequest,
				"Hari tidak valid",
			)
			return
		}

		query = query.Where(
			"\"Schedule\".\"dayOfWeek\" = ?",
			value,
		)
	}

	var schedules []Schedule

	if err := query.
		Preload("Course.Semester").
		Order(
			"\"Schedule\".\"dayOfWeek\" ASC, \"Schedule\".\"startTime\" ASC",
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

	var schedule Schedule

	if err := a.DB.
		Preload("Course.Semester").
		Where(
			"\"Schedule\".id = ? AND \"Schedule\".\"userId\" = ?",
			c.Param("id"),
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

	var req scheduleRequest

	if err := c.ShouldBindJSON(&req); err != nil {
		a.abort(
			c,
			http.StatusBadRequest,
			"Payload tidak valid",
		)
		return
	}

	item, message := a.parseScheduleRequest(
		user.UserID,
		req,
	)

	if message != "" {
		a.abort(
			c,
			http.StatusBadRequest,
			message,
		)
		return
	}

	item.ID = uuid.NewString()
	item.UserID = user.UserID

	if err := a.DB.Create(&item).Error; err != nil {
		a.fail(c, err)
		return
	}

	a.DB.
		Preload("Course").
		Where(
			"id = ?",
			item.ID,
		).
		First(&item)

	c.JSON(
		http.StatusCreated,
		item,
	)
}

func (a *App) updateSchedule(c *gin.Context) {
	user := authUser(c)

	var existing Schedule

	if err := a.DB.
		Where(
			"id = ? AND \"userId\" = ?",
			c.Param("id"),
			user.UserID,
		).
		First(&existing).
		Error; err != nil {
		a.fail(c, err)
		return
	}

	var req scheduleRequest

	if err := c.ShouldBindJSON(&req); err != nil {
		a.abort(
			c,
			http.StatusBadRequest,
			"Payload tidak valid",
		)
		return
	}

	item, message := a.parseScheduleRequest(
		user.UserID,
		req,
	)

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
				"courseId":        item.CourseID,
				"dayOfWeek":       item.DayOfWeek,
				"startTime":       item.StartTime,
				"endTime":         item.EndTime,
				"room":            item.Room,
				"lectureType":     item.LectureType,
				"onlineUrl":       item.OnlineURL,
				"reminderMinutes": item.ReminderMinutes,
			},
		).
		Error; err != nil {
		a.fail(c, err)
		return
	}

	a.DB.
		Preload("Course").
		Where(
			"id = ?",
			existing.ID,
		).
		First(&existing)

	c.JSON(
		http.StatusOK,
		existing,
	)
}

func (a *App) parseScheduleRequest(
	userID string,
	req scheduleRequest,
) (Schedule, string) {
	if !validUUID(req.CourseID) ||
		!a.ownsCourse(
			userID,
			req.CourseID,
		) {
		return Schedule{},
			"Mata kuliah tidak ditemukan"
	}

	if req.DayOfWeek < 1 ||
		req.DayOfWeek > 7 {
		return Schedule{},
			"Hari harus antara 1 sampai 7"
	}

	if !timePattern.MatchString(
		req.StartTime,
	) ||
		!timePattern.MatchString(
			req.EndTime,
		) {
		return Schedule{},
			"Jam harus menggunakan format HH:mm"
	}

	if req.StartTime >= req.EndTime {
		return Schedule{},
			"Jam selesai harus setelah jam mulai"
	}

	if !contains(
		[]string{
			"OFFLINE",
			"ONLINE",
			"HYBRID",
		},
		req.LectureType,
	) {
		return Schedule{},
			"Jenis perkuliahan tidak valid"
	}

	if req.OnlineURL != nil &&
		strings.TrimSpace(*req.OnlineURL) != "" &&
		!validURL(
			strings.TrimSpace(*req.OnlineURL),
		) {
		return Schedule{},
			"URL kuliah online tidak valid"
	}

	if req.ReminderMinutes != nil &&
		(*req.ReminderMinutes < 0 ||
			*req.ReminderMinutes > 10080) {
		return Schedule{},
			"Pengingat harus antara 0 sampai 10080 menit"
	}

	return Schedule{
		CourseID:        req.CourseID,
		DayOfWeek:       req.DayOfWeek,
		StartTime:       req.StartTime,
		EndTime:         req.EndTime,
		Room:            trimNullable(req.Room),
		LectureType:     req.LectureType,
		OnlineURL:       trimNullable(req.OnlineURL),
		ReminderMinutes: req.ReminderMinutes,
	}, ""
}

func (a *App) deleteSchedule(c *gin.Context) {
	a.deleteOwned(
		c,
		&Schedule{},
		"Jadwal",
		"Jadwal berhasil dihapus",
	)
}

func (a *App) listAssignments(c *gin.Context) {
	user := authUser(c)

	a.updateOverdue(user.UserID)

	query := a.DB.
		Where(
			"\"Assignment\".\"userId\" = ?",
			user.UserID,
		)

	if value := c.Query("courseId"); value != "" {
		query = query.Where(
			"\"Assignment\".\"courseId\" = ?",
			value,
		)
	}

	if value := c.Query("status"); value != "" {
		query = query.Where(
			"\"Assignment\".status = ?",
			value,
		)
	}

	if value := c.Query("priority"); value != "" {
		query = query.Where(
			"\"Assignment\".priority = ?",
			value,
		)
	}

	var assignments []Assignment

	if err := query.
		Preload("Course.Semester").
		Order(
			"\"Assignment\".deadline ASC, \"Assignment\".priority DESC",
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

	a.updateOverdue(user.UserID)

	var assignment Assignment

	if err := a.DB.
		Preload("Course.Semester").
		Where(
			"\"Assignment\".id = ? AND \"Assignment\".\"userId\" = ?",
			c.Param("id"),
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

	var req assignmentRequest

	if err := c.ShouldBindJSON(&req); err != nil {
		a.abort(
			c,
			http.StatusBadRequest,
			"Payload tidak valid",
		)
		return
	}

	item, message := a.parseAssignmentRequest(
		user.UserID,
		req,
	)

	if message != "" {
		a.abort(
			c,
			http.StatusBadRequest,
			message,
		)
		return
	}

	item.ID = uuid.NewString()
	item.UserID = user.UserID

	err := a.DB.Transaction(
		func(tx *gorm.DB) error {
			if err := tx.Create(&item).Error; err != nil {
				return err
			}

			if item.ReminderAt != nil {
				var course Course

				if err := tx.
					Where(
						"id = ?",
						item.CourseID,
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
						item.Title,
					Message: course.Name +
						" memiliki deadline pada " +
						item.Deadline.UTC().Format(
							time.RFC3339Nano,
						),
					ScheduledFor: item.ReminderAt,
				}

				if err := tx.Create(
					&notification,
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
		Preload("Course").
		Where(
			"id = ?",
			item.ID,
		).
		First(&item)

	c.JSON(
		http.StatusCreated,
		item,
	)
}

func (a *App) updateAssignment(c *gin.Context) {
	user := authUser(c)

	var existing Assignment

	if err := a.DB.
		Where(
			"id = ? AND \"userId\" = ?",
			c.Param("id"),
			user.UserID,
		).
		First(&existing).
		Error; err != nil {
		a.fail(c, err)
		return
	}

	var req struct {
		CourseID      *string `json:"courseId"`
		Title         *string `json:"title"`
		Description   *string `json:"description"`
		Deadline      *string `json:"deadline"`
		Priority      *string `json:"priority"`
		Status        *string `json:"status"`
		AttachmentURL *string `json:"attachmentUrl"`
		ReminderAt    *string `json:"reminderAt"`
	}

	if err := c.ShouldBindJSON(&req); err != nil {
		a.abort(
			c,
			http.StatusBadRequest,
			"Payload tidak valid",
		)
		return
	}

	merged := assignmentRequest{
		CourseID:      existing.CourseID,
		Title:         existing.Title,
		Description:   existing.Description,
		Deadline:      existing.Deadline.UTC().Format(time.RFC3339Nano),
		Priority:      existing.Priority,
		Status:        existing.Status,
		AttachmentURL: existing.AttachmentURL,
	}

	if existing.ReminderAt != nil {
		value := existing.ReminderAt.UTC().Format(
			time.RFC3339Nano,
		)

		merged.ReminderAt = &value
	}

	if req.CourseID != nil {
		merged.CourseID = *req.CourseID
	}

	if req.Title != nil {
		merged.Title = *req.Title
	}

	if req.Description != nil {
		merged.Description = req.Description
	}

	if req.Deadline != nil {
		merged.Deadline = *req.Deadline
	}

	if req.Priority != nil {
		merged.Priority = *req.Priority
	}

	if req.Status != nil {
		merged.Status = *req.Status
	}

	if req.AttachmentURL != nil {
		merged.AttachmentURL = req.AttachmentURL
	}

	if req.ReminderAt != nil {
		merged.ReminderAt = req.ReminderAt
	}

	item, message := a.parseAssignmentRequest(
		user.UserID,
		merged,
	)

	if message != "" {
		a.abort(
			c,
			http.StatusBadRequest,
			message,
		)
		return
	}

	if item.Status == "SUBMITTED" ||
		item.Status == "COMPLETED" {
		if existing.SubmittedAt != nil {
			item.SubmittedAt = existing.SubmittedAt
		}
	} else {
		item.SubmittedAt = nil
	}

	if err := a.DB.
		Model(&existing).
		Updates(
			map[string]any{
				"courseId":      item.CourseID,
				"title":         item.Title,
				"description":   item.Description,
				"deadline":      item.Deadline,
				"priority":      item.Priority,
				"status":        item.Status,
				"attachmentUrl": item.AttachmentURL,
				"reminderAt":    item.ReminderAt,
				"submittedAt":   item.SubmittedAt,
			},
		).
		Error; err != nil {
		a.fail(c, err)
		return
	}

	a.DB.
		Preload("Course").
		Where(
			"id = ?",
			existing.ID,
		).
		First(&existing)

	c.JSON(
		http.StatusOK,
		existing,
	)
}

func (a *App) parseAssignmentRequest(
	userID string,
	req assignmentRequest,
) (Assignment, string) {
	if !validUUID(req.CourseID) ||
		!a.ownsCourse(
			userID,
			req.CourseID,
		) {
		return Assignment{},
			"Mata kuliah tidak ditemukan"
	}

	title := strings.TrimSpace(req.Title)

	if len(title) < 2 ||
		len(title) > 160 {
		return Assignment{},
			"Judul tugas harus memiliki 2 sampai 160 karakter"
	}

	deadline, err := parseISOTime(req.Deadline)
	if err != nil {
		return Assignment{},
			"Deadline tidak valid"
	}

	priority := req.Priority

	if priority == "" {
		priority = "MEDIUM"
	}

	if !contains(
		[]string{
			"LOW",
			"MEDIUM",
			"HIGH",
			"URGENT",
		},
		priority,
	) {
		return Assignment{},
			"Prioritas tugas tidak valid"
	}

	status := req.Status

	if status == "" {
		status = "TODO"
	}

	if !contains(
		[]string{
			"TODO",
			"IN_PROGRESS",
			"SUBMITTED",
			"COMPLETED",
			"OVERDUE",
		},
		status,
	) {
		return Assignment{},
			"Status tugas tidak valid"
	}

	if deadline.Before(time.Now()) &&
		(status == "TODO" ||
			status == "IN_PROGRESS") {
		status = "OVERDUE"
	}

	var reminder *time.Time

	if req.ReminderAt != nil &&
		strings.TrimSpace(
			*req.ReminderAt,
		) != "" {
		value, err := parseISOTime(
			*req.ReminderAt,
		)

		if err != nil {
			return Assignment{},
				"Waktu pengingat tidak valid"
		}

		reminder = &value
	}

	if req.AttachmentURL != nil &&
		strings.TrimSpace(
			*req.AttachmentURL,
		) != "" &&
		!validURL(
			strings.TrimSpace(
				*req.AttachmentURL,
			),
		) {
		return Assignment{},
			"URL lampiran tidak valid"
	}

	var submitted *time.Time

	if status == "SUBMITTED" ||
		status == "COMPLETED" {
		now := time.Now()
		submitted = &now
	}

	return Assignment{
		CourseID:      req.CourseID,
		Title:         title,
		Description:   trimNullable(req.Description),
		Deadline:      deadline,
		Priority:      priority,
		Status:        status,
		AttachmentURL: trimNullable(req.AttachmentURL),
		ReminderAt:    reminder,
		SubmittedAt:   submitted,
	}, ""
}

func (a *App) deleteAssignment(c *gin.Context) {
	a.deleteOwned(
		c,
		&Assignment{},
		"Tugas",
		"Tugas berhasil dihapus",
	)
}

func (a *App) listExams(c *gin.Context) {
	user := authUser(c)

	query := a.DB.
		Where(
			"\"Exam\".\"userId\" = ?",
			user.UserID,
		)

	if value := c.Query("courseId"); value != "" {
		query = query.Where(
			"\"Exam\".\"courseId\" = ?",
			value,
		)
	}

	if value := c.Query("type"); value != "" {
		query = query.Where(
			"\"Exam\".type = ?",
			value,
		)
	}

	var exams []Exam

	if err := query.
		Preload("Course.Semester").
		Order(
			"\"Exam\".\"examDate\" ASC, \"Exam\".\"startTime\" ASC",
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

	var exam Exam

	if err := a.DB.
		Preload("Course.Semester").
		Where(
			"\"Exam\".id = ? AND \"Exam\".\"userId\" = ?",
			c.Param("id"),
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

	var req examRequest

	if err := c.ShouldBindJSON(&req); err != nil {
		a.abort(
			c,
			http.StatusBadRequest,
			"Payload tidak valid",
		)
		return
	}

	item, message := a.parseExamRequest(
		user.UserID,
		req,
	)

	if message != "" {
		a.abort(
			c,
			http.StatusBadRequest,
			message,
		)
		return
	}

	item.ID = uuid.NewString()
	item.UserID = user.UserID

	err := a.DB.Transaction(
		func(tx *gorm.DB) error {
			if err := tx.Create(&item).Error; err != nil {
				return err
			}

			if item.ReminderAt != nil {
				var course Course

				if err := tx.
					Where(
						"id = ?",
						item.CourseID,
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
						item.Title,
					Message: course.Name +
						" memiliki ujian pada " +
						item.ExamDate.UTC().Format(
							time.RFC3339Nano,
						),
					ScheduledFor: item.ReminderAt,
				}

				if err := tx.Create(
					&notification,
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
		Preload("Course").
		Where(
			"id = ?",
			item.ID,
		).
		First(&item)

	c.JSON(
		http.StatusCreated,
		item,
	)
}

func (a *App) updateExam(c *gin.Context) {
	user := authUser(c)

	var existing Exam

	if err := a.DB.
		Where(
			"id = ? AND \"userId\" = ?",
			c.Param("id"),
			user.UserID,
		).
		First(&existing).
		Error; err != nil {
		a.fail(c, err)
		return
	}

	var req examRequest

	if err := c.ShouldBindJSON(&req); err != nil {
		a.abort(
			c,
			http.StatusBadRequest,
			"Payload tidak valid",
		)
		return
	}

	item, message := a.parseExamRequest(
		user.UserID,
		req,
	)

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
				"courseId":   item.CourseID,
				"type":       item.Type,
				"title":      item.Title,
				"examDate":   item.ExamDate,
				"startTime":  item.StartTime,
				"endTime":    item.EndTime,
				"room":       item.Room,
				"topics":     item.Topics,
				"reminderAt": item.ReminderAt,
			},
		).
		Error; err != nil {
		a.fail(c, err)
		return
	}

	a.DB.
		Preload("Course").
		Where(
			"id = ?",
			existing.ID,
		).
		First(&existing)

	c.JSON(
		http.StatusOK,
		existing,
	)
}

func (a *App) parseExamRequest(
	userID string,
	req examRequest,
) (Exam, string) {
	if !validUUID(req.CourseID) ||
		!a.ownsCourse(
			userID,
			req.CourseID,
		) {
		return Exam{},
			"Mata kuliah tidak ditemukan"
	}

	if !contains(
		[]string{
			"MIDTERM",
			"FINAL",
			"QUIZ",
			"PRACTICUM",
			"PRESENTATION",
			"THESIS_DEFENSE",
		},
		req.Type,
	) {
		return Exam{},
			"Jenis ujian tidak valid"
	}

	title := strings.TrimSpace(req.Title)

	if len(title) < 2 ||
		len(title) > 160 {
		return Exam{},
			"Judul ujian harus memiliki 2 sampai 160 karakter"
	}

	examDate, err := parseISOTime(req.ExamDate)
	if err != nil {
		return Exam{},
			"Tanggal ujian tidak valid"
	}

	if req.StartTime != nil &&
		*req.StartTime != "" &&
		!timePattern.MatchString(
			*req.StartTime,
		) {
		return Exam{},
			"Jam mulai ujian tidak valid"
	}

	if req.EndTime != nil &&
		*req.EndTime != "" &&
		!timePattern.MatchString(
			*req.EndTime,
		) {
		return Exam{},
			"Jam selesai ujian tidak valid"
	}

	if req.StartTime != nil &&
		req.EndTime != nil &&
		*req.StartTime != "" &&
		*req.EndTime != "" &&
		*req.StartTime >= *req.EndTime {
		return Exam{},
			"Jam selesai ujian harus setelah jam mulai"
	}

	var reminder *time.Time

	if req.ReminderAt != nil &&
		strings.TrimSpace(
			*req.ReminderAt,
		) != "" {
		value, err := parseISOTime(
			*req.ReminderAt,
		)

		if err != nil {
			return Exam{},
				"Waktu pengingat tidak valid"
		}

		reminder = &value
	}

	return Exam{
		CourseID:   req.CourseID,
		Type:       req.Type,
		Title:      title,
		ExamDate:   examDate,
		StartTime:  trimNullable(req.StartTime),
		EndTime:    trimNullable(req.EndTime),
		Room:       trimNullable(req.Room),
		Topics:     trimNullable(req.Topics),
		ReminderAt: reminder,
	}, ""
}

func (a *App) deleteExam(c *gin.Context) {
	a.deleteOwned(
		c,
		&Exam{},
		"Ujian",
		"Ujian berhasil dihapus",
	)
}

func (a *App) listAttendances(c *gin.Context) {
	user := authUser(c)

	query, ok := a.applyAttendanceFilters(
		c,
		a.DB.Where(
			"\"Attendance\".\"userId\" = ?",
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
			"\"Attendance\".\"meetingDate\" DESC",
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

	var attendance Attendance

	if err := a.DB.
		Preload("Course.Semester").
		Where(
			"\"Attendance\".id = ? AND \"Attendance\".\"userId\" = ?",
			c.Param("id"),
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

	var req attendanceRequest

	if err := c.ShouldBindJSON(&req); err != nil {
		a.abort(
			c,
			http.StatusBadRequest,
			"Payload tidak valid",
		)
		return
	}

	item, message := a.parseAttendanceRequest(
		user.UserID,
		req,
		"",
	)

	if message != "" {
		a.abort(
			c,
			http.StatusBadRequest,
			message,
		)
		return
	}

	item.ID = uuid.NewString()
	item.UserID = user.UserID

	if err := a.DB.Create(&item).Error; err != nil {
		a.fail(c, err)
		return
	}

	a.DB.
		Preload("Course").
		Where(
			"id = ?",
			item.ID,
		).
		First(&item)

	c.JSON(
		http.StatusCreated,
		item,
	)
}

func (a *App) updateAttendance(c *gin.Context) {
	user := authUser(c)

	var existing Attendance

	if err := a.DB.
		Where(
			"id = ? AND \"userId\" = ?",
			c.Param("id"),
			user.UserID,
		).
		First(&existing).
		Error; err != nil {
		a.fail(c, err)
		return
	}

	var req attendanceRequest

	if err := c.ShouldBindJSON(&req); err != nil {
		a.abort(
			c,
			http.StatusBadRequest,
			"Payload tidak valid",
		)
		return
	}

	item, message := a.parseAttendanceRequest(
		user.UserID,
		req,
		existing.ID,
	)

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
				"courseId":    item.CourseID,
				"meetingDate": item.MeetingDate,
				"status":      item.Status,
				"notes":       item.Notes,
			},
		).
		Error; err != nil {
		a.fail(c, err)
		return
	}

	a.DB.
		Preload("Course").
		Where(
			"id = ?",
			existing.ID,
		).
		First(&existing)

	c.JSON(
		http.StatusOK,
		existing,
	)
}

func (a *App) parseAttendanceRequest(
	userID string,
	req attendanceRequest,
	ignoredID string,
) (Attendance, string) {
	if !validUUID(req.CourseID) ||
		!a.ownsCourse(
			userID,
			req.CourseID,
		) {
		return Attendance{},
			"Mata kuliah tidak ditemukan"
	}

	meetingDate, err := parseISOTime(
		req.MeetingDate,
	)

	if err != nil {
		return Attendance{},
			"Tanggal presensi tidak valid"
	}

	if !contains(
		[]string{
			"PRESENT",
			"PERMITTED",
			"SICK",
			"ABSENT",
			"CANCELLED",
			"REPLACEMENT",
		},
		req.Status,
	) {
		return Attendance{},
			"Status presensi tidak valid"
	}

	var duplicate int64

	query := a.DB.
		Model(&Attendance{}).
		Where(
			"\"userId\" = ? AND \"courseId\" = ? AND \"meetingDate\" = ?",
			userID,
			req.CourseID,
			meetingDate,
		)

	if ignoredID != "" {
		query = query.Where(
			"id <> ?",
			ignoredID,
		)
	}

	query.Count(&duplicate)

	if duplicate > 0 {
		return Attendance{},
			"Presensi pada mata kuliah dan tanggal tersebut sudah tersedia"
	}

	return Attendance{
		CourseID:    req.CourseID,
		MeetingDate: meetingDate,
		Status:      req.Status,
		Notes:       trimNullable(req.Notes),
	}, ""
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

	query, ok := a.applyAttendanceFilters(
		c,
		a.DB.Model(&Attendance{}).
			Where(
				"\"Attendance\".\"userId\" = ?",
				user.UserID,
			),
	)

	if !ok {
		return
	}

	type row struct {
		Status string
		Count  int64
	}

	var rows []row

	if err := query.
		Select(
			"status, count(*) AS count",
		).
		Group("status").
		Scan(&rows).
		Error; err != nil {
		a.fail(c, err)
		return
	}

	values := map[string]int64{}

	for _, row := range rows {
		values[row.Status] = row.Count
	}

	counted := values["PRESENT"] +
		values["PERMITTED"] +
		values["SICK"] +
		values["ABSENT"] +
		values["REPLACEMENT"]

	attended := values["PRESENT"] +
		values["REPLACEMENT"]

	percentage := 0.0

	if counted > 0 {
		percentage = math.Round(
			float64(attended)/
				float64(counted)*
				10000,
		) / 100
	}

	c.JSON(
		http.StatusOK,
		gin.H{
			"total": counted +
				values["CANCELLED"],
			"present":     values["PRESENT"],
			"permitted":   values["PERMITTED"],
			"sick":        values["SICK"],
			"absent":      values["ABSENT"],
			"cancelled":   values["CANCELLED"],
			"replacement": values["REPLACEMENT"],
			"percentage":  percentage,
		},
	)
}

func (a *App) applyAttendanceFilters(
	c *gin.Context,
	query *gorm.DB,
) (*gorm.DB, bool) {
	if value := c.Query("courseId"); value != "" {
		if !validUUID(value) {
			a.abort(
				c,
				http.StatusBadRequest,
				"Mata kuliah tidak valid",
			)
			return nil, false
		}

		query = query.Where(
			"\"Attendance\".\"courseId\" = ?",
			value,
		)
	}

	if value := c.Query("status"); value != "" {
		query = query.Where(
			"\"Attendance\".status = ?",
			value,
		)
	}

	if value := c.Query("from"); value != "" {
		date, err := parseISOTime(value)

		if err != nil {
			a.abort(
				c,
				http.StatusBadRequest,
				"Tanggal awal tidak valid",
			)
			return nil, false
		}

		query = query.Where(
			"\"Attendance\".\"meetingDate\" >= ?",
			date,
		)
	}

	if value := c.Query("to"); value != "" {
		date, err := parseISOTime(value)

		if err != nil {
			a.abort(
				c,
				http.StatusBadRequest,
				"Tanggal akhir tidak valid",
			)
			return nil, false
		}

		query = query.Where(
			"\"Attendance\".\"meetingDate\" <= ?",
			date,
		)
	}

	return query, true
}

func (a *App) ownsCourse(
	userID string,
	courseID string,
) bool {
	var count int64

	err := a.DB.
		Model(&Course{}).
		Where(
			"id = ? AND \"userId\" = ?",
			courseID,
			userID,
		).
		Count(&count).
		Error

	return err == nil && count > 0
}

func (a *App) updateOverdue(userID string) {
	_ = a.DB.
		Model(&Assignment{}).
		Where(
			"\"userId\" = ? AND deadline < ? AND status IN ?",
			userID,
			time.Now(),
			[]string{
				"TODO",
				"IN_PROGRESS",
			},
		).
		Update(
			"status",
			"OVERDUE",
		).
		Error
}

func (a *App) deleteOwned(
	c *gin.Context,
	model any,
	resource string,
	message string,
) {
	user := authUser(c)

	id := c.Param("id")

	if !validUUID(id) {
		a.abort(
			c,
			http.StatusBadRequest,
			resource+" tidak valid",
		)
		return
	}

	result := a.DB.
		Where(
			"id = ? AND \"userId\" = ?",
			id,
			user.UserID,
		).
		Delete(model)

	if result.Error != nil {
		a.fail(c, result.Error)
		return
	}

	if result.RowsAffected == 0 {
		a.abort(
			c,
			http.StatusNotFound,
			resource+" tidak ditemukan",
		)
		return
	}

	c.JSON(
		http.StatusOK,
		gin.H{
			"message": message,
		},
	)
}
