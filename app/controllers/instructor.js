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
const Instructor = require('../models/instructor');
const User = require('../models/user');

module.exports = (app) => {
  app.use('/', router);
  app.use(cors());
};

router.use(bodyParser.urlencoded({ extended: false }));
router.use(bodyParser.json());

// Add Instructor
router.post('/v1/instructor', (req, res, next) => {
	var instructorExist;
	var instructorData = {
		name: req.body.name,
		courses: []
	}

	checkInstructor();
	
	async function checkInstructor() {
		try {
			checkInstructorName();
		} catch (err) {
			console.log('Opps, an error occured', err)
			res.status(500).json({
				auth: false,
				message: 'Error'
	    	});
		}
	}

	function checkInstructorName(){
	 	// Check Instructor Name
	 	Instructor.check('name', req.body.name, function(exist){
	 		instructorExist = exist;
	 			sendResult();
	 	})
	 }

	 function sendResult(){
		if (instructorExist) {
			res.status(409).json({
				status: 'Conflict',
				message: 'Instructor name already exist'
			})
		} else {
			firebase({collection: 'instructor'}).addData(instructorData, function(status, result){
				if(status === true){
					res.status(200).json({
						auth: true,
						message: 'Berhasil menambahkan instructor',
						result: result
			    	});
				}else{
					console.log(result)
					res.status(500).json({
						auth: false,
						message: 'Gagal menambahkan instructor'
			    	});
				}
			})
		}
	 }
})

// Get All Instructor
router.get('/v1/instructors', (req, res, next) => {
	console.log('Get All Instructor...')
	Instructor.findAll(function(instructors){
		res.status(200).json({
			status: 200,
			result: instructors
		})
	})
})

// Get instructors pagination
router.get('/v1/instructorspage', (req, res, next) => {
	var pageCount = 0;
	var page = parseInt(req.query.page)
	var size = parseInt(req.query.size)

	console.log(page, size)

	Instructor.paginate(page, size, (data) => {
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

// Get Instructor by Id
router.get('/v1/instructor/:id', (req, res, next) => {
	Instructor.findById(req.params.id, function(data){
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

// Update Instructor
router.put('/v1/instructor/:id', (req, res, next) => {

	User.isAdmin(decoded.id,(isAdmin) => {
		console.log(isAdmin)
		if(isAdmin){

			Instructor.findById(req.params.id, function(data){
				if(data){
					var cloned = JSON.parse(JSON.stringify(data));

					cloned.name = req.body.name;
					cloned.courses = req.body.courses;

					var count = 0;
					var nameUpdated = false;
					var coursesUpdated = false;

					Instructor.findOneAndUpdateSingleKey(req.params.id, {name: req.body.name}, (ok)=>{
						if(ok){
							count++;
							nameUpdated = true;
							check();
						}
					})
					Instructor.findOneAndUpdateSingleKey(req.params.id, {courses: req.body.courses}, (ok)=>{
						if(ok){
							count++;
							coursesUpdated = true;
							check();
						}
					})

					function check(){
						if(count === 2){
							if(nameUpdated && coursesUpdated){
								res.status(200).json({
									status: 200,
									message: "Instructor updated.",
									result: cloned
								});
							}else{
								res.status(500).json({
									status: 500,
									message: "Data failed to edit"
								})
							}
						}
					}
				}else{
					res.status(404).json({
						status: 404,
						message: 'Data' + req.params + 'not found'
					})
				}
			})
		}else {
			res.status(403).json({
				status: 403,
				message: "Bukan Admin"
			});
		}
	})
});

// Delete Instructor
router.delete('/v1/instructor/:id', (req, res, next) => {
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
					Instructor.delete(req.params.id, ok => {
						if(ok){
							res.status(200).json({
								status: 200,
								message: 'Instructor ' + req.params.id + ' deleted.'
							})
						}else{
							res.status(400).json({
								status: 400,
								message: 'Instructor ' + req.params.id + ' failed to delete.'
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