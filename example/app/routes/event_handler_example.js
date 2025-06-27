module.exports = {
  GET: {
    "/event_handler_example": (req, res)=>{
      res.renderLayout('event_handler_example/index');
    }
  }
};