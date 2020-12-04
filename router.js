let Url = require('url-parse');
const customers = require("./local-modules/customers.js");
const rates = require("./local-modules/rates.js")
const querystring = require("querystring");
const webhooks = require("./local-modules/webhooks.js");
exports.route = function(req, res, db, body){
  let urlObj = new Url(req.url);
	console.log(urlObj.pathname, req.method);
  if (req.method === "OPTIONS"){
    res.writeHead(200, {'Access-Control-Allow-Origin':'*',
    'Access-Control-Allow-Methods' : 'GET, POST, PATCH, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Headers' : 'Origin, Content-Type, X-Auth-Token, Access-Control-Allow-Origin'});
    res.end();
    return
  }

  if (urlObj.pathname === "/v1/customers"){
    return customers.post(req, res, db, body);
  }

  if (urlObj.pathname === "/v1/customers/login_tokens"){
    return customers.loginTokens.post(req, res, db, body);
  }

  if (urlObj.pathname === "/v1/customers/data"){
    return customers.data.post(req, res, db, body);
  }

  if (urlObj.pathname === "/v1/customers/identities"){
    if (req.method === "POST"){
      return customers.identities.post(req, res, db, body);
    }
    if (req.method === "GET"){
      let body = querystring.decode(urlObj.query);
      return customers.identities.get(req, res, db, body);
    }
  }

  if (urlObj.pathname === "/v1/stripe_connect_accounts/confirmations"){
	  console.log(12);
    if (req.method === "GET"){
      let body = querystring.decode(urlObj.query);
      return customers.stripeConnectAccounts.confirmations.get(req, res, db, body);
    }
  }

  if (urlObj.pathname === "/v1/customers/stripe_connect_accounts/login_links"){
    if (req.method === "POST"){
	    console.log(00);
      return customers.stripeConnectAccounts.loginLinks.post(req, res, db, body);
    }
  }
  if (urlObj.pathname === "/v1/customers/transactions"){
    if (req.method === "POST"){
      return customers.transactions.post(req, res, db, body);
    }
  }
  if (urlObj.pathname === "/v1/customers/transactions/records"){
    if (req.method === "POST"){
      return customers.transactions.records.post(req, res, db, body);
    }
  }
  if (urlObj.pathname === "/v1/customers/transactions/refunds"){
    if (req.method === "POST"){
      return customers.transactions.refunds(req, res, db, body);
    }
  }
  if (urlObj.pathname === "/v1/webhooks/stripe"){
    return webhooks.stripe(req, res, db, body);
  }
  if (urlObj.pathname === "/v1/webhooks/twilio"){
    return webhooks.twilio(req, res, db, querystring.parse(body));
  }
  if (urlObj.pathname === "/v1/check"){
    res.writeHead(200);
    res.write("OK");
    res.end();
	  return
  }
  if (urlObj.pathname === "/v1/rates"){
    return rates.get(req, res, db);
  }
  if (urlObj.pathname === "/v1/rates/tip_suggestions"){
    return rates.tipSuggestions.get(req, res, db);
  }
  if (urlObj.pathname === "/v1/customers/unlock"){
    return customers.unlock(req, res, db, body);
  }
  if (urlObj.pathname === "/v1/customers/lock"){
    return customers.lock(req, res, db, body);
  }
  if (urlObj.pathname === "/v1/customers/cards"){
	  return customers.cards(req, res, db, body)
  }
}

// curl -X POST -d '{"amt":2,"type":"onetime"}' localhost:8008/v1/payment-processing/charges
