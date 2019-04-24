const express = require('express');
const router = express.Router();
const app = express();
const config = require('../../config/config');
const cors =  require('cors');
const jwt =  require('jsonwebtoken');
const bodyParser = require('body-parser');
const fs = require('fs');
const upload = require('../modules/upload');

// Models
const User = require('../models/user');
const Course = require('../models/course');
const Instructor = require('../models/instructor');
const Category = require('../models/category');
const Comment = require('../models/comment');
const Section = require('../models/section');
const Video = require('../models/video');

// Custom Module
const firebase = require('../modules/firebase');

module.exports = (app) => {
  app.use('/', router);
  app.use(cors());
};

router.use(bodyParser.urlencoded({ extended: false }));
router.use(bodyParser.json());

// Local database
var _instructors = [];
var _categories = [];
var _sections = [];
var _videos = [];
var _comments = [];

// Add Course
router.post('/v1/course', (req, res, next) => {
	// CEK DULU ADMIN BUKAN?
	let token = req.headers['x-access-token'];

	if (!token) return res.status(401).send({ auth: false, message: 'No log-in detected' });

	jwt.verify(token, config.secret, function(err, decoded) {
		if (err) {
			return res.status(500).send({ auth: false, message: 'Failed to authenticate token.' });
		} else {
			User.isAdmin(decoded.id, (isAdmin) => {
				if(isAdmin){
					// Initial Data
					var data = {
						sections: req.body.sections,
						title: req.body.title,
						description: req.body.description,
						subtitle: req.body.subtitle,
						thumbnail: req.body.thumbnail,
						view_count: 0,
						instructors: req.body.instructors,
						categories: req.body.categories,
						public: false,
						popular: false,
						created_at: Course.createTimestamp(),
						background: req.body.background,
						background_desc: req.body.background_desc,
						comments: []
					}
					// Add to database
					firebase({collection: 'course'}).addData(data, function(status, result){
						if(status === true){
							res.status(200).json({
								auth: true,
								message: 'Berhasil menambahkan course',
								result: result
					    	});
						}else{
							console.log(result)
							res.status(500).json({
								auth: false,
								message: 'Gagal menambahkan course'
					    	});
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

// Router save STORAGE
router.post('/v1/uploadimage', (req, res, next) => {
	console.log('[UPLOAD BACKGROUND IMAGE]')

	upload(req, res, (err) => {
		if(err) {
			console.log('Error')
			res.status(403).json({message: 'error'})
		} else {
			var data = req.files;
			if(data) {
				console.log(data);
				
				var fullUrl = req.protocol + '://' + req.get('host') + '/images/' +  data[0].filename  ;

				console.log('Upload success')
			
				res.status(200).json({
					status: 'OK',
					message: 'Image uploaded',
					url : fullUrl
				});
			} else {
				console.log('Upload file failed')

				res.status(403).json({
					status: 'Forbidden',
					message: 'Failed'
				});
			}
		}
	});
});

// Get All Course
router.get('/v1/courses', (req, res, next) => {
	console.log('Get All Course...')
	Course.findAll(function(courses){
		// Get lagi semua data yang statis
		  getCategory();

		res.status(200).json({
			status: 200,
			result: courses
		})
	})
});

// Get New Course
router.get('/v1/newcourses', (req, res, next) => {
	console.log('Get All Course...')
	Course.findAllNew(function(courses){
		// Get lagi semua data yang statis
		 getCategory();

		res.status(200).json({
			status: 200,
			result: courses
		})
	})
});

// Get Popular Course
router.get('/v1/popularcourses', (req, res, next) => {
	console.log('Get All Course...')
	Course.findAllPopular(function(courses){
		// Get lagi semua data yang statis
		 getCategory();

		res.status(200).json({
			status: 200,
			result: courses
		})
	})
});

// Get Course by Id
router.get('/v1/course/:id', (req, res, next) => {
	var prev_count = null;

	var result = [];
	console.log(req.params.id)
	Course.findById(req.params.id, function(course){
		console.log(course)
		if(course){
			var doc = course;

		    var cloned = JSON.parse(JSON.stringify(doc));

		    var convertedCategories = firebase().convertIdsToObjects(doc.categories, _categories);
		    var convertedInstructors = firebase().convertIdsToObjects(doc.instructors, _instructors);
		    var convertedSections = firebase().convertIdsToObjects(doc.sections, _sections);
		    var convertedComments = firebase().convertIdsToObjects(doc.comments, _comments);

			prev_count = doc.view_count;
			cloned.categories = convertedCategories;
			cloned.instructors = convertedInstructors;
			cloned.sections = convertedSections;
			cloned.comments = convertedComments;

			for (var i = 0; i < cloned.sections.length; i++) {
				var ccv = firebase().convertIdsToObjects(cloned.sections[i].videos, _videos)
				cloned.sections[i].videos = ccv;
			}

		    result.push(cloned)

			// Update view count 
			var newCount = prev_count + 1;
			Course.findOneAndUpdateSingleKey(cloned.id, {view_count: newCount}, function(result){
				if(result){
					console.log('view_count++')
				}
			})

			res.status(200).json({
				status: 200,
				result: result[0]
			})
		}else{
			res.status(404).json({
				status: 404,
				message: 'Course not found.'
			})
		}
	})
});

// User Joined Course
router.post('/v1/joincourse/:id', (req, res, next) => {
	let token = req.headers['x-access-token'];
	
	if (!token) return res.status(401).send({ auth: false, message: 'No log-in detected' });

	jwt.verify(token, config.secret, function(err, decoded) {
		if (err) {
			return res.status(500).send({ auth: false, message: 'Failed to authenticate token.' });
		} else {

			User.findById(decoded.id, function(user){
				if(user){
					console.log(user)
					var cloned = JSON.parse(JSON.stringify(user.my_course));
					console.log(cloned)
					
					// Cek apakah course sudah ada
					console.log(cloned.indexOf(req.params.id))
					if(cloned.indexOf(req.params.id) === -1){
						cloned.push(req.params.id);

						User.findOneAndUpdateSingleKey(decoded.id, {my_course: cloned}, function(result){
							res.status(200).json({
								status: 200,
								message: 'Course added.',
								courses: cloned
							})
						})
					}else{
						res.status(403).json({
							status: 403,
							message: "Course already added."
						});
					}
				}else{
					res.status(400).json({
						status: 400,
						message: "No user or admin log-in"
					});
				}
			})
		}
	});
});

// Get comment course by Id FOR DUMMY
router.get('/v1/commentcourse/:id', (req, res, next) => {
	var result = [];

	var resultComment = [];
	var currentPage = 1;
	var page = parseInt(req.query.page)
	var size = parseInt(req.query.size)
	var pageCount = result.length / size;
	var listComment = [];
	var lastResult = [];

	Course.findById(req.params.id, function(course){

		if(course){
			for (var i in course.comments) {
				var hasil = course.comments[i];

				result.push(hasil)
			}
			

			while (result.length > 0) {
				resultComment.push(result.splice(0, size))
			}


			if (page !== 'undefined') {
				currentPage = +page;
			}

			listComment = resultComment[+ currentPage - 1];
			console.log("LIST COMENT", listComment)

			if (listComment && listComment.length > 0){
				for (var j = 0; j < listComment.length; j++) {
					Comment.findById(listComment[j], function(comment) {
						// console.log('HASIL LOOP COMMENT ==>', comment);
						lastResult.push(comment)
					})
				}
					
				setTimeout(function() { 	 
					res.status(200).json({
						status: 200,
						result: lastResult
					})
				}, 5000);
			
			} else {
				res.status(403).json({
					status: 403,
					message: 'comments is empty'
				})
			}
		} else {
			
			res.status(404).json({
				status: 404,
				message: 'Course not found.'
			})
		} 
	})
});

// Get comment course by Id REAL
router.get('/v1/commentcoursereal/:id', (req, res, next) => {
	var result = [];

	var resultComment = [];
	var currentPage = 1;
	var page = parseInt(req.query.page)
	var size = parseInt(req.query.size)
	var pageCount = result.length / size;
	var listComment = [];
	var lastResult = [];

	Course.findById(req.params.id, function(course){
		console.log("UDAH MASUK FIND BY ID COURSE")
		if(course){
			for (var i in course.comments) {
				var hasil = course.comments[i];

				result.push(hasil)
			}
			
			console.log('PANJANG RESULT ==> ', result.length)
			while (result.length > 0) {
				resultComment.push(result.splice(0, size))
			}

			if (page !== 'undefined') {
				currentPage = +page;
			}

			listComment = resultComment[+ currentPage - 1];

			for (var j = 0; j < listComment.length; j++) {
				Comment.findById(listComment[j], function(comment) {

					lastResult.push(comment)
				})
			}

			setTimeout(function() { 	 
				res.status(200).json({
					status: 200,
					result: lastResult
				})
			}, 5000);
		} else {
			
			res.status(404).json({
				status: 404,
				message: 'Course not found.'
			})
		} 
	})
});


// User Unjoined Course
router.post('/v1/unjoincourse/:id', (req, res, next) => {
	let token = req.headers['x-access-token'];
	
	if (!token) return res.status(401).send({ auth: false, message: 'No log-in detected' });

	jwt.verify(token, config.secret, function(err, decoded) {
		if (err) {
			return res.status(500).send({ auth: false, message: 'Failed to authenticate token.' });
		} else {

			User.findById(decoded.id, function(user){
				if(user){
					console.log(user)
					var cloned = JSON.parse(JSON.stringify(user.my_course));
					
					console.log('Sebelum displice: ', cloned)

					cloned.splice(cloned.indexOf(req.params.id), 1);

					console.log('Sesudah displice: ', cloned)

					User.findOneAndUpdateSingleKey(decoded.id, {my_course: cloned}, function(result){
						res.status(200).json({
							status: 200,
							message: 'Course removed.',
							courses: cloned
						})
          })
				}else{
					res.status(400).json({
						status: 400,
						message: "No user or admin log-in"
					});
				}
			})
		}
	});
});

// Edit Course
router.put('/v1/editcourse/sections/:id', (req, res, next) => {
	let token = req.headers['x-access-token'];
	
	if (!token) return res.status(401).send({ auth: false, message: 'No log-in detected' });

	jwt.verify(token, config.secret, function(err, decoded) {
		if (err) {
			return res.status(500).send({ auth: false, message: 'Failed to authenticate token.' });
		} else {

			Course.findOneAndUpdateSingleKey(req.params.id, {sections: req.body.sections}, function(result){
				res.status(200).json({
					status: 200,
					message: 'Course sections updated.',
					result: req.params.id
				})
			})
		}
	});
});

// Get Course pagination
router.get('/v1/coursespage', (req, res, next) => {
	var pageCount = 0;
	var page = parseInt(req.query.page)
	var size = parseInt(req.query.size)

	console.log(page, size)

	Course.paginate(page, size, (data) => {
		console.log('masuk data ==>', data)
		if(data && data.length > 0){
			res.json({
				result: data
			});
		}else{
			res.status(400).send('error');
		}
	})
});

router.post('/v1/searchcourses', (req, res, next) => {
	console.log('Get All Course...')
	// 1. Get all user.
	// 2. Search cek course yang ada dengan request.
	// 3. Jika cocok maka tampilkan data yang cocok dengan request.

	Course.findAll(function(courses) {

		var course = searchCourse(courses);

		if(course == 0) {
			res.status(404).json({
				message: req.body.search + ' Not found'
			})
		} else {
			res.status(200).json({
				message: 'Success',
				result: course
			})
		}
	})

	function searchCourse(snapshot){
		var result = [];
		// Cari course dengan request
		for (var i = 0; i < snapshot.length; i++) {
			
			var doc = snapshot[i];
			console.log(req.body.search.toLowerCase())
			console.log(doc.title.toLowerCase())

			if( req.body.search == doc.title
				// || doc.title.indexOf(req.body.search)
				|| req.body.search.toLowerCase() == doc.title.toLowerCase() 
				|| doc.title.toLowerCase().indexOf(req.body.search)!== -1
				|| req.body.search.toUpperCase() == doc.title.toUpperCase() 
				|| doc.title.toUpperCase().indexOf(req.body.search)!== -1) {
				result.push(doc) 
			}
		}
		 return result;
	}	
});

// Langsung get semua data yang statis
// sementara matiin supaya ga boros quota
// getCategory();

function getCategory(){
	Category.findAll(function(categories){
		_categories = categories;
		console.log('LOADING 10%...')
		getInstructor();
	})
}
function getInstructor(){
	Instructor.findAll(function(instructors){
		_instructors = instructors;
		console.log('LOADING 20%...')
		getSection();
	})
}
function getSection(){
	Section.findAll(function(sections){
		_sections = sections;
		console.log('LOADING 30%...')
		getComment();
	})
}
function getComment(){
	Comment.findAll(function(comments){
		_comments = comments;
		console.log('LOADING 40%...')
		getVideo();
	})
}
function getVideo(){
	Video.findAll(function(videos){
		_videos = videos;
		console.log('LOADING 100%... LOADED.')
	})
}