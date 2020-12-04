const fs = require('fs');
var stripe_key = fs.readFileSync("local-modules/utilities/keys/stripe.key").toString();
stripe_key = stripe_key.substring(stripe_key, stripe_key.length - 1);
const stripe = require('stripe')(stripe_key);
const mongolf = require('./mongolf.js');

let taxObj = {
  AU: '0.1',
  BE: '0.21',
  AT: '0.2',
  BG: '0.2',
  CA: '0.1',
  CY: '0.19',
  CZ: '0.21',
  DK: '0.25',
  EE: '0.2',
  FI: '0.24',
  FR: '0.2',
  DE: '0.16',
  GR: '0.24',
  IN: '0.18',
  IE: '0.23',
  IT: '0.22',
  JP: '0.10',
  LV: '0.21',
  LT: '0.21',
  LU: '0.17',
  MY: '0.06',
  MT: '0.18',
  NL: '0.21',
  NZ: '0.15',
  NO: '0.25',
  PL: '0.23',
  PT: '0.23',
  RO: '0.19',
  SG: '0.07',
  SK: '0.2',
  SI: '0.22',
  ES: '0.21',
  SE: '0.25',
  CH: '0.077',
  GB: '0.2',
}

exports.pCheckoutCreate = function(amt){
  return stripe.checkout.sessions.create({
    payment_method_types: ['card'],
    line_items: [{
      name: 'One-Time Payment Link',
      description: 'A one-time payment link.',
      amount: amt,
      currency: 'usd',
      quantity: 1
    }],
    payment_intent_data: {
      capture_method: 'manual',
    },
    success_url: 'http://drkhrsy.tk:8008/v1/payment-processing/charges/success',
    cancel_url: 'http://dm.cash'
  })
}

exports.pCustomerCreate = function(id, cnt, curr, stripeCustomerId){
  return stripe.customers.create({
   id: stripeCustomerId,
   metadata : {
	   curr : curr,
	   cnt : cnt,
     dmcashId : id
   }
 })
}

exports.pCustomerRetrieve = function(id){
  return stripe.customers.retrieve(id)
}

exports.pSetupCreate = function(id){
  return stripe.setupIntents.create({
    customer : id,
    payment_method_types : ['card']
  })
}

exports.pCardRetrieve = function(customer){
  return stripe.paymentMethods.list({customer : customer, type : 'card'})
  .then(function(list){
    return list.data[0];
  })
}

exports.updateConnectAccount = function(accountId, property, update){
  return stripe.accounts.retrieve(accountId)
  .then(function(account){
    let target = account[property]
    for (let key of Object.keys(update)){
      target[key] = update[key];
    }
    return stripe.accounts.update(accountId, {[property] : target})
  })
  .then(function(res){console.log(res); return}, function(err){
	  console.log(err); throw new Error()
  })
}
exports.setPayoutsToManual = function(accountId){
	return stripe.accounts.update(accountId, {"settings" : {"payouts" : {"schedule" : { "interval" : "manual"} }  }})
}
exports.pAllCardsDetach = function(customer){
  return stripe.paymentMethods.list({customer : customer, type : 'card'})
  .then(function(list){
    var pArr = []
    for (let x of list["data"]){
      pArr.push(
        stripe.paymentMethods.detach(x["id"])
      )
    }
    return Promise.all(pArr);
  })
}

exports.fetchStripeConnectOauth = async function(body, customer){
  const response = await stripe.oauth.token({
    grant_type: 'authorization_code',
    code: body["code"],
    suggested_capabilities: ['transfers','card_payments'],
    stripe_user : {
      country : customer.localizationInformation.cnt,
      email : customer.email
    }
  });

  return response
}

exports.createLoginLink = function(id){
	return stripe.accounts.createLoginLink(id);
}

