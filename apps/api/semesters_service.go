package main

func parseSemesterValues(
	name string,
	academicYear string,
	semesterType string,
	startRaw string,
	endRaw string,
	isActive bool,
) (Semester, string) {
	if len(name) < 2 || len(name) > 50 {
		return Semester{},
			"Nama semester harus memiliki 2 sampai 50 karakter"
	}

	if !academicYearPattern.MatchString(academicYear) {
		return Semester{},
			"Tahun akademik harus menggunakan format 2026/2027"
	}

	if !contains(
		[]string{
			"ODD",
			"EVEN",
		},
		semesterType,
	) {
		return Semester{},
			"Jenis semester tidak valid"
	}

	startDate, err := parseISOTime(startRaw)

	if err != nil {
		return Semester{},
			"Tanggal mulai tidak valid"
	}

	endDate, err := parseISOTime(endRaw)

	if err != nil ||
		!startDate.Before(endDate) {
		return Semester{},
			"Tanggal selesai semester harus setelah tanggal mulai"
	}

	return Semester{
		Name:         name,
		AcademicYear: academicYear,
		Type:         semesterType,
		StartDate:    startDate,
		EndDate:      endDate,
		IsActive:     isActive,
	}, ""
}

func (a *App) semesterDuplicate(
	userID string,
	name string,
	academicYear string,
	ignoredID string,
) (bool, error) {
	query := a.DB.
		Model(&Semester{}).
		Where(
			"\"userId\" = ? AND name = ? AND \"academicYear\" = ?",
			userID,
			name,
			academicYear,
		)

	if ignoredID != "" {
		query = query.Where(
			"id <> ?",
			ignoredID,
		)
	}

	var count int64

	if err := query.
		Count(&count).
		Error; err != nil {
		return false, err
	}

	return count > 0, nil
}
