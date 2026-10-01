package main

import (
	"net/http"

	"github.com/gin-gonic/gin"
)

func (a *App) ownsCourse(userID string, courseID string) (bool, error) {
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

	return count > 0, err
}

func (a *App) ownsSemester(userID string, semesterID string) (bool, error) {
	var count int64

	err := a.DB.
		Model(&Semester{}).
		Where(
			"id = ? AND \"userId\" = ?",
			semesterID,
			userID,
		).
		Count(&count).
		Error

	return count > 0, err
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
