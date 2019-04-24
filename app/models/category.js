const firebase = require('../modules/firebase');

// Model data
const data = {
	collection: 'category'
};

var Category = {
	tes: function(){
		console.log(data.collection + ' Model OK')
	},
	createTimestamp: function(){
		return firebase().createTimestamp();
	},
	findAll: function(callback){
		firebase({collection: data.collection}).findAll(function(categories){
			callback(categories)
		})
	},
	findOne: function(key, value, callback){
		firebase({collection: data.collection}).findOne({
			key: key,
			value: value
		}, function(user){
			callback(user)
		})
	},
	findById: function(id, callback){
		firebase({collection: data.collection}).findById(id, function(user){
			if(user){
				var userData = {}
				for (var i in user) {
					if(i != 'password') {
						userData[i] = user[i]
					}
				}
				userData.id = id;
				callback(userData)
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
	},
	delete: function(id, callback) {
		firebase({collection: data.collection}).deleteById(id, function(result){
			if(result){
				callback(true)
			}else{
				callback(false)
			}
		})
	}
}

module.exports = Category