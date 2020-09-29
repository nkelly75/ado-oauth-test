const express = require('express');
const router = express.Router();
const qs = require('qs');
const axios = require('axios');
const buildUrl = require('build-url');
const { v4: uuidv4 } = require('uuid');

const authzUrl = 'https://app.vssps.visualstudio.com/oauth2/authorize';
const tokenUrl = 'https://app.vssps.visualstudio.com/oauth2/token';

let authorizationRequests = {};

function initTokenInfo(pending) {
  return {
    accessToken: null,
    tokenType: null,
    refreshToken: null,
    scope: null,
    expiresIn: -1,
    isPending: pending
  };
}

function getAuthorizationUrl(state) {
  let queryParams = {
    client_id: process.env.ADO_CLIENT_ID,
    response_type: 'Assertion',
    state: state,
    scope: 'vso.code_write',
    redirect_uri: process.env.OAUTH_CALLBACK_URL
  };

  return buildUrl(authzUrl, {
    queryParams: queryParams
  });
}

router.get('/', function (req, res, next) {
  res.render('oauth', {});
});

router.get('/authorize', function (req, res, next) {
  const guid = uuidv4();
  authorizationRequests[guid] = initTokenInfo(true);

  let redirectURL = getAuthorizationUrl(guid);

  res.redirect(redirectURL);
});

router.get('/callback', async function (req, res, next) {
  let code = null;
  let state = null;
  let error = null;
  let result = {
    title: 'DevOps OAuth: Results'
  };

  if (req.query && req.query.code) {
    code = req.query.code;
  }
  if (req.query && req.query.state) {
    state = req.query.state;
  }

  if (!code) {
    error = 'Invalid auth code';
  } else if (!state) {
    error = 'Invalid authorization request key';
  } else {
    let tokenInfo = authorizationRequests[state];
    if (!tokenInfo) {
      error = 'Unknown authorization request key';
    } else if (!tokenInfo.isPending) {
      error = 'Authorization request key already used';
    } else {
      // mark the state value as used so it can't be reused
      authorizationRequests[state].isPending = false;
    }
  }

  if (error) {
    console.log('Error in /callback: ' + error);
    result.error = error;
  } else {
    let queryParams = {
      'client_assertion_type': 'urn:ietf:params:oauth:client-assertion-type:jwt-bearer',
      'client_assertion': process.env.ADO_CLIENT_APP_SECRET,
      'grant_type': 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      'assertion': code,
      'redirect_uri': process.env.OAUTH_CALLBACK_URL
    };

    try {
      const response = await axios({
        method: 'post',
        url: tokenUrl,
        data: qs.stringify(queryParams),
        headers: {
          'content-type': 'application/x-www-form-urlencoded'
        }
      });

      if (response.data) {
        authorizationRequests[state].accessToken = response.data.access_token;
        authorizationRequests[state].tokenType = response.data.token_type;
        authorizationRequests[state].refreshToken = response.data.refresh_token;
        authorizationRequests[state].expiresIn = response.data.expires_in;
        authorizationRequests[state].scope = response.data.scope;

        req.session.accessToken = response.data.access_token;
        req.session.refreshToken = response.data.refresh_token;

        req.session.save(function(err) {
          if (err) {
            console.error(`Error attempting to save session: ${err}`);
          }
        });
      }

      result.tokenInfo = authorizationRequests[state];
    } catch (err) {
      console.log('error from POST to token endpoint');
      console.dir(err);
      result.error = 'Token request failed';
    }
  }
  res.render('result', result);
});

module.exports = router;
