'use strict';

const Usuario = require('../models/Usuario');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');

class LoginController {

  /**
   * GET "/"
   * @param {object} req Request object
   * @param {object} res Response object
   * @param {function} next Next function
   */
  index(req, res, next) {
    res.locals.email = '';
    res.locals.error = '';
    res.render('login');
  }

   /**
   * POST "/"
   * Receives email & password in the body
   * @param {string} email 
   * @param {string} password 
   */
  async postJWT(req, res, next) {
    try {
      const email = req.body.email;
      const password = req.body.password;

      const usuario = await Usuario.findOne({ email: email });

      if (!usuario || !await bcrypt.compare(password, usuario.password) ) {
        res.json({ success: false, error: res.__('Invalid credentials') });
        return;
      }

      const token = await new Promise((resolve, reject) => {
        jwt.sign({ _id: usuario._id }, process.env.JWT_SECRET, {
          expiresIn: '2d'
        }, (err, token) => {
          if (err) {
            reject(err);
            return;
          }
          resolve(token);
        });
      });

      res.json({ success: true, token: token });
      
    } catch (err) {
      next(err);
    }
  }

}

module.exports = new LoginController();
