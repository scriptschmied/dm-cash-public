const cryptoRandomString = require("crypto-random-string");
const schema = require("./utilities/schema.js");
const { v4: uuidv4 } = require("../node_modules/uuid");
const mongolf = require('./utilities/mongolf.js');
const stripen = require('./utilities/stripen.js');
const tokenada = require('./utilities/tokenada.js');
const crypto = require('crypto');
const twilily = require('./utilities/twilily.js');
let appJSONHeader = {"Content-Type" : "application/json"};
let tHtmlHeader = {"Content-Type" : "text/plain"};
let trailingCatch = function(err, res){
  try {
    err = JSON.parse(err.message);
  }
  catch {
    let error = schema.errors.internalServerError;
    let message = JSON.stringify(error);
    res.writeHead(error.head);
    res.write(message);
    res.end();
    return
  }
  res.writeHead(err.head);
  err = JSON.stringify(err);
  res.write(err);
  res.end();
  return
}

exports.post = function(req, res, db, body){
    let parsedBody = JSON.parse(body);
    let unsafeCustomer = schema.auditAndReturn(parsedBody, schema.customerPostReq);
    let validValuesCheck = schema.validateCountryAndCurrency(
      unsafeCustomer.cnt,
      unsafeCustomer.curr
    );

    if (!unsafeCustomer || !validValuesCheck){
      let err = schema.errors.badRequest
      err.message = "You selected an invalid country or currency, or otherwise had an invalidly formatted request."
      let message = JSON.stringify(err)
      res.writeHead(err.head);
      res.write(message);
      res.end();
	    return
    }

    let customer = {
      email : unsafeCustomer.email,
      pw : unsafeCustomer.pw,
      localizationInformation : {
        curr : unsafeCustomer.curr,
        cnt : unsafeCustomer.cnt
      },
	     acceptedTermsAndConditions : unsafeCustomer.acceptedTermsAndConditions,
       tierThreeTxValue : 0
    }
    return mongolf.mustNotFindOne(db, "customers", {email : customer.email})
    .then(function(){
	    console.log('DONE3');
        customer.id = uuidv4();
        customer.salt = cryptoRandomString({length : 5});
        customer.pw = crypto.createHash('sha256').update(customer.pw + customer.salt).digest('hex');
        customer["stripeCustomerId"] = uuidv4();

        let loginToken = tokenada.generateLoginToken(customer.id);
        customer.activeToken = tokenada.hashLoginToken(loginToken);

        return Promise.all([stripen.pCustomerCreate(customer.id, customer.cnt, customer.curr, customer["stripeCustomerId"]), loginToken,
          mongolf.insertOne(db, "customers", customer), customer.stripeCustomerId])
    })
    .then(function(values){
      return mongolf.updateOne(db, "customers", {"stripeCustomerId" : values[3]}, {"$set" : {"appState" : "awaiting_identities"}})
      .then(function(){
        return values
      })
    })
    .then(function(values){
        let customerId = values[3], loginToken = values[1];
        return Promise.all([stripen.pSetupCreate(customerId), loginToken]);
    })
    .then(function(values){
	    console.log('DONE4');
        let responseTokenStr = JSON.stringify({
          setupIntentSecret : values[0]["client_secret"],
          responseToken : values[1]
        });
        res.writeHead(200, {'Content-Type':'application/json'});
        res.write(responseTokenStr);
        res.end();
        return
    })
    .catch(function(err){
	    console.log(err);
      return trailingCatch(err, res);
    })
}

exports.data = {
	post : function(req, res, db, body){
          let parsedBody = JSON.parse(body);
          let unsafeBody = schema.auditAndReturn(parsedBody, schema.customerDataPostReq);
          let token = {cust : unsafeBody.cust, tokenId : unsafeBody.tokenId}
          if (!token){
            let err = schema.errors.badRequest;
		        err.message = `Your login token is improperly formatted. Click 'Log Out' and close the extension to try again, or try in a different window.`
            let message = JSON.stringify(err);
            res.writeHead(err.head);
            res.write(message);
            res.end();
            return
          }

          return mongolf.mustFindOne(db, "customers", {id : token.cust})
          .then(function(customer){
            tokenada.validateLoginToken(token, customer.activeToken);
            return Promise.all([customer, stripen.pCardRetrieve(customer.stripeCustomerId)])
          })
          .then(function(values){
		          let customer = values[0]
		            if (customer.appState === "locked"){
			              return Promise.reject(`{locked : ${customer.id}}`);
		           }
            resp = JSON.stringify(values);
            res.writeHead(200, appJSONHeader);
            res.write(resp);
            res.end();
            return
          })
        .catch(function(err){
            if (err["locked"]){
              let tkn = tokenada.generateLoginToken(err["locked"], cryptoRandomString({length : 6}));
              let hashedTkn = tokenada.hashLoginToken(tkn);
              return mongolf.updateOne(db, "customers", {id : err["locked"]}, {"$set" : {"activeToken" : hashedTkn}})
              .then(function(){
                return twilily.sendCode(tkn["tokenId"], err["locked"], db);
              })
              .then(function(){
                res.writeHead(500);
                res.write(JSON.stringify(err))
                res.end();
              })
            }
            return Promise.reject(err);
        })
      .catch(function(err){
        return trailingCatch(err, res)
      })
  }
}

