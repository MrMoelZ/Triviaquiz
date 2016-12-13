var app = require('express')();
var http = require('http').Server(app);
var io = require('socket.io')(http);
var counter = 0;
var quizActive = false;
var currentQuestion = 0;


var questions = [
	{'q':'huggel?','a':'hapf'},
	{'q':'wer a sagt?','a':'b'},
	{'q':'dumm?','a':'ja'}
];


app.get('/', function(req, res){
	res.sendFile(__dirname+'\\index.html');
});


io.on('connection', function(socket){
	console.log('connected');
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
	console.log('check this out ',msg.message);
	if(msg.message == questions[currentQuestion].a) {
		io.emit('chat message',
		{
			'message':'Richtig '+msg.message+' ist die richtige Antwort!',
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


http.listen(3000, function(){
  console.log('listening on *:3000');
});