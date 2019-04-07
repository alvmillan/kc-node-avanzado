'use strict';

const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const Anuncio = mongoose.model('Anuncio');

const multer = require('multer')
const upload = multer({ storage: multer.memoryStorage() })
const path = require('path');
var fs = require('fs');

const connectionPromise = require('../../lib/connectAMQP');

const queueName = 'thumbnail-resizer';

router.get('/', (req, res, next) => {

  const start = parseInt(req.query.start) || 0;
  const limit = parseInt(req.query.limit) || 1000; // nuestro api devuelve max 1000 registros
  const sort = req.query.sort || '_id';
  const includeTotal = req.query.includeTotal === 'true';
  const filters = {};
  if (typeof req.query.tag !== 'undefined') {
    filters.tags = req.query.tag;
  }

  if (typeof req.query.venta !== 'undefined') {
    filters.venta = req.query.venta;
  }

  if (typeof req.query.precio !== 'undefined' && req.query.precio !== '-') {
    if (req.query.precio.indexOf('-') !== -1) {
      filters.precio = {};
      let rango = req.query.precio.split('-');
      if (rango[0] !== '') {
        filters.precio.$gte = rango[0];
      }

      if (rango[1] !== '') {
        filters.precio.$lte = rango[1];
      }
    } else {
      filters.precio = req.query.precio;
    }
  }

  if (typeof req.query.nombre !== 'undefined') {
    filters.nombre = new RegExp('^' + req.query.nombre, 'i');
  }

  Anuncio.list(filters, start, limit, sort, includeTotal, function (err, anuncios) {
    if (err) return next(err);
    res.json({ ok: true, result: anuncios });
  });
});

// Return the list of available tags
router.get('/tags', function (req, res) {
  res.json({ ok: true, allowedTags: Anuncio.allowedTags() });
});

router.post('/', upload.single('foto'), async function (req, res) {
  const imagePath = path.join(__dirname, '../../public/images/anuncios/');
  const data = req.body;

  if (!req.file) {
    res.status(401).json({error: 'Please provide an image'});
  }
  fs.writeFile(imagePath + req.file.originalname, req.file.buffer, function (err) {
    if (err) throw err;
  });
  data.foto = req.file.originalname;
  const anuncio = new Anuncio(data);
  const anuncioGuardado = await anuncio.save();

  // conectamos con servidor AMQP
  const conn = await connectionPromise;

  // conectar un canal
  const channel = await conn.createChannel();

  // asegurar que la cola existe
  await channel.assertQueue(queueName, {
    durable: true // la cola sobrevive a reinicios de broker
  });

  let sendAgain = true;
    try {
      // mandar un mensaje
      const mensaje = {
        texto: imagePath + req.file.originalname
      };

      // antes de mandar el siguiente mensaje verifico si puedo hacerlo
      if (!sendAgain) {
        await new Promise((resolve) => channel.on('drain', resolve ) );
      }

      sendAgain = channel.sendToQueue(queueName, Buffer.from(JSON.stringify(mensaje)), 
      {
        persistent: true // el mensaje sobrevive a reinicios
      });

      console.log(`publicado ${mensaje.texto} con resultado ${sendAgain}`);
    } catch (err) {
      console.log(err);
      process.exit(1);
    }

  res.json({ success: true, result: anuncioGuardado})
});

module.exports = router;
