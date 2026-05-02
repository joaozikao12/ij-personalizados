const express = require('express');
const session = require('express-session');
const SequelizeStore = require('connect-session-sequelize')(session.Store);
const sequelize = require('./models/index');
const helmet = require('helmet');
const csrf = require('./middleware/csrf');           // confirme o caminho (pode ser ./middlewares/csrf)
const rateLimit = require('express-rate-limit');
const cors = require('cors');
const flash = require('connect-flash');               // 🔹 ADICIONADO
require('dotenv').config();

const app = express();

// Sincronizar banco ANTES de tudo
sequelize.sync({ force: false }).then(() => {
  console.log('✅ Banco de dados sincronizado');
}).catch(err => {
  console.error('❌ Erro no banco:', err);
});

// Segurança
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "https://cdn.jsdelivr.net"],
      styleSrc: ["'self'", "https://cdn.jsdelivr.net", "'unsafe-inline'"],
      imgSrc: ["'self'", "data:", "https:"],
    }
  },
  hsts: { maxAge: 31536000, includeSubDomains: true, preload: true }
}));

app.use(cors({ origin: "*", credentials: true }));
app.use(rateLimit({ windowMs: 15 * 60 * 1000, max: 200 }));

// Sessão
const store = new SequelizeStore({ db: sequelize });
app.use(session({
  secret: process.env.SESSION_SECRET || 'IJpersonalizados2024@Seguro!',
  store: store,
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: false,           // coloque true se estiver em produção com HTTPS
    httpOnly: true,
    maxAge: 86400000,
    sameSite: "lax"
  }
}));
store.sync();

// Flash messages (deve vir depois da sessão)
app.use(flash());

// Parse de formulários
app.use(express.urlencoded({ extended: true, limit: "1mb" }));
app.use(express.json({ limit: "1mb" }));

// CSRF (depois do body parser)
app.use(csrf);

// 🔹 Variáveis globais para todas as views (sempre disponíveis)
app.use((req, res, next) => {
  res.locals.csrfToken = req.csrfToken();
  res.locals.usuario = req.session.usuarioId ? { 
    id: req.session.usuarioId, 
    nome: req.session.usuarioNome, 
    role: req.session.usuarioRole 
  } : null;
  res.locals.carrinhoCount = req.session.carrinho ? req.session.carrinho.length : 0;
  
  // 🔹 Disponibiliza flash messages para as views
  res.locals.erros = req.flash('erros');      // array de erros
  res.locals.dados = req.flash('dados')[0] || {};  // dados preenchidos (se houver)
  
  next();
});

// Configuração do template engine
app.set("view engine", "ejs");
app.set("views", "./views");
app.use(express.static("public"));

// Rotas
app.use("/", require("./routes/index"));
app.use("/auth", require("./routes/auth"));
app.use("/produtos", require("./routes/produtos"));
app.use("/carrinho", require("./routes/carrinho"));
app.use("/pedidos", require("./routes/pedidos"));
app.use("/admin", require("./routes/admin"));

// Tratamento de erro 500 (deve ficar por último)
app.use((err, req, res, next) => {
  console.error('❌ Erro interno:', err.stack);
  res.status(500).render("erro", { mensagem: "Ocorreu um erro inesperado." });
});

// Criar admin automaticamente (evite setTimeout, use async logo após sync)
setTimeout(async () => {
  const Usuario = require('./models/Usuario');
  try {
    const adminExistente = await Usuario.findOne({ where: { email: 'admin@ijpersonalizados.com' } });
    if (!adminExistente) {
      await Usuario.create({
        nome: 'Administrador IJ',
        email: 'admin@ijpersonalizados.com',
        senha_hash: 'Admin@123',
        role: 'admin'
      });
      console.log('✅ Admin criado com sucesso!');
    } else {
      console.log('✅ Admin já existe!');
    }
  } catch (err) {
    console.log('⚠️ Erro ao criar admin:', err.message);
  }
}, 3000);
app.get('/teste', (req, res) => {
  res.render('teste');
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`🚀 Servidor rodando na porta ${PORT}`));