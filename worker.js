const fs = require('fs');
const path = require('path');

process.on('message', async task => {
  const { id, file, start } = task;

  try {
    const filepath = path.resolve(file);
    const data = fs.readFileSync(filepath, 'utf8');

    const counts = {};

    // Use regular expression to match words containing only letters
    const wordPattern = /[a-zA-Z]+/g;
    const words = data.match(wordPattern);

    if (words) {
      words.forEach(word => {
        counts[word] = (counts[word] || 0) + 1;
      });
    }

    const elapsed = Date.now() - start; // Calculate elapsed time

    console.log(`Processed task ${id} in ${elapsed} ms`);

    process.send({ id, counts, elapsed }); // Send elapsed time and counts back to master

  } catch (error) {
    console.error(error);

    process.send({
      id,
      error: error.message
    });
  }
});
