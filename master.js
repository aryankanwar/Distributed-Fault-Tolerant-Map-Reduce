const cluster = require('cluster');
const fs = require('fs');
const path = require('path');
const os = require('os');

const counts = {}; // aggregated counts

if (cluster.isMaster) {
  const numWorkers = os.cpus().length;

  cluster.setupMaster({
    exec: 'worker.js'
  });

  const inputFiles = fs.readdirSync('files').filter(f => f.startsWith('input-'));
  const tasks = inputFiles.map((file, index) => ({
    id: index,
    file: path.join('files', file) // full path
  }));

  let taskIndex = 0;

  for (let i = 0; i < numWorkers; i++) {
    const worker = cluster.fork();
    worker.on('message', (msg) => {
      if (msg.counts) {
        Object.assign(counts, msg.counts);

        // Check if there are more tasks
        if (taskIndex < tasks.length) {
          const nextTask = tasks[taskIndex];
          taskIndex++;
          worker.send(nextTask);
        } else {
          // No more tasks, log final result and write to file
          console.log(counts);
          fs.writeFileSync('output.txt', JSON.stringify(counts, null, 2));
        }
      }
    });
  }

  // Send initial tasks to workers
  for (let i = 0; i < numWorkers; i++) {
    const worker = Object.values(cluster.workers)[i];
    if (taskIndex < tasks.length) {
      worker.send(tasks[taskIndex]);
      taskIndex++;
    }
  }
}
