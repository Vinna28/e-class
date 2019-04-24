const express = require('express');
const router = express.Router();
const app = express();
const config = require('../../config/config');
const cors =  require('cors');
const bodyParser = require('body-parser');
const jwt = require('jsonwebtoken');

// Custom Module
const firebase = require('../modules/firebase');

// Model
const Category = require('../models/category');
const User = require('../models/user');
const Course = require('../models/course');

module.exports = (app) => {
  app.use('/', router);
  app.use(cors());
};

router.use(bodyParser.urlencoded({ extended: false }));
router.use(bodyParser.json());

// Add Category
router.post('/v1/category', (req, res, next) => {
	// Initial Data
	var data = {
		name: req.body.name,
		category_desc: req.body.category_desc,
		subs: req.body.subs
	}

	let token = req.headers['x-access-token'];

	if (!token) return res.status(401).send({ auth: false, message: 'No log-in detected' });

	jwt.verify(token, config.secret, function(err, decoded) {
		if (err) {
			return res.status(500).send({ auth: false, message: 'Failed to authenticate token.' });
		} else {
			// cek admin by decoded.id
			User.isAdmin(decoded.id, (isAdmin) => {
				if(isAdmin){
					// Add to database
					firebase({collection: 'category'}).addData(data, function(status, result){
						if(status === true){
							res.status(200).json({
								auth: true,
								message: 'Berhasil menambahkan kategori.',
								result: result
					    	});
						}else{
							res.status(500).json({
								auth: false,
								message: 'Gagal menambahkan kategori.'
					    	});
						}
					});
				}else{
					res.status(403).json({
						status: 403,
						message: "Bukan admin"
					});
				}
			})
		}
	});
});

// Get All Categories
router.get('/v1/categories', (req, res, next) => {
	Category.findAll(function(categories){
		res.status(200).json({
			status: 200,
			result: categories
		});
	});
});

// Get Category by Id
router.get('/v1/category/:id', (req, res, next) => {
	Category.findById(req.params.id, function(data){
		if(data){
			res.status(200).json({
				status: 200,
				result: data
			})
		}else{
			res.status(404).json({
				status: 404,
				message: 'Data ' + req.params.id + ' not found.'
			})
		}
	})
});

// Search Name Category
router.post('/v1/searchcategories', (req, res, next) => {
	console.log('Get All category...')
	// 1. Get all user.
	// 2. Search cek course yang ada dengan request.
	// 3. Jika cocok maka tampilkan data yang cocok dengan request.

	Course.findAll(function(categories) {

		var category = searchCategory(categories);

		if(category == 0) {
			res.status(404).json({
				message: req.body.search + ' Not found'
			})
		} else {
			res.status(200).json({
				message: 'Success',
				result: category
			})
		}
	})

	function searchCategory(snapshot){
		var result = [];
		// Cari category dengan request
		for (var i = 0; i < snapshot.length; i++) {
			var doc = snapshot[i].categories;

			for (var j = 0; j < doc.length; j++) {
				var cat = doc[j];
			}
			// REAL FIX-NYA CAT.NAME.Category di tambah index 0
			  if(req.body.search.toLowerCase() == cat.name_category[0].toLowerCase() 
			  	|| cat.name_category[0].toLowerCase().indexOf(req.body.search)!== -1
			  	|| req.body.search.toUpperCase() == cat.name_category[0].toUpperCase() 
			  	|| cat.name_category[0].toUpperCase().indexOf(req.body.search)!== -1) {
			  	result.push(snapshot[i]) 
			  }
		}
		 return result;
	}	
});

// Search Subs Name Category
router.post('/v1/searchsubcat', (req, res, next) => {
	console.log('Get All category...')
	// 1. Get all user.
	// 2. Search cek course yang ada dengan request.
	// 3. Jika cocok maka tampilkan data yang cocok dengan request.

	Course.findAll(function(categories) {

		var category = searchCategory(categories);

		if(category == 0) {
			res.status(404).json({
				message: req.body.search + ' Not found'
			})
		} else {
			res.status(200).json({
				message: 'Success',
				result: category
			})
		}
	})

	function searchCategory(snapshot){
		var result = [];
		// Cari category dengan request
		for (var i = 0; i < snapshot.length; i++) {
			var doc = snapshot[i].categories;

			for (var j = 0; j < doc.length; j++) {
				var cat = doc[j].sub_category;
				for (var j = 0; j < cat.length; j++) {
					var sub = cat[j].name;
				}
			}
			    if(req.body.search.toLowerCase() == sub.toLowerCase() 
			    	|| sub.toLowerCase().indexOf(req.body.search)!== -1
			    	|| req.body.search.toUpperCase() == sub.toUpperCase() 
			    	|| sub.toUpperCase().indexOf(req.body.search)!== -1) {
			    	result.push(snapshot[i]) 
			    }
		}
		 return result;
	}	
});

