const fs = require('fs');
const path = require('path');

process.on('message', async task => {
  const { id, file, start } = task;

  try {
    const filepath = path.resolve(file);
    const readStream = fs.createReadStream(filepath, { encoding: 'utf8' });

    let counts = {};

    readStream.on('data', (chunk) => {
      const wordPattern = /[a-zA-Z]+/g;
      const words = chunk.match(wordPattern);

      if (words) {
        words.forEach(word => {
          counts[word] = (counts[word] || 0) + 1;
        });
      }
    });

    readStream.on('end', () => {
      const elapsed = Date.now() - start;
      console.log(`Processed task ${id} in ${elapsed} ms`);
      process.send({ id, counts, elapsed });
    });

    readStream.on('error', (error) => {
      console.error(error);
      process.send({ id, error: error.message });
    });
  } catch (error) {
    console.error(error);
    process.send({ id, error: error.message });
  }
});
