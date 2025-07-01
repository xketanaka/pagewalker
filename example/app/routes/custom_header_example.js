module.exports = {
  GET: {
    "/custom_header_example": (req, res)=>{
      const headers = {};
      for (const key in req.headers) {
        if (key.startsWith('X-') || key.startsWith('x-')) {
          headers[key] = req.headers[key];
        }
      }
      res.renderLayout('custom_header_example/index', { headers: headers });
    }
  }
};