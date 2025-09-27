"use strict";

// Load environment variables
require('dotenv').config();

// Imports
const express = require("express");
const session = require("express-session");
const ExpressOIDC = require("@okta/oidc-middleware").ExpressOIDC;
const { auth } = require('express-openid-connect');
const { requiresAuth } = require('express-openid-connect');
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

let oidc = new ExpressOIDC({
  issuer: OKTA_ISSUER_URI,
  client_id: OKTA_CLIENT_ID,
  client_secret: OKTA_CLIENT_SECRET,
  redirect_uri: getRedirectURI(),
  routes: { callback: { defaultRedirect: getRedirectURI() } },
  scope: 'openid profile'
});

// auth router attaches /login, /logout, and /callback routes to the baseURL
app.use(auth(config));

// MVC View Setup
app.engine('html', cons.swig)
app.set('views', path.join(__dirname, 'views'));
app.set('models', path.join(__dirname, 'models'));
app.set('view engine', 'html');

// App middleware
app.use("/static", express.static("static"));

app.use(session({
  cookie: { 
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production' // HTTPS en producción
  },
  secret: SECRET,
  resave: false,
  saveUninitialized: false
}));

// App routes
app.use(oidc.router);

app.get("/",  (req, res) => {
  res.render("index");  
});

app.get("/dashboard", requiresAuth() ,(req, res) => {  
  var payload = Buffer.from(req.appSession.id_token.split('.')[1], 'base64').toString('utf-8');
  const userInfo = JSON.parse(payload);
  res.render("dashboard", { user: userInfo });
});

const openIdClient = require('openid-client');
openIdClient.Issuer.defaultHttpOptions.timeout = 20000;

oidc.on("ready", () => {
  console.log("Server running on port: " + PORT);
  console.log("Base URL: " + getBaseURL());
  app.listen(parseInt(PORT));
});

oidc.on("error", err => {
  console.error(err);
});