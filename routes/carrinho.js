const express = require('express');
const Produto = require('../models/Produto');
const router = express.Router();

function init(req) { 
  if (!req.session.carrinho) req.session.carrinho = []; 
}

// GET /carrinho - Exibir carrinho com formulário de checkout
router.get('/', (req, res) => { 
  init(req);
  // Recuperar flash messages
  const erros = req.flash('erros') || [];
  const dados = req.flash('dados')[0] || {};
  
  res.render('carrinho', { 
    carrinho: req.session.carrinho, 
    erros: erros,
    dados: dados
  }); 
});

// POST /carrinho/adicionar/:id - Adicionar produto ao carrinho
router.post('/adicionar/:id', async (req, res) => {
  try {
    const produto = await Produto.findByPk(req.params.id);
    if (!produto || produto.estoque < 1) {
      req.flash('erros', [{ msg: 'Produto indisponível' }]);
      return res.redirect('/produtos');
    }
    
    init(req);
    const c = req.session.carrinho;
    const idx = c.findIndex(i => i.produtoId == produto.id);
    
    if (idx > -1) {
      c[idx].quantidade += 1;
    } else {
      c.push({ 
        produtoId: produto.id, 
        nome: produto.nome, 
        preco: parseFloat(produto.preco), 
        imagem: produto.imagem, 
        quantidade: 1 
      });
    }
    
    req.session.carrinho = c;
    req.flash('erros', [{ msg: 'Produto adicionado ao carrinho!' }]);
    res.redirect('/carrinho');
  } catch (err) { 
    console.error(err);
    req.flash('erros', [{ msg: 'Erro ao adicionar produto' }]);
    res.redirect('/produtos');
  }
});

// POST /carrinho/atualizar - Atualizar quantidade
router.post('/atualizar', (req, res) => {
  init(req);
  const { id, quantidade } = req.body;
  const c = req.session.carrinho;
  const i = c.find(item => item.produtoId == id);
  
  if (i) {
    i.quantidade = Math.max(1, parseInt(quantidade));
  }
  
  req.session.carrinho = c;
  res.redirect('/carrinho');
});

// POST /carrinho/remover/:id - Remover produto do carrinho
router.post('/remover/:id', (req, res) => {
  init(req);
  req.session.carrinho = req.session.carrinho.filter(i => i.produtoId != req.params.id);
  res.redirect('/carrinho');
});

// GET /carrinho/checkout - Página de checkout separada (opcional)
router.get('/checkout', async (req, res) => {
  if (!req.session.usuarioId) {
    req.session.returnTo = '/carrinho/checkout';
    return res.redirect('/auth/login');
  }
  
  init(req);
  if (req.session.carrinho.length === 0) {
    req.flash('erros', [{ msg: 'Carrinho vazio' }]);
    return res.redirect('/carrinho');
  }
  
  try {
    const Usuario = require('../models/Usuario');
    const usuario = await Usuario.findByPk(req.session.usuarioId);
    
    res.render('carrinho/checkout', { 
      carrinho: req.session.carrinho, 
      erros: [], 
      dados: usuario || {} 
    });
  } catch (err) {
    console.error(err);
    res.status(500).render('erro', { mensagem: 'Erro ao carregar checkout' });
  }
});

// POST /carrinho/checkout/enviar - Enviar pedido via WhatsApp (rota alternativa)
router.post('/checkout/enviar', async (req, res) => {
  if (!req.session.usuarioId) {
    req.session.returnTo = '/carrinho/checkout';
    return res.redirect('/auth/login');
  }
  
  init(req);
  if (!req.session.carrinho || req.session.carrinho.length === 0) {
    req.flash('erros', [{ msg: 'Carrinho vazio' }]);
    return res.redirect('/carrinho');
  }

  const Usuario = require('../models/Usuario');
  const usuario = await Usuario.findByPk(req.session.usuarioId);
  const numeroWhatsApp = '5548991228152';
  
  const itens = req.session.carrinho.map(i => 
    `${i.nome} (x${i.quantidade}) - R$ ${(i.preco * i.quantidade).toFixed(2)}`
  ).join('\n');

  const total = req.session.carrinho.reduce((t, i) => t + (i.preco * i.quantidade), 0).toFixed(2);

  const mensagem = `🛍️ *NOVO PEDIDO* - IJ Personalizados%0A%0A` +
    `👤 Cliente: ${usuario?.nome || 'Não informado'}%0A` +
    `📞 Telefone: ${usuario?.telefone || 'Não informado'}%0A` +
    `📍 Endereço: ${usuario?.logradouro || ''}, ${usuario?.numero || ''} - ${usuario?.bairro || ''}, ${usuario?.cidade || ''}-${usuario?.estado || ''}%0A%0A` +
    `📦 *Itens:*%0A${itens}%0A%0A` +
    `💰 *Total:* R$ ${total}`;

  const url = `https://wa.me/${numeroWhatsApp}?text=${encodeURIComponent(mensagem)}`;
  res.redirect(url);
});

module.exports = router;