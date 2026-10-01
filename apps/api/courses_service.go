package main

import "strings"

func (a *App) validateCourseValues(
	userID string,
	semesterID string,
	code string,
	name string,
	credits int,
	lecturer *string,
	room *string,
	color string,
	notes *string,
	ignoredID string,
) (Course, string, error) {
	if !validUUID(semesterID) {
		return Course{},
			"Semester tidak valid",
			nil
	}

	owned, err := a.ownsSemester(
		userID,
		semesterID,
	)

	if err != nil {
		return Course{}, "", err
	}

	if !owned {
		return Course{},
			"Semester tidak ditemukan",
			nil
	}

	code = strings.ToUpper(
		strings.TrimSpace(code),
	)

	name = strings.TrimSpace(name)

	color = strings.ToUpper(
		strings.TrimSpace(color),
	)

	if len(code) < 2 || len(code) > 20 {
		return Course{},
			"Kode mata kuliah harus memiliki 2 sampai 20 karakter",
			nil
	}

	if len(name) < 2 || len(name) > 120 {
		return Course{},
			"Nama mata kuliah harus memiliki 2 sampai 120 karakter",
			nil
	}

	if credits < 1 || credits > 12 {
		return Course{},
			"SKS harus antara 1 sampai 12",
			nil
	}

	if !colorPattern.MatchString(color) {
		return Course{},
			"Format warna tidak valid",
			nil
	}

	if lecturer != nil &&
		len(strings.TrimSpace(*lecturer)) > 120 {
		return Course{},
			"Nama dosen maksimal 120 karakter",
			nil
	}

	if room != nil &&
		len(strings.TrimSpace(*room)) > 50 {
		return Course{},
			"Ruangan maksimal 50 karakter",
			nil
	}

	if notes != nil &&
		len(strings.TrimSpace(*notes)) > 2000 {
		return Course{},
			"Catatan maksimal 2000 karakter",
			nil
	}

	query := a.DB.
		Model(&Course{}).
		Where(
			"\"userId\" = ? AND \"semesterId\" = ? AND code = ?",
			userID,
			semesterID,
			code,
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
		return Course{}, "", err
	}

	if duplicate > 0 {
		return Course{},
			"Kode mata kuliah sudah digunakan pada semester tersebut",
			nil
	}

	return Course{
		SemesterID: semesterID,
		Code:       code,
		Name:       name,
		Credits:    credits,
		Lecturer:   trimNullable(lecturer),
		Room:       trimNullable(room),
		Color:      color,
		Notes:      trimNullable(notes),
	}, "", nil
}

func (a *App) courseCounts(
	courseID string,
	detail bool,
) (*CourseCount, error) {
	count := &CourseCount{}

	if detail {
		if err := a.DB.
			Model(&Attendance{}).
			Where(
				"\"courseId\" = ?",
				courseID,
			).
			Count(&count.Attendances).
			Error; err != nil {
			return nil, err
		}

		if err := a.DB.
			Model(&Grade{}).
			Where(
				"\"courseId\" = ?",
				courseID,
			).
			Count(&count.Grades).
			Error; err != nil {
			return nil, err
		}

		return count, nil
	}

	if err := a.DB.
		Model(&Schedule{}).
		Where(
			"\"courseId\" = ?",
			courseID,
		).
		Count(&count.Schedules).
		Error; err != nil {
		return nil, err
	}

	if err := a.DB.
		Model(&Assignment{}).
		Where(
			"\"courseId\" = ?",
			courseID,
		).
		Count(&count.Assignments).
		Error; err != nil {
		return nil, err
	}

	if err := a.DB.
		Model(&Exam{}).
		Where(
			"\"courseId\" = ?",
			courseID,
		).
		Count(&count.Exams).
		Error; err != nil {
		return nil, err
	}

	if err := a.DB.
		Model(&Attendance{}).
		Where(
			"\"courseId\" = ?",
			courseID,
		).
		Count(&count.Attendances).
		Error; err != nil {
		return nil, err
	}

	return count, nil
}
