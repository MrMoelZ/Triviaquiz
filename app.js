var express = require('express');
var app = express();
var http = require('http').Server(app);
var io = require('socket.io')(http);
var fs = require('fs');
var counter = 0;
var quizActive = false;
var currentQuestion = 0;
var users =[];

var db = require('./db');


var questions = [
	{'q':'Wer war der erste Mann auf dem Mond?','a':'Neil Armstrong'},
	{'q':'Wie heißt der innerste Planet des Sonnensystems?','a':'Merkur'},
	{'q':'Wieviele Bundesländer hat Deutschland (Zahl)?','a':'16'}
];

//express.static.mime.define({'text/css': ['md']});

app.use(express.static('files'));

app.get('/', function(req, res){
	res.set('X-Content-Type-Options', 'nosniff');
	res.sendFile(__dirname+'\\index.html');
});


io.on('connection', function(socket){
	socket.on('register',function(user) {
		if(users.find(e=>e == user)) {
			console.log('username exists ',user);
			// emit reject to requesting client
		}
		else {
			users.push(user);	
			// emit confirm to requesting client
			console.log(user, ' connected');
		} 
	});
  	socket.on('chat message', function(msg){
    	//console.log('message: ' + JSON.stringify(msg));
    	io.emit('chat message',msg);
    	if(quizActive==true) {
  			checkAnswer(msg);
  		}
    	if(msg.message == '/start') {
    		currentQuestion=0;
    		quizActive = true;
  			startQuiz();
  		}
  		else if(msg.message == '/stop') {
    		quizActive = false;
  			io.emit('chat message',
			{
				'message':'Quiz beendet',
				'sender':'Quizmaster'
			});
  		}
  	});
});


db.db();

//fs.watch('./questions',{encoding:'buffer'},(eventType,filename) => {
//	console.log(eventType);
//});

function resetQuiz() {

}

function LoadQuestions() {

}

function startQuiz() {
	console.log('Quiz started');
	io.emit('chat message',{'message':'Quiz gestartet', 'sender':'Quizmaster'});
	askQuestion();
}

function askQuestion() {
	setTimeout(function() {
		io.emit('chat message',{
			'message':questions[currentQuestion].q,
			'sender':'Quizmaster'})
	},1500);
}

function checkAnswer(msg) {
	console.log(msg.sender,' answered ',msg.message);
	if(msg.message == questions[currentQuestion].a) {
		io.emit('chat message',
		{
			'message':'Richtig \"'+msg.message+'\" ist die richtige Antwort!',
			'sender':'Quizmaster'
		});
		if(++currentQuestion < questions.length) {
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


http.listen(1237, function(){
  console.log('listening on *:1237');
});