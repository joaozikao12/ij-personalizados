module.exports = (req, res, next) => {
  if (req.session && req.session.usuarioId) return next();
  req.session.returnTo = req.originalUrl;
  res.redirect('/auth/login');
};