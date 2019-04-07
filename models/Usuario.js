'use strict';

const mongoose = require('mongoose');
const bcrypt = require('bcrypt');
const fs = require('fs');

const usuarioSchema = mongoose.Schema({
  name: String,
  email: { type: String, unique: true },
  password: String
});

usuarioSchema.statics.cargaJson = async function (fichero) {
  
  // Using a callback function with async/await
  const data = await new Promise((resolve, reject) => {
    // Encodings: https://nodejs.org/api/buffer.html
    fs.readFile(fichero, { encoding: 'utf8' }, (err, data) => {
      return err ? reject(err) : resolve(data);
    });
  });

  console.log(fichero + ' leido.');

  if (!data) {
    throw new Error(fichero + ' está vacio!');
  }

  const usuarios = JSON.parse(data).usuarios;
  const numUsuarios = usuarios.length;

  for (var i = 0; i < usuarios.length; i++) {
    usuarios[i].password = await Usuario.hashPassword(usuarios[i].password);
    await (new Usuario(usuarios[i])).save();
  }

  return numUsuarios;

};

usuarioSchema.statics.hashPassword = function(plainPassword) {
  return bcrypt.hash(plainPassword, 10);
}

const Usuario = mongoose.model('Usuario', usuarioSchema);

module.exports = Usuario;
