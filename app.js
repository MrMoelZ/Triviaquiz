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
var mongodb = require('mongodb');

var lobby = [];
var users = [];

var db = require('./db');
var quiz = require('./quiz');


passport.use('local', new LocalStrategy(
	function (username, password, done) {
		db.find('user',{name:username,password:password},function(data){
			if(data.length>0) {
				console.log('login success', username, password);
				return done(null,data[0]);
			}
			else {
				console.log('login failed', username, password);
				return done(null, false);
			}
		});
	}
));

passport.serializeUser(function (user, done) {
	done(null, user);
});

passport.deserializeUser(function (user, done) {
	done(null, user);
});

function ensureAuthenticated(req, res, next) {
	if (req.isAuthenticated()) return next();
	else {
		console.log('not authenticated');
		res.redirect('/');
	}
}


function ensureAdmin(req,res,next) {
	if(req.user.isAdmin) return next();
	else {
		console.log('not Admin');
		res.redirect('/');
	}
}



//app.use(express.cookieSession({key:'app.sess',secret:'test'}));
app.use(session({ secret: 'secret', cookie: { maxAge: 600000 } }));
app.use(flash());
app.use(bodyParser());
app.use(passport.initialize());
app.use(passport.session());
app.use(express.static('files'));

app.set('view engine', 'pug');
app.set('views', './views');


// public
app.get('/', function (req, res) {
	// res.set('X-Content-Type-Options', 'nosniff');
	db.find('news', {}, function (data) {
		for(d of data) {
			d.timestamp = cleanUpTimestamp(d);
		}
		res.render('index', { title: 'ROFLOMG Quizzer', message: 'Merlin ist supertoll!', session: req.session, entries: data });
	});
});

app.get('/about', function (req, res) {
	res.render('about.pug', { title: 'About', message: 'Here be info', session: req.session });
});


//needs authentication

app.get('/game',ensureAuthenticated, function (req, res) {
	db.find('messages',{},function(data){
		res.render('game.pug', { title: 'GAME', message: 'Welcome to the game', session: req.session, messages: data });
	});
});

app.get('/account', ensureAuthenticated, function (req, res) {
	res.render('account.pug', { title: 'Account', message: 'Here be account', session: req.session });
});

function init() {
	insert('news', { title: 'Hallo', timestamp: new Date(), text: 'Dies ist die allererste alpha Version des neuen ROFLOMG Quizzers. Funktionalitäten sind praktisch keine vorhanden.<br/>Changelog gibts mit dem ersten wirklich spielbaren Release, dies ist eher ein Datenbank / Performance check.<br/>Glhf' });
	insert('user',{name:'Admin',email:'mrmoerlin@gmail.com',password:'Holzadmin',isAdmin:true,pts:{total:0,thisSession:0,thisGame:0}});
}

//ADMIN!
app.get('/admin',ensureAuthenticated,ensureAdmin, function (req, res) {
//app.get('/admin', function (req, res) {	
	db.find('user',{},function(udata) {
		console.log(udata);
		users = udata;
		db.find('question',{},function(qdata){
			res.render('admin.pug',{ title: 'Admin', message: 'Hello Admin', session: req.session, users: users, questionCount: qdata.length });
		});
	});
});

app.post('/deleteuser',function(req,res) {
	db.delete('user',{_id:new mongodb.ObjectID(req.body.id)},function(response) {
		if(response.result.ok) console.log('successfully deleted ',response.result.n,' documents by ',req.session.passport.user.name, ' on ',new Date());
	})
	res.redirect('/admin');
});

app.post('/admin',function(req,res){
	console.log(req.body);
	if(req.body.type=="user") {
		insert('user',{created:new Date(),name:req.body.username,email:req.body.email,password:req.body.password,isAdmin:req.body.admin||false,pts:{total:0,thisSession:0,thisGame:0}});
	}
	else if(req.body.type=="question") {
		//TODO MAKE WORK
		insert('question',{question:req.body.question,correctAnswer:req.body.correctAnswer});
	}
	else if(req.body.type=="news") {
		insert('news',{title:req.body.title,timestamp:new Date(),text:req.body.newstext});
	}
	res.redirect('/admin');
})

//TO IMPLEMENT STATISTIKEN, WERKSTATT

//login/out
app.post('/login', passport.authenticate('local', { failureRedirect: '/', successRedirect: '/game' }));

app.get('/logout', function (req, res) {
	console.log('logout');
	req.logout();
	console.log(req.session);
	res.redirect('/');
});



var insert = function (coll, data) {
	db.insert(coll, data, function (res) {
		if (res.result.ok) console.log('inserted ', res.result.n, ' documents');
		else console.log('insertion failed or inserted 0 documents');
	})
}


var cleanUpTimestamp = function(d) {
	return 'Posted: '+moment(d.timestamp).format('DD.MM.YY HH:mm')+ ' Uhr';
}



//quiz handling
quiz.setIo(io);
quiz.setUsers(users);


//socket stuff
io.on('connection', function (socket) {
	console.log('connected', socket.id);
	io.to(socket.id).emit('lobby_list', lobby);
	socket.on('register', function (user) {
		if (lobby.find(e => e.name == user)) {
			console.log('username exists ', user);
			// emit reject to requesting client
		}
		else {
			var usr = { 'name': user, 'id': socket.id, 'pts': 0 };
			// emit confirm to requesting client
			console.log(user, ' registered with id ', socket.id);
			lobby.push(usr);
			console.log(JSON.stringify(lobby));
			io.emit('lobby_add', usr);
		}
	});

	socket.on('answer',function(answer){
		quiz.checkAnswer(answer,req.user._id);
	});
	
	socket.on('chat message', function (m) {
		// save msg to db
		var message = {msg:m.msg,sender:m.sender,timestamp:new Date()};
		insert('messages',message);
		console.log('message: ', m);
		// emit msg to all
		io.emit('chat message', message);

		// console.log('quiz active ', quiz.active);
		// if (quiz.active == true) {
		// 	quiz.checkAnswer(msg, usr);
		// }
		// if (msg.message == '/start') {
		// 	quiz.active = true;
		// 	quiz.startQuiz();
		// }
		// else if (msg.message == '/stop') {
		// 	quiz.deactivate();
		// 	io.emit('chat message',
		// 		{
		// 			'message': 'Quiz beendet',
		// 			'sender': 'Quizmaster'
		// 		});
		// }
	});
	socket.on('merlin', function (data) {
		console.log(data);
	});

	socket.on('disconnect', function () {
		console.log('disconnected', socket.id);
		var ix = lobby.findIndex(e => e.id == socket.id);
		lobby.splice(ix, 1);
		io.emit('lobby_list', lobby);
	});
});


exports.getLobby = function () {
	console.log(JSON.stringify(lobby));
	return lobby;
}


//fs.watch('./questions',{encoding:'buffer'},(eventType,filename) => {
//	console.log(eventType);
//});




http.listen(1237, function () {
	console.log('listening on *:1237');
});
