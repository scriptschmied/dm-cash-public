const cryptoRandomString = require("crypto-random-string");
const crypto = require("crypto");
const schema = require("./schema.js");

exports.generateLoginToken = function(customerId, id = cryptoRandomString({length : 12})){
  return {
    customerId : customerId,
    tokenId : id,
    exp : String( Math.floor(Date.now() / 1000) + (720 * 60) )
  }
}

exports.hashLoginToken = function(loginToken){
  let salt = cryptoRandomString({length : 5});
  return {
    hashedTokenId : crypto.createHash('sha256').update(loginToken.tokenId + salt).digest('hex'),
    exp : loginToken.exp,
    salt : salt
  }
}

exports.validateLoginToken = function(loginToken, activeToken){
  if (activeToken.exp <= Math.floor(Date.now()/1000)){
    let err = JSON.stringify(
      schema.errors.invalidToken
    )
	  console.log('EXP');
    throw new Error(err);
  }

  let loginTokenIdHash = crypto.createHash('sha256').update(loginToken.tokenId + activeToken.salt).digest('hex')

  if (loginTokenIdHash !== activeToken.hashedTokenId){
	  console.log(loginTokenIdHash, activeToken.hashedTokenId);
    let err = JSON.stringify(
      schema.errors.invalidToken
    )
    throw new Error(err);
  }
}
