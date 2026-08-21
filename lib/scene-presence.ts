import type { MapToken } from "@/lib/types";

export function isUserInScene(userId: string, excludedUserIds: string[] = []) {
  return !excludedUserIds.includes(userId);
}

export function isTokenInScene(token: MapToken, excludedUserIds: string[] = []) {
  if (token.kind !== "hero") return true;
  const controllers = token.controllerIds?.length ? token.controllerIds : [token.ownerId];
  return controllers.some((userId) => isUserInScene(userId, excludedUserIds));
}
