const express = require('express');
const router = express.Router();
const User = require('../models/user')
const app = express();
const config = require('../../config/config')
const crypto =  require('crypto')
const nodemailer = require('nodemailer');
const jwt = require('jsonwebtoken');
const cors =  require('cors')
const bodyParser = require('body-parser');
const upload = require('../modules/upload');
const firebase = require('../modules/firebase');

module.exports = (app) => {
  app.use('/', router);
};

router.get('/', (req, res, next) => {
	res.json({
		status:"Success",
		message:"REST API READY"
	})
});

// GET PRIVACY POLICY -f
router.get('/v1/privacypolicy', (req, res, next) => {
	firebase({collection: 'static'}).findAll((result) => {
		var data = result[0]
		if(data.privacy_policy){
			res.status(200).json({
				status: 200,
				message: 'Successfully get Privacy Policy',
				result: data.privacy_policy
			})
		}else{
			res.status(400).json({
				status: 400,
				message: "Privacy policy not found."
			})
		}
	})
});

// PUT PRIVACY POLICY
router.put('/v1/privacypolicy', (req, res, next) => {
	let token = req.headers['x-access-token'];

	if (!token) return res.status(401).send({ auth: false, message: 'No log-in detected' });

	jwt.verify(token, config.secret, function(err, decoded) {
		if (err) {
			return res.status(500).send({ auth: false, message: 'Failed to authenticate token.' });
		} else {
			User.isAdmin(decoded.id, (isAdmin) => {
				if(isAdmin){
					firebase({collection: 'static'}).findOneAndUpdateSingleKey(req.body.id, {privacy_policy: req.body.privacy_policy}, (ok) => {
						if(ok){
							res.status(200).json({
								status: 200,
								message: 'Successfully update Privacy Policy',
								result: {
									id: req.body.id,
									privacy_policy: req.body.privacy_policy
								}
							})
						}else{
							res.status(400).json({
								status: 400,
								message: "Privacy policy failed to edit."
							})
						}
					})
				} else {
					res.status(403).json({
						status: 403,
						message: "Bukan admin"
					});
				}
			})
		}
	});
});

// GET ABOUT -f
router.get('/v1/about', (req, res, next) => {
	firebase({collection: 'static'}).findAll((result) => {
		var data = result[0]
		if(data.about){
			res.status(200).json({
				status: 200,
				message: 'Successfully get About data.',
				result: data.about
			})
		}else{
			res.status(400).json({
				status: 400,
				message: "About not found."
			})
		}
	})
});

// PUT ABOUT
router.put('/v1/about', (req, res, next) => {
	let token = req.headers['x-access-token'];

	if (!token) return res.status(401).send({ auth: false, message: 'No log-in detected' });

	jwt.verify(token, config.secret, function(err, decoded) {
		if (err) {
			return res.status(500).send({ auth: false, message: 'Failed to authenticate token.' });
		} else {
			User.isAdmin(decoded.id, (isAdmin) => {
				if(isAdmin){
					firebase({collection: 'static'}).findOneAndUpdateSingleKey(req.body.id, {about: req.body.about}, (ok) => {
						if(ok){
							res.status(200).json({
								status: 200,
								message: 'Successfully update About text',
								result: {
									id: req.body.id,
									about: req.body.about
								}
							})
						}else{
							res.status(400).json({
								status: 400,
								message: "About text failed to edit."
							})
						}
					})
				} else {
					res.status(403).json({
						status: 403,
						message: "Bukan admin"
					});
				}
			})
		}
	});
});

// POST CONTACT 
router.post('/v1/contact', (req, res) => {
	var contactName = req.body.name;
	var contactEmail = req.body.email;
	var contactSubject = req.body.subject;
	var contactText = req.body.text;

	let transporter = nodemailer.createTransport({
		host : config.host,
		port: config.portSmtp,
		secure: config.secure, 
		auth: {
			user: config.auth.user,
			pass: config.auth.pass
		}
	});

	let mailOptions = {
		from: contactName+' <doesgen5@gmail.com>',
		to: config.auth.user,
		subject: contactSubject,
		text: 'From: '+ contactName+ '\nEmail: '+ contactEmail +'\nSubject: '+ contactSubject + '\nQuestion: '+contactText
	};

	transporter.sendMail(mailOptions, (err, next) => {
		if (err) {
			res.send(err);
		}

		console.log('Message sent: %s', next.messageId);
	
		res.send({
			message: "Success, verification email sent",
			status: 200
		});
	});
})
