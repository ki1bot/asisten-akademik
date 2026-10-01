package main

import (
	"net/http"

	"github.com/gin-gonic/gin"
)

func (a *App) logout(c *gin.Context) {
	user := authUser(c)

	if err := a.DB.
		Where(
			"id = ? AND \"userId\" = ?",
			user.SessionID,
			user.UserID,
		).
		Delete(&Session{}).
		Error; err != nil {
		a.fail(c, err)
		return
	}

	c.JSON(
		http.StatusCreated,
		gin.H{
			"message": "Berhasil logout",
		},
	)
}

func (a *App) logoutAll(c *gin.Context) {
	user := authUser(c)

	if err := a.DB.
		Where(
			"\"userId\" = ?",
			user.UserID,
		).
		Delete(&Session{}).
		Error; err != nil {
		a.fail(c, err)
		return
	}

	c.JSON(
		http.StatusCreated,
		gin.H{
			"message": "Semua sesi berhasil dihentikan",
		},
	)
}

func (a *App) me(c *gin.Context) {
	user := authUser(c)

	var found User

	if err := a.DB.
		Preload("Profile").
		Where(
			"id = ?",
			user.UserID,
		).
		First(&found).
		Error; err != nil {
		a.abort(
			c,
			http.StatusUnauthorized,
			"Akun tidak ditemukan",
		)
		return
	}

	c.JSON(
		http.StatusOK,
		found,
	)
}

func (a *App) sessions(c *gin.Context) {
	user := authUser(c)

	var sessions []Session

	if err := a.DB.
		Where(
			"\"userId\" = ?",
			user.UserID,
		).
		Order(
			"\"lastUsedAt\" DESC",
		).
		Find(&sessions).
		Error; err != nil {
		a.fail(c, err)
		return
	}

	c.JSON(
		http.StatusOK,
		sessions,
	)
}

func (a *App) revokeSession(c *gin.Context) {
	user := authUser(c)

	id := c.Param("id")

	if !validUUID(id) {
		a.abort(
			c,
			http.StatusBadRequest,
			"Sesi tidak ditemukan",
		)
		return
	}

	result := a.DB.
		Where(
			"id = ? AND \"userId\" = ?",
			id,
			user.UserID,
		).
		Delete(&Session{})

	if result.Error != nil {
		a.fail(c, result.Error)
		return
	}

	if result.RowsAffected == 0 {
		a.abort(
			c,
			http.StatusBadRequest,
			"Sesi tidak ditemukan",
		)
		return
	}

	c.JSON(
		http.StatusOK,
		gin.H{
			"message": "Sesi berhasil dihentikan",
		},
	)
}
