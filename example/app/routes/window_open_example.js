
module.exports = {
  GET: {
    "/window_open_example": (req, res)=>{
      res.renderLayout('window_open_example/index');
    },
    "/window_open_example/content": (req, res)=>{
      res.renderLayout('window_open_example/content', { hideMenu: true });
    }
  }
};