exports.identities = {
  post : function(req, res, db, body){
    let parsedBody = JSON.parse(body);
    let unsafeBody = schema.auditAndReturn(parsedBody, schema.customerIdentitiesPostReq);
    if (!unsafeBody){
      let err = schema.errors.badRequest;
      err.message = `Your request to register a social media profile is improperly formatted. Close the extension to try again, or log-in & try again in a different window.`
      res.writeHead(400);
      let message = JSON.stringify(err);
      res.write(message);
      res.end();
      return
    }

    let safeBody = {
      cust : unsafeBody["cust"],
      tokenId : unsafeBody["tokenId"],
      platform : unsafeBody["platform"],
      handle : unsafeBody["handle"],
      discriminator : unsafeBody["discriminator"]
    }

    return mongolf.mustFindOne(db, "customers", {id : safeBody.cust})
    .then(function(customer){
      // tokenada.validateLoginToken(safeBody, customer.activeToken);
      return customer
    })
    .then(function(customer){
	    if (customer.appState === "locked"){
        return Promise.reject({locked : customer["_id"]});
	    }
      let identity = {
        cust : safeBody.cust,
        handle : safeBody.handle,
        platform : safeBody.platform,
        discriminator : safeBody.discriminator,
        verified : false
      }
	console.log(identity);
      return mongolf.updateOne(db, "identities", {cust : identity.cust, platform : identity.platform},
{"$set" : {cust : safeBody.cust, handle : safeBody.handle, platform : safeBody.platform, discriminator : safeBody.discriminator, verified : false}}, {upsert : true}).then(function(x){console.log(x);  return customer})
    })
    .then(function(customer){
      if (customer["appState"] === "active"){
        return
      }
      if (customer["appState"] !== "awaiting_identities"){
        throw new Error();
      }
      return mongolf.updateOne(db, "customers", {"id" : customer["id"]}, {"$set" : {"appState" : "awaiting_stripe_connect"}})
    })
    .then(function(){
      res.writeHead(200, tHtmlHeader);
      res.write('OK');
      res.end();
      return
    })
    .catch(function(err){
	    console.log(err);
      if (err["locked"]){
        let tkn = tokenada.generateLoginToken(err["locked"], cryptoRandomString({length : 6}));
        let hashedTkn = tokenada.hashLoginToken(tkn);
        return mongolf.updateOne(db, "customers", {id : err["locked"]}, {"$set" : {"activeToken" : hashedTkn}})
        .then(function(){
          return twilily.sendCode(tkn["tokenId"], err["locked"], db);
        })
        .then(function(){
          res.writeHead(500);
          res.write(JSON.stringify(err), appJSONHeader)
          res.end();
        })
      }
      return Promise.reject();
    })
    .catch(function(err){
      return trailingCatch(err, res);
    })
  },

  get : function(req, res, db, body){
		let unsafeBody = schema.auditAndReturn(body, schema.customerIdentitiesGetReq);
    let safeBody = {
      "?platform" : unsafeBody["?platform"],
      handle : unsafeBody["handle"]
    }
	  console.log(safeBody);
    return mongolf.mustFindOne(db, "identities", {handle : safeBody["handle"], platform : safeBody["?platform"]})
     .then(function(identity){
      let tc = (identity.tipcount.toString() || "0")
      res.writeHead(200, tHtmlHeader);
      res.write(tc)
      res.end();
    })
    .catch(function(){
      res.writeHead(404);
      res.end();
    })
  }
}

