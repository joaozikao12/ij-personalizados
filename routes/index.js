
const express = require('express');
const router = express.Router();
const Produto = require('../models/Produto');

router.get('/', async (req, res) => {
  try {
    const produtos = await Produto.findAll({ limit: 4, order: [['createdAt', 'DESC']] });
    res.render('index', { produtos });
  } catch (err) {
    res.status(500).render('erro', { mensagem: 'Erro ao carregar pagina inicial.' });
  }
});

module.exports = router;
