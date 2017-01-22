var mongo = require('mongodb');
var app = require('./app');
var fs = require('fs');

var counter = 0;
var quizActive = false;
var currentQuestion = 0;
var io = null;
var gameLength = 10;

var countdownTimer;
var timer;
var gameOptions;
var currentMode;

var lobby = null;


var questionPool = [];

var users;
var questions;

rand = 0;


var getQuestionsFromFile = function(file) {
	fs.readFile(__dirname+file,'utf8',function(err,data){
		if(err) console.log('error reading question file: ',err);
		var dataArray = data.split('\r\n');
		for(var x=0;x<dataArray.length;x+=2){
			questionPool.push({question:dataArray[x],correctAnswers:dataArray[x+1].split(',')});
		}
		console.log('questions successfully read',questionPool.length);
	});
}


exports.setGameLength = function(len) {
	gameLength = len;
}

exports.setUsers = function (u) {
	users = u;
	console.log('users set ', users);
}

exports.setQuestionPool = function () {
	getQuestionsFromFile("/files/questions/questions.txt");
}

exports.setIo = function (socketio) {
	io = socketio;
}

exports.deactivate = function () {
	quizActive = false;
}


exports.active = function () {
	return quizActive;
}

function getSettingsForGameMode() {
			// afterCorrectAnswer: 
			// 1: what happends with teh round? 
			// 		nothing= time elapses till last person answered, switch: otherPersonsTurn
			// 2: points? nothing: no points
			// 3: nextQuestion? nothing: no question
			// 4: hints TBI : nothing: no hints
			// afterWrongAnswer
			// points: erster - fünfter, position5: rest
			// questionSetTye: 0 = trivia, 1 = enumeration, 2 = pictures
			// id of question set -1 = all
	console.log('in getgameOptions',currentMode);
	switch(currentMode) {
		case "quickshot": 
			gameOptions = {
				afterCorrectAnswer: 'endRound,pts,randomQuestion,',
				afterWrongAnswer: '',
				endCondition: 'questionCount',
				maxQuestions: gameLength,
				maxPoints: 0,
				pointsPlacement: [1],
				pointsTime: [],
				timePerRound: 0,
				timeAfterAnswer: 0,
				questionSetType: 0,
				questionSets: [-1],
				maxPlayers: 0,
				showAnswer: true
			}
		break;
		case "sixtySecs":
			gameOptions = {
				afterCorrectAnswer: ',pts,randomQuestion,',
				afterWrongAnswer: '',
				endCondition: 'questionCount',
				maxQuestions: gameLength,
				maxPoints: 0,
				pointsPlacement: [3,2,1,0,0,0],
				pointsTime: [],
				timePerRound: 60,
				timeAfterAnswer: 0,
				questionSetType: 0,
				questionSets: [-1],
				maxPlayers: 0,
				showAnswer: false
			}
		break;
		case "fiveSecs": 
			gameOptions = {
				afterCorrectAnswer: 'timer,pts,randomQuestion,',
				afterWrongAnswer: '',
				endCondition: 'questionCount',
				maxQuestions: gameLength,
				maxPoints: 0,
				pointsPlacement: [3,1,1,1,1,1],
				pointsTime: [],
				timePerRound: 0,
				timeAfterAnswer: 5,
				questionSetType: 0,
				questionSets: [-1],
				maxPlayers: 0,
				showAnswer: false
			}
		break;
		case "pingpong": 
			gameOptions = {
				afterCorrectAnswer: 'switch,pts,,',
				afterWrongAnswer: 'eliminatePlayer',
				endCondition: 'lastManStanding',
				maxQuestions: 0,
				maxPoints: 0,
				pointsPlacement: [1],
				pointsTime: [],
				timePerRound: 20,
				timeAfterAnswer: 0,
				questionSetType: 1,
				questionSets: [-1],
				maxPlayers: 2,
				showAnswer:true
			}
		default:
			gameOptions = {
				afterCorrectAnswer: 'endRound,pts,randomQuestion,',
				afterWrongAnswer: '',
				endCondition: 'questionCount',
				maxQuestions: 10,
				maxPoints: 0,
				pointsPlacement: [1],
				pointsTime: [],
				timePerRound: 0,
				timeAfterAnswer: 0,
				questionSetType: 0,
				questionSets: [-1],
				maxPlayers: 0,
				showAnswer:false
			}	
		break;
	}
}


function resetQuiz() {
	console.log('reset Quiz');
	io.emit('quiz_reset');
	currentQuestion = 0;
	counter=0;
	questions = [].concat(questionPool);
	quizActive = false
}


