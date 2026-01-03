const express = require('express');
const router = express.Router();
const userController = require('../controller/userController');


router.get('/count', (req, res) => userController.countUsers(req, res));

router.post('/login', (req, res) => userController.login(req, res));

router.post('/', (req, res) => userController.createUser(req, res));

router.get('/', (req, res) => userController.getAllUsers(req, res));

router.get('/:id', (req, res) => userController.getUserById(req, res));

router.put('/:id', (req, res) => userController.updateUser(req, res));

router.put('/:id/password', (req, res) => userController.updatePassword(req, res));

router.delete('/:id', (req, res) => userController.deleteUser(req, res));

router.delete('/:id/permanent', (req, res) => userController.permanentDeleteUser(req, res));

module.exports = router;
