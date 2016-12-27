var MongoClient = require('mongodb').MongoClient;

var url='mongodb://localhost:27017/Trivia';

exports.find = function(collection,query,cb) {
	MongoClient.connect(url, function (err,db) {
		if(err) console.log(err);
		var coll = db.collection(collection);
		coll.find(query||{}).toArray(function(err,docs) {
			if(err) console.log(err);
			cb(docs);
		});
		db.close();
	});
}

exports.insert = function(collection,data,cb) {
	MongoClient.connect(url, function (err,db) {
		if(err) console.log(err);
		var coll = db.collection(collection);
		if( Object.prototype.toString.call( data ) === '[object Array]') {
			coll.insertMany(data,function(err,res){
				if(err) console.log(err);
				cb(res);
			});
		}
		else {
			coll.insertOne(data,function(err,res){
				if(err) console.log(err);
				cb(res);
			});
		}
		db.close();
	});
}

//NOT TESTED
exports.update = function(collection,query,data,cb) {
	MongoClient.connect(url,function(err,db){
		if(err) console.log(err);
		var coll = db.collection(collection);
		coll.update(query,{$set:data},function(err,res){
			if(err) console.log(err);
			cb(res);
		})
	})
}


exports.delete = function(collection,query,cb) {
	MongoClient.connect(url, function (err,db) {
		if(err) console.log(err);
		var coll = db.collection(collection);
		coll.remove(query,function(err,res){
			if(err) console.log(err);
			cb(res);
		});
		db.close();
	});
}