exports.LoadQuestions = function () {

}


function countdown(secs) {
	console.log('in countdown');
	var x = secs;
	countdownTimer = setTimeout(() => {
		console.log('the count should down',x);
		io.emit('quiz_countdown',x)
		countdown(x-1);
	},1000);
	
}

function askQuestion() {
	rand = Math.round(Math.random() * (questions.length - 1))
	currentQuestion = rand;
	console.log('askQuestion ', currentQuestion);
	io.emit('quiz_q', { q: questions[currentQuestion].question, count: ++counter });
	var time = gameOptions.timePerRound;
	if(time>0) {
		console.log('timer set');
		//set timer
		timer = setTimeout(function() { io.emit('quiz_timeUp'); },time*1000);
		countdown(time);
	}
}

//exports.askQuestion = askQuestion;

function normalizeString(s) {
	ret = s.toLowerCase();
	ret = ret.replace(/ö/g,'oe').replace(/ä/g,'ae').replace(/ü/g,'ue').replace(/ß/g,'ss').replace(/é/g,'e').replace(/\s/g,'').replace(/-/g,'');
	return ret;
}

function isAnswerCorrect(answer) {
	var modifiedAnswer = normalizeString(answer)
	console.log('modifiedAnswer: ',modifiedAnswer);
	var ret = questions[rand].correctAnswers.find(e=> normalizeString(e) === modifiedAnswer);
	if(ret) return questions[rand].correctAnswers[0];
	else return false;
}



function checkForEnd() {
	switch(gameOptions.endCondition) {
		case 'questionCount':
			return counter == gameOptions.maxQuestions;
		case 'pointCount': 
			// for each player loop and return if any pts.thisGame == maxPoints;
			break;
		case 'lastManStanding':
			return !(players.length > 1);
		default:
			console.log('CHECKFOREND ERROR',gameOptions.endCondition);
			return true;
	}
}

function shouldAskQuestion(command) {
	console.log('command',command);
	if(command == 'randomQuestion') {
		return true;
	}
	else return false;
}

function gameRound() {
	if(checkForEnd()) endQuiz();
	

	if(shouldAskQuestion()) {
		questions.splice(currentQuestion, 1);
		askQuestion();
	}

	// askQuestion with condiiton (pingpong => only one question)
	// timer if gametime is round end condition
	// checkAnswer must be refactored
	// timer in checkANswer if timer after question
	// TODO => hints
}

function correctAnswer(user,answer) {
	var split = gameOptions.afterCorrectAnswer.split(',');
	var command = split[0];
	var pts = split[1];
	var nextQuestion = split[2];
	if (pts == 'pts')addPoints(user);
	io.emit('quiz_a', {answer:answer,player:user.name});
	io.emit('quiz_info', 'richtige Antwort von '+user.name);
	gameRound();
}


function wrongAnswer(user,answer) {
	if(gameOptions.showAnswer) io.emit('quiz_info', 'falsche Antwort von '+user.name+ ': ' +answer);
	else io.emit('quiz_info', 'falsche Antwort von '+ user.name+'.');
	if(gameOptions.afterWrongAnswer) {
		switch(gameOptions.afterWrongAnswer) {
			case 'eliminatePlayer': eliminatePlayer(user);
			break;
			default:
			break;
		}
	}
}


function eliminatePlayer() {
	// TO IMPLEMENT
}

exports.checkAnswer = function (answer, userid) {
	if (users.length > 0) {
		var user = users.find(e => e._id == userid);
		var q;
		if (quizActive) {
			if (q=isAnswerCorrect(answer)) correctAnswer(user,answer);
			else wrongAnswer(user,answer);
		}
	}
	else {
		console.log('USERS EMPTY!');
	}

}

exports.addPoints = function(user,points) {
	user.pts.thisGame+=points;
	user.pts.total+=points;
	user.pts.thisSession+=points;
	io.emit('user_update',user);
}

exports.startQuiz = function (mode) {
	currentMode = mode;
	getSettingsForGameMode();
	io.emit('quiz_start')
	currentQuestion = 0;
	counter=0;
	questions = [].concat(questionPool);
	quizActive = true;
	console.log('Quiz started');
	io.emit('quiz_info', 'Quiz gestartet.')
	gameRound();
}

exports.endQuiz = function (winners=[]) {
	resetQuiz();
	console.log('Quiz ended');
	io.emit('quiz_info', 'Quiz beendet.');
	io.emit('quiz_winner','Gewinner: '+winners);
}
