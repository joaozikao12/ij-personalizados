const express = require('express');
const auth = require('../middleware/auth');
const { body, validationResult } = require('express-validator');
const Pedido = require('../models/Pedido');
const ItemPedido = require('../models/ItemPedido');
const Usuario = require('../models/Usuario');
const router = express.Router();

const SEU_WHATSAPP = '5548991228152'; // ⚠️ TROQUE PELO SEU NÚMERO!

// Listar pedidos
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

// Finalizar compra (checkout)
router.post('/checkout', auth, [
  body('nome').trim().isLength({ min: 3 }),
  body('telefone').notEmpty(),
  body('cep').notEmpty(),
  body('logradouro').notEmpty(),
  body('numero').notEmpty(),
  body('bairro').notEmpty(),
  body('cidade').notEmpty(),
  body('estado').isLength({ min: 2, max: 2 })
], async (req, res) => {
  const erros = validationResult(req);
  if (!erros.isEmpty()) {
    return res.render('carrinho/checkout', { 
      carrinho: req.session.carrinho, 
      erros: erros.array(), 
      dados: req.body 
    });
  }

  if (!req.session.carrinho || req.session.carrinho.length === 0) {
    return res.redirect('/carrinho');
  }

  try {
    // Atualizar dados do usuário
    await Usuario.update({
      nome: req.body.nome,
      telefone: req.body.telefone,
      cep: req.body.cep,
      logradouro: req.body.logradouro,
      numero: req.body.numero,
      complemento: req.body.complemento,
      bairro: req.body.bairro,
      cidade: req.body.cidade,
      estado: req.body.estado
    }, { where: { id: req.session.usuarioId } });

    const endereco = `${req.body.logradouro}, ${req.body.numero} - ${req.body.complemento || ''} - ${req.body.bairro}, ${req.body.cidade}-${req.body.estado} - CEP: ${req.body.cep}`;
    
    let total = 0;
    req.session.carrinho.forEach(i => total += i.preco * i.quantidade);

    const pedido = await Pedido.create({
      total: total,
      endereco_entrega: endereco,
      UsuarioId: req.session.usuarioId,
      status: 'pago'
    });

    for (const i of req.session.carrinho) {
      await ItemPedido.create({
        quantidade: i.quantidade,
        preco_unitario: i.preco,
        PedidoId: pedido.id,
        ProdutoId: i.produtoId
      });
    }

    // Mensagem WhatsApp
    let mensagem = `🛍️ *NOVO PEDIDO #${pedido.id}* - IJ Personalizados%0A%0A`;
    mensagem += `👤 *Cliente:* ${req.body.nome}%0A`;
    mensagem += `📧 *E-mail:* ${req.session.usuarioEmail || 'N/A'}%0A`;
    mensagem += `📞 *Telefone:* ${req.body.telefone}%0A%0A`;
    mensagem += `📦 *Itens:*%0A`;
    
    req.session.carrinho.forEach((item, index) => {
      mensagem += `${index + 1}. ${item.nome} - ${item.quantidade}x - R$ ${(item.preco * item.quantidade).toFixed(2)}%0A`;
    });
    
    mensagem += `%0A💰 *Total:* R$ ${total.toFixed(2)}%0A`;
    mensagem += `💳 *Pagamento:* ${req.body.pagamento}%0A`;
    mensagem += `📍 *Entrega:* ${endereco}%0A`;
    mensagem += `📅 *Data:* ${new Date().toLocaleString('pt-BR')}`;

    const whatsappLink = `https://wa.me/${SEU_WHATSAPP}?text=${mensagem}`;

    req.session.carrinho = [];
    req.session.pedidoFinalizado = { id: pedido.id, whatsappLink };
    
    res.redirect('/pedidos/confirmacao');
  } catch (err) {
    console.error(err);
    res.status(500).render('erro', { mensagem: 'Erro ao finalizar compra.' });
  }
});

// Página de confirmação
router.get('/confirmacao', auth, (req, res) => {
  const pedido = req.session.pedidoFinalizado;
  if (!pedido) return res.redirect('/pedidos');
  delete req.session.pedidoFinalizado;
  res.render('pedidos/confirmacao', { pedido });
});

module.exports = router;