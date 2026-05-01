const express = require('express');
const Produto = require('../models/Produto');
const router = express.Router();

function init(req) { 
  if (!req.session.carrinho) req.session.carrinho = []; 
}

router.get('/', (req, res) => { 
  init(req); 
  res.render('carrinho', { carrinho: req.session.carrinho, erros: [], dados: {} }); 
});

router.post('/adicionar/:id', async (req, res) => {
  try {
    const produto = await Produto.findByPk(req.params.id);
    if (!produto || produto.estoque < 1) return res.status(404).send('Indisponivel');
    init(req);
    const c = req.session.carrinho;
    const idx = c.findIndex(i => i.produtoId == produto.id);
    if (idx > -1) c[idx].quantidade += 1;
    else c.push({ 
      produtoId: produto.id, 
      nome: produto.nome, 
      preco: parseFloat(produto.preco), 
      imagem: produto.imagem, 
      quantidade: 1 
    });
    req.session.carrinho = c;
    res.redirect('/carrinho');
  } catch (err) { 
    res.status(500).send('Erro'); 
  }
});

router.post('/atualizar', (req, res) => {
  init(req);
  const { id, quantidade } = req.body;
  const c = req.session.carrinho;
  const i = c.find(i => i.produtoId == id);
  if (i) i.quantidade = Math.max(1, parseInt(quantidade));
  req.session.carrinho = c;
  res.redirect('/carrinho');
});

router.post('/remover/:id', (req, res) => {
  init(req);
  req.session.carrinho = req.session.carrinho.filter(i => i.produtoId != req.params.id);
  res.redirect('/carrinho');
});

// Página de checkout com formulário
router.get('/checkout', (req, res) => {
  if (!req.session.usuarioId) return res.redirect('/auth/login');
  init(req);
  if (req.session.carrinho.length === 0) return res.redirect('/carrinho');
  
  const Usuario = require('../models/Usuario');
  Usuario.findByPk(req.session.usuarioId).then(usuario => {
    res.render('carrinho/checkout', { 
      carrinho: req.session.carrinho, 
      erros: [], 
      dados: usuario || {} 
    });
  });
});

// NOVA ROTA: Enviar pedido para WhatsApp
router.post('/checkout/enviar', async (req, res) => {
  if (!req.session.usuarioId) return res.redirect('/auth/login');
  init(req);
  if (!req.session.carrinho || req.session.carrinho.length === 0) {
    return res.redirect('/carrinho');
  }

  const Usuario = require('../models/Usuario');
  const usuario = await Usuario.findByPk(req.session.usuarioId);

  const numeroWhatsApp = '5548991228152'; // seu número Business
  const itens = req.session.carrinho.map(i => 
    `${i.nome} (x${i.quantidade}) - R$${(i.preco * i.quantidade).toFixed(2)}`
  ).join('\n');

  const total = req.session.carrinho.reduce((t,i)=>t+i.preco*i.quantidade,0).toFixed(2);

  const mensagem = `Novo Pedido:\n\nCliente: ${usuario?.nome || ''}\nTelefone: ${usuario?.telefone || ''}\nEndereço: ${usuario?.endereco || ''}\n\nItens:\n${itens}\n\nTotal: R$${total}`;

  const url = `https://wa.me/${numeroWhatsApp}?text=${encodeURIComponent(mensagem)}`;
  res.redirect(url);
});

module.exports = router;