exports.auditMinMaxAmt = function(curr, amt, currCodeTipSuggestions){
	let multiplier = 100
	if (curr === "JPY"){
		multiplier = 1;
	}
  if (currCodeTipSuggestions["USD" + curr][0] > (amt/multiplier)){
    throw new Error();
  }
}

exports.pExecuteCardPayment = function(amount, card, stripeCustomerId, recipientConnectId, metadata, currency, tierThreeTxValue, db, currCodeTipSuggestions, country, recipientCountry){
  let taxMultiplier = taxObj[country];
  if (!taxMultiplier){
    taxMultiplier = 0;
  }
  let pAll = []
  let multiplier
  if (currency === "JPY"){
    multiplier = 1
  }
  else {
    multiplier = 100
  }
  let feeAmount
  if (tierThreeTxValue >= 1.8){
    let tierThreeAmount = (currCodeTipSuggestions["USD" + currency][2] * multiplier);
    feeAmount = Math.floor((currCodeTipSuggestions["USD" + currency][0] * multiplier * 0.28) + (amount * 0.25));
    pAll.push(mongolf.updateOne(db, "customers", {"connectId" : recipientConnectId}, {"$set" : {
      tierThreeTxValue : tierThreeTxValue + (amount/tierThreeAmount)
    }}))
  }
  if (tierThreeTxValue < 1.8){
    let pointsNeeded = (1.8 - tierThreeTxValue);
	  let tierThreeAmount = (currCodeTipSuggestions["USD" + currency][2] * multiplier);
    let amountNeeded = Number((currCodeTipSuggestions["USD" + currency][2] * multiplier * pointsNeeded).toFixed(2))
    if (amount < amountNeeded){
      pAll.push(mongolf.updateOne(db, "customers", {"connectId" : recipientConnectId}, {"$set" : {
        tierThreeTxValue : tierThreeTxValue + (amount/tierThreeAmount)
      }}))
      feeAmount = amount
    }
    if (amount >= amountNeeded){
        let baseFee = currCodeTipSuggestions["USD" + currency][0] * multiplier * 0.28
        let topFee = (amount * 0.25);
        let tax = (amount * 0.25 * taxMultiplier);
        console.log(tax);
        if (amountNeeded <=  Math.floor( baseFee + topFee )){
          feeAmount = Math.floor(baseFee + topFee + tax)
        }
        else {
          feeAmount = amountNeeded
        }
          pAll.push(mongolf.updateOne(db, "customers", {"connectId" : recipientConnectId}, {"$set" : {
          tierThreeTxValue : 1.8
        }}))
    }
  }
  let obo
  if (recipientCountry !== "US"){
    obo = recipientConnectId;
  }
  pAll.push(stripe.paymentIntents.create({
   amount: Math.floor(amount),
   currency: currency,
   customer: stripeCustomerId,
   payment_method: card["id"],
   off_session : false,
	  return_url : "https://---",
   confirm: true,
   metadata : metadata,
	 transfer_data : {destination : recipientConnectId},
	 on_behalf_of : obo,
   application_fee_amount: Math.ceil(feeAmount)
  })
  .catch(function(){
    return mongolf.updateOne(db, "customers", {"connectId" : recipientConnectId}, {"$set" : {
    tierThreeTxValue : tierThreeTxValue
    }})
    .then(function(){
      throw new Error();
    })
  }))
  return Promise.all(pAll)
}

exports.pReturnTransfers = function(connectId, startingAfter){
  let list
  return stripe.transfers.list(
    {limit: 5, destination : connectId, starting_after : startingAfter}
  )
  .then(function(transfers){
	  if (transfers["data"]["length"] === 0){
		  throw Error()
	  }
    list = transfers["data"]
    return new Promise(function(resolve,reject){
      let arr = []
      for (let transfer of transfers["data"]){
        arr.push(
          stripe.charges.retrieve(transfer["source_transaction"])
        )
        if (arr.length === transfers["data"]["length"]){
          resolve(Promise.all(arr));
        }
      }
    })
  })
  .then(function(sources){
    return new Promise(function(resolve,reject){
      let it = 0
      for (let source of sources){
        list[it]["metadata"] = source["metadata"];
        list[it]["currency"] = source["currency"];
        list[it]["amount"] = source["amount"]
        list[it]["application_fee_amount"] = source["application_fee_amount"];
	      it++;
        if (it === sources.length){
          resolve(list);
        }
      }
    })
  })
  .then(function(list){
    console.log(list);
    return list
  })
}

