const express = require('express');
const router = express.Router();
const Video = require('../models/video');
const app = express();
const config = require('../../config/config');
const cors =  require('cors');
const bodyParser = require('body-parser');

// Custom Module
const firebase = require('../modules/firebase');

module.exports = (app) => {
  app.use('/', router);
  app.use(cors());
};

router.use(bodyParser.urlencoded({ extended: false }));
router.use(bodyParser.json());

// Add Video
router.post('/v1/video', (req, res, next) => {
	let data = {
		title: req.body.title,
		locked: req.body.locked,
		duration: req.body.duration,
		number: req.body.number,
		url: req.body.url,
		course_id: req.body.course_id,
		section_id: req.body.section_id
	}

	firebase({collection: 'video'}).addData(data, function(status, result){
		if(status === true){
			res.status(200).json({
				auth: true,
				message: 'Berhasil menambahkan video',
				result: result
	    	});
		}else{
			console.log(result)
			res.status(500).json({
				auth: false,
				message: 'Gagal menambahkan video'
	    	});
		}
	})
})

// Get All Video
router.get('/v1/videos', (req, res, next) => {
	Video.findAll(function(videos){
		res.status(200).json({
			status: 200,
			result: videos
		})
	})
})

// Get Video by Id
router.get('/v1/video/:id', (req, res, next) => {
	Video.findById(req.params.id, function(data){
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