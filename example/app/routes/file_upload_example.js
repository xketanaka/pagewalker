const uploadConfig = { dest: __dirname + '/../public/uploads/' };
const multer = require('multer');
const path = require('path');
const upload = multer(uploadConfig);
const fs = require('fs');

module.exports = {
  GET: {
    "/file_upload_example": (req, res)=>{
      let files = fs.readdirSync(uploadConfig.dest);
      res.renderLayout("/file_upload_example/index", { files: files });
    },
    "/file_upload_example/done": (req, res)=>{
      let files = fs.readdirSync(uploadConfig.dest);
      res.renderLayout("/file_upload_example/index", { files: files, message: `"${req.query.filename}" has been uploaded.` });
    },
    "/file_upload_example/download": (req, res)=>{
      let files = fs.readdirSync(uploadConfig.dest);
      if (files.includes(req.query.filename)) {
        res.setHeader('Content-disposition', `attachment; filename*=utf8''${encodeURIComponent(req.query.filename)}`);
        res.setHeader('Content-type', "application/octet-stream");

        fs.createReadStream(path.join(uploadConfig.dest, req.query.filename)).pipe(res);
      } else {
        res.renderLayout("/file_upload_example/index", { files: files, message: `"${req.query.filename}" is not found.` });
      }
    },
  },
  POST: {
    "/file_upload_example/upload": [
      upload.single('file'), (req, res)=>{
        fs.rename(req.file.path, uploadConfig.dest + req.file.originalname, (err)=>{
          if (!err) {
            res.redirect(`/file_upload_example/done?filename=${req.file.originalname}`);
          } else {
            console.log(err);
            res.renderLayout("/index", { message: `Unexpected error has occurred, ${err}` });
          }
        });
      }
    ]
  }
}
