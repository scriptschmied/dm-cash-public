const mongolf = require("./utilities/mongolf.js")
const twilily = require("./utilities/twilily.js")
const pantsir = require("./utilities/pantsir.js");
const querystring = require("querystring");
const fs = require('fs');
let stripe_key = fs.readFileSync("/home/brandonburke_personal/dm-cash/local-modules/utilities/keys/stripe.key").toString();
stripe_key = stripe_key.substring(0, stripe_key.length - 1);
let stripe_endpoint_secret = fs.readFileSync("/home/brandonburke_personal/dm-cash/local-modules/utilities/keys/stripe_endpoint.secret").toString();
stripe_endpoint_secret = stripe_endpoint_secret.substring(0, stripe_endpoint_secret.length - 1);

const stripe = require("stripe")(stripe_key);
exports.stripe = function(req, res, db, body){
  try {
    const sig = req.headers['stripe-signature'];
	  console.log(req.body, body, 777)
    let e = stripe.webhooks.constructEvent(body, sig, stripe_endpoint_secret);
    console.log(e, 999);
  }
  catch(err){
    console.log(err);
    res.writeHead(400);
    return
  }
  res.writeHead(200);
  res.end();
  let event = JSON.parse(body);
  if (event.data.object.object === "account"){
    let account = event.data.object
    if (account["metadata"]["stripeCustomerId"] && account["business_profile"]["support_phone"]){
      return mongolf.mustNotFindOne(db, "protectees", {stripeCustomerId : account["metadata"]["stripeCustomerId"]})
      .then(function(result){
        mongolf.insertOne(db, "protectees", {stripeCustomerId : account["metadata"]["stripeCustomerId"], phoneNumber : account["business_profile"]["support_phone"]})
      })
      .catch(function(err){
        console.log(err);
        return
      })
    }
  }
  if (event.data.object.object === "payment_intent"){
    let charge = event.data.object, gProtectee, date = (Date.now()/1000)
    return mongolf.mustFindOne(db, "protectees", {"stripeCustomerId" : charge.customer})
    .catch(function(result){
        throw new Error()
    })
    .then(function(protectee){
      let lastNoticeDate
      if (protectee["optedOut"] === true){
        throw new Error();
      }
      if (protectee["lastNotice"] && protectee["lastNotice"]["date"]){
        lastNoticeDate = protectee["lastNotice"]["date"]
        if (lastNoticeDate > (date - 7200)){
          throw new Error()
        }
      }
        let multiplier
        if (charge.currency === "jpy"){
          multiplier = 1
        }
        else {
          multiplier = 100
        }
        let amount = (charge.amount/multiplier), txFee = (charge["application_fee_amount"]/multiplier),
        recipient = charge["metadata"]["to"], platform = charge["metadata"]["platform"]
        gProtectee = protectee
        return Promise.all([twilily.sendTransactionNotification(amount, recipient, platform, protectee["phoneNumber"]),
        mongolf.updateOne(db, "protectees", {"_id" : protectee["_id"]},{"$set":{"lastNotice":{"date":date, "payment_intent" : charge}}})])
    })
    .catch(function(error){
	    console.log(error);
    })
  }
}

exports.twilio = function(req, res, db, body){
  twilily.verifyWebhook(req.headers["x-twilio-signature"], body);
	let from = body["From"];
  body = body["Body"]; console.log(from);
  if (body.toLowerCase().slice(0,4) === "stop"){
    return mongolf.mustFindOne(db, "protectees", {"phoneNumber" : from})
    .then(function(){
      return mongolf.updateOne(db, "protectees", {"phoneNumber" : from}, {optedOut : true})
    })
  }
  if (body.toLowerCase().slice(0,2) === "no"){
    let count, gProtectee, date, charge
    return mongolf.mustFindOne(db, "protectees", {"phoneNumber" : from})
    .then(function(protectee){
      if (protectee["lastNotice"]["reportedFraud"] === true || protectee["optedOut"] === true){
        throw new Error();
      }
      gProtectee = protectee;
      charge = protectee["lastNotice"]["payment_intent"];
      return mongolf.mustFindOne(db, "protectees", {object : "fraud_counter"})
    })
    .then(function(fraudCounter){
      date = (Date.now()/1000)
      if (fraudCounter.created < (date - 86400)){
        count = 1
        return Promise.all([
          mongolf.updateOne(db, "protectees", {object : "fraud_counter"}, {"$set" : {"created" : date,"count" : 1}}),
          mongolf.updateOne(db, "protectees", {"_id" : gProtectee["_id"]}, {"$set" : {"lastNotice.reporteFraud" : true}})
        ])
      }
      else {
        count = fraudCounter.count + 1
        return Promise.all([
          mongolf.updateOne(db, "protectees", {object : "fraud_counter"}, {"$set" : {"count" : count}}),
          mongolf.updateOne(db, "protectees", {"_id" : gProtectee["_id"]}, {"$set" : {"lastNotice.reportedFraud" : true}})
        ])
      }
    })
    .then(function(){
      return mongolf.updateOne(db, "customers", {stripeCustomerId : gProtectee["stripeCustomerId"]}, {"$set" : {
      "appState" : "locked" }})
    })
    .then(function(){
      return mongolf.insertOne(db, "reports", {stripeCustomerId : gProtectee["stripeCustomerId"], "payment_intent" : charge, created : date})
    })
    .then(function(){
      if (count >= 5){
        return twilily.sendResponseToNo(from)
        .then(function(){
          return twilily.sendShutdownAlertToAdmin();
        })
        .then(function(){
          return pantsir.kill();
        })
      }
      else {
        return twilily.sendResponseToNo(from)
        .then(function(){
          return twilily.sendFraudAlertToAdmin();
        })
      }
    })
    .catch(function(err){
      console.log(err);
    })
  }
}
