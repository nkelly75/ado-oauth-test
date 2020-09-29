var express = require('express');
var router = express.Router();

/* GET home page. */
router.get('/', function(req, res, next) {
  let result = {
    title: 'DevOps OAuth'
  };

  if (req.session.displayName) {
    result.displayName = req.session.displayName;
  }

  res.render('index', result);
});

module.exports = router;
