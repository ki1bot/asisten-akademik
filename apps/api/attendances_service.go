package main

import (
	"math"
	"net/http"
	"strings"

	"github.com/gin-gonic/gin"
	"gorm.io/gorm"
)

func (a *App) attendanceFilterQuery(
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
			`"Attendance"."courseId" = ?`,
			value,
		)
	}

	if value := c.Query("status"); value != "" {
		if !contains(
			[]string{
				"PRESENT",
				"PERMITTED",
				"SICK",
				"ABSENT",
				"CANCELLED",
				"REPLACEMENT",
			},
			value,
		) {
			a.abort(
				c,
				http.StatusBadRequest,
				"Status presensi tidak valid",
			)
			return nil, false
		}

		query = query.Where(
			`"Attendance".status = ?`,
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
			`"Attendance"."meetingDate" >= ?`,
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
			`"Attendance"."meetingDate" <= ?`,
			date,
		)
	}

	return query, true
}

func (a *App) validateAttendanceValues(
	userID string,
	courseID string,
	meetingDateRaw string,
	status string,
	notes *string,
	ignoredID string,
) (Attendance, string, error) {
	if !validUUID(courseID) {
		return Attendance{},
			"Mata kuliah tidak valid",
			nil
	}

	owned, err := a.ownsCourse(
		userID,
		courseID,
	)

	if err != nil {
		return Attendance{}, "", err
	}

	if !owned {
		return Attendance{},
			"Mata kuliah tidak ditemukan",
			nil
	}

	meetingDate, err := parseISOTime(
		meetingDateRaw,
	)

	if err != nil {
		return Attendance{},
			"Tanggal presensi tidak valid",
			nil
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
		status,
	) {
		return Attendance{},
			"Status presensi tidak valid",
			nil
	}

	if notes != nil &&
		len(strings.TrimSpace(*notes)) > 1000 {
		return Attendance{},
			"Catatan maksimal 1000 karakter",
			nil
	}

	query := a.DB.
		Model(&Attendance{}).
		Where(
			"\"userId\" = ? AND \"courseId\" = ? AND \"meetingDate\" = ?",
			userID,
			courseID,
			meetingDate,
		)

	if ignoredID != "" {
		query = query.Where(
			"id <> ?",
			ignoredID,
		)
	}

	var duplicate int64

	if err := query.
		Count(&duplicate).
		Error; err != nil {
		return Attendance{}, "", err
	}

	if duplicate > 0 {
		return Attendance{},
			"Presensi pada mata kuliah dan tanggal tersebut sudah tersedia",
			nil
	}

	return Attendance{
		CourseID:    courseID,
		MeetingDate: meetingDate,
		Status:      status,
		Notes:       trimNullable(notes),
	}, "", nil
}

func attendanceSummaryFromQuery(
	query *gorm.DB,
) (gin.H, error) {
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
		return nil, err
	}

	values := map[string]int64{}

	for _, item := range rows {
		values[item.Status] = item.Count
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
	}, nil
}
