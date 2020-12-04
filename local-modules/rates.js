const mongolf = require("./utilities/mongolf.js")
const http = require("http");
const fs = require("fs");
var apiKey = fs.readFileSync("local-modules/utilities/keys/apilayer.key").toString();
apiKey = apiKey.substring(0, apiKey.length - 1);
let updateFrex = function(db){
	console.log(0);
      var options = {
        host: 'apilayer.net',
        path: `/api/live?access_key=${apiKey}&source=USD`,
        method: 'POST'
      }
			
      return new Promise(function(resolve,reject){
      let frexreq = http.request(options, function(res){
        let d = ""
	      console.log(1);
        res.on('data', function(chunk){
          d += chunk
		console.log(2);
        }).on('end', function(){
          let json = JSON.parse(d);
          let quotes = json.quotes
          let tipSuggestions = {}
          tipSuggestions.object = "tipSuggestionTable"
          tipSuggestions.timestamp = json.timestamp
          for (let key of Object.keys(quotes)){
            let xRate = quotes[key];
            let fixed = 2
            if (key === "USDJPY" || key === "USDINR"){
              xRate = Math.ceil(xRate);
              fixed = 0
            }
            tipSuggestions[key] = [(xRate * 1.25).toFixed(fixed), (xRate * 1.75).toFixed(fixed), (xRate * 2.25).toFixed(fixed), (xRate * 5).toFixed(fixed)]
          }
          return mongolf.updateOne(db, "forex", {"object" : "forexTable"}, {"$set" : {"object" : "expiredForexTable"}})
          .then(function(){
            return mongolf.insertOne(db, "forex", {
              "timestamp" : json.timestamp, "source" : json.source, "quotes" : json.quotes, "object" : "forexTable"
            })
          })
          .then(function(){
            return mongolf.updateOne(db, "forex", {"object" : "tipSuggestionTable"}, {"$set" : {"object" : "expiredTipSuggestionTable"}})
          })
          .then(function(){
            return mongolf.insertOne(db, "forex", tipSuggestions)
          })
          .then(function(resp){
            resolve(resp);
          })
	  .catch(function(err){
		  console.log(err)
		  reject()
	  })
       })
     })
    frexreq.end();
   })
}

exports.tipSuggestions = {
  get : function(req, res, db){
    mongolf.mustFindOne(db, "forex", {"object" : "tipSuggestionTable"})
    .then(function(table){
      if ( (table.timestamp) <= ( (Date.now()/1000) - (7200 * 6))){
	      console.log(22);
        return updateFrex(db)
      }
      return
    })
    .catch(function(){
	    return updateFrex(db);
    })
    .then(function(){
	    console.log(3);
      return mongolf.mustFindOne(db, "forex", {"object" : "tipSuggestionTable"})
    })
    .then(function(table){
      let r = JSON.stringify(table);
	    console.log(r);
      res.writeHead(200, {'Content-Type': 'application/json'});
      res.write(r, 'utf8', function(){
      res.end()});
    })
    .catch(function(err){
	    console.log(err);
      res.writeHead(500);
      res.end();
    })
  }
}

exports.get = function(req, res, db){
  mongolf.mustFindOne(db, "forex", {"object" : "forexTable"})
  .then(function(table){
    if ( (table.timestamp) <= ( (Date.now()/1000) - (7200 * 6))){
      return updateFrex(db)
    }
    return
  })
  .then(function(){
    return mongolf.mustFindOne(db, "forex", {"object" : "forexTable"})
  })
  .then(function(table){
    table = JSON.stringify(table);
    res.writeHead(200);
    res.write(table);
    res.end();
  })
  .catch(function(){
    res.writeHead(500);
    res.end();
  })
}
