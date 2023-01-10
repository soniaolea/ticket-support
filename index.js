//import all the modules
const express = require('express');
const path = require('path');

// set up the express validator
const {check, validationResult} = require('express-validator'); 

///import expresss-fileupload
const fileupload = require('express-fileupload'); 

// import express session
const session = require('express-session');

//import mongoose
const mongoose = require('mongoose');

//connect to mongoose
mongoose.connect('mongodb://localhost:27017/smartsupportDB');

//define the models
const SupportCase = mongoose.model('SupportCase', {
    name : String,
    emailPhone : String,
    description : String,
    caseImageName : String
 });

 // define user model
const User = mongoose.model('User',{
    username: String,
    password: String
}); 


//create express app
var myApp = express();

// set up the body parser for extracting form data
myApp.use(express.urlencoded({extended:false}));

//set up file upload middleware to be used by the app
myApp.use(fileupload()); 

// set up the session middleware
myApp.use(session({
    secret: 'MySuperSecret',
    resave: false,
    saveUninitialized: true
}));

// set up middlewares
myApp.use(express.static(path.join(__dirname, 'public')));

// set the view engine and views directory
myApp.set('view engine', 'ejs');
myApp.set('views', __dirname+'/views');

//ROUTES

//New Request (Home)
myApp.get('/', function(req, res){
    res.render('newRequest'); // render add new page
});

//login
myApp.get('/login', function(req, res){
    res.render('login'); // render login page
});

//login processing
myApp.post('/loginprocess', function(req, res){

    var username = req.body.username;
    var password = req.body.password;
    
    //find a user that matches user input in the db
    User.findOne({username: username, password: password}).exec(function(err, user){
        if(user){
          req.session.username = username; 
          req.session.loggedIn = true; 
          res.redirect('/dashboard');
        }
        else{
           res.redirect('/login')
        }
    });
});

//logout
myApp.get('/logout',function(req, res){
    req.session.username = '';
    req.session.loggedIn = false;    
    res.render('login'); 
 });   

//Process New Request
myApp.post('/processNew', function(req, res){
    
    //fetch all the data
    var name = req.body.name; 
    var emailPhone = req.body.emailPhone;
    var description = req.body.description;
    var caseImage = req.files.userimage;
    var caseImageName = req.files.userimage.name;

    //remove p tags
    description = description.replace('<p>', '');
    description = description.replace('</p>', '');

    //define image path
    var imagePath = './public/uploads/' + caseImageName;  

    //move files to a permanent place
    caseImage.mv(imagePath);

    // create an object to send data to the db
    var pageData = {
        name : name,
        emailPhone : emailPhone,
        description : description,
        caseImageName : caseImageName
    }
     //Mongo DB
    // Create an object using a model
    var myCase = new SupportCase(pageData);

    //Save the object 
    myCase.save();

    // render newRequest confirmation
    res.render('processNew'); // render new request page
});

//dashboard
myApp.get('/dashboard', function(req, res){
    
    if(req.session.loggedIn){
        
        SupportCase.find({}).exec(function(err, supportcases){

            var pageData = {
            supportcases : supportcases
            }

            res.render('dashboard', pageData); // render dashboard.ejs page
        });
    }   
    else{
        res.redirect('/login')
    }
});

//view
myApp.get('/view/:id',function(req, res){
    
    if(!req.session.loggedIn){
        res.redirect('/login');
    }

    //Look for id in database
    var id = req.params.id;
    SupportCase.findOne({_id:id}).exec(function(err, supportcase){
        var pageData = 
        {
            name : supportcase.name,
            emailPhone : supportcase.emailPhone,
            description : supportcase.description,
            caseImageName : supportcase.caseImageName
        }
        res.render('view', pageData); // render view.ejs page
    });
});

//edit
myApp.get('/edit', function(req, res){
    
    if(!req.session.loggedIn){
        res.redirect('/login');
    }
    res.render('edit'); // render edit.ejs page
});

//Delete
myApp.get('/delete/:id',function(req, res){

    if(!req.session.loggedIn){
        res.redirect('/login');
    }

    //Look for case in database and delete
    var id = req.params.id;
    SupportCase.findByIdAndDelete({_id:id}).exec(function(err, supportcase){
        
        var message = 'Support case not found';

        if(supportcase){
            message = 'Your support case has been successfully deleted';
        }

        var pageData ={
            message: message
        }
        res.render('processDelete', pageData);
    });
});

//Edit***
myApp.get('/edit/:id',function(req, res){

    if(!req.session.loggedIn){
        res.redirect('/login');
    }

        var id = req.params.id;

        SupportCase.findOne({_id:id}).exec(function(err, supportcase){
        var pageData = 
        {
            name : supportcase.name,
            emailPhone : supportcase.emailPhone,
            description : supportcase.description,
            caseImageName : supportcase.caseImageName,
            _id: id
        }
        res.render('edit', pageData);
    });
});

myApp.post('/editprocess', function(req, res){

    //fetch data
    var _id = req.body._id;
    var name = req.body.name; 
    var emailPhone = req.body.emailPhone;
    var description = req.body.description;   
    description = description.replace('<p>', '');
    description = description.replace('</p>', '');
    
    var caseImageName = '';
    if (req.files != null) {
        caseImageName = req.files.userimage.name;
        var caseImage = req.files.userimage;
    
        var imagePath = './public/uploads/' + caseImageName;  
        caseImage.mv(imagePath);
    }
    

    
    SupportCase.findOne({_id: _id}).exec(function(err, supportcase){
    supportcase.name = name;
    supportcase.emailPhone = emailPhone;
    supportcase.description = description;
    if (caseImageName != '') {
        supportcase.caseImageName = caseImageName;
    }
    supportcase.save();
    });
    var message ='';
        var pageData = {
            message : 'The support case has been updated'
    }
    res.render('processEdit', pageData);
 });

//Create user
myApp.get('/setup',function(req, res){
    var adminData = {
        username: 'admin',
        password: 'admin'
    }
    var newUser = new User(adminData);
    newUser.save();
});


//listen at a port
myApp.listen(8080);
console.log('Open http://localhost:8080 in the browser');