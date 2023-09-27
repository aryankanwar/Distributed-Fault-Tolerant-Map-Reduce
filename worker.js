const fs = require('fs');
const path = require('path');

process.on('message', async task => {
  const { id, file } = task;

  try {
    const filepath = path.resolve(file);
    const data = fs.readFileSync(filepath, 'utf8');

    const counts = {};

    data.split(/\s+/).forEach(word => {
      counts[word] = (counts[word] || 0) + 1;
    });

    console.log(`Processed task ${id}`);

    process.send({ id, counts });

  } catch (error) {
    console.error(error);

    process.send({
      id,
      error: error.message
    });
  }
});
