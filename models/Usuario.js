const { DataTypes } = require('sequelize');
const sequelize = require('./index');
const bcrypt = require('bcrypt');

const Usuario = sequelize.define('Usuario', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  nome: { type: DataTypes.STRING(100), allowNull: false },
  email: { type: DataTypes.STRING(150), allowNull: false, unique: true, validate: { isEmail: true } },
  senha_hash: { type: DataTypes.STRING, allowNull: false },
  role: { type: DataTypes.ENUM('cliente', 'admin'), defaultValue: 'cliente' },
  cep: DataTypes.STRING(9),
  logradouro: DataTypes.STRING(200),
  numero: DataTypes.STRING(10),
  complemento: DataTypes.STRING(100),
  bairro: DataTypes.STRING(100),
  cidade: DataTypes.STRING(100),
  estado: DataTypes.STRING(2),
  telefone: DataTypes.STRING(15)
}, {
  hooks: {
    beforeCreate: async (u) => {
      const salt = await bcrypt.genSalt(12);
      u.senha_hash = await bcrypt.hash(u.senha_hash, salt);
    },
    beforeUpdate: async (u) => {
      if (u.changed('senha_hash')) {
        const salt = await bcrypt.genSalt(12);
        u.senha_hash = await bcrypt.hash(u.senha_hash, salt);
      }
    }
  },
  defaultScope: { attributes: { exclude: ['senha_hash'] } },
  scopes: { comSenha: { attributes: {} } }
});

Usuario.prototype.validarSenha = async function(senha) {
  return bcrypt.compare(senha, this.senha_hash);
};

module.exports = Usuario;
