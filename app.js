var express = require('express');
var app = express();
var http = require('http').Server(app);
var io = require('socket.io')(http);
var fs = require('fs');

var lobby = [];

var db = require('./db');
var quiz = require('./quiz');



//express.static.mime.define({'text/css': ['md']});

app.use(express.static('files'));

app.get('/', function(req, res){
	res.set('X-Content-Type-Options', 'nosniff');
	res.sendFile(__dirname+'\\index.html');
});

app.get('/trivia',function(req,res){
	res.sendFile(__dirname+'\\trivia.html');
});

app.get('/user/:name',function(req,res,name){
	console.log(name);
	res.send('not implementerino yet');
});

quiz.setIo(io);

io.on('connection', function(socket){
	console.log('connected', socket.id);
	io.to(socket.id).emit('lobby_list',lobby);
	socket.on('register',function(user) {
		if(lobby.find(e=>e.name == user)) {
			console.log('username exists ',user);
			// emit reject to requesting client
		}
		else {
			var usr = {'name':user,'id':socket.id,'pts':0};
			// emit confirm to requesting client
			console.log(user, ' registered with id ',socket.id);
			lobby.push(usr);
			console.log(JSON.stringify(lobby));
			io.emit('lobby_add',usr);
		} 
	});
  	socket.on('chat message', function(msg){
  		var usr = lobby.find(e=>e.name==msg.sender);

    	//console.log('message: ' + JSON.stringify(msg));
    	io.emit('chat message',msg);

    	console.log('quiz active ',quiz.active);
    	if(quiz.active==true) {
  			quiz.checkAnswer(msg,usr);
  		}
    	if(msg.message == '/start') {
    		quiz.active = true;
  			quiz.startQuiz();
  		}
  		else if(msg.message == '/stop') {
    		quiz.deactivate();
  			io.emit('chat message',
			{
				'message':'Quiz beendet',
				'sender':'Quizmaster'
			});
  		}
  	});
  	socket.on('disconnect',function() {
  		console.log('disconnected',socket.id);
  		var ix = lobby.findIndex(e=>e.id == socket.id);
  		lobby.splice(ix,1);
  		io.emit('lobby_list',lobby);
  	});
});


exports.getLobby = function() {
	console.log(JSON.stringify(lobby));
	return lobby;
}

db.db();

//fs.watch('./questions',{encoding:'buffer'},(eventType,filename) => {
//	console.log(eventType);
//});




http.listen(1237, function(){
  console.log('listening on *:1237');
});