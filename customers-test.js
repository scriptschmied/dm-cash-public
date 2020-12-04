let chai = require('chai');
let chaiHttp = require('chai-http');
let server = "http://localhost:8008";
let should = chai.should();
let expect = chai.expect();
chai.use(chaiHttp)
const MongoClient = require('mongodb').MongoClient;
const fs = require('fs');
const uri = fs.readFileSync("local-modules/utilities/keys/atlas.key").toString();
const client = new MongoClient(uri, { useNewUrlParser: true });
const mongo = require('mongodb');
const dbName = 'dm-cash-test';
let db

client.connect()
.then(function(connectedClient){
  return connectedClient.db(dbName);
})
.then(function(obj){
	db = obj
	run()
})

describe("dm-cash-test", () => {
  let prefabLoginToken, chargeToRefund

  before(function(done){
    db.collection("customers").deleteMany({"email" : "generatedtestaccount@gmail.com"})
    .then(function(){
      return db.collection("identities").deleteMany({});
    })
    .then(function(){
      done();
    })
  })

  describe("POST /v1/customers", () => {
    it('it should RETURN a LOGIN TOKEN and SETUP INTENT SECRET', (done) => {
      let body = {
        email : 'generatedtestaccount@gmail.com',
        pw : 'testingman25!$%',
        curr : 'EUR',
        cnt : 'DE',
        acceptedTermsAndConditions : {
          date : (Date.now()/1000).toString(),
          action : "true"
        }
      }
      chai.request(server)
      .post("/v1/customers")
      .send(body)
      .then(function(res){
        res.should.have.status(200);
        res.body.should.be.an("object");
        res.body.should.have.property("setupIntentSecret")
	      res.body.setupIntentSecret.should.be.a("string");
        res.body.should.have.property("responseToken")
	      res.body.responseToken.should.be.an("object")
	      res.body.responseToken.should.not.be.empty
	      done();
      })
      .catch(function(err){
        throw err
      })
    })
  })
  describe("POST /v1/customers/login_tokens", () => {
    it('it should RETURN a LOGIN TOKEN', (done) => {
      let body = {
        email : 'prefabtestaccount@gmail.com',
        pw : 'Brandon2000!',
      }
      chai.request(server)
      .post("/v1/customers/login_tokens")
      .send(body)
      .then(function(res){
        res.should.have.status(200);
        res.body.should.be.an("object").and.not.be.empty;
        prefabLoginToken = res.body;
	      done()
      })
      .catch(function(err){
        throw err
      })
    })
  })
  describe("POST /v1/customers/data", () => {
    it('it should RETURN a CARD and a CUSTOMER OBJECT in an ARRAY', (done) => {
      let body = {
        cust : prefabLoginToken["customerId"],
        tokenId : prefabLoginToken["tokenId"]
      }
      chai.request(server)
      .post("/v1/customers/data")
      .send(body)
      .then(function(res){
        res.should.have.status(200);
        res.body.should.be.an("array");
	      res.body[0].should.be.an("object").and.not.be.empty
        res.body[1].should.be.an("object").and.not.be.empty;
        done();
      })
      .catch(function(err){
        throw err
      })
    })
  })
 describe("POST /v1/customers/identities", () => {
   it('it should RETURN 200 OK for a VALID TWITTER REQUEST', (done) => {
     let body = {
       cust : prefabLoginToken["customerId"],
       tokenId : prefabLoginToken["tokenId"],
       platform : 'twitter',
       handle : 'realDonaldTrump'
     }
     chai.request(server)
     .post("/v1/customers/identities")
     .send(body)
     .then(function(res){
       res.should.have.status(200);
       res.text.should.be.a('string');
       res.text.should.not.be.empty;
       done()
     })
     .catch(function(err){
       throw err
     })
   })
   it('it should RETURN 200 OK for a VALID FOURCHANNEL REQUEST', (done) => {
     let body = {
       cust : prefabLoginToken["customerId"],
       tokenId : prefabLoginToken["tokenId"],
       platform : 'fourChannel',
       handle : 'testXy5'
     }
     chai.request(server)
     .post("/v1/customers/identities")
     .send(body)
     .then(function(res){
       res.should.have.status(200);
       res.text.should.be.a('string');
       res.text.should.not.be.empty
       done()
     })
     .catch(function(err){
       throw err
     })
   })
 })

 describe("GET /v1/customers/identities", () => {
   it('it should RETURN 200 OK or CAUTION for an EXTANT TWITTER IDENTITY REQ. and an EXTANT FOURCHANNEL IDENTITY REQ.', (done) =>{
     chai.request(server)
     .get("/v1/customers/identities?platform=twitter&handle=realDonaldTrump")
     .then(function(res){
       res.should.have.status(200);
       res.text.should.be.a('string');
       res.text.should.not.be.empty
       return
     })
     .then(function(){
       return chai.request(server).get("/v1/customers/identities?platform=fourChannel&handle=testXy5")
     })
     .then(function(res){
       res.should.have.status(200);
       res.text.should.be.a('string');
       res.text.should.not.be.empty;
       done();
     })
     .catch(function(err){
       throw err
     })
   })
 })
 describe("GET /v1/rates/tip_suggestions", () => {
   it('it should RETURN a TIP SUGGESTION TABLE', (done) => {
     chai.request(server)
     .get("/v1/rates/tip_suggestions")
     .then(function(res){
       res.should.have.status(200);
       res.body.should.be.a('object');
       res.body.should.not.be.empty;
       done();
     })
   })
 })
 describe("POST /v1/customers/transactions", () => {
   it('it should RETURN a 200 OK', (done) => {
     let body = {
       cust : prefabLoginToken["customerId"],
       loginToken : prefabLoginToken,
       amt : "325",
       transferTo : {
         handle : 'realDonaldTrump',
         platform : 'twitter'
       }
     }
     chai.request(server)
     .post("/v1/customers/transactions")
     .send(body)
     .then(function(res){
       res.should.have.status(200);
       res.text.should.be.a('string');
       res.text.should.not.be.empty;
       done();
     })
     .catch(function(err){
	     throw err
     })
   })
 })
describe("POST /v1/customers/transactions/records", () => {
   it('it should RETURN an OUTGOING TRANSACTIONS ARRAY with an ACCURATE MOST RECENT TRANSACTION', (done) => {
     let body = {
	     cust : prefabLoginToken["customerId"],
             loginToken : prefabLoginToken,
             direction : "outgoing"
	}
     chai.request(server)
     .post("/v1/customers/transactions/records")
     .send(body)
     .then(function(res){
     res.should.have.status(200);
     res.body.data.should.be.an('array');
     res.body.data[0].should.be.an('object');
     chargeToRefund = res.body.data[0]["id"];
     done()
    })
 })
 it('it should RETURN an INCOMING TRANSACTIONS ARRAY with an ACCURATE MOST RECENT TRANSACTION', (done) => {
   let body = {
     cust : prefabLoginToken["customerId"],
           loginToken : prefabLoginToken,
           direction : "incoming"
   }
   chai.request(server)
   .post("/v1/customers/transactions/records")
   .send(body)
   .then(function(res){
   res.should.have.status(200);
   res.body.should.be.an('array');
   res.body[0].should.be.an('object');
   done()
  })
  })
 })
describe("POST /v1/customers/transactions/refunds", () => {
  it('it should RETURN a 200 OK', (done) => {
    let body = {
      chargeId : chargeToRefund,
      loginToken : prefabLoginToken
    }
    chai.request(server)
    .post("/v1/customers/transactions/refunds")
    .send(body)
    .then(function(res){
      res.should.have.status(200);
      res.text.should.be.a('string');
      done();
    })
  })
})
})
