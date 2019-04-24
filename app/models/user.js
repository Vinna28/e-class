const firebase = require('../modules/firebase');

// Model data
const data = {
	collection: 'user'
};

var User = {
	tes: function(){
		console.log(data.collection + ' Model OK')
	},
	createTimestamp: function(){
		return firebase().createTimestamp();
	},
	findAll: function(callback){
		firebase({collection: data.collection}).findAll(function(users){
			callback(users)
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
		firebase({collection: data.collection}).findById(id, function(user, err){
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
				callback(false, err)
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
	isAdmin: function(id, callback){
		console.log('is admin ' + id)
		firebase({collection: data.collection}).findById(id, (user) => {
			console.log(user)
			if(user.role === 9){
				callback('admin')
			}else if(user.role === 99){
				callback('superadmin')
			}else{
				callback(false)
			}
		})
	},
	paginate: function(page, size, callback){
		firebase({collection: data.collection, order_by: 'registered_at'}).paginate(page, size, (data)=>{
			console.log("SEBELUM IF", data)
			if(data){
				console.log('SESUDAH IF', data)
				callback(data)
			}
		})
	},
}

module.exports = User