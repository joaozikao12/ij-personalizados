
const express = require('express');
const { Op } = require('sequelize');
const Produto = require('../models/Produto');
const validator = require('validator');
const router = express.Router();

router.get('/', async (req, res) => {
  try {
    const { busca } = req.query;
    const where = {};
    if (busca) {
      const sanitized = validator.escape(busca);
      where.nome = { [Op.like]: '%' + sanitized + '%' };
    }
    const produtos = await Produto.findAll({ where });
    res.render('produtos/index', { produtos, busca: busca || '' });
  } catch (err) {
    res.status(500).render('erro', { mensagem: 'Erro ao listar produtos.' });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const produto = await Produto.findByPk(req.params.id);
    if (!produto) return res.status(404).render('erro', { mensagem: 'Produto nao encontrado.' });
    res.render('produtos/detalhe', { produto });
  } catch (err) {
    res.status(500).render('erro', { mensagem: 'Erro ao carregar produto.' });
  }
});

module.exports = router;
