
const express = require('express');
const session = require('express-session');
const SequelizeStore = require('connect-session-sequelize')(session.Store);
const sequelize = require('./models/index');
const helmet = require('helmet');
const csrf = require('./middleware/csrf');
const rateLimit = require('express-rate-limit');
const cors = require('cors');
require('dotenv').config();

const app = express();
sequelize.sync();

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

app.use(cors({ origin: "https://ij-personalizados.onrender.com", credentials: true }));
app.use(rateLimit({ windowMs: 15 * 60 * 1000, max: 200 }));

const store = new SequelizeStore({ db: sequelize });
app.use(session({
  secret: process.env.SESSION_SECRET,
  store: store,
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: process.env.NODE_ENV === "production",
    httpOnly: true,
    maxAge: 86400000,
    sameSite: "lax"
  }
}));
store.sync();

app.use(express.urlencoded({ extended: true, limit: "1mb" }));
app.use(express.json({ limit: "1mb" }));
app.use(csrf);

app.use((req, res, next) => {
  res.locals.csrfToken = req.csrfToken();
  res.locals.usuario = req.session.usuarioId ? { id: req.session.usuarioId, nome: req.session.usuarioNome, role: req.session.usuarioRole } : null;
  res.locals.carrinhoCount = req.session.carrinho ? req.session.carrinho.length : 0;
  next();
});

app.set("view engine", "ejs");
app.set("views", "./views");
app.use(express.static("public"));

app.use("/", require("./routes/index"));
app.use("/auth", require("./routes/auth"));
app.use("/produtos", require("./routes/produtos"));
app.use("/carrinho", require("./routes/carrinho"));
app.use("/pedidos", require("./routes/pedidos"));
app.use("/admin", require("./routes/admin"));

app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).render("erro", { mensagem: "Ocorreu um erro inesperado." });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log("http://localhost:" + PORT));
