package main

import (
	"net/http"
	"strconv"
	"time"

	"github.com/gin-gonic/gin"
)

func (a *App) listNotifications(c *gin.Context) {
	user := authUser(c)

	limit := 30

	if value := c.Query("limit"); value != "" {
		parsed, err := strconv.Atoi(value)

		if err != nil ||
			parsed < 1 ||
			parsed > 100 {
			a.abort(
				c,
				http.StatusBadRequest,
				"Limit harus antara 1 sampai 100",
			)
			return
		}

		limit = parsed
	}

	query := a.DB.
		Where(
			"\"userId\" = ?",
			user.UserID,
		)

	if value := c.Query("unreadOnly"); value != "" {
		if value != "true" &&
			value != "false" {
			a.abort(
				c,
				http.StatusBadRequest,
				"unreadOnly harus bernilai true atau false",
			)
			return
		}

		if value == "true" {
			query = query.Where(
				"\"readAt\" IS NULL",
			)
		}
	}

	var notifications []Notification

	if err := query.
		Order(
			"\"createdAt\" DESC",
		).
		Limit(limit).
		Find(&notifications).
		Error; err != nil {
		a.fail(c, err)
		return
	}

	c.JSON(
		http.StatusOK,
		notifications,
	)
}

func (a *App) unreadNotificationCount(
	c *gin.Context,
) {
	user := authUser(c)

	var count int64

	if err := a.DB.
		Model(&Notification{}).
		Where(
			"\"userId\" = ? AND \"readAt\" IS NULL",
			user.UserID,
		).
		Count(&count).
		Error; err != nil {
		a.fail(c, err)
		return
	}

	c.JSON(
		http.StatusOK,
		gin.H{
			"count": count,
		},
	)
}

func (a *App) readNotification(
	c *gin.Context,
) {
	user := authUser(c)

	id := c.Param("id")

	if !validUUID(id) {
		a.abort(
			c,
			http.StatusBadRequest,
			"Notifikasi tidak valid",
		)
		return
	}

	var notification Notification

	if err := a.DB.
		Where(
			"id = ? AND \"userId\" = ?",
			id,
			user.UserID,
		).
		First(&notification).
		Error; err != nil {
		a.fail(c, err)
		return
	}

	if notification.ReadAt == nil {
		now := time.Now()

		if err := a.DB.
			Model(&notification).
			Update(
				"readAt",
				now,
			).
			Error; err != nil {
			a.fail(c, err)
			return
		}

		notification.ReadAt = &now
	}

	c.JSON(
		http.StatusOK,
		notification,
	)
}

func (a *App) readAllNotifications(
	c *gin.Context,
) {
	user := authUser(c)

	result := a.DB.
		Model(&Notification{}).
		Where(
			"\"userId\" = ? AND \"readAt\" IS NULL",
			user.UserID,
		).
		Update(
			"readAt",
			time.Now(),
		)

	if result.Error != nil {
		a.fail(c, result.Error)
		return
	}

	c.JSON(
		http.StatusOK,
		gin.H{
			"message": "Semua notifikasi berhasil ditandai sebagai dibaca",
			"updated": result.RowsAffected,
		},
	)
}

func (a *App) deleteNotification(
	c *gin.Context,
) {
	a.deleteOwned(
		c,
		&Notification{},
		"Notifikasi",
		"Notifikasi berhasil dihapus",
	)
}
