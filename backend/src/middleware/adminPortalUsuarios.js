/**
 * Solo correos listados en ADMIN_PORTAL_USUARIOS_EMAILS (o Enrique/Nicolás por defecto).
 */
function emailsPermitidos() {
  return (process.env.ADMIN_PORTAL_USUARIOS_EMAILS ||
    'enrique.agapito@prayaga.biz,nicolas.valdivia@prayaga.biz')
    .split(',')
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);
}

const verificarAdminPortalUsuarios = (req, res, next) => {
  const email = (req.usuario?.email || '').toLowerCase().trim();
  if (!email || !emailsPermitidos().includes(email)) {
    return res.status(403).json({
      success: false,
      mensaje: 'No tienes permiso para administrar usuarios del portal'
    });
  }
  next();
};

module.exports = { verificarAdminPortalUsuarios, emailsPermitidos };
