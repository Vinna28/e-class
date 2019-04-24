const express = require('express');
const router = express.Router();
const app = express();
const config = require('../../config/config');
const bcrypt =  require('bcryptjs')
const crypto =  require('crypto')
const jwt = require('jsonwebtoken');
const cors =  require('cors');
const bodyParser = require('body-parser');
const upload = require('../modules/upload');
const firebaseAdmin = require('firebase-admin');
const db = firebaseAdmin.firestore();
const fs = require('fs');

const User = require('../models/user');
const Course = require('../models/course');

// Custom Modules
const firebase = require('../modules/firebase');
const mailer = require('../modules/mailer');

module.exports = (app) => {
  app.use('/', router);
  app.use(cors());
};

router.use(bodyParser.urlencoded({ extended: false }));
router.use(bodyParser.json());

// USER REGISTER -f
router.post('/v1/register', (req, res, next) => {
	let usernameExist;
	let emailExist;
	let userData = {
		username: req.body.username,
		fullname: req.body.fullname,
		password: hashing(req.body.password),
		email: req.body.email,
		gender: req.body.gender,
		birthday: req.body.birthday,
		avatar: 'https://' + req.headers.host + '/images/default.png',
		role: 1,
		active: true,
		verified: false,
		token: null,
		token_expired: null,
		google_id: null,
		my_course: [],
		registered_at: User.createTimestamp()
	}

	registerUser();
	
	async function registerUser() {
		try {
			checkUsernameAndEmail();
		} catch (err) {
			console.log('Opps, an error occured', err)
			res.status(500).json({
				auth: false,
				message: 'Error'
	    	});
		}
	}

	function checkUsernameAndEmail(){
		// Check username and email
		User.check('username', req.body.username, function(exist){
			usernameExist = exist;
			User.check('email', req.body.email, function(exist){
				emailExist = exist;
				sendResult();
			})
		})
	}

	function sendResult(){
		if (usernameExist) {
			res.status(409).json({
				status: 'Conflict',
				message: 'Username already exist'
			})
		}
		else if (emailExist) {
			res.status(409).json({
				status: 'Conflict',
				message: 'Email already exist'
			})
		} 
		else if (emailExist && usernameExist) {
			res.status(409).json({
				status: 'Conflict',
				message: 'Username and Email already exist'
			})
		} else {
			firebase({collection: 'user'}).addData(userData, function(status, result){
				if(status === true){
					userData.id = result
					sendVerficationEmail(userData, req.headers.host, function(ok){
						var msg = 'Berhasil register. ';
						if(ok){
							msg = msg + 'Silahkan cek email.'
						}
						res.status(200).json({
							auth: true,
							message: msg,
							result: result
				    	});
					})
				}else{
					console.log(result)
					res.status(500).json({
						auth: false,
						message: 'Gagal register'
			    	});
				}
			})
		}
	}
});

