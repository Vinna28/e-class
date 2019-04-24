const firebase = require('../modules/firebase');

// Model data
const data = {
	collection: 'comment'
};

var Comment = {
	tes: function(){
		console.log(data.collection + ' Model OK')
	},
	createTimestamp: function(){
		return firebase().createTimestamp();
	},
	findAll: function(callback){
		firebase({collection: data.collection}).findAll(function(result){
			callback(result)
		})
	},
	findAllNew: function(callback){
		firebase({collection: data.collection}).findAllNew(function(comments){
			callback(comments)
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
		firebase({collection: data.collection}).findById(id, function(data){
			if(data){
				callback(data)
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
	},
	sortByTimestamp: function(callback){
		firebase({collection: data.collection}).sortByTimestamp(function(result){
			callback(result)
		})
	},
	paginate: function(page, size, callback){
		firebase({collection: data.collection, order_by: 'created_at'}).paginate(page, size, (data)=>{
			console.log("SEBELUM IF", data)
			if(data){
				console.log('SEUDAH IF', data)
				callback(data)
			}
		})
	},
}

module.exports = Comment