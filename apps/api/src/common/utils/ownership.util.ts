import { ForbiddenException, NotFoundException } from '@nestjs/common';

export function assertOwnedResource<
  T extends {
    userId: string;
  },
>(resource: T | null, userId: string, label: string): T {
  if (!resource) {
    throw new NotFoundException(`${label} tidak ditemukan`);
  }

  if (resource.userId !== userId) {
    throw new ForbiddenException(
      `Anda tidak memiliki akses ke ${label.toLowerCase()} ini`,
    );
  }

  return resource;
}
