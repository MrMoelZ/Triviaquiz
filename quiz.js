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
var players;

var nextQuestion;
var split;
var command;
var pts;

var lobby = [];


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
}

exports.setLobby = function(l) {
	lobby = l;
}

exports.addToLobby = function(user) {
	if(! lobby.find(e=>e._id == user._id)) lobby.push(user);
	console.log('this is lobby',lobby);
}

exports.removeFromLobby = function(user) {
	lobby.splice(lobby.findIndex(u=>u._id==user._id),1);
}

exports.resetLobby = function() {
	lobby = [];
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


function getUser(id) {
	return lobby.find(e => e._id == id);
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
	switch(currentMode) {
		case "quickshot": 
			gameOptions = {
				afterCorrectAnswer: 'endRound,pts,randomQuestion,',
				afterWrongAnswer: '',
				endCondition: 'questionCount',
				maxQuestions: gameLength,
				maxPoints: 0,
				pointsPlacement: [1],
				pointsTime: [0],
				minusPoints: [0],
				timePerRound: 0,
				timeAfterAnswer: 0,
				questionSetType: 0,
				questionSets: [-1],
				maxPlayers: 0,
				FreeForAll: true,
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
				pointsTime: [0],
				minusPoints: [0],
				timePerRound: 60,
				timeAfterAnswer: 0,
				questionSetType: 0,
				questionSets: [-1],
				maxPlayers: 0,
				FreeForAll: true,
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
				pointsTime: [0],
				minusPoints: [0],
				timePerRound: 0,
				timeAfterAnswer: 5,
				questionSetType: 0,
				questionSets: [-1],
				maxPlayers: 0,
				FreeForAll: true,
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
				pointsTime: [0],
				minusPoints: [0],
				timePerRound: 20,
				timeAfterAnswer: 0,
				questionSetType: 1,
				questionSets: [-1],
				maxPlayers: 2,
				FreeForAll: false,
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
				pointsTime: [0],
				minusPoints: [0],
				timePerRound: 0,
				timeAfterAnswer: 0,
				questionSetType: 0,
				questionSets: [-1],
				maxPlayers: 0,
				FreeForAll: true,
				showAnswer:false
			}	
		break;
	}
}



exports.LoadQuestions = function () {

}


function countdown(secs) {
	var x = secs;
	countdownTimer = setTimeout(() => {
		io.emit('quiz_countdown',x);
		if(x==0) {
			console.log('times up');
			io.emit('quiz_timeUp');
			gameRound(nextQuestion);
		} 
		else countdown(x-1);
	},1000);
	
}

exports.timeUp = function() {
	console.log('in timeUp');
	clearTimeout(timer);
}

function askQuestion(x) {
	if( x != -1 ) {
		currentQuestion = x;
		// console.log('askQuestion ', currentQuestion);
		// console.log('question: ',questions[currentQuestion]);
		io.emit('quiz_q', { q: questions[currentQuestion].question, count: ++counter });
		var time = gameOptions.timePerRound;
		if (time > 0) {
			console.log('timer set');
			//set timer
			timer = setTimeout(function() { io.emit('quiz_timeUp'); },time*1000);
			countdown(time);
		}
	}
}

function normalizeString(s) {
	ret = s.toLowerCase();
	ret = ret.replace(/ö/g,'oe').replace(/ä/g,'ae').replace(/ü/g,'ue').replace(/ß/g,'ss').replace(/é/g,'e').replace(/\s/g,'').replace(/-/g,'');
	return ret;
}

function isAnswerCorrect(answer) {
	var modifiedAnswer = normalizeString(answer)
	//console.log('modifiedAnswer: ',modifiedAnswer);
	var ret = questions[currentQuestion].correctAnswers.find(e=> normalizeString(e) === modifiedAnswer);
	if(ret) return questions[rand].correctAnswers[0];
	else return false;
}

function shouldAskQuestion(command) {
	if(command == 'randomQuestion') return Math.round(Math.random() * (questions.length - 1));
	else if (command == 'nextQuestion') return currentQuestion+1;
	else return -1;
}


function IsLastPerson() {
	var u = lobby.filter(e=>e.HasAnswered);
	return u.length == lobby.length;
}


function eliminatePlayer() {
	// TO IMPLEMENT
}

function isUsersTurn() {
	// TO IMPLEMENT IF NOT FFA
	if(gameOptions.FreeForAll) return true;
	else return true;
}


function wrongAnswer(user,answer) {
	if(gameOptions.showAnswer) io.emit('quiz_info', 'falsche Antwort von '+user.name+ ': "' +answer+'"');
	else io.emit('quiz_info', 'falsche Antwort von '+ user.name+'.');
	if(gameOptions.afterWrongAnswer) {
		switch(gameOptions.afterWrongAnswer) {
			case 'eliminatePlayer': eliminatePlayer(user);
			break;
			case 'deductPoints': addPoints(howManyPts(false));
			break;
			default:
			break;
		}
	}
}

function clearUserHasAnswered() {
	lobby.forEach(function(u){
		u.HasAnswered = false;
	});
}

function clearTimers() {
	console.log('end timers');
	clearTimeout(timer);
	clearTimeout(countdownTimer);
}

function correctAnswer(user,answer) {
	if (pts == 'pts') addPoints(user,howManyPts(true));
	io.emit('quiz_a', {answer:answer,player:user.name});
	io.emit('quiz_info', 'richtige Antwort von '+user.name);
	// reset timers if lastPerson or endRound otherwise keep running till timers off => next gameRound
	switch(command) {
		case 'endRound':
			clearTimers();
			questions.splice(currentQuestion,1);
			gameRound(nextQuestion);
		break;
		case 'timer':
		case '': 
			user.HasAnswered = true;
			if(IsLastPerson()) {
				clearTimers();
				clearUserHasAnswered();
				questions.splice(currentQuestion,1);
				gameRound(nextQuestion);
			}
		break;
		case 'switch':
			//TO IMPLEMENT
			questions.splice(currentQuestion,1);
			gameRound(nextQuestion);
		break;
		default: console.log('something went wrong: correctAnswer switch');
		break;
		
	}
}


exports.checkAnswer = function (answer, userid) {
	console.log('Lobby',lobby);
	if (lobby.length > 0) {
		var user = getUser(userid);
		var q;
		if (quizActive) {
			if (isUsersTurn(user)) {
				if (q=isAnswerCorrect(answer)) correctAnswer(user,answer);
				else wrongAnswer(user,answer);
			}
		}
	}
	else {
		console.log('LOBBY EMPTY!');
	}

}

function howManyPts(correct,modus) {
	// TO IMPLEMENT
	// check which placement player has
	// check which time 
	if (correct) {
		if (modus == 'placement') return gameOptions.pointsPlacement[0];
		else if (modus == 'time') return gameOptions.pointsTime[0];
	}
	else return gameOptions.minusPoints[0];
}

function addPoints(user,points) {
	user.pts.thisGame+=points;
	user.pts.total+=points;
	user.pts.thisSession+=points;
	io.emit('user_update',user);
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


function gameRound(nextQuestion) {
	if(checkForEnd()) endQuiz();
	else askQuestion(shouldAskQuestion(nextQuestion));
	
	// timer if gametime is round end condition
	// checkAnswer must be refactored
	// timer in checkANswer if timer after question
	// TODO => hints
}

exports.startQuiz = function (mode) {
	currentMode = mode;
	getSettingsForGameMode();
	split = gameOptions.afterCorrectAnswer.split(',');
	command = split[0];
	pts = split[1];
	nextQuestion = split[2];
	io.emit('quiz_start')
	currentQuestion = 0;
	counter = 0;
	questions = [].concat(questionPool);
	quizActive = true;
	console.log('Quiz started');
	io.emit('quiz_info', 'Quiz gestartet.');
	gameRound(nextQuestion);
}



var endQuiz = function (winners) {
	if (winners == null || winners.length == 0) winners = [];
	resetQuiz();
	console.log('Quiz ended');
	io.emit('quiz_info', 'Quiz beendet.');
	io.emit('quiz_winner','Gewinner: '+winners);
	clearTimers();
}

exports.endQuiz = endQuiz;

function resetQuiz() {
	console.log('reset Quiz');
	io.emit('quiz_reset');
	currentQuestion = 0;
	counter = 0;
	questions = [].concat(questionPool);
	quizActive = false
}
