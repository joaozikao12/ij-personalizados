
const { DataTypes } = require('sequelize');
const sequelize = require('./index');
const Pedido = require('./Pedido');
const Produto = require('./Produto');

const ItemPedido = sequelize.define('ItemPedido', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  quantidade: { type: DataTypes.INTEGER, allowNull: false },
  preco_unitario: { type: DataTypes.DECIMAL(10,2), allowNull: false }
});

ItemPedido.belongsTo(Pedido);
Pedido.hasMany(ItemPedido);
ItemPedido.belongsTo(Produto);
Produto.hasMany(ItemPedido);
module.exports = ItemPedido;