exports.stripeConnectAccounts = {
  confirmations : {
    get : async function(req, res, db, body){
      let unsafeBody = schema.auditAndReturn(body, schema.stripeConnectAccountsConfirmationsGetQuery);
      let safeBody = {code : unsafeBody["?code"], linkto : unsafeBody["state"]}
      let stripeCustomerId
      return mongolf.mustFindOne(db, "customers", {"id" : safeBody["linkto"]})
      .then(function(customer){
	      if (customer.appState === "locked"){
          return Promise.reject({locked : customer["_id"]});
	      }
        stripeCustomerId = customer.stripeCustomerId
        return stripen.fetchStripeConnectOauth(safeBody, customer)
      })
      .then(function(oauthInfo){
        return Promise.all([mongolf.updateOne(db, "customers", {"id" : safeBody["linkto"]}, {"$set" : {"connectId" : oauthInfo["stripe_user_id"]}}), oauthInfo["stripe_user_id"]])
      })
      .then(function(results){
        let connectId = results[1]
        return Promise.all([stripen.updateConnectAccount(connectId, "metadata", {"stripeCustomerId" : stripeCustomerId}), connectId])
      })
			.then(function(results){
				return stripen.setPayoutsToManual(results[1])
			})
      .then(function(){
        return mongolf.updateOne(db, "customers", {"id" : safeBody["linkto"]}, {"$set" : {"appState" : "active"}})
      })
      .then(function(){
        res.writeHead(200);
        res.end();
        return
      })
      .catch(function(err){
        if (err["locked"]){
          let tkn = tokenada.generateLoginToken(err["locked"], cryptoRandomString({length : 6}));
          let hashedTkn = tokenada.hashLoginToken(tkn);
          return mongolf.updateOne(db, "customers", {id : err["locked"]}, {"$set" : {"activeToken" : hashedTkn}})
          .then(function(){
            return twilily.sendCode(tkn["tokenId"], err["locked"], db);
          })
          .then(function(){
            res.writeHead(500);
            res.write(JSON.stringify(err))
            res.end();
            return
          })
        }
        return Promise.reject(err)
      })
      .catch(function(err){
	      console.log(err);
        return trailingCatch(err, res);
      })
    }
  },
  loginLinks : {
    post : function(req, res, db, body){
      let unsafeBody = schema.auditAndReturn(JSON.parse(body), schema.stripeConnectAccountsLoginLinksPostReq);
      let safeBody = {
        id : unsafeBody.id
      };
      return mongolf.mustFindOne(db, "customers", {"id" : safeBody.id})
      .then(function(customer){
	      if (customer.appState === "locked"){
          return Promise.reject({locked : customer["_id"]});
	      }
        return stripen.createLoginLink(customer.connectId);
      })
      .then(function(link){
        if (link["url"]){
        res.writeHead(200, appJSONHeader);
        res.write(link["url"]);
        res.end();
	      return
      }
      else {
        return Promise.reject(link);
      }
      })
      .catch(function(err){
        if (err["locked"]){
          let tkn = tokenada.generateLoginToken(err["locked"], cryptoRandomString({length : 6}));
          let hashedTkn = tokenada.hashLoginToken(tkn);
          return mongolf.updateOne(db, "customers", {id : err["locked"]}, {"$set" : {"activeToken" : hashedTkn}})
          .then(function(){
            return twilily.sendCode(tkn["tokenId"], err["locked"], db);
          })
          .then(function(){
            res.writeHead(500)
            res.write(JSON.stringify(err))
            res.end();
          })
        }
        return Promise.reject(err);
      })
      .catch(function(err){
        return trailingCatch(err, res);
      })
    }
  }
}

exports.loginTokens = {
  post : function(req, res, db, body){
    let unsafeBody = schema.auditAndReturn(JSON.parse(body), schema.customerLoginTokensPostReq);
    let safeBody = { email : unsafeBody.email, pw : unsafeBody.pw };
	  console.log(safeBody.email);
    mongolf.mustFindOne(db, "customers", {"email" : safeBody.email})
    .then(function(customer){
	    console.log(customer.appState);
	    if (customer.appState === "locked"){
		    return Promise.reject({locked : customer["_id"]});
	    }
	    console.log(customer);
      let testHash = crypto.createHash('sha256').update(unsafeBody.pw + customer.salt).digest('hex');
      if (testHash !== customer.pw){
        throw new Error()
      }
      let loginToken = tokenada.generateLoginToken(customer.id);
      let hashedToken = tokenada.hashLoginToken(loginToken);
      return Promise.all([mongolf.updateOne(db, "customers", {"id" : customer.id}, {"$set":{activeToken : hashedToken}}), loginToken]);
    })
    .then(function(values){
      let resp = JSON.stringify(values[1]);
	    console.log(values);
      res.writeHead(200, appJSONHeader);
      res.write(resp);
      res.end();
      return
    })
    .catch(function(err){
	    console.log(err);
      if (err["locked"]){
        let tkn = tokenada.generateLoginToken(err["locked"], cryptoRandomString({length : 6}));
        let hashedTkn = tokenada.hashLoginToken(tkn);
	      let oid = mongolf.returnObjectId(err["locked"])
        return mongolf.updateOne(db, "customers", {_id : oid}, {"$set" : {"activeToken" : hashedTkn}})
        .then(function(){
          return twilily.sendCode(tkn["tokenId"], err["locked"], db);
        })
        .then(function(){
          res.writeHead(500);
          res.write(JSON.stringify(err))
		      res.end();
		      return
        })
      }
	   return Promise.reject(err);
    })
    .catch(function(err){
	    console.log(err);
      return trailingCatch(err, res);
    })
  }
}

