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
const Comment = require('../models/comment');
const User = require('../models/user');
const Course = require('../models/course');

// Local database
var _instructors = [];
var _categories = [];
var _sections = [];
var _videos = [];
var _comments = [];

module.exports = (app) => {
  app.use('/', router);
  app.use(cors());
};

router.use(bodyParser.urlencoded({ extended: false }));
router.use(bodyParser.json());

/*

	NOTE: 
	- 1 comment memiliki beberapa reply (replies)
	- Sebuah reply tidak bisa di-reply lagi

*/

var ID = function () {return '_' + Math.random().toString(36).substr(2, 9);};

// ADD COMMENT
router.post('/v1/comment', (req, res, next) => {
	var data = {
		course_id: req.body.course_id,
		user_id: req.body.user_id,
		text: req.body.text,
		replies: [],
		created_at: Comment.createTimestamp()
	}

	// Add to database
	firebase({collection: 'comment'}).addData(data, function(status, result){
		if(status === true){
			addToCourse(result);
		}else{
			console.log(result)
			res.status(500).json({
				auth: false,
				message: 'Gagal menambahkan comment'
	    	});
		}
	})

	// Add to course
	function addToCourse(comment_id){
		Course.findById(req.body.course_id, (course) => {
			var comments = JSON.parse(JSON.stringify(course.comments));
			comments.push(comment_id);
			updateComments(comments);
		})

		function updateComments(comments){	
			Course.findOneAndUpdateSingleKey(req.body.course_id, {comments: comments}, function(result){
				if(result){
					res.status(200).json({
						auth: true,
						message: 'Berhasil menambahkan comment'
			    	});
				}else{
					res.status(500).json({
						auth: false,
						message: 'Gagal menambahkan comment'
			    	});
				}
			})
		}
	}
});

// ADD REPLY
// :id dibawah adalah id comment, bukan id user / reply / course
router.post('/v1/reply/:commentid', (req, res, next) => {
	var data = {
		id: ID(),
		comment_id: req.params.commentid,
		user_id: req.body.user_id,
		text: req.body.text,
		avatar: req.body.avatar,

		// ini pakai new date karena firebase serverTimestamp() tidak bisa digunakan didalam Array.
		created_at: new Date()
	}

	Comment.findById(req.params.commentid, (comment) => {
		var cloned = JSON.parse(JSON.stringify(comment));

		cloned.replies.push(data);
		cloned.id = req.params.commentid;

		Comment.findOneAndUpdateSingleKey(req.params.commentid, {replies: cloned.replies}, (ok) => {
			if(ok){
				res.status(200).json({
					status: 200,
					message: "Reply added.",
					result: cloned
				})
			}else{
				res.status(400).json({
					status: 400,
					message: "Failed to add reply."
				})
			}
		})
	})
});

// GET ALL COMMENT
router.get('/v1/comments', (req, res, next) => {
	Comment.findAll((comments) => {
		if(comments){
			res.status(200).json({
				status: 200,
				message: "Successfully get all comments.",
				result: comments
			})
		}else{
			res.status(400).json({
				status: 400,
				message: "Failed to get all comments."
			})
		}
	})
});

// GET ALL COMMENT SORTED
// router.get('/v1/commentsorted', (req, res, next) => {
// 	Comment.findAllNew((comments) => {
// 		if(comments){
// 			res.status(200).json({
// 				status: 200,
// 				message: "Successfully get all comments.",
// 				result: comments
// 			})
// 		}else{
// 			res.status(400).json({
// 				status: 400,
// 				message: "Failed to get all comments."
// 			})
// 		}
// 	})
// });


// DELETE COMMENT BY SELF USER (sudah bisa tapi belum di tes)
router.delete('/v1/comment/:courseid/:commentid', (req, res, next) => {
	let token = req.headers['x-access-token'];
	
	if (!token) return res.status(401).send({ auth: false, message: 'No log-in detected' });

	jwt.verify(token, config.secret, function(err, decoded) {
		if (err) {
			return res.status(500).send({ auth: false, message: 'Failed to authenticate token.' });
		} else {

			// CARI DULU KOMENTARNYA MANA
			Comment.findById(req.params.commentid, function(comment) {
				if(comment){

					// CEK APAKAH USER YANG MAU DELETE === USER YANG KOMEN
					if(decoded.id == comment.user_id){

						// DELETE KOMENTAR DI COURSE DULU
						deleteCommentOnCourse(req.params.commentid, req.params.courseid, (ok)=>{
							if(ok){

								// BARU DELETE YANG DI DATABASE KOMEN
								deleteComment(req.params.commentid, (ok2) => {
									if(ok2){
										res.status(200).json({
											message: "Comment deleted."
										})
									}
								})
							}else{
								res.status(500).json({
									message: "Gagal menghapus komentar di course " + req.params.courseid
								})
							}
						});
					}else{
						res.status(403).json({
							message: "Anda tidak boleh menghapus komentar ini. Hanya pemilik komentar yang boleh menghapus."
						})
					}
				}else{
					res.status(404).json({
						status: 404,
						message: "Comment not found."
					});
				}
			})
		}
	});

	function deleteCommentOnCourse(commentid, courseid, callback){
		Course.findById(courseid, (course) => {
			var cloned = JSON.parse(JSON.stringify(course));

			var comment_index = cloned.comments.indexOf(commentid);
			console.log(comment_index)

			cloned.comments.splice(comment_index, 1);

			Course.findOneAndUpdateSingleKey(courseid, {comments: cloned.comments}, (ok) => {
				if(ok){
					callback(true);
				}else{
					callback(false);
				}
			})
		});
	}

	function deleteComment(commentid, callback){
		Comment.delete(commentid, ok => {
			if(ok){
				callback(true)
			}else{
				callback(false)
			}
		})
	}
});

// DELETE REPLY
router.delete('/v1/reply/:commentid/:replyid', (req, res, next) => {
	let token = req.headers['x-access-token'];
	
	if (!token) return res.status(401).send({ auth: false, message: 'No log-in detected' });

	jwt.verify(token, config.secret, function(err, decoded) {
		if (err) {
			return res.status(500).send({ auth: false, message: 'Failed to authenticate token.' });
		} else {

			// CARI DULU KOMENTARNYA MANA
			Comment.findById(req.params.commentid, function(comment) {
				if(comment){


					// CARI REPLYNYA MANA
					for (var i = 0; i < comment.replies.length; i++) {
						if(comment.replies[i].id == req.params.replyid){
							checkUser(comment.replies[i], i);
						}
					}

					function checkUser(reply, index){						
						// CEK APAKAH USER YANG MAU DELETE === USER YANG REPLY
						if(decoded.id == reply.user_id){
							deleteReply(index);
						}else{
							res.status(403).json({
								message: "Anda tidak boleh menghapus komentar ini. Hanya pemilik komentar yang boleh menghapus."
							})
						}
					}

					function deleteReply(index){
						Comment.findById(req.params.commentid, (selected) => {
							var cloned = selected;
							cloned.replies.splice(index, 1);

							Comment.findOneAndUpdateSingleKey(req.params.commentid, {replies: cloned.replies}, (ok) => {
								if(ok){
									res.status(200).json({
										message: "Reply deleted."
									})
								}else{
									res.status(500).json({
										message: "Gagal meng-update comment."
									})
								}
							})
						})
					}
				}else{
					res.status(404).json({
						status: 404,
						message: "Comment not found."
					});
				}
			})
		}
	});
});