// Search Topic Real
router.post('/v1/searchtopic', (req, res, next) => {
	console.log('Get All category...')
	// 1. Get all user.
	// 2. Search cek course yang ada dengan request.
	// 3. Jika cocok maka tampilkan data yang cocok dengan request.

	Course.findAll(function(categories) {
		console.log('masuk findAll course')
		var category = searchCategory(categories);

		if(category == 0) {
			res.status(404).json({
				message: req.body.search + ' Not found'
			})
		} else {
			res.status(200).json({
				message: 'Success',
				result: category
			})
		}
	})

	function searchCategory(snapshot){
		var result = [];
		// Cari category dengan request
		for (var i = 0; i < snapshot.length; i++) {
			var doc = snapshot[i].categories;
			for (var j = 0; j < doc.length; j++) {
				var cat = doc[j].sub_category[0].topic[0].name_topic[0];
			}
			    if(req.body.search.toLowerCase() == cat.toLowerCase() 
			    	|| cat.toLowerCase().indexOf(req.body.search)!== -1
			    	|| req.body.search.toUpperCase() == cat.toUpperCase() 
			    	|| cat.toUpperCase().indexOf(req.body.search)!== -1) {
			    	result.push(snapshot[i]) 
			    }
		}
		return result;
	}	
});

// Topic Dummy
// router.post('/v1/searchtopic', (req, res, next) => {
// 	console.log('Get All category...')
// 	// 1. Get all user.
// 	// 2. Search cek course yang ada dengan request.
// 	// 3. Jika cocok maka tampilkan data yang cocok dengan request.

// 	Course.findAll(function(categories) {
// 		console.log('masuk findAll course')
// 		var category = searchCategory(categories);

// 		if(category == 0) {
// 			res.status(404).json({
// 				message: req.body.search + ' Not found'
// 			})
// 		} else {
// 			res.status(200).json({
// 				message: 'Success',
// 				result: category
// 			})
// 		}
// 	})

// 	function searchCategory(snapshot){
// 		var result = [];
// 		// console.log('MASUK FUNGSI Search ==>', console.log(snapshot))
// 		// Cari category dengan request
// 		for (var i = 0; i < snapshot.length; i++) {
// 			var doc = snapshot[i].categories;
// 			// console.log('LOOPING DATA KE 1', doc)
// 			 for (var j = 0; j < doc.length; j++) {
// 			 	// var cat = doc[j].sub_category[0].topic[0].name_topic[0];
// 			 	var cat = doc[j].sub_category[0].topics;
// 			 	// console.log('LOOPING DATA KE 2', cat)
// 			 	for (var k = 0; k < cat.length; k++) {
// 			 		var topic = cat[k];
// 			 		console.log("HASIL TOPIC", topic)
// 					 if(req.body.search.toLowerCase() == topic.toLowerCase() 
// 					 	|| topic.toLowerCase().indexOf(req.body.search)!== -1
// 					 	|| req.body.search.toUpperCase() == topic.toUpperCase() 
// 					 	|| topic.toUpperCase().indexOf(req.body.search)!== -1) {
// 					 	result.push(snapshot[i]) 
// 					 }
// 			 	}
// 			 }
// 		}
// 		return result;
// 	}	
// });

// Update Category
router.put('/v1/category/:id', (req, res, next) => {
	let token = req.headers['x-access-token'];

	if (!token) return res.status(401).send({ auth: false, message: 'No log-in detected' });

	jwt.verify(token, config.secret, function(err, decoded) {
		if (err) {
			return res.status(500).send({ auth: false, message: 'Failed to authenticate token.' });
		} else {
			// cek admin by decoded.id
			User.isAdmin(decoded.id, (isAdmin) => {
				if(isAdmin){
					Category.findById(req.params.id, function(data){
						if(data){
							var cloned = JSON.parse(JSON.stringify(data));

							cloned.name = req.body.name;
							cloned.subs = req.body.subs;

							var count = 0;
							var nameUpdated = false;
							var subsUpdated = false;

							Category.findOneAndUpdateSingleKey(req.params.id, {name: req.body.name}, (ok)=>{
								if(ok){
									count++;
									nameUpdated = true;
									check();
								}
							})
							Category.findOneAndUpdateSingleKey(req.params.id, {name: req.body.name}, (ok)=>{
								if(ok){
									count++;
									subsUpdated = true;
									check();
								}
							})

							function check(){
								if(count == 2){
									if(nameUpdated && subsUpdated){
										res.status(200).json({
											status: 200,
											message: 'Category updated.',
											result: cloned
										});
									}else{
										res.status(500).json({
											status: 500,
											message: 'Data ' + req.params.id + ' failed to edit.'
										})
									}
								}
							}
						}else{
							res.status(404).json({
								status: 404,
								message: 'Data ' + req.params.id + ' not found.'
							})
						}
					})
				}else{
					res.status(403).json({
						status: 403,
						message: "Bukan admin"
					});
				}
			})
		}
	});
});

// Delete Category
router.delete('/v1/category/:id', (req, res, next) => {
	let token = req.headers['x-access-token'];

	if (!token) return res.status(401).send({ auth: false, message: 'No log-in detected' });

	jwt.verify(token, config.secret, function(err, decoded) {
		if (err) {
			return res.status(500).send({ auth: false, message: 'Failed to authenticate token.' });
		} else {	
			// cek admin by decoded.id
			User.isAdmin(decoded.id, (isAdmin) => {
				if(isAdmin){
					// if ok, fungsi delete
					Category.delete(req.params.id, ok => {
						if(ok){
							res.status(200).json({
								status: 200,
								message: 'Category ' + req.params.id + ' deleted.'
							})
						}else{
							res.status(400).json({
								status: 400,
								message: 'Category ' + req.params.id + ' failed to delete.'
							})
						}
					})
				}else{
					res.status(403).json({
						status: 403,
						message: "Bukan admin"
					});
				}
			})
		}
	});
});