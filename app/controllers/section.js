const express = require('express');
const router = express.Router();
const app = express();
const config = require('../../config/config');
const cors =  require('cors');
const bodyParser = require('body-parser');
const jwt = require('jsonwebtoken');

// Custom Module
const firebase = require('../modules/firebase');

// Models
const User = require('../models/user');
const Video = require('../models/video');
const Section = require('../models/section');

module.exports = (app) => {
  app.use('/', router);
  app.use(cors());
};

router.use(bodyParser.urlencoded({ extended: false }));
router.use(bodyParser.json());

var _videos = [];

// Add Section
router.post('/v1/section', (req, res, next) => {
	let data = {
		title: req.body.title,
		number: req.body.number,
		videos: req.body.videos
	}

	firebase({collection: 'section'}).addData(data, function(status, result){
		if(status === true){
			res.status(200).json({
				auth: true,
				message: 'Berhasil menambahkan section',
				result: result
	    	});
		}else{
			console.log(result)
			res.status(500).json({
				auth: false,
				message: 'Gagal menambahkan section'
	    	});
		}
	})
});

// Get All Section
router.get('/v1/sections', (req, res, next) => {
	Section.findAll(function(sections){
		res.status(200).json({
			status: 200,
			result: sections
		})
	})
});

// Get Section by Id
router.get('/v1/section/:id', (req, res, next) => {
	var result = [];

	Section.findById(req.params.id, function(section){
		if(section){
			var doc = section;

		    var cloned = JSON.parse(JSON.stringify(doc));

		    getVideo((videos) => {
			    var convertedVideos = firebase().convertIdsToObjects(doc.videos, videos);

				cloned.videos = convertedVideos;

			    result.push(cloned)

				res.status(200).json({
					status: 200,
					result: result[0]
				})
		    });
		}else{
			res.status(404).json({
				status: 404,
				message: 'Section not found.'
			})
		}
	})
});

// Update Section
router.put('/v1/section/:id', (req, res, next) => {
	let token = req.headers['x-access-token'];

	if (!token) return res.status(401).send({ auth: false, message: 'No log-in detected' });

	jwt.verify(token, config.secret, function(err, decoded) {
		if (err) {
			return res.status(500).send({ auth: false, message: 'Failed to authenticate token.' });
		} else {
			User.isAdmin(decoded.id, (isAdmin) => {
				if(isAdmin){
					Section.findById(req.params.id, function(data){
						if(data){
							var cloned = JSON.parse(JSON.stringify(data));

							cloned.title = req.body.title;
							cloned.number = req.body.number;
							cloned.videos = req.body.videos;
							cloned.course_id = req.body.course_id;

							console.log('ASU CLONED', cloned);

							var count = 0;
							var titleUpdated = false;
							var numberUpdated = false;
							var videosUpdated = false;
							var courseIdUpdated = false;

							Section.findOneAndUpdateSingleKey(req.params.id, {title: req.body.title}, (ok)=>{
								if(ok){
									count++;
									titleUpdated = true;
									check();
								}
							})
							Section.findOneAndUpdateSingleKey(req.params.id, {number: req.body.number}, (ok)=>{
								if(ok){
									count++;
									numberUpdated = true;
									check();
								}
							})
							Section.findOneAndUpdateSingleKey(req.params.id, {videos: req.body.videos}, (ok)=>{
								if(ok){
									count++;
									videosUpdated = true;
									check();
								}
							})
							Section.findOneAndUpdateSingleKey(req.params.id, {course_id: req.body.course_id}, (ok)=>{
								if(ok){
									count++;
									courseIdUpdated = true;
									check();
								}
							})

							function check(){
								if(count == 4){
									if(titleUpdated && numberUpdated && videosUpdated && courseIdUpdated){
										res.status(200).json({
											status: 200,
											message: 'Section updated.',
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

function getVideo(callback){
	Video.findAll(function(videos){
		_videos = videos;
		callback(videos);
	})
}
