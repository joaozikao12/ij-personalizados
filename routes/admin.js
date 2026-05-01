
const express = require('express');
const auth = require('../middleware/auth');
const Produto = require('../models/Produto');
const Pedido = require('../models/Pedido');
const router = express.Router();

function adminOnly(req, res, next) {
  if (req.session.usuarioRole === 'admin') return next();
  res.status(403).render('erro', { mensagem: 'Acesso restrito.' });
}

router.get('/', auth, adminOnly, async (req, res) => {
  try {
    const totalProdutos = await Produto.count();
    const totalPedidos = await Pedido.count();
    res.render('admin/index', { totalProdutos, totalPedidos });
  } catch (err) { res.status(500).render('erro', { mensagem: 'Erro ao carregar painel.' }); }
});

router.get('/produtos', auth, adminOnly, async (req, res) => {
  const produtos = await Produto.findAll();
  res.render('admin/produtos', { produtos });
});

router.get('/produtos/novo', auth, adminOnly, (req, res) => {
  res.render('admin/novo-produto', { erros: [], dados: {} });
});

router.post('/produtos/novo', auth, adminOnly, async (req, res) => {
  try {
    const { nome, descricao, preco, imagem, estoque } = req.body;
    await Produto.create({ nome, descricao, preco: parseFloat(preco), imagem, estoque: parseInt(estoque) });
    res.redirect('/admin/produtos');
  } catch (err) { res.render('admin/novo-produto', { erros: [{ msg: 'Erro ao criar produto.' }], dados: req.body }); }
});

module.exports = router;
