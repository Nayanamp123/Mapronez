const express = require('express');
const app = express();
const path = require('path');
const env = require('dotenv').config();
const session = require('express-session')
const passport = require('./config/passport')
const db = require('./config/db')
const userRouter = require('./routes/userRouter');
const adminRouter = require('./routes/adminRouter');
const events = require('events');
events.EventEmitter.defaultMaxListeners = 20;
db();


app.use(express.json());
app.use(express.urlencoded({extended:true}));

app.use(session({
    secret:process.env.SESSION_SECRET,
    resave:false,
    saveUninitialized:false,
    cookie:{
        secure: process.env.NODE_ENV === 'production'
    }
}))

app.use(passport.initialize());
app.use(passport.session());

app.use((req, res, next) => {
    res.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    res.set('Pragma', 'no-cache');
    res.set('Expires', '0');
    next();
})

app.set('view engine','ejs');
app.set('views',[path.join(__dirname,'views/user'),
                path.join(__dirname,'views/admin')]);


app.use('/',userRouter);
app.use('/admin',adminRouter);


app.listen(process.env.PORT,()=>{
    console.log("Server running");
})

module.exports = app;