
module.exports = {
  GET: {
    "/login": (req, res)=>{
      res.renderLayout('/login/login', { hideMenu: true })
    },
    "/logout": (req, res)=>{
      req.session.destroy((err)=>{ console.error(err) });
      res.renderLayout("/login/logged_out", { hideMenu: true });
    },
  },
  POST: {
    "/login": (req, res)=>{
      const username = req.body.username;
      const password = req.body.password;
      if(username && username.length > 8 && password && password.length > 8){
        req.session.username = username;
        res.redirect('/')
      }else{
        res.renderLayout('/login/login', { message: "Username or Password is incorrect.", hideMenu: true })
      }
    },
  }
};
