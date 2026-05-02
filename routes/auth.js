
const express = require('express');
const { body, validationResult } = require('express-validator');
const Usuario = require('../models/Usuario');
const rateLimit = require('express-rate-limit');
const router = express.Router();

router.get('/login', (req, res) => {
  res.render('auth/login', { erros: [], dados: {} });
});

router.post('/login', rateLimit({ windowMs: 900000, max: 10, skipSuccessfulRequests: true }), [
  body('email').isEmail().normalizeEmail(),
  body('senha').notEmpty()
], async (req, res) => {
  const erros = validationResult(req);
  if (!erros.isEmpty()) return res.render('auth/login', { erros: erros.array(), dados: req.body });
  try {
    const usuario = await Usuario.scope('comSenha').findOne({ where: { email: req.body.email } });
    if (!usuario || !(await usuario.validarSenha(req.body.senha))) {
      return res.render('auth/login', { erros: [{ msg: 'E-mail ou senha invalidos.' }], dados: req.body });
    }
    req.session.usuarioId = usuario.id;
    req.session.usuarioNome = usuario.nome;
    req.session.usuarioRole = usuario.role;
    req.session.usuarioEmail = usuario.email;
    const redir = req.session.returnTo || '/';
    delete req.session.returnTo;
    res.redirect(redir);
  } catch (err) {
    res.status(500).render('erro', { mensagem: 'Erro no servidor.' });
  }
});

router.get('/cadastro', (req, res) => {
  res.render('auth/cadastro', { erros: [], dados: {} });
});

router.post('/cadastro', [
  body('nome').trim().isLength({ min: 3, max: 100 }).escape(),
  body('email').isEmail().normalizeEmail(),
  body('senha').isLength({ min: 8 }).matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])/),
  body('confirmar_senha').custom((v, { req }) => v === req.body.senha)
], async (req, res) => {
  const erros = validationResult(req);
  if (!erros.isEmpty()) return res.render('auth/cadastro', { erros: erros.array(), dados: req.body });
  try {
    const existente = await Usuario.findOne({ where: { email: req.body.email } });
    if (existente) return res.render('auth/cadastro', { erros: [{ msg: 'E-mail ja cadastrado.' }], dados: req.body });
    const novo = await Usuario.create({ nome: req.body.nome, email: req.body.email, senha_hash: req.body.senha });
    req.session.usuarioId = novo.id;
    req.session.usuarioNome = novo.nome;
    req.session.usuarioRole = novo.role;
    req.session.usuarioEmail = novo.email;
    res.redirect('/');
  } catch (err) {
    res.status(500).render('erro', { mensagem: 'Erro ao criar conta.' });
  }
});

router.get('/logout', (req, res) => {
  req.session.destroy();
  res.redirect('/');
});

module.exports = router;
