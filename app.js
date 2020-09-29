var createError = require('http-errors');
var express = require('express');
var session = require('express-session');
var path = require('path');
var cookieParser = require('cookie-parser');
var logger = require('morgan');

const { ManagedIdentityCredential } = require('@azure/identity');
const { SecretClient } = require('@azure/keyvault-secrets');

if (!(process.env.OAUTH_CALLBACK_URL && process.env.KV_NAME)) {
  console.error('Please configure OAUTH_CALLBACK_URL and KV_NAME variables');
  process.exit(1);
}

async function getSecrets() {
  const credential = new ManagedIdentityCredential();
  const vaultName = process.env.KV_NAME;
  const url = `https://${vaultName}.vault.azure.net`;
  const client = new SecretClient(url, credential);
  let secret;

  secret = await client.getSecret('ado-client-id');
  process.env.ADO_CLIENT_ID = secret.value;

  secret = await client.getSecret('ado-client-app-secret');
  process.env.ADO_CLIENT_APP_SECRET = secret.value;

  secret = await client.getSecret('ado-client-sess-enc');
  process.env.ADO_CLIENT_SESS_ENC = secret.value;
}

function init() {

  return new Promise(function (resolve, reject) {

    getSecrets().then(() => {
      console.log('Got secrets successfully');

      var indexRouter = require('./routes/index');
      var oauthRouter = require('./routes/oauth');
      var devopsRouter = require('./routes/devops');

      var app = express();
      app.set('trust proxy', 1) // required for secure: true to work for cookie
      app.use(session({
        secret: process.env.ADO_CLIENT_SESS_ENC,
        resave: false,
        saveUninitialized: true,
        name: 'tw.ado.sid',
        cookie: {
          httpOnly: true,
          secure: true,
          sameSite: true,
          maxAge: 3600000
        }
      }));

      // view engine setup
      app.set('views', path.join(__dirname, 'views'));
      app.set('view engine', 'pug');

      app.use(logger('dev'));
      app.use(express.json());
      app.use(express.urlencoded({ extended: false }));
      app.use(cookieParser());
      app.use(express.static(path.join(__dirname, 'public')));

      app.use('/', indexRouter);
      app.use('/oauth', oauthRouter);
      app.use('/devops', devopsRouter);

      // catch 404 and forward to error handler
      app.use(function(req, res, next) {
        next(createError(404));
      });

      // error handler
      app.use(function(err, req, res, next) {
        // set locals, only providing error in development
        res.locals.message = err.message;
        res.locals.error = req.app.get('env') === 'development' ? err : {};

        // render the error page
        res.status(err.status || 500);
        res.render('error');
      });

      resolve(app);
    }).catch((err) => {
      console.error(`Error getting secret(s). code: ${err.code} message: ${err.message}. Exiting.`);
      process.exit(1);
    });
  });
}

module.exports.init = init;