// USER LOGIN -f
router.post('/v1/login', (req, res, next) => {
	console.log('\n\n[LOGIN] - ' + req.body.username + ' ' + req.body.email);

	// 1. Get all user.
	// 2. Search user yang mau login.
	// 3. Compare username/email & passwordnya.
	// 4. Jika belum verified, dilarang masuk. Kirim email verifikasi.
	// 5. Login selesai.

	// 1.
	console.log('10% ...');
	User.findAll(function(users){
		
		// 2.
		console.log('20% ...');
		var user = searchUser(users);
		if(user !== null){
			if(user.active === true && user.verified === true) {
				
				// 3.
				console.log('30% ...');
				compare(user, function(compared) {
					if(compared.status === true){
						var token = jwt.sign({id: user.aid}, config.secret, {
							expiresIn: '24h'
						});

						// 5.
						console.log('LOGIN SUCCESS. ID: ', user.aid, token)
						res.status(200).json({message: 'Login success', token, ID: user.aid});
					}else{
						res.status(403).json({message: 'Login failed. ' + compared.message})
					}
				});
			}
			else if(user.active !== true){
				res.status(400).json({message: 'User deactive. Please check your email.'})
				sendActivationEmail(user, req.headers.host, function(ok){
					if(ok){
						res.status(400).json({
							code: 'ACTIVE',
							message: "Login failed. User not active. Activation Email Sent."
						})
					}else{
						res.status(400).json({
							code: 'ACTIVE',
							message: "Login failed. User not active. And we are sorry, we cannot send activation email due to system error."
						})
					}
				});
			}else if(user.verified !== true){
				// 4.
				console.log('Login failed, karena belum verified.');
				sendVerficationEmail(user, req.headers.host, function(ok){
					if(ok){
						res.status(400).json({
							code: 'VERIFIED',
							message: 'Login failed. User not verified. Please check email.'
						})
					}else{
						res.status(400).json({
							code: 'VERIFIED',
							message: 'Login failed. User not verified. And we are sorry, we cannot send verification email due to system error.'
						})
					}
				});
			}else{
				res.send('Unknown');
			}
		}
		else{
			res.status(404).json({code: 'EXIST', message: 'User not exist.'})
		}
	})

	// --- Login Modules ---
	function compare(user, callback) {
		if(user.username == req.body.username){
			checkPassword();
		}else if(user.email == req.body.email){
			checkPassword();
		}else{
			callback({status: false, message: 'Wrong username/email.'});
		}

		function checkPassword(){
			if(user.password == hashing(req.body.password)){
				callback({status: true})
			}else{
				callback({status: false, message: 'Wrong password.'})
			}
		}
	}

	function searchUser(snapshot){
		var user = null;

		// Cari user dengan username
		for (var i = 0; i < snapshot.length; i++) {
			var doc = snapshot[i];
			if(doc.username == req.body.username) {
				user = doc;
			}
		}

		// Kalau user masih belum ketemu, cari user dengan email
		if(user === null){
			if(req.body.email){
				for (var i = 0; i < snapshot.length; i++) {
					var doc = snapshot[i];
					if(doc.email == req.body.email) {
						user = doc;
					}
				}
			}
		}

		return user;
	}
});

// VERIFICATION EMAIL -f
router.post('/v1/verification', (req, res, next) => {
	// Jika akun belum verified, DILARANG LOGIN --faris
	console.log(req.body.email)
	User.findOne('email', req.body.email, function(user){
		if(user){
			sendVerficationEmail(user, req.headers.host, function(ok){
				if(ok){
					res.status(200).send({
						message: "Success, verification email sent",
						id_user: user.id
					});
				}else{
					res.status(500).send({
						message: "Error, verification email not sent"
					});
				}
			});
		}else{
			res.status(400).send({
				message: "Email does not exist"
			});
		}
	})
});

// ACTIVATION EMAIL -f
router.post('/v1/activation', (req, res, next) => {
	console.log('\n\n[ACTIVATION] - ' + req.body.email)
	User.findOne('email', req.body.email, function(user){
		if(user){
			sendActivationEmail(user, req.headers.host, function(ok){
				if(ok){
					res.status(200).json({
						message: "Activation Email Sent."
					})
				}else{
					res.status(400).json({
						message: "Error. Activation Email failed to send."
					})
				}
			});
		}else{
			res.status(400).send({
				message: "Email does not exist"
			});
		}
	})
});

// ACTIVATE ACCOUNT. bukan verification akun. -f
router.get('/v1/activate/:token', (req, res, next) => {
	console.log('ACTIVATING ACCOUNT WITH TOKEN:', req.params.token)
	jwt.verify(req.params.token, config.secret, function(err, decoded){
		console.log('DECODED:', decoded)
		console.log('ERROR:', err)

		if(err !== null){
			res.status(500).send({message: 'Failed to authenticate token.'});
		}else{
			User.findOneAndUpdateSingleKey(decoded.id, {active: true}, function(ok){
				if(ok){
					console.log('ACCOUNT ACTIVATED. REDIRECT LOGIN')
					res.redirect('https://eclass-dev.doesuniversity.com/login/activated');
				}
			})
		}
	})
});

// VERIFY ACCOUNT. bukan activation akun. -f
router.get('/v1/verify/:token', (req, res, next) => {
	console.log('VERIFYING ACCOUNT WITH TOKEN:', req.params.token)
	jwt.verify(req.params.token, config.secret, function(err, decoded){
		console.log('DECODED:', decoded)
		console.log('ERROR:', err)

		if(err !== null){
			res.status(500).send({message: 'Failed to authenticate token.'});
		}else{
			User.findOneAndUpdateSingleKey(decoded.id, {verified: true}, function(ok){
				if(ok){
					console.log('ACCOUNT VERIFIED. REDIRECT LOGIN')
					res.redirect('https://eclass-dev.doesuniversity.com/login/verified');
				}
			})
		}
	})
});

