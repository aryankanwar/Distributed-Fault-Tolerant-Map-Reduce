const fs = require('fs');
const path = require('path');

const blacklist = new Set(['the', 'and', 'or', 'in', 'on', 'at', 'to', 'with', 'a', 'an', 'of',
'for', 'as', 'by', 'but', 'is', 'it', 'that', 'which', 'this', 'not',
'are', 'was', 'from', 'have', 'had', 'has', 'if', 'at', 'can', 'be',
'will', 'you', 'we', 'your', 'my', 'his', 'her', 'their', 'its']);

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
          const cleanedWord = word.toLowerCase(); // Convert to lowercase for case-insensitive comparison
          if (!blacklist.has(cleanedWord)) {
            counts[cleanedWord] = (counts[cleanedWord] || 0) + 1;
          }
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
