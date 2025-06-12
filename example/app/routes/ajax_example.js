
module.exports = {
  GET: {
    "/ajax_example": (req, res)=>{
      res.renderLayout("/ajax_example/index")
    },
    "/ajax_example/get_content": (req, res)=>{
      res.send('response of btn' + req.query.from)
    },
  },
  POST: {
    "/ajax_example/post_content": (req, res)=>{
      const nickname = req.body.nickname;
      const sex = req.body.sex;
      res.send(`response of post { nickname: "${nickname}", sex: "${sex}" }`)
    },
  },
}
