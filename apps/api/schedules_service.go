package main

import "strings"

func (a *App) validateScheduleValues(
	userID string,
	courseID string,
	dayOfWeek int,
	startTime string,
	endTime string,
	room *string,
	lectureType string,
	onlineURL *string,
	reminderMinutes *int,
) (Schedule, string, error) {
	if !validUUID(courseID) {
		return Schedule{},
			"Mata kuliah tidak valid",
			nil
	}

	owned, err := a.ownsCourse(
		userID,
		courseID,
	)

	if err != nil {
		return Schedule{}, "", err
	}

	if !owned {
		return Schedule{},
			"Mata kuliah tidak ditemukan",
			nil
	}

	if dayOfWeek < 1 ||
		dayOfWeek > 7 {
		return Schedule{},
			"Hari harus antara 1 sampai 7",
			nil
	}

	if !timePattern.MatchString(startTime) ||
		!timePattern.MatchString(endTime) {
		return Schedule{},
			"Jam harus menggunakan format HH:mm",
			nil
	}

	if startTime >= endTime {
		return Schedule{},
			"Jam selesai harus setelah jam mulai",
			nil
	}

	if !contains(
		[]string{
			"OFFLINE",
			"ONLINE",
			"HYBRID",
		},
		lectureType,
	) {
		return Schedule{},
			"Jenis perkuliahan tidak valid",
			nil
	}

	if room != nil &&
		len(strings.TrimSpace(*room)) > 50 {
		return Schedule{},
			"Ruangan maksimal 50 karakter",
			nil
	}

	if onlineURL != nil &&
		strings.TrimSpace(*onlineURL) != "" &&
		!validURL(
			strings.TrimSpace(*onlineURL),
		) {
		return Schedule{},
			"URL kuliah online tidak valid",
			nil
	}

	if reminderMinutes != nil &&
		(*reminderMinutes < 0 ||
			*reminderMinutes > 10080) {
		return Schedule{},
			"Pengingat harus antara 0 sampai 10080 menit",
			nil
	}

	return Schedule{
		CourseID:        courseID,
		DayOfWeek:       dayOfWeek,
		StartTime:       startTime,
		EndTime:         endTime,
		Room:            trimNullable(room),
		LectureType:     lectureType,
		OnlineURL:       trimNullable(onlineURL),
		ReminderMinutes: reminderMinutes,
	}, "", nil
}
