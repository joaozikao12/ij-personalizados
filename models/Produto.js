
const { DataTypes } = require('sequelize');
const sequelize = require('./index');
module.exports = sequelize.define('Produto', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  nome: { type: DataTypes.STRING(100), allowNull: false },
  descricao: DataTypes.TEXT,
  preco: { type: DataTypes.DECIMAL(10,2), allowNull: false },
  imagem: DataTypes.STRING(255),
  estoque: { type: DataTypes.INTEGER, defaultValue: 0 }
});