exports.transactions = {
  post : function(req, res, db, body){
    let unsafeBody = schema.auditAndReturn(JSON.parse(body), schema.transactionsPostReq);
    let safeBody = {
      cust : unsafeBody.cust,
      loginToken : unsafeBody.loginToken,
      amt : unsafeBody.amt,
      transferTo : unsafeBody.transferTo
    }

    let stripeCustomerId, recipientConnectId, customerHandle, currency, country, recipientCountry, tierThreeTxValue, currCodeTipSuggestions, rateTable
    return mongolf.mustFindOne(db, "forex", {"object" : "tipSuggestionTable"})
    .then(function(obj){
      currCodeTipSuggestions = obj
      return
    })
    .then(function(){
      return mongolf.mustFindOne(db, "identities", {"cust" : safeBody.cust, "platform" : safeBody.transferTo.platform})
    })
    .catch(function(err){
      return null
    })
    .then(function(identity){
	    if (identity){
      customerHandle = identity.handle;
      }
      return
    })
    .then(function(){
      return mongolf.mustFindOne(db, "customers", {"id" : safeBody.cust})
    })
    .then(function(customer){
      if (customer.appState !== "active"){
        throw new Error();
      }
      currency = customer.localizationInformation.curr;
      country = customer.localizationInformation.cnt;
      stripen.auditMinMaxAmt(currency, safeBody.amt, currCodeTipSuggestions);
      tokenada.validateLoginToken(safeBody.loginToken, customer.activeToken);
      stripeCustomerId = customer.stripeCustomerId
      return mongolf.mustFindOne(db, "identities", {handle : safeBody.transferTo.handle, platform : safeBody.transferTo.platform})
    })
    .then(function(identity){
      return mongolf.mustFindOne(db, "customers", {"id" : identity.cust})
    })
    .then(function(cust){
      recipientConnectId = cust.connectId
      recipientCountry = cust.localizationInformation.cnt
      tierThreeTxValue = cust.tierThreeTxValue
      return stripen.pCardRetrieve(stripeCustomerId);
    })
    .then(function(card){
      let metadata = {
        to : safeBody.transferTo.handle,
        by : customerHandle,
	      platform : safeBody.transferTo.platform
      }
     return  stripen.pExecuteCardPayment(safeBody.amt, card, stripeCustomerId, recipientConnectId, metadata,
     currency, tierThreeTxValue, db, currCodeTipSuggestions, country, recipientCountry);
    })
    .catch(function(result){
	    console.log(result);
	    if (result[0]["next_action"]){
		    return result
	    }
	    else {
		    throw new Error();
	    }
    })
    .then(function(result){
	    console.log(result,555);
	    if (result[0]["next_action"]){
	      res.writeHead(200, tHtmlHeader);
		    res.write(result[0]["next_action"]["redirect_to_url"]["url"]);
		    res.end();
		    return
	    }
	    else {
		    console.log(2);
		    res.writeHead(200, tHtmlHeader);
	      res.write("OK");
		    res.end()
     	  }
    })
    .then(function(){
      return mongolf.updateOne(db, "identities", {"handle" : safeBody.transferTo.handle, "platform" : safeBody.transferTo.platform}, {"$inc" : {"tipcount" : 1}})
    })
     .catch(function(err){
	     console.log(err,999);
	    return trailingCatch(err, res);
    })
  },
  records : {
    post : function(req, res, db, body){
      let unsafeBody = schema.auditAndReturn(JSON.parse(body), schema.transactionsRecordsPostReq);
      let safeBody = {direction : unsafeBody.direction, loginToken : unsafeBody.loginToken, cust : unsafeBody.cust, startingAfter : unsafeBody.startingAfter}
      let target
      mongolf.mustFindOne(db, "customers", {id : safeBody.cust})
      .then(function(customer){
        if (customer["appState"] === "locked"){
          return Promise.reject({"locked" : customer["_id"]})
        }
        tokenada.validateLoginToken(safeBody.loginToken, customer.activeToken);
        if (safeBody.direction === "outgoing"){
          return stripen.pReturnCharges(customer.stripeCustomerId, safeBody.startingAfter);
        }
          return stripen.pReturnTransfers(customer.connectId, safeBody.startingAfter);
      })
      .then(function(result){
	      console.log(result);
	      result = JSON.stringify(result);
        res.writeHead(200, appJSONHeader);
        res.write(result);
        res.end();
      })
      .catch(function(err){
	      console.log(err);
        return trailingCatch(err, res);
      })
    }
  },
  refunds : function(req, res, db, body){
    let unsafeBody = schema.auditAndReturn(JSON.parse(body), schema.transactionsRefundsPostReq);
    let safeBody = {loginToken : unsafeBody.loginToken, chargeId : unsafeBody.chargeId};
	  let customer
    mongolf.mustFindOne(db, "customers", {id : safeBody.loginToken.customerId})
    .then(function(cust){
	    customer = cust;
      tokenada.validateLoginToken(safeBody.loginToken, customer.activeToken);
      return mongolf.mustFindOne(db, "forex", {"object" : "tipSuggestionTable"})
    })
    .then(function(currCodeTipSuggestions){
	    console.log('REFUND_NOW');
      return stripen.pProcessRefundRequest(customer.stripeCustomerId, safeBody.chargeId, currCodeTipSuggestions, db)
    })
    .then(function(result){
      res.writeHead(200, tHtmlHeader);
      res.write("OK");
      res.end();
      return
    })
    .catch(function(err){
	    console.log('CAUGHT',err);
      return trailingCatch(err, res);
    })
  }
}

