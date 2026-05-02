const express = require('express');
const auth = require('../middleware/auth');
const { body, validationResult } = require('express-validator');
const Pedido = require('../models/Pedido');
const ItemPedido = require('../models/ItemPedido');
const Usuario = require('../models/Usuario');
const router = express.Router();

const SEU_WHATSAPP = '5548991228152';

// Listar pedidos do usuário
router.get('/', auth, async (req, res) => {
  try {
    const pedidos = await Pedido.findAll({
      where: { UsuarioId: req.session.usuarioId },
      include: [ItemPedido],
      order: [['createdAt', 'DESC']]
    });
    res.render('pedidos/index', { pedidos });
  } catch (err) { 
    console.error(err);
    res.status(500).render('erro', { mensagem: 'Erro ao carregar pedidos.' }); 
  }
});

// ✅ ROTA CORRIGIDA - Finalizar compra
router.post('/checkout', auth, async (req, res) => {
  // Verificar carrinho
  if (!req.session.carrinho || req.session.carrinho.length === 0) {
    req.flash('erros', [{ msg: 'Carrinho vazio' }]);
    return res.redirect('/carrinho');
  }

  // Validar campos obrigatórios
  const { nome, telefone, cep, logradouro, numero, bairro, cidade, estado, pagamento } = req.body;
  let erros = [];

  if (!nome) erros.push({ msg: 'Nome é obrigatório' });
  if (!telefone) erros.push({ msg: 'Telefone é obrigatório' });
  if (!cep) erros.push({ msg: 'CEP é obrigatório' });
  if (!logradouro) erros.push({ msg: 'Logradouro é obrigatório' });
  if (!numero) erros.push({ msg: 'Número é obrigatório' });
  if (!bairro) erros.push({ msg: 'Bairro é obrigatório' });
  if (!cidade) erros.push({ msg: 'Cidade é obrigatória' });
  if (!estado) erros.push({ msg: 'Estado é obrigatório' });

  if (erros.length > 0) {
    req.flash('erros', erros);
    req.flash('dados', req.body);
    return res.redirect('/carrinho');
  }

  try {
    // Atualizar dados do usuário
    await Usuario.update({
      nome: nome,
      telefone: telefone,
      cep: cep,
      logradouro: logradouro,
      numero: numero,
      complemento: req.body.complemento || '',
      bairro: bairro,
      cidade: cidade,
      estado: estado
    }, { where: { id: req.session.usuarioId } });

    // Montar endereço completo
    const endereco = `${logradouro}, ${numero}${req.body.complemento ? ' - ' + req.body.complemento : ''} - ${bairro}, ${cidade}-${estado} - CEP: ${cep}`;
    
    // Calcular total
    let total = 0;
    req.session.carrinho.forEach(i => total += i.preco * i.quantidade);

    // Criar pedido no banco
    const pedido = await Pedido.create({
      total: total,
      endereco_entrega: endereco,
      UsuarioId: req.session.usuarioId,
      status: 'pago'
    });

    // Criar itens do pedido
    for (const i of req.session.carrinho) {
      await ItemPedido.create({
        quantidade: i.quantidade,
        preco_unitario: i.preco,
        PedidoId: pedido.id,
        ProdutoId: i.produtoId
      });
    }

    // Montar mensagem para WhatsApp
    let mensagem = `🛍️ *NOVO PEDIDO #${pedido.id}* - IJ Personalizados%0A%0A`;
    mensagem += `👤 *Cliente:* ${nome}%0A`;
    mensagem += `📞 *Telefone:* ${telefone}%0A%0A`;
    mensagem += `📦 *Itens:*%0A`;
    
    req.session.carrinho.forEach((item, index) => {
      mensagem += `${index + 1}. ${item.nome} - ${item.quantidade}x - R$ ${(item.preco * item.quantidade).toFixed(2)}%0A`;
    });
    
    mensagem += `%0A💰 *Total:* R$ ${total.toFixed(2)}%0A`;
    mensagem += `💳 *Pagamento:* ${pagamento}%0A`;
    mensagem += `📍 *Entrega:* ${endereco}%0A`;
    mensagem += `📅 *Data:* ${new Date().toLocaleString('pt-BR')}`;

    const whatsappLink = `https://wa.me/${SEU_WHATSAPP}?text=${mensagem}`;

    // Limpar carrinho e salvar dados do pedido finalizado
    req.session.carrinho = [];
    req.session.pedidoFinalizado = { id: pedido.id, whatsappLink };
    
    res.redirect('/pedidos/confirmacao');
  } catch (err) {
    console.error('Erro no checkout:', err);
    req.flash('erros', [{ msg: 'Erro ao finalizar compra. Tente novamente.' }]);
    req.flash('dados', req.body);
    res.redirect('/carrinho');
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