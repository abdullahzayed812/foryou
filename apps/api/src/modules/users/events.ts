import type { Role } from "@foryou/shared";

export interface UserRegisteredPayload {
  userId: string;
  email: string;
  role: Role;
}

export interface UserRoleAddedPayload {
  userId: string;
  role: Role;
}

export interface UserSuspendedPayload {
  userId: string;
  reason?: string;
}

export interface UserReactivatedPayload {
  userId: string;
}

export interface UserProfileUpdatedPayload {
  userId: string;
}

declare module "../../lib/events.js" {
  interface EventMap {
    "user.registered": UserRegisteredPayload;
    "user.role_added": UserRoleAddedPayload;
    "user.suspended": UserSuspendedPayload;
    "user.reactivated": UserReactivatedPayload;
    "user.profile_updated": UserProfileUpdatedPayload;
  }
}
