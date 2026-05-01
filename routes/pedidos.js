const express = require('express');
const auth = require('../middleware/auth');
const Pedido = require('../models/Pedido');
const ItemPedido = require('../models/ItemPedido');
const Usuario = require('../models/Usuario');
const router = express.Router();

// NÚMERO DO SEU WHATSAPP (coloque seu número com DDD)
const SEU_WHATSAPP = '5548991228152'; // ⚠️ TROQUE PELO SEU NÚMERO!

router.get('/', auth, async (req, res) => {
  try {
    const pedidos = await Pedido.findAll({
      where: { UsuarioId: req.session.usuarioId },
      include: [ItemPedido],
      order: [['createdAt', 'DESC']]
    });
    res.render('pedidos/index', { pedidos });
  } catch (err) { res.status(500).render('erro', { mensagem: 'Erro ao carregar pedidos.' }); }
});

router.post('/checkout', auth, async (req, res) => {
  if (!req.session.carrinho || req.session.carrinho.length === 0) return res.redirect('/carrinho');
  try {
    const u = await Usuario.findByPk(req.session.usuarioId);
    const end = (u.logradouro || '') + ', ' + (u.numero || 's/n') + ' - ' + (u.bairro || '') + ', ' + (u.cidade || '') + '-' + (u.estado || '');
    let t = 0;
    req.session.carrinho.forEach(i => t += i.preco * i.quantidade);
    
    const ped = await Pedido.create({ 
      total: t, 
      endereco_entrega: end, 
      UsuarioId: u.id, 
      status: 'pago' 
    });
    
    for (const i of req.session.carrinho) {
      await ItemPedido.create({ 
        quantidade: i.quantidade, 
        preco_unitario: i.preco, 
        PedidoId: ped.id, 
        ProdutoId: i.produtoId 
      });
    }

    // 📱 MONTAR MENSAGEM PARA WHATSAPP
    let mensagem = `🛍️ *NOVO PEDIDO #${ped.id}* - IJ Personalizados%0A%0A`;
    mensagem += `👤 *Cliente:* ${u.nome}%0A`;
    mensagem += `📧 *E-mail:* ${u.email}%0A`;
    mensagem += `📞 *Telefone:* ${u.telefone || 'Não informado'}%0A%0A`;
    mensagem += `📦 *Itens:*%0A`;
    
    req.session.carrinho.forEach((item, index) => {
      mensagem += `${index + 1}. ${item.nome} - ${item.quantidade}x - R$ ${(item.preco * item.quantidade).toFixed(2)}%0A`;
    });
    
    mensagem += `%0A💰 *Total:* R$ ${t.toFixed(2)}%0A`;
    mensagem += `📍 *Entrega:* ${end}%0A`;
    mensagem += `📅 *Data:* ${new Date().toLocaleString('pt-BR')}`;

    const whatsappLink = `https://wa.me/${SEU_WHATSAPP}?text=${mensagem}`;

    req.session.carrinho = [];
    req.session.pedidoFinalizado = { id: ped.id, whatsappLink };
    
    res.redirect('/pedidos/confirmacao');
  } catch (err) { 
    console.error(err);
    res.status(500).render('erro', { mensagem: 'Erro ao finalizar compra.' }); 
  }
});

// Nova rota de confirmação
router.get('/confirmacao', auth, (req, res) => {
  const pedido = req.session.pedidoFinalizado;
  if (!pedido) return res.redirect('/pedidos');
  delete req.session.pedidoFinalizado;
  res.render('pedidos/confirmacao', { pedido });
});

module.exports = router;