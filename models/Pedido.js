const { DataTypes } = require('sequelize');
const sequelize = require('./index');
const Usuario = require('./Usuario');

const Pedido = sequelize.define('Pedido', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  status: { type: DataTypes.ENUM('carrinho', 'pago', 'enviado', 'entregue'), defaultValue: 'pago' },
  total: DataTypes.DECIMAL(10,2),
  endereco_entrega: DataTypes.TEXT
});

Pedido.belongsTo(Usuario);
Usuario.hasMany(Pedido);

module.exports = Pedido;
