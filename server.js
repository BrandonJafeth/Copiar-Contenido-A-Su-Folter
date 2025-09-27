"use strict";

// Load environment variables
require('dotenv').config();

// Imports
const express = require("express");
const session = require("express-session");
const { auth, requiresAuth } = require('express-openid-connect');
var cons = require('consolidate');
var path = require('path');
let app = express();

// Globals - Using environment variables
const OKTA_ISSUER_URI = process.env.OKTA_ISSUER_URI;
const OKTA_CLIENT_ID = process.env.OKTA_CLIENT_ID;
const OKTA_CLIENT_SECRET = process.env.OKTA_CLIENT_SECRET;
const PORT = process.env.PORT || "3000";
const SECRET = process.env.SECRET;

// Configuración dinámica para Render
const getBaseURL = () => {
  if (process.env.NODE_ENV === 'production' && process.env.RENDER_EXTERNAL_URL) {
    return process.env.RENDER_EXTERNAL_URL;
  }
  return process.env.BASE_URL || 'http://localhost:3000';
};

const getCallbackURL = () => {
  const baseURL = getBaseURL();
  return `${baseURL}/callback`;
};

const getRedirectURI = () => {
  const baseURL = getBaseURL();
  return `${baseURL}/dashboard`;
};

//  Configuración de Auth0 usando variables de entorno
const config = {
  authRequired: process.env.AUTH_REQUIRED === 'true',
  auth0Logout: process.env.AUTH0_LOGOUT === 'true',
  secret: SECRET,
  baseURL: getBaseURL(),
  clientID: OKTA_CLIENT_ID,
  issuerBaseURL: process.env.ISSUER_BASE_URL
};

// MVC View Setup
app.engine('html', cons.swig)
app.set('views', path.join(__dirname, 'views'));
app.set('models', path.join(__dirname, 'models'));
app.set('view engine', 'html');

// App middleware (ANTES de auth)
app.use("/static", express.static("static"));

// Configurar sesión ANTES del auth middleware
app.use(session({
  cookie: { 
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production', // HTTPS en producción
    maxAge: 24 * 60 * 60 * 1000 // 24 horas
  },
  secret: SECRET,
  resave: false,
  saveUninitialized: false,
  name: 'sessionId'
}));

// Configuración mejorada de Auth0
const authConfig = {
  authRequired: false,
  auth0Logout: true,
  secret: SECRET,
  baseURL: getBaseURL(),
  clientID: OKTA_CLIENT_ID,
  issuerBaseURL: process.env.ISSUER_BASE_URL,
  clientSecret: OKTA_CLIENT_SECRET,
  routes: {
    callback: '/callback',
    login: '/login',
    logout: '/logout',
    postLogoutRedirect: getBaseURL() // Redirige a la base URL después del logout
  },
  session: {
    absoluteDuration: 24 * 60 * 60 * 1000, // 24 horas
    rolling: true,
    rollingDuration: 60 * 60 * 1000 // 1 hora de inactividad
  }
};

// auth router attaches /login, /logout, and /callback routes to the baseURL
app.use(auth(authConfig));

// App routes
app.get("/",  (req, res) => {
  res.render("index");  
});

app.get("/dashboard", requiresAuth(), (req, res) => {  
  try {
    // Usar req.oidc.user en lugar de decodificar manualmente
    const userInfo = req.oidc.user;
    res.render("dashboard", { user: userInfo });
  } catch (error) {
    console.error('Error en dashboard:', error);
    res.redirect('/');
  }
});

// Iniciar servidor
console.log("Server starting...");
console.log("Environment:", process.env.NODE_ENV || 'development');
console.log("Base URL:", getBaseURL());
console.log("Callback URL:", getCallbackURL());
console.log("Redirect URI:", getRedirectURI());
console.log("Port:", PORT);

app.listen(parseInt(PORT), () => {
  console.log(`Server running on port: ${PORT}`);
  console.log(`Visit: ${getBaseURL()}`);
  console.log(`Login: ${getBaseURL()}/login`);
});