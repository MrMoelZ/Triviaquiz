var express = require('express');
var app = express();
var session = require('express-session');
var http = require('http').Server(app);
var io = require('socket.io')(http);
var fs = require('fs');
var passport = require('passport');
var bodyParser = require('body-parser');
var flash = require('connect-flash');
var LocalStrategy = require('passport-local').Strategy;
var moment = require('moment');

var lobby = [];

var db = require('./db');
var quiz = require('./quiz');

//DEBUG
var theUser = {name:'asd',password:'test'};

passport.use('local',new LocalStrategy(
	function(username,password,done) {
		//db.find('user',)
		//DEBUG
		if(username==theUser.name && password==theUser.password){
			console.log('login success',username,password);
			//DEBUG
			return done(null,{name:'hans',pw:'hidden'});
		} 
		else {
			console.log('login failed',username,password);
			return done(null,false);
		} 
	}
));

passport.serializeUser(function(user, done) {
  done(null, user);
});

passport.deserializeUser(function(user, done) {
  done(null, user);
});

function ensureAuthenticated(req,res,next) {
	if(req.isAuthenticated()) return next();
	else {
		console.log('not authenticated');
		res.redirect('/');
	} 
}


//app.use(express.cookieSession({key:'app.sess',secret:'test'}));
app.use(session({secret:'secret',cookie:{maxAge:60000}}));
app.use(flash());
app.use(bodyParser());
app.use(passport.initialize());
app.use(passport.session());
app.use(express.static('files'));

app.set('view engine', 'pug');
app.set ('views','./views');

// public
app.get('/', function(req, res){
	// res.set('X-Content-Type-Options', 'nosniff');
	// db get newsentries
	var xkcd=[{title:'asd',text:'Dies ist ein Test, asd!Dies ist ein Test, asd!Dies ist ein Test, asd!Dies ist ein Test, asd!Dies ist ein Test, asd!Dies ist ein Test, asd!Dies ist ein Test, asd!Dies ist ein Test, asd!',timestamp:moment().format('DD.MM.YYYY - HH:mm [Uhr]')},{title:'cfd'},{text:'ggg'}];
	res.render('index',{title:'ROFLOMG Quizzer',message:'Merlin ist supertoll!',session:req.session,entries:xkcd})
});

app.get('/about',function(req,res) {
	res.render('about.pug',{title:'About',message:'Here be info',session:req.session});
});


// needs authentication
app.get('/game',ensureAuthenticated,function(req,res) {
	res.render('game.pug',{title:'GAME',message:'Welcome to the game',session:req.session});
});

app.get('/account',ensureAuthenticated,function(req,res) {
	res.render('account.pug',{title:'Account',message:'Here be account',session:req.session});
});

//TO IMPLEMENT STATISTIKEN, WERKSTATT

//login/out
app.post('/login',passport.authenticate('local',{failureRedirect:'/',successRedirect:'/game'}));

app.get('/logout',function(req,res) {
	console.log('logout');
	req.logout();
	console.log(req.session);
	res.redirect('/');
});



//quiz handling
quiz.setIo(io);


//socket stuff
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
	socket.on('merlin',function(data) {
		console.log(data);
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