// CHECK TOKEN -f
router.post('/v1/checktoken', (req, res, next) => {
	var token = req.headers['x-access-token'];
	console.log(token);
	if (!token) return res.status(401).send({ auth: false, message: 'No token detected' });

	jwt.verify(token, config.secret, function(err, decoded) {
		if (err) {
			return res.status(500).send({ auth: false, message: 'Failed to authenticate token.' });
		} else {
			console.log(decoded);
			res.status(200).send({
				code: 200,
				message: "Token is valid.",
				decoded: decoded
			});
		}
	});
});

// NEW PASSWORD CONFIRMATION -f
router.use('/v1/confirmation/:token', function(req, res, next) {
	console.log('CONFIRMATION:', req.params.token)
	jwt.verify(req.params.token, config.secret, function(err, decoded){
		console.log('DECODED:', decoded)
		console.log('ERROR:', err)

		if(err !== null){
			res.status(500).send({message: 'Failed to authenticate token.'});
		}else{
			res.redirect('https://eclass-dev.doesuniversity.com/newpassword/' + req.params.token);
		}
	})
});

// USER DE-ACTIVATE ACCOUNT -f
router.put('/v1/deactivate', (req, res, next) => {
	console.log('[DEACTIVATE]')
	var token = req.headers['x-access-token'];

	if (!token) return res.status(401).send({ auth: false, message: 'No log-in detected' });

	jwt.verify(token, config.secret, function(err, decoded) {
		if (err) {
			return res.status(500).send({ auth: false, message: 'Failed to authenticate token.' });
		} else {
			console.log(decoded);

			User.findOneAndUpdateSingleKey(decoded.id, {active: false}, function(ok){
				if(ok){
					res.status(200).send({
						message: "Account deactivated"
					});
				}else{
					res.status(400).send({
						message: "Error. Account deactivation failed."
					});
				}
			});
		}
	});
});

