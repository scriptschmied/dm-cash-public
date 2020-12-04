const http = require('http');
const mongolf = require('./local-modules/utilities/mongolf.js');
const router = require('./router.js')
mongolf.getDb()
.then(function(db){
  let requestHandler = function(req, res){
    let body = [];
    req.on('data', (chunk) => {
      body.push(chunk);
    }).on('end', () => {
      console.log(body);
	    body = Buffer.concat(body).toString();
      return new Promise(function(resolve,reject){
        return router.route(req, res, db, body)
      })
      .catch(function(err){
        console.log(err);
      })
    }).on('error', () => {
      res.writeHead(500);
      res.write();
      res.end();
    })
  }
   let server = http.createServer(requestHandler)
   server.listen(8008);
})
