
module.exports = {
  GET: {
    "/dialog_example": (req, res)=>{
      const params = {};
      if(req.query.from){
        params.message = `Submitted by "${req.query.from.match(/^alert/) ? 'alert' : 'confirm'}" button clicked.`;
      }
      res.renderLayout("/dialog_example/index", params)
    },
  },
  POST: {
    "/dialog_example": (req, res)=>{
      res.redirect(`/dialog_example?from=${req.body.submit}`);
    },
  }
}
