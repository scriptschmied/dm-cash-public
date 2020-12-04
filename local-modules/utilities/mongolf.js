const MongoClient = require('mongodb').MongoClient;
const mongo = require('mongodb');
const fs = require("fs");
const uri = fs.readFileSync("local-modules/utilities/keys/atlas.key").toString();
const client = new MongoClient(uri, { useNewUrlParser: true });
const dbName = 'dm-cash-test'
const schema = require("./schema.js");
exports.getDb = function(){
  return client.connect()
  .then(function(connectedClient){
    return connectedClient.db(dbName);
  })
}

exports.mustNotFindOne = function(db, collection, query){
  return db.collection(collection).findOne(query)
  .then(function(response){
	 if (!!response){
		 console.log('AAAA');
    let err = JSON.stringify(
      schema.errors.duplicateResourceFound
    )
    throw new Error(err);
  }
    return
  })
}

exports.returnObjectId = function(string){
	return new mongo.ObjectID(string);
}
exports.updateOne = function(db, collection, query, updateDoc, options){
    return db.collection(collection).updateOne(query, updateDoc, options)
}

exports.mustFindOne = function(db, collection, query){
  return db.collection(collection).findOne(query)
  .then(function(response){
	 if (!response){
     let err = JSON.stringify(
       schema.errors.resourceNotFound
     )
		 console.log(query);
     throw new Error(err);
  }
	  console.log(query);
  return response
  })
}

exports.find = function(db, collection, query){
  return db.collection(collection).find(query);
}

exports.insertOne = function(db, collection, object){
   return db.collection(collection).insertOne(object);
}