exports.unlock = function(req, res, db, body){
  let unsafeBody = schema.auditAndReturn(JSON.parse(body), schema.unlockPostReq);
  let safeBody = {loginToken : unsafeBody.loginToken, cust : unsafeBody.cust, newpass : unsafeBody.newpass};
  let oid = mongolf.returnObjectId(safeBody.cust)
  return mongolf.mustFindOne(db, "customers", {"_id" : oid})
  .then(function(customer){
    if (customer["appState"] !== "locked"){
      return Promise.reject()
    }
    tokenada.validateLoginToken(safeBody.loginToken, customer.activeToken);
    customer.salt = cryptoRandomString({length : 5});
    customer.pw = crypto.createHash('sha256').update(safeBody.newpass + customer.salt).digest('hex');
    customer.appState = "active"
    return mongolf.updateOne(db, "customers", {"id" : customer.id}, {"$set" : customer})
  })
  .then(function(){
    res.writeHead(200);
    res.write('OK');
    res.end()
  })
  .catch(function(err){
    res.writeHead(500);
    res.end()
  })
}

exports.lock = function(req, res, db, body){
    let unsafeBody =  schema.auditAndReturn(JSON.parse(body), schema.lockPostReq);
    let safeBody = {loginToken : unsafeBody.loginToken, cust : unsafeBody.loginToken.customerId}
    return mongolf.mustFindOne(db, "customers", {"id" : safeBody.cust})
    .then(function(customer){
	    console.log(safeBody.cust);
      if (customer["appState"] === "locked"){
        return Promise.reject()
      }
      tokenada.validateLoginToken(safeBody.loginToken, customer.activeToken);
      return mongolf.updateOne(db, "customers", {id : safeBody.cust}, {"$set" : {"appState" : "locked"}});
    })
    .then(function(){
      res.writeHead(200);
      res.write('OK');
      res.end()
    })
    .catch(function(err){
      res.writeHead(500);
      res.end()
    })
}

exports.cards = function(req, res, db, body){
  let unsafeBody = schema.auditAndReturn(JSON.parse(body), schema.customersCardsPostReq);
  let safeBody = {cust : unsafeBody.cust, loginToken : unsafeBody.loginToken};
  let customerId
  mongolf.mustFindOne(db, "customers", {"id" : safeBody.cust})
  .then(function(customer){
    console.log(safeBody.cust);
    if (customer["appState"] === "locked"){
      return Promise.reject()
    }
    tokenada.validateLoginToken(safeBody.loginToken, customer.activeToken);
    customerId = customer["stripeCustomerId"];
    return stripen.pAllCardsDetach(customer["stripeCustomerId"])
  })
  .then(function(){
    return stripen.pSetupCreate(customerId)
  })
  .then(function(setupIntent){
    res.writeHead(200);
    res.write(setupIntent["client_secret"]);
    res.end();
  })
  .catch(function(err){
	  console.log(err);
    return trailingCatch(err);
  })
}
