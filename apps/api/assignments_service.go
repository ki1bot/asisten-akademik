package main

import (
	"strings"
	"time"
)

func (a *App) validateAssignmentValues(
	userID string,
	courseID string,
	title string,
	description *string,
	deadlineRaw string,
	priority string,
	status string,
	attachmentURL *string,
	reminderRaw *string,
	currentSubmittedAt *time.Time,
) (Assignment, string, error) {
	if !validUUID(courseID) {
		return Assignment{},
			"Mata kuliah tidak valid",
			nil
	}

	owned, err := a.ownsCourse(
		userID,
		courseID,
	)

	if err != nil {
		return Assignment{}, "", err
	}

	if !owned {
		return Assignment{},
			"Mata kuliah tidak ditemukan",
			nil
	}

	title = strings.TrimSpace(title)

	if len(title) < 2 ||
		len(title) > 160 {
		return Assignment{},
			"Judul tugas harus memiliki 2 sampai 160 karakter",
			nil
	}

	if description != nil &&
		len(strings.TrimSpace(*description)) > 5000 {
		return Assignment{},
			"Deskripsi maksimal 5000 karakter",
			nil
	}

	deadline, err := parseISOTime(deadlineRaw)

	if err != nil {
		return Assignment{},
			"Deadline tidak valid",
			nil
	}

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
			"Prioritas tugas tidak valid",
			nil
	}

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
			"Status tugas tidak valid",
			nil
	}

	if deadline.Before(time.Now()) &&
		(status == "TODO" ||
			status == "IN_PROGRESS") {
		status = "OVERDUE"
	}

	if attachmentURL != nil &&
		strings.TrimSpace(*attachmentURL) != "" &&
		!validURL(
			strings.TrimSpace(*attachmentURL),
		) {
		return Assignment{},
			"URL lampiran tidak valid",
			nil
	}

	var reminderAt *time.Time

	if reminderRaw != nil &&
		strings.TrimSpace(*reminderRaw) != "" {
		value, err := parseISOTime(*reminderRaw)

		if err != nil {
			return Assignment{},
				"Waktu pengingat tidak valid",
				nil
		}

		reminderAt = &value
	}

	var submittedAt *time.Time

	if status == "SUBMITTED" ||
		status == "COMPLETED" {
		if currentSubmittedAt != nil {
			submittedAt = currentSubmittedAt
		} else {
			now := time.Now()
			submittedAt = &now
		}
	}

	return Assignment{
		CourseID:      courseID,
		Title:         title,
		Description:   trimNullable(description),
		Deadline:      deadline,
		Priority:      priority,
		Status:        status,
		AttachmentURL: trimNullable(attachmentURL),
		ReminderAt:    reminderAt,
		SubmittedAt:   submittedAt,
	}, "", nil
}

func (a *App) updateOverdue(userID string) error {
	return a.DB.
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
