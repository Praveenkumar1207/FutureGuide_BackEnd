var express = require('express');
var router = express.Router();

/* GET users listing. */
router.get('/', function(req, res, next) {
  res.json({ users: [] });
});

/* POST create user */
router.post('/', function(req, res, next) {
  const { name, email } = req.body;
  res.json({ message: 'User created', user: { name, email, id: Date.now() } });
});

module.exports = router;