const mongolf = require("./mongolf.js");
const stripen = require("./stripen.js");

let payout = function(){
  let pAll = []
  let iterator = function(doc){
    stripen.pProcessPayout(doc["connectId"]);
  }
  let callback = function(err){
    console.log(err, pAll, "done");
  }
  return mongolf.getDb()
  .then(function(db){
    return mongolf.find(db, "customers", {"tierThreeTxValue" : {"$gte" : 1.8}})
  })
  .then(function(cursor){
    return cursor.forEach(iterator, callback)
  })
}

