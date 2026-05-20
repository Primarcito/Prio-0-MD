const settings = require('./settings');

const SERVER_IDS = settings.servers;
const ROLE_IDS = settings.roles;

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
  return hasRole(member, ROLE_IDS.mover);
}

function canSendMessage(member) {
  return hasRole(member, ROLE_IDS.mensaje);
}

module.exports = {
  SERVER_IDS,
  ROLE_IDS,
  hasRole,
  canUseMamut,
  canManagePanel,
  canViewLogs,
  canMoveMembers,
  canSendMessage,
};
