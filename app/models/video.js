const firebase = require('../modules/firebase');

// Model data
const data = {
	collection: 'video'
};

var Video = {
	tes: function(){
		console.log(data.collection + ' Model OK')
	},
	createTimestamp: function(){
		return firebase().createTimestamp();
	},
	findAll: function(callback){
		firebase({collection: data.collection}).findAll(function(arr){
			callback(arr)
		})
	},
	findOne: function(key, value, callback){
		firebase({collection: data.collection}).findOne({
			key: key,
			value: value
		}, function(doc){
			callback(doc)
		})
	},
	findById: function(id, callback){
		firebase({collection: data.collection}).findById(id, function(doc){
			if(doc){
				var docData = {}
				for (var i in doc) {
					if(i != 'password') {
						docData[i] = doc[i]
					}
				}
				docData.id = id;
				callback(docData)
			}else{
				callback(false)
			}
		})
	},
	findOneAndUpdateSingleKey: function(id, updated, callback){
		firebase({collection: data.collection}).findOneAndUpdateSingleKey(id, updated, function(result){
			callback(result)
		})
	},
	check: function(key, value, callback) {
		firebase({collection: data.collection}).find({
			key: key, 
			value: value
		}, function(result){
			if(result.length === 0){
				callback(false);
			}else{
				callback(true);
			}
		})
	}
}

module.exports = Video