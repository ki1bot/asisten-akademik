import { Injectable } from '@nestjs/common';
import { AuthUser } from '../../common/types/auth-user.type';
import { assertOwnedResource } from '../../common/utils/ownership.util';
import { PrismaService } from '../../database/prisma.service';
import { NotificationQueryDto } from './dto/notification-query.dto';

@Injectable()
export class NotificationsService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(user: AuthUser, query: NotificationQueryDto) {
    return this.prisma.notification.findMany({
      where: {
        userId: user.userId,
        ...(query.unreadOnly
          ? {
              readAt: null,
            }
          : {}),
      },
      orderBy: {
        createdAt: 'desc',
      },
      take: query.limit ?? 30,
    });
  }

  async unreadCount(user: AuthUser) {
    const count = await this.prisma.notification.count({
      where: {
        userId: user.userId,
        readAt: null,
      },
    });

    return {
      count,
    };
  }

  async markAsRead(user: AuthUser, id: string) {
    const notification = await this.prisma.notification.findFirst({
      where: {
        id,
        userId: user.userId,
      },
    });

    assertOwnedResource(notification, user.userId, 'Notifikasi');

    return this.prisma.notification.update({
      where: {
        id,
      },
      data: {
        readAt: notification.readAt ?? new Date(),
      },
    });
  }

  async markAllAsRead(user: AuthUser) {
    const result = await this.prisma.notification.updateMany({
      where: {
        userId: user.userId,
        readAt: null,
      },
      data: {
        readAt: new Date(),
      },
    });

    return {
      message: 'Semua notifikasi berhasil ditandai sebagai dibaca',
      updated: result.count,
    };
  }

  async remove(user: AuthUser, id: string) {
    const notification = await this.prisma.notification.findFirst({
      where: {
        id,
        userId: user.userId,
      },
    });

    assertOwnedResource(notification, user.userId, 'Notifikasi');

    await this.prisma.notification.delete({
      where: {
        id,
      },
    });

    return {
      message: 'Notifikasi berhasil dihapus',
    };
  }
}
