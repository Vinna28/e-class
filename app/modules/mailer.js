const config = require('../../config/config');
const nodemailer = require('nodemailer');

function Mailer(props){

	let transporter = nodemailer.createTransport({
		host: config.host,
		port: config.portSmtp,
		secure: config.secure, 
		service: 'gmail',
		auth: {
			user: config.auth.user,
			pass: config.auth.pass
		}
	});

	this.check = function(){
		console.log('Mailer Moduler OK')
	}

	this.send = function(options, callback){
		let mailOptions = {
			from: '"E-Class Online Course" <doesgen5@gmail.com>',
			to: options.to,
			subject: options.subject,
			text: options.text,
		};

		transporter.sendMail(mailOptions, (error, info) => {
			console.log('Mailer Module: Sending email...')
			if (error !== null) {
				console.log('Mailer Module ERROR', error);
				callback(500, error);
			}else{
				console.log('Mailer Module: Email sent!')
				if(info.messageId){
					callback(200, 'Message sent: %s', info.messageId)
				}else{
					callback(200, 'Message sent')
				}
			}
		});
	}
	
	return this;
}

module.exports = Mailer;
