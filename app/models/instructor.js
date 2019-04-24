const firebase = require('../modules/firebase');

// Model data
const data = {
	collection: 'instructor'
};

var Instructor = {
	tes: function(){
		console.log(data.collection + ' Model OK')
	},
	createTimestamp: function(){
		return firebase().createTimestamp();
	},
	findAll: function(callback){
		firebase({collection: data.collection}).findAll(function(instructors){
			callback(instructors)
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
	},
	paginate: function(page, size, callback){
		console.log('Instructors paginated')
		firebase({collection: data.collection, order_by: 'name'}).paginate(page, size, (data)=>{
			console.log("SEBELUM IF", data)
			if(data){
				console.log('SEUDAH IF', data)
				callback(data)
			}
		})
	},
}

module.exports = Instructor