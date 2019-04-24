const firebaseAdmin = require('firebase-admin');
const serviceAccount = require('../../serviceAccountKey.json');

// Initialize Firebase
firebaseAdmin.initializeApp({
  credential: firebaseAdmin.credential.cert(serviceAccount)
});

// Database Settings
const db = firebaseAdmin.firestore();
const settings = {/* your settings... */ timestampsInSnapshots: true};
db.settings(settings);

// Modules Object
function Firebase(props){

	this.createTimestamp = function(){
		return firebaseAdmin.firestore.FieldValue.serverTimestamp();
	}

	this.findById = function(id, callback){
		db.collection(props.collection).doc(id).get()
		.then((doc) => {
			if(doc){
				callback(doc.data())
			}else{
				callback(false)	
			}
		})
		.catch((err) => {
		  console.log('Error getting documents', err);
		  callback(false, err)
		});
	}

	this.findAll = function(callback){
		var items = []
		db.collection(props.collection).get()
		.then((snapshot) => {
		  snapshot.forEach((doc) => {
				var data = doc.data()
				data.id = doc.id
				data.aid = doc.id
			    items.push(data)
		  });
		  callback(items)
		})
		.catch((err) => {
		  console.log('Error getting documents', err);
		});
	}

	 this.findAllNew = function(callback){
	 	var items = []
	 	db.collection(props.collection).orderBy('created_at', 'desc').limit(10).get()
	 	.then((snapshot) => {
	 	  snapshot.forEach((doc) => {
	 			var data = doc.data()
	 			data.id = doc.id
	 			data.aid = doc.id
	 		    items.push(data)
	 	  });
	 	  callback(items)
	 	})
	 	.catch((err) => {
	 	  console.log('Error getting documents', err);
	 	});
	 }

	this.findAllPopular = function(callback){
		var items = []
		db.collection(props.collection).orderBy('view_count', 'desc').limit(10).get()
		.then((snapshot) => {
		  snapshot.forEach((doc) => {
				var data = doc.data()
				data.id = doc.id
				data.aid = doc.id
			    items.push(data)
		  });
		  callback(items)
		})
		.catch((err) => {
		  console.log('Error getting documents', err);
		});
	}

	this.findAllLimit = function(callback){
	 	var items = []
	 	db.collection(props.collection).orderBy(props.order_by).limit(10).get()
	 	.then((snapshot) => {
	 	  snapshot.forEach((doc) => {
	 			var data = doc.data()
	 			data.id = doc.id
	 			data.aid = doc.id
	 		    items.push(data)
	 	  });
	 	  callback(items)
	 	})
	 	.catch((err) => {
	 	  console.log('Error getting documents', err);
	 	});
	 }

	this.find = function(params, callback){
		var items = []
		db.collection(props.collection).where(params.key, '==', params.value).get()
		.then((snapshot) => {
		  snapshot.forEach((doc) => {
		    items.push(doc.data())
		  });
		  callback(items)
		})
		.catch((err) => {
		  console.log('Error getting documents', err);
		});
	}

	// find one and callback a single object
	this.findOne = function(params, callback){
		db.collection(props.collection).where(params.key, '==', params.value).get()
		.then((snapshot) => {
			if(snapshot._docs()[0]){
				var cloned = snapshot._docs()[0].data();
				cloned.id = snapshot._docs()[0].id
				cloned.aid = snapshot._docs()[0].id
				callback(cloned)
			}else{
				callback(false)		
			}
		})
		.catch((err) => {
			console.log('Error getting documents', err);
			callback(false)
		});
	}

	this.addData = function(newData, callback){
		db.collection(props.collection).add(newData)
		.then((snapshot) => {
			console.log('data added: ', snapshot.id)
			callback(true, snapshot.id)
		})
		.catch((err) => {
			console.log('Error add data', err);
			callback(false, err)
		});
	}

	// edit data
	this.findOneAndUpdateSingleKey = function(id, updated, callback){
		db.collection(props.collection).doc(id).update(updated);
		callback(true)
	}

	this.convertIdsToObjects = function(arr, arr2){
		for (var i = 0; i < arr.length; i++) {
		    for (var j = 0; j < arr2.length; j++) {
		      if(arr2[j].aid === arr[i]){
		        arr[i] = arr2[j];
		      }
		    }
		  }

		return arr
	}

	this.deleteById = function(id, callback){
		db.collection(props.collection).doc(id).delete()
		.then(()=>{
			callback(true);
		})
		.catch((err)=>{
			console.log(err)
			callback(false);
		})
	}

	this.paginate = function(page, size, callback){
		var limit = size * page;
		var result = [];

		var query = db.collection(props.collection).orderBy(props.order_by).limit(limit);

		query.get().then(snapshot => {
			var sliced = snapshot.docs.slice(Math.max(snapshot.docs.length - size, 0))

			sliced.forEach(doc => {
				console.log(doc.id)
				var cloned = doc.data();
				cloned.id = doc.id;
				result.push(cloned)
			})

			callback(result);
		})
	}

	return this;
}

module.exports = Firebase;
