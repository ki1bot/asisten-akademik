package main

import (
	"strings"
	"time"
)

func (a *App) validateExamValues(
	userID string,
	courseID string,
	examType string,
	title string,
	examDateRaw string,
	startTime *string,
	endTime *string,
	room *string,
	topics *string,
	reminderRaw *string,
) (Exam, string, error) {
	if !validUUID(courseID) {
		return Exam{},
			"Mata kuliah tidak valid",
			nil
	}

	owned, err := a.ownsCourse(
		userID,
		courseID,
	)

	if err != nil {
		return Exam{}, "", err
	}

	if !owned {
		return Exam{},
			"Mata kuliah tidak ditemukan",
			nil
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
		examType,
	) {
		return Exam{},
			"Jenis ujian tidak valid",
			nil
	}

	title = strings.TrimSpace(title)

	if len(title) < 2 ||
		len(title) > 160 {
		return Exam{},
			"Judul ujian harus memiliki 2 sampai 160 karakter",
			nil
	}

	examDate, err := parseISOTime(examDateRaw)

	if err != nil {
		return Exam{},
			"Tanggal ujian tidak valid",
			nil
	}

	startTime = trimNullable(startTime)
	endTime = trimNullable(endTime)

	if startTime != nil &&
		!timePattern.MatchString(*startTime) {
		return Exam{},
			"Jam mulai ujian tidak valid",
			nil
	}

	if endTime != nil &&
		!timePattern.MatchString(*endTime) {
		return Exam{},
			"Jam selesai ujian tidak valid",
			nil
	}

	if startTime != nil &&
		endTime != nil &&
		*startTime >= *endTime {
		return Exam{},
			"Jam selesai ujian harus setelah jam mulai",
			nil
	}

	if room != nil &&
		len(strings.TrimSpace(*room)) > 50 {
		return Exam{},
			"Ruangan maksimal 50 karakter",
			nil
	}

	if topics != nil &&
		len(strings.TrimSpace(*topics)) > 5000 {
		return Exam{},
			"Topik ujian maksimal 5000 karakter",
			nil
	}

	var reminderAt *time.Time

	if reminderRaw != nil &&
		strings.TrimSpace(*reminderRaw) != "" {
		value, err := parseISOTime(*reminderRaw)

		if err != nil {
			return Exam{},
				"Waktu pengingat tidak valid",
				nil
		}

		reminderAt = &value
	}

	return Exam{
		CourseID:   courseID,
		Type:       examType,
		Title:      title,
		ExamDate:   examDate,
		StartTime:  startTime,
		EndTime:    endTime,
		Room:       trimNullable(room),
		Topics:     trimNullable(topics),
		ReminderAt: reminderAt,
	}, "", nil
}
