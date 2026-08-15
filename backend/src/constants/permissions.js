const PERMISSIONS = {
  MANAGE_WHATSAPP: 'manage_whatsapp',
  MANAGE_DOCTORS: 'manage_doctors',
  SIMULATOR: 'simulator',
  VIEW_CHATS: 'view_chats',
  DIAGNOSTICS: 'diagnostics',
  MANAGE_SUB_ADMINS: 'manage_sub_admins'
};

const ALL_PERMISSIONS = Object.values(PERMISSIONS);

module.exports = {
  PERMISSIONS,
  ALL_PERMISSIONS
};
