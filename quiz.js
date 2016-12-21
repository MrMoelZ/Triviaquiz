var app = require('./app');

var counter = 0;
var quizActive = false;
var currentQuestion = 0;
var io= null;

var lobby=null;


var questionPool = [
	{'q':'Wer war der erste Mann auf dem Mond?','a':'Neil Armstrong'},
	{'q':'Wie heißt der innerste Planet des Sonnensystems?','a':'Merkur'},
	{'q':'Wieviele Bundesländer hat Deutschland (Zahl)?','a':'16'}
];


var questions;

rand = 0;



exports.setIo = function(socketio) {
	io=socketio;
}

exports.deactivate = function() {
	quizActive= false;
}


exports.active = function() {
	return quizActive;
}

exports.resetQuiz = function() {

}

exports.LoadQuestions = function() {

}



function askQuestion () {
	rand = Math.round(Math.random()*(questions.length-1))
	console.log('askQuestion ',rand);
	setTimeout(function() {
		io.emit('chat message',{
			'message':questions[rand].q,
			'sender':'Quizmaster'})
	},1500);
}

exports.askQuestion = askQuestion;


exports.checkAnswer = function(msg,usr) {
	console.log(msg.sender,' answered ',msg.message);
	if(msg.message.toLowerCase() == questions[rand].a.toLowerCase()) {
		usr.pts++;
		io.emit('chat message',
		{
			'message':'Richtig \"'+msg.message+'\" ist die richtige Antwort!',
			'sender':'Quizmaster'
		});
		questions.splice(rand,1);
		lobby = app.getLobby();
		console.log('in quiz check answer ', lobby);
		io.emit('lobby_list',lobby);
		if(questions.length>0) {
			askQuestion();
		}
		else {
			io.emit('chat message',
			{
				'message':'Keine weiteren Fragen vorhanden',
				'sender':'Quizmaster'
			});
			quizActive = false;
			currentQuestion=0;
		}
	}
	else {
		io.emit('chat message',
		{
			'message':'Leider falsch',
			'sender':'Quizmaster'
		});	
	}
}


exports.startQuiz = function() {
	currentQuestion = 0;
	questions = questionPool;
	console.log('Quiz started');
	io.emit('chat message',{'message':'Quiz gestartet', 'sender':'Quizmaster'});
	askQuestion();
}