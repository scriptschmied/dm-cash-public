const fs = require('fs');
const accountSid = 'AC3c1122fb246a567c9013520ef4760887';
let authToken = fs.readFileSync("local-modules/utilities/keys/twilio.key").toString();
authToken = authToken.substring(0, authToken.length - 1);
const stripe_key = fs.readFileSync("local-modules/utilities/keys/stripe.key").toString();
const client = require('twilio')(accountSid, authToken);
const twilio = require('twilio');
const stripe = require('stripe')(stripe_key);
const mongolf = require('./mongolf.js');

exports.verifyWebhook = function(signature, parsedBody){
  let e = twilio.validateRequest(authToken, signature, "https://prologos.cc/v1/webhooks/twilio", parsedBody);
  console.log(e, signature, parsedBody, authToken);
  if (e){
    return
  }
  else {
    throw new Error();
  }
}
exports.sendTransactionNotification = function(parsedAmount, amountRecipient, platform, sendto){
 return  client.messages
  .create({
     body: `DM-CASH WEB EXTENSION : A charge of ${parsedAmount} was made on your account and sent to ${amountRecipient} on
     ${platform}. If you did not authorize this charge, text back 'NO'. If you did authorize the charge, feel free to ignore this message.
     To opt-out of these notifications, text back 'STOP'.`,
     from: '+12819154063',
     to: sendto
   })
}

exports.sendResponseToNo = function(sendto){
  return client.messages
  .create({
     body: `DM-CASH WEB EXTENSION : Thank you for your co-operation. We've locked your account for security reasons. Please proceed to the dm-cash
     web extension to generate a new password for your account & to request refunds on any transactions you believe to be fraudulent.`,
     from: '+12819154063',
     to: sendto
   })
}

exports.sendFraudAlertToAdmin = function(){
  return client.messages
  .create({
     body: `DM-CASH WEB EXTENSION : Fraud reported.`,
     from: '+12819154063',
     to: '+12147533189'
   })
}

exports.sendCode = function(code, cust, db){
  return mongolf.mustFindOne(db, "customers", {"_id" : cust})
  .then(function(cust){
	  return mongolf.mustFindOne(db, "protectees", {"stripeCustomerId": cust["stripeCustomerId"]})
  })
  .then(function(protectee){
    return client.messages
    .create({
      body : `DM-CASH WEB EXTENSION : Your password reset code is ${code}.`,
      from : '+12819154063',
      to : protectee["phoneNumber"]
    })
  })
}

exports.sendShutdownAlertToAdmin = function(){
  return client.messages
    .create({
       body: `DM-CASH WEB EXTENSION : Fraud reported & pantsir killed server.`,
       from: '+12819154063',
       to: '+12147533189'
     })
}

exports.sendResponseToStop = function(sendto){
  return client.messages
  .create({
     body: `DM-CASH WEB EXTENSION : You have been opted out of DM-CASH WEB EXTENSION mobile notifications.`,
     from: '+12819154063',
     to: sendTo
   })
}
