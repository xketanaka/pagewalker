const fs = require('fs');
const express = require('express')
const morgan = require('morgan');
const bodyParser = require('body-parser');
const session = require('express-session');

const routes = [
  require('./routes/login'),
  require('./routes/form_input_example'),
  require('./routes/dialog_example'),
  require('./routes/window_open_example'),
  require('./routes/file_upload_example'),
  require('./routes/file_download_example'),
  require('./routes/iframe_example'),
  require('./routes/ajax_example'),
  require('./routes/table_example'),
];

const ActionMethods = {
  GET: {
    "/": (req, res)=>{
      res.renderLayout('index');
    },
    "/basic_auth_example": (req, res)=>{
      res.renderLayout("/basic_auth_example")
    },
    "/managed_users": (req, res)=>{
      res.renderLayout("/managed_users")
    }
  },
  POST: {}
};

routes.forEach((methods)=>{
  if(methods.GET) Object.assign(ActionMethods.GET, methods.GET);
  if(methods.POST) Object.assign(ActionMethods.POST, methods.POST);
});

class ActionFilter {
  // This filter add methods to req and res needed for acts as webapp.
  static extendFilter(req, res, next){
    res.renderLayout = (page, params)=>{
      res.render('layout', { page: `./${page}`, params: Object.assign({ req: req, res: res }, params || {}) });
    }
    Object.defineProperty(req, 'isLoggedIn', { get: ()=>{ return req.session && req.session.username } })
    next();
  }
  // This filter restricts access by user not logged in
  static loginFilter(req, res, next){
    if(["/manage_users"].some(key => req.path.includes(key)) && !req.isLoggedIn){
      res.redirect('/');
    }else{
      next();
    }
  }
}

class WebApplication {
  static setup(env){
    this.port = env.PORT || 3000;
    const app = this.app = express();
    const logStream = fs.createWriteStream(`${__dirname}/logs/access.log`, { flags: 'a' });

    app.disable('etag');
    app.use(express.static(__dirname + '/public'));
    app.use(bodyParser.json());
    app.use(bodyParser.urlencoded({ extended: false }));
    app.use(session({ secret: 'session secret', resave: false, saveUninitialized: false }))
    app.use(morgan('combined', { stream: logStream }));
    app.set('views', __dirname + '/views');
    app.set('view engine', 'ejs');

    app.use(ActionFilter.extendFilter);
    app.use(ActionFilter.loginFilter);
    // Bind action
    Object.keys(ActionMethods.GET).forEach((key)=>{
      let action = ActionMethods.GET[key];
      if (Array.isArray(action)) {
        app.get(key, ...action);
      } else {
        app.get(key, action);
      }
    });
    Object.keys(ActionMethods.POST).forEach((key)=>{
      let action = ActionMethods.POST[key];
      if (Array.isArray(action)) {
        app.post(key, ...action)
      } else {
        app.post(key, action)
      }
    });
  }
  static start(){
    this.app.listen(this.port, ()=>{
      console.log(`Example webapp listening on port "${this.port}"`);
    });
  }
}

module.exports = WebApplication;

if(!module.parent){
  WebApplication.setup(process.env);
  WebApplication.start();
}
