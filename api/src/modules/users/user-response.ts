import { isSelectableRole, SelectableRole, User } from './entities/user.entity';

export const toUserResponse = (user: User) => ({
  id: user.id,
  msuIdNumber: user.msuIdNumber,
  username: user.username,
  fullName: user.fullName,
  email: user.email,
  role: user.role,
  preferredRole: isSelectableRole(user.preferredRole) ? user.preferredRole : SelectableRole.STUDENT,
  isCourierVerified: user.isCourierVerified,
  isActive: user.isActive,
  createdAt: user.createdAt,
  updatedAt: user.updatedAt,
});