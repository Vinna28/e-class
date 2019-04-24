const firebase = require('../modules/firebase');

// Model data
const data = {
	collection: 'course'
};

var Course = {
	tes: function(){
		console.log(data.collection + ' Model OK')
	},
	createTimestamp: function(){
		return firebase().createTimestamp();
	},
	findAll: function(callback){
		firebase({collection: data.collection}).findAll(function(courses){
			callback(courses)
		})
	},
	findAllNew: function(callback){
		firebase({collection: data.collection}).findAllNew(function(courses){
			callback(courses)
		})
	},
	findAllPopular: function(callback){
		firebase({collection: data.collection}).findAllPopular(function(courses){
			callback(courses)
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
		firebase({collection: data.collection}).findById(id, function(course){
			if(course){
				var courseData = {}
				for (var i in course) {
					courseData[i] = course[i]
				}
				courseData.id = id;
				courseData.aid = id;
				callback(courseData)
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
	paginate: function(page, size, callback){
		console.log('course paginated')
		firebase({collection: data.collection, order_by: 'created'}).paginate(page, size, (data)=>{
			console.log("SEBELUM IF", data)
			if(data){
				console.log('SEUDAH IF', data)
				callback(data)
			}
		})
	},
	 // paginated: function(limited, callback){
	 // 	console.log('course paginated')
	 // 	firebase({collection: data.collection}).limit(25)
	 // 		if(data){
	 // 			callback(data)
	 // 		}
	 // 	})
	 // },
}

module.exports = Course