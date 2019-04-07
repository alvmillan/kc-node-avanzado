'use strict';

const connectionPromise = require('./connectAMQP');
const sharp = require('sharp');
const path = require('path');
var fs = require('fs');

const queueName = 'thumbnail-resizer';
const imagePath = path.join(__dirname, '../public/images/thumbnails/');

main().catch(err => { console.log('Hubo un error', err)});

async function main() {
  
  // conectamos con servidor AMQP
  const conn = await connectionPromise;

  // conectar un canal
  const channel = await conn.createChannel();

  // asegurar que la cola existe
  await channel.assertQueue(queueName, {
    durable: true // la cola sobrevive a reinicios de broker
  });

  // cuantos mensajes quiero procesar en paralelo
  channel.prefetch(1);

  channel.consume(queueName, msg => {
      console.log(msg.content.toString);
    sharp(JSON.parse(msg.content.toString()).texto)
        .resize(100,100)
        .toBuffer()
        .then( data => {
            fs.writeFile(imagePath + Date.now() + '.jpg', data, function (err) {
                if (err) throw err;
              });
              channel.ack(msg)
        })
        .catch( err => console.log(err));
  })

}