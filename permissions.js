const settings = require('./settings');

const SERVER_IDS = settings.servers;
const ROLE_IDS = settings.roles;
const USER_IDS = settings.users;

function hasRole(member, roleId) {
  const roleIds = Array.isArray(roleId) ? roleId : [roleId];
  return roleIds.some(id => Boolean(member?.roles?.cache?.has(id)));
}

function canUseMamut(member) {
  return hasRole(member, ROLE_IDS.mamut);
}

function canManagePanel(member) {
  return hasRole(member, ROLE_IDS.admin);
}

function canViewLogs(member) {
  return hasRole(member, ROLE_IDS.admin);
}

function canMoveMembers(member) {
  const allowedUserIds = Array.isArray(USER_IDS.mover) ? USER_IDS.mover : [USER_IDS.mover];
  return allowedUserIds.includes(member?.id || member?.user?.id);
}

function canManageCountdown(member) {
  const allowedUserIds = Array.isArray(USER_IDS.contador) ? USER_IDS.contador : [USER_IDS.contador];
  return allowedUserIds.includes(member?.id || member?.user?.id);
}

function canSendMessage(member) {
  return hasRole(member, ROLE_IDS.mensaje);
}

function canManageRoles(member) {
  return hasRole(member, ROLE_IDS.rolAdmin);
}

module.exports = {
  SERVER_IDS,
  ROLE_IDS,
  USER_IDS,
  hasRole,
  canUseMamut,
  canManagePanel,
  canViewLogs,
  canMoveMembers,
  canManageCountdown,
  canSendMessage,
  canManageRoles,
};