// ADMIN DEACTIVATE USER ACCOUNT -f
router.put('/v1/admindeactivateuser/:id', (req, res, next) => {
	let token = req.headers['x-access-token'];

	if (!token) return res.status(401).send({ auth: false, message: 'No log-in detected' });

	jwt.verify(token, config.secret, function(err, decoded) {
		if (err) {
			return res.status(500).send({ auth: false, message: 'Failed to authenticate token.' });
		} else {
			User.isAdmin(decoded.id, (isAdmin) => {
				if(isAdmin){
					User.findOneAndUpdateSingleKey(req.params.id, {active: false}, function(ok){
						if(ok){
							res.status(200).send({
								message: "Account deactivated"
							});
						}else{
							res.status(400).send({
								message: "Error. Account deactivation failed."
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

// ADMIN ACTIVATE USER ACCOUNT -f
router.put('/v1/adminactivateuser/:id', (req, res, next) => {
	let token = req.headers['x-access-token'];

	if (!token) return res.status(401).send({ auth: false, message: 'No log-in detected' });

	jwt.verify(token, config.secret, function(err, decoded) {
		if (err) {
			return res.status(500).send({ auth: false, message: 'Failed to authenticate token.' });
		} else {
			User.isAdmin(decoded.id, (isAdmin) => {
				if(isAdmin){
					User.findOneAndUpdateSingleKey(req.params.id, {active: true}, function(ok){
						if(ok){
							res.status(200).send({
								message: "Account activated"
							});
						}else{
							res.status(400).send({
								message: "Error. Account activation failed."
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

// FORGOT PASSWORD -f
router.post('/v1/forgotpassword', (req, res, next) => {
	User.findOne('email', req.body.email, function(user){
		if(user){
			console.log(user)
			sendEmailToken(user.id, user.email);
		}else{
			res.status(400).send({
				message: "Email not found."
			});	
		}
	})

	async function sendEmailToken(id, email) {
		try {
			console.log('FORGOT PASSWORD ID:', id)
			var token = jwt.sign({
				id: id,
			}, config.secret, {
				expiresIn: '24h'
			});
			
			// SEND EMAIL
			mailer().send({
				to: email,
				subject: 'E-Class Forgot Password',
				text: 'Hello,\n\n' + 'Please set a new password for your account by clicking this link: \nhttps:\/\/' + req.headers.host + '\/v1' + '\/confirmation\/' + token + '.\n'
			}, function(code, message){
				if(code === 200){
					res.status(200).send({
						status: 'Success',
						message: "Success, email sent",
						tokenz: 'http:\/\/' + req.headers.host + '\/v1' + '\/confirmation\/' + token
					});
				}else{
					res.status(500).send({
						message: "Error, email not sent"
					});
				}
			});
		} catch (err) {
			console.log('Something error: ', err)
		}
	}
});

// RESET PASSWORD -f
router.use('/v1/resetpassword/:token', (req, res, next) => {
	jwt.verify(req.params.token, config.secret, function(err, decoded) {
		if (req.method === 'GET') {
			if (decoded) {
				res.status(200).json({auth: true, message: 'Token is exist', data_token: decoded, token: req.params.token})
			} else {
				res.status(500).send({auth: false, message: 'Failed to Authenticated'})
			}
		} else if (req.method === 'PUT') {
			User.findOneAndUpdateSingleKey(decoded.id, {password: hashing(req.body.password)}, function(result){
				res.status(200).send({message: 'Reset password success'})	
			})			
		}
	});
});

// USER CHANGE PASSWORD -f
router.put('/v1/changepassword', (req, res, next) => {
	console.log('\n\n=== CHANGE PASSWORD ===');

	// Change password harus pakai token
	var token = req.headers['x-access-token'];
	
	console.log('Hashing inputed current_password...');
	var hashCurrentPassword = hashing(req.body.current_password);

	if (!token) {
		console.log('401: No token provided');
		res.status(401).send({auth: false, message: 'No token provided'})
	} else {
		try {
			console.log('Verify token...');
			jwt.verify(token, config.secret, function(err, decoded) {
				console.log('Token verified.')

				console.log('Find user...');
				User.findOne('password', hashCurrentPassword, function(user){
					if(user === false){
						console.log('400: User not found or wrong current password')
						res.status(400).send({auth: false, message: 'User not found or wrong current password'})
					}else{
						console.log('User found!')
						if (decoded && decoded.id && hashCurrentPassword == user.password) {
							
							console.log('Update password...')

							User.findOneAndUpdateSingleKey(decoded.id, {password: hashing(req.body.new_password)}, function(result){
								console.log(result)

								res.status(200).send({auth: true, message: 'Berhasil change password'});
								console.log('=== END ===\n\n')
							})
						}else{
							res.status(500).send({auth: false, message: 'Failed to authenticate token'})
						}
					}
				})
			})
		}catch(err){
			console.log('error: jwt.verify')
			res.status(500).send({auth: false, message: 'Failed to authenticate token'})
		}
	}
});

// GET USER BY ID -f
router.get('/v1/user/:id', (req, res, next) => {
	User.findById(req.params.id, function(user, err){
		if(user){
			var userData = {}
			
			Course.findAll(function(courses){
				for (var i in user) {
					if(i != 'password') {
						userData[i] = user[i]
					}
					if(i == 'my_course'){
						userData[i] = firebase().convertIdsToObjects(user.my_course, courses)
					}
				}

				res.status(200).json({
					statusReponse: "OK",
					message : "User found",
					userData: userData
				})
			})
		}else{
			if(err){
				res.json({
					status: 500,
					statusReponse: "Quota",
					message : "Quota sudah habis.",
					errorMessage: err
				})
			}else{
				res.status(404).json({
					status: 404,
					statusReponse: " Not found",
					message : req.params.id + " user not found.",
				})
			}
		}
	})
});

// GET ALL USER
router.get('/v1/users', (req, res, next) => {
	User.findAll(function(users){
		if(users){
			res.status(200).json({
				status: 200,
				message: "Successfully get all user.",
				result: users
			})
		}else{
			res.status(400).json({
				status: 400,
				message: "Failed to get all user."
			})
		}
	})
})

// Get User pagination
router.get('/v1/userspage', (req, res, next) => {
	var pageCount = 0;
	var page = parseInt(req.query.page)
	var size = parseInt(req.query.size)

	console.log(page, size)

	User.paginate(page, size, (data) => {
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

// ========================================================
// 					PROFILE & STORAGES
// ========================================================
// Router save STORAGE ONLY -f
router.post('/v1/uploadavatar', (req, res, next) => {
	console.log('[UPLOAD AVATAR]')

	upload(req, res, (err) => {
		if(err) {
			console.log('Error')
			res.status(403).json({message: 'error'})
		} else {
			var data = req.files;
			var url = req.body.url;
			var splitted = url.split('/');
			var filename = splitted[splitted.length-1];
			console.log('FILENAME: ', filename);

			console.log(data);
			
			var fullUrl = req.protocol + '://' + req.get('host') + '/images/' +  data[0].filename ;

			// Delete Old File
			if(filename !== 'default.png'){
				fs.unlink('./public/images/' + filename, function(err) {
					if (err) {
						console.log(err);
					} else {
						console.log('file removed');
					}
				});
			}

			console.log('Upload success')
			res.status(200).json({
				status: 'OK',
				message: 'Image uploaded',
				url : fullUrl
			});
		}
	});
});

// USER EDIT PROFILE -f
router.put('/v1/editprofile/:id',  (req, res, next) => {
	var token = req.headers['x-access-token'];

	if (!token) {
		return res.status(401).send({
			auth: false, message: 'No log-in detected.'
		})
	} else {
		jwt.verify(token, config.secret, function(err, decoded) {
			if(err) {
				return res.status(500).send({
					auth: false, message: 'Failed to authenticate token.'
				})
			}else{
				findAndEdit();
			}
		})
	}

	function findAndEdit(){
		User.findById(req.params.id, function(user){
			if(user){
				editProfile(user);
			}else{
				res.status(400).json({
					message: "User not found."
				})
			}
		})
	}

	async function editProfile(user) {
		var count = 0;
		var messages = [];
		try {
			function checkFunction(strict, data, callback){
				let used = false;
				if(data.newvalue && data.oldvalue != data.newvalue){
					if(strict){
						User.findOne(data.key, data.newvalue, function(result){
							if(result){
								used = true;
								messages.push(data.negative_message)
								callback(false)
							}
						})
						if(used === false){
							callback(true)
						}
					}else{
						callback(true)
					}
				}else{
					callback(false)
				}

				count++;
				if(count === 6){
					res.json({
						messages: messages
					});
				}
			}

			checkFunction(true, {
				oldvalue: user.username,
				newvalue: req.body.username,
				key: 'username',
				negative_message: 'Username sudah digunakan.'
			}, function(ok){
				if(ok){
					User.findOneAndUpdateSingleKey(req.params.id, {username: req.body.username}, function(result){
						messages.push('Username berhasil diganti.')
					})
				}
			});

			checkFunction(true, {
				oldvalue: user.email,
				newvalue: req.body.email,
				key: 'email',
				negative_message: 'Email sudah digunakan.'
			}, function(ok){
				if(ok){
					User.findOneAndUpdateSingleKey(req.params.id, {email: req.body.email}, function(result){
						messages.push('Email berhasil diganti.')
					})
				}
			});

			checkFunction(false, {
				oldvalue: user.fullname,
				newvalue: req.body.fullname,
				key: 'fullname'
			}, function(ok){
				if(ok){
					User.findOneAndUpdateSingleKey(req.params.id, {fullname: req.body.fullname}, function(){
						messages.push('Fullname berhasil diganti.')
					})
				}
			});

			checkFunction(false, {
				oldvalue: user.gender,
				newvalue: req.body.gender,
				key: 'gender'
			}, function(ok){
				if(ok){
					User.findOneAndUpdateSingleKey(req.params.id, {gender: req.body.gender}, function(){
						messages.push('Gender berhasil diganti.')
					})
				}
			});

			checkFunction(false, {
				oldvalue: user.birthday,
				newvalue: req.body.birthday,
				key: 'birthday'
			}, function(ok){
				if(ok){
					User.findOneAndUpdateSingleKey(req.params.id, {birthday: req.body.birthday}, function(){
						messages.push('Birthday berhasil diganti.')
					})
				}
			});

			checkFunction(false, {
				oldvalue: user.avatar,
				newvalue: req.body.avatar,
				key: 'avatar'
			}, function(ok){
				if(ok){
					User.findOneAndUpdateSingleKey(req.params.id, {avatar: req.body.avatar}, function(){
						messages.push('Avatar berhasil diganti.')
					})
				}
			});

		} catch (err) {
			console.log('Opps, an error occured', err)
			res.status(500)
		}
	}
});

// ========================================================
// 							GOOGLE
// ========================================================

// USER REGISTER GOOGLE -f
router.post('/v1/registergoogle', (req, res, next) => {
	let userData = {				
		username: req.body.username,
		fullname: req.body.fullname,
		email: req.body.email,
		avatar: req.body.avatar,
		role: req.body.role,
		active: req.body.active,
		token: req.body.token,
		verified: req.body.verified,
		google_id: req.body.google_id,
		my_course: []
	}

	User.check('google_id', req.body.google_id, function(exist){
		sendResult(exist);
	})

	function sendResult(exist){
		if (exist) {
			res.status(400).json({
				status: 'Failed',
				message: 'Google ID exist'
			})
		} else {
			firebase({collection: 'user'}).addData(userData, function(status, result){
				if(status === true){
					res.status(200).json({
						status: 'Success',
						message: 'User berhasil register dengan Google.',
						result: result
					});
				}else{
					console.log(result)
					res.status(500).json({
						auth: false,
						message: 'Gagal register dengan Google.'
			    	});
				}
			})
		}
	}
});

// USER LOGIN WITH GOOGLE -f
router.post('/v1/logingoogle', (req, res, next) => {
	console.log('\n\n[LOGIN WITH GOOGLE] - ' + req.body.google_id);

	User.findOne('google_id', req.body.google_id, function(user){
		if(user){
			console.log('GOOGLE SIGN IN USER:', user)

			if(user.active === true){
				if(user.google_id == req.body.google_id){
					var token = jwt.sign({id: user.id}, config.secret, {
						expiresIn: '24h'
					});

					res.status(200).json({
						status: 'Successfully Login with Google',
						message: 'Google ID matched.',
						ID : user.id,
						token: token
					});
				}
			}else{
				sendActivationEmail(user, req.headers.host, function(ok){
					if(ok){
						res.status(400).json({
							message: "Login failed. User not active. Activation Email Sent."
						})
					}else{
						res.status(400).json({
							message: "Login failed. User not active. And we are sorry, we cannot send activation email due to system error."
						})
					}
				});
			}
		}else{
			res.status(403).json({
				status: 'Forbidden',
				message: 'Try again or sign up.'
			});
		}
	});
});

// ========================================================
// 							MODULE
// ========================================================

function hashing(pass){
	return crypto.createHash('md5').update(pass).digest('hex');
}

function sendVerficationEmail(user, host, callback){
	console.log('KIRIM EMAIL VERIFIKASI KE USER INI:', user)
			
	var token = jwt.sign({
		id: user.id,
	}, config.secret, {
		expiresIn: '24h'
	});

	// SEND EMAIL
	mailer().send({
		to: user.email,
		subject: 'E-Class Account Verification',
		text: 'Hello,\n\n' + 'Please verify your account by clicking the link: \nhttp:\/\/' + host + '\/v1' + '\/verify\/' + token,
	}, function(code, message){
		if(code === 200){
			callback(true);
		}else{
			callback(false);
		}
	});
}

function sendActivationEmail(user, host, callback){
	console.log('KIRIM EMAIL AKTIVASI KE USER INI:', user)

	console.log('USER ID: ' + user.id)
	
	var token = jwt.sign({
		id: user.id,
	}, config.secret, {
		expiresIn: '24h'
	});

	// SEND ACTIvATION EMAIL
	mailer().send({
		to: user.email,
		subject: 'E-Class Account Activation',
		text: 'Hello,\n\n' + 'Please activate your account by clicking this link: \nhttp:\/\/' + host + '\/v1' + '\/activate\/' + token,
	}, function(code, message){
		if(code === 200){
			callback(true);
		}else{
			callback(false);
		}
	});
}

//===========================================================
