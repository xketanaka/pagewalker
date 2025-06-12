
module.exports = {
  GET: {
    "/iframe_example": (req, res)=>{
      res.renderLayout("/iframe_example/index");
    },
    "/iframe_example/inframe": (req, res)=>{
      res.render("iframe_example/inframe", { params: null });
    },
  },
  POST: {
    "/iframe_example/inframe": (req, res)=>{
      res.render("iframe_example/inframe", { params: req.body });
    },
    "/iframe_example/inframe/ajax": (req, res)=>{
      res.send(req.body.field.toUpperCase());
    },
  }
}