exports.pReturnCharges = function(stripeCustomerId, startingAfter){
  return stripe.charges.list(
  {limit: 5, customer : stripeCustomerId, starting_after : startingAfter}
  );
}

exports.pProcessRefundRequest = function(stripeCustomerId, chargeId, currCodeTipSuggestions, db){
  return stripe.charges.retrieve(chargeId)
  .then(function(charge){
    let sameId = (charge.customer === stripeCustomerId);
    let transferId
    var date = new Date();
    date.setDate(date.getDate() - 28);
    date = (date/1000);
    let noEarlierThanEarliestDate = (charge.created >= date)
    let notRefunded = (!charge.refunded);
    let refundAmount = (charge.amount - charge["application_fee_amount"]);
    return mongolf.mustNotFindOne(db, "payouts", { date : {"$gte" : charge.created } })
    .then(function(){
    if (refundAmount === 0 && sameId && noEarlierThanEarliestDate && notRefunded){
	    console.log(1);
      let transfer
	    return stripe.transfers.retrieve(charge.transfer)
      .then(function(tf){
        transfer = tf
        transferId = tf.id
        return mongolf.mustFindOne(db, "customers", {"connectId" : tf.destination})
      })
      .then(function(recipient){
        let multiplier = 100
        if (recipient["localizationInformation"]["curr"] === "JPY"){
          multiplier = 1
        }
        let tierOneTxAmt = currCodeTipSuggestions["USD" + recipient["localizationInformation"]["curr"]][0]
        let tierThreeTxAmt = currCodeTipSuggestions["USD" + recipient["localizationInformation"]["curr"]][2]
        let points = recipient.tierThreeTxValue - (charge["application_fee_amount"]/(tierThreeTxAmt * multiplier))
	      if (points < 0){
		      points = 0
	      }
	      console.log(tierOneTxAmt, tierThreeTxAmt, points);
        return mongolf.updateOne(db, "customers", {"connectId" : transfer.destination}, {
          "$set" : {tierThreeTxValue : points}
        })
        .then(function(){
         return stripe.refunds.create({charge : chargeId, amount :
         Math.floor(charge["application_fee_amount"] - (tierOneTxAmt * multiplier * 0.3) - (charge["application_fee_amount"] * 0.28)), reverse_transfer : true})
        })
      })
    }

    if (sameId && noEarlierThanEarliestDate && notRefunded){
      return stripe.refunds.create({charge : chargeId, amount : refundAmount, reverse_transfer : true})
	    .then(function(obj){
		    console.log(obj);
		    return obj
	    })
	    .catch(function(err){
		    console.log(err)
	    })
    }
    else {
	    console.log('ERR_');
      throw Error()
    }
  })
})
}

exports.pProcessPayout = function(connectId){
  return stripe.balance.retrieve({stripeAccount : connectId})
  .then(function(balance){
    console.log
    let pAll = []
    for (let entry of balance["available"]){
      if (entry.amount > 0){
        pAll.push(
          stripe.payouts.create({amount : entry.amount, currency: entry.currency}, {stripeAccount : connectId})
        )
      }
    }
    return Promise.all(pAll);
  })
}

/* stripe.accounts.update(
  'acct_1HEHeyBuKTmXxs0X',
  {settings : {payouts : { schedule : { "interval"{}: manual}
)
.then(function(){
  return pProcessPayout('acct_1HEHeyBuKTmXxs0X')
})
.then(function(result){
  console.log(result);
}) */
