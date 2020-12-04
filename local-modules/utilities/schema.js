const alphaNumSpecial = /^[0-9a-zA-Z!#$%@&*+-:()._ ]+$/
const alphaNum = /^[0-9a-zA-Z.]+$/
const Schema = require('../../node_modules/validate/build/schema.js');
const alpha = /^[a-zA-Z]+$/

exports.customerPostReq = new Schema({
  email : {
    type : String,
    required : true,
    match : alphaNumSpecial
  },
  pw : {
    type : String,
    required : true,
    match : alphaNumSpecial
  },
  curr : {
    type : String,
    required : true,
    match : alpha
  },
  cnt : {
    type : String,
    required : true,
    match : alpha
  },
  acceptedTermsAndConditions : {
    date : {
      type : String,
      required : true,
      match : alphaNumSpecial
    },
    action : {
      type : String,
      required : true,
      enum : ["true"]
    }
  }
})

exports.customerDataPostReq = new Schema({
  cust : {
    type : String,
    required : true,
    match : alphaNumSpecial
  },
  tokenId : {
    type : String,
    required : true,
    match : alphaNum
  }
})

exports.customerLoginTokensPostReq = new Schema({
  email : {
    type : String,
    required : true,
    match : alphaNumSpecial
  },
  pw : {
    type : String,
    required : true,
    match : alphaNumSpecial
  }
})
exports.customerIdentitiesPostReq = new Schema({
  cust : {
    type : String,
    required : true,
    match : alphaNumSpecial
  },
  tokenId : {
    type : String,
    required : true,
    match : alphaNum
  },
  platform : {
    type : String,
    required : true,
    enum : ['fourChannel', 'twitter', 'kohlChan', 'reddit']
  },
  handle : {
    type : String,
    required : true,
    match : alphaNumSpecial
  },
  discriminator : {
    type : String,
    match : alphaNumSpecial,
    required : false
  }
})

exports.stripeConnectAccountsLoginLinksPostReq = new Schema({
  id : {
    type : String,
    match : alphaNumSpecial,
    required : true
  }
})

exports.stripeConnectAccountsConfirmationsGetQuery = new Schema({
  "?code" : {
    type : String,
    required : true,
    match : alphaNumSpecial
  },
  "state" : {
  type : String, required : true, match : alphaNumSpecial }
})

exports.transactionsPostReq = new Schema({
  "cust" : {
    type : String,
    required : true,
    match : alphaNumSpecial
  },
  "loginToken" : {
	customerId : {
		type : String,
		required : true,
                match : alphaNumSpecial
	},
	  exp : {
		  type : String,
		  required : true,
      match : alphaNumSpecial
	  },
	  tokenId : {
		  type : String,
		  required : true,
      match : alphaNumSpecial
	  }
  },
  "amt" : {
    type : String,
    required : true,
    match : alphaNum
  },
  "transferTo" : {
    "platform" : {
      type : String,
      required : true,
      enum : ['fourChannel', 'twitter', 'kohlChan', 'reddit']
    },
    "handle" : {
      type : String,
      required : true,
      match : alphaNumSpecial
    },
    "discriminator" : {
      type : String,
      required : false,
      match : alphaNum
    }
  }
})

exports.transactionsRecordsPostReq = new Schema({
  direction : {
    type : String,
    required : true,
    enum : ['outgoing', 'incoming']
  },
  cust : {
    type : String,
    required : true,
    match : alphaNumSpecial
  },
  loginToken : {
	   customerId : {
		     type : String,
		     required : true,
         match : alphaNumSpecial
	  },
	   exp : {
		   type : String,
		  required : true,
      match : alphaNum
	   },
	  tokenId : {
		  type : String,
		  required : true,
      match : alphaNumSpecial
	  }
  },
  startingAfter : {
    type : String,
    required : false,
    match : alphaNumSpecial
  }
})

exports.transactionsRefundsPostReq = new Schema({
  loginToken : {
	   customerId : {
		     type : String,
		     required : true,
         match : alphaNumSpecial
	  },
	   exp : {
		   type : String,
		  required : true,
      match : alphaNumSpecial
	   },
	  tokenId : {
		  type : String,
		  required : true,
      match : alphaNumSpecial
	  }
  },
  chargeId : {
    type : String,
    required : true,
    match : alphaNumSpecial
  }
})

exports.customerIdentitiesGetReq = new Schema({
  "?platform" : {
    type : String,
    required : true,
    enum : ['twitter', 'fourChannel', 'kohlChan', 'reddit']
  },
  "handle" : {
    type : String,
    required : true,
    match : alphaNumSpecial
  }
})
exports.unlockPostReq = new Schema({
  cust : {
    type : String,
    required : true,
    match : alphaNumSpecial
  },
  "loginToken" : {
	customerId : {
		type : String,
		required : true,
    match : alphaNumSpecial
	},
	  exp : {
		  type : String,
		  required : true,
      match : alphaNum
	  },
	  tokenId : {
		  type : String,
		  required : true,
      match : alphaNumSpecial
	  }
  },
  newpass : {
    type : String,
    required : true,
    match : alphaNumSpecial
  }
})

exports.lockPostReq = new Schema({
  cust : {
    type : String,
    required : true,
    match : alphaNumSpecial
  },
  "loginToken" : {
	customerId : {
		type : String,
		required : true,
    match : alphaNumSpecial
	},
	  exp : {
		  type : String,
		  required : true,
      match : alphaNum
	  },
	  tokenId : {
		  type : String,
		  required : true,
      match : alphaNumSpecial
	  }
  }
})

exports.customersCardsPostReq = new Schema({
  cust : {
    type : String,
    required : true,
    match : alphaNumSpecial
  },
  loginToken : {
	   customerId : {
		     type : String,
		     required : true,
         match : alphaNumSpecial
	  },
	   exp : {
		   type : String,
		  required : true,
      match : alphaNumSpecial
	   },
	  tokenId : {
		  type : String,
		  required : true,
      match : alphaNumSpecial
	  }
  }
})
exports.validateCountryAndCurrency = function(countryCode, currencyCode){

  let validCountries = ["AU", "AT", "BE", "BG", "BR", "CA", "CY", "CZ", "DK", "EE", "FI", "FR", "DE", "GR", "HK", "HU", "IN",
  "IE", "IT", "JP", "LV", "LT", "LU", "MY", "MT", "NL", "NZ", "NO", "PL", "PT", "RO", "SG", "SK", "SI", "ES",
  "SE", "CH", "GB", "US"];

 let  validCurrencies = ["AUD", "EUR", "EUR", "BGN", "BRL", "CAD", "EUR", "CZK", "DKK", "EUR",
  "EUR", "EUR", "EUR", "EUR", "HKD", "HUF", "INR", "EUR", "EUR", "JPY", "EUR", "EUR", "EUR", "MYR",
  "EUR", "EUR", "NZD", "NOK", "PLN", "EUR", "RON", "SGD", "EUR", "EUR", "EUR", "SEK", "CHF", "GBP", "USD"];

  let indexArr = []
  let reqIndex = validCountries.indexOf(countryCode);
  if (reqIndex === -1){ return false }

  while (validCurrencies.indexOf(currencyCode) !== -1){
    let n = validCurrencies.indexOf(currencyCode);
    indexArr.push(n);
    validCurrencies[n] = null;
  }

  let check = indexArr.includes(reqIndex);

  if (check){
    return true
  } else {
    return false
  }
}

exports.auditAndReturn = function(object, schema){
  const errors = schema.validate(object);
  if (errors.length === 0){
    return object
  }
  else {
    console.log(errors[0])
    return false
  }
}

exports.errors = {
  badRequest : {
    text : "Bad request - Error Code : 0",
    code : 0,
    head : 400,
    message : null
  },
  duplicateResourceFound : {
    text : "Duplicate resource found - Error Code : 1",
    code : 1,
    head : 409,
    message : null
  },
  resourceNotFound : {
    text : "Essential resource not found - Error Code : 2",
    code : 2,
    head : 404,
    message : null
  },
  invalidToken : {
    text : "Token is invalid - Error Code : 3",
    code : 3,
    head : 409,
    message : null
  },
  internalServerError : {
    text : "Internal server error - Error Code : 4",
    code : 4,
    head : 500,
    message : null
  },
  extensionError : {
    text : "Extension error - Error Code : 5",
    code : 5,
    head : null
  }
}
