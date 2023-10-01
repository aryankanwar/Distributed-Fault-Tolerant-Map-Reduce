const cluster = require('cluster');
const fs = require('fs');
const path = require('path');
const os = require('os');

const counts = {};
const timings = [];

if (cluster.isMaster) {

  const numWorkers = os.cpus().length;
  
  cluster.setupMaster({
    exec: 'worker.js'
  });

  const inputFiles = fs.readdirSync('files').filter(f => f.startsWith('input-'));

  let taskIndex = 0;

  const tasks = inputFiles.map((file, index) => ({
    id: index,
    file: path.join('files', file), 
    start: Date.now()
  }));

  for (let i = 0; i < numWorkers; i++) {
    const worker = cluster.fork();

    worker.on('message', (msg) => {
      if (msg.counts) {
        Object.assign(counts, msg.counts);
      }
      if (msg.elapsed) {
        timings.push({
          id: msg.id,
          elapsed: msg.elapsed
        });
        console.log(`Task ${msg.id} took ${msg.elapsed} ms`);
      }

      if (taskIndex < tasks.length) {
        const nextTask = tasks[taskIndex];
        taskIndex++;
        worker.send({...nextTask, start: nextTask.start}); 
      } else {
        console.log(counts);
        console.log(timings);
        fs.writeFileSync('output.txt', JSON.stringify({
          counts,
          timings
        }, null, 2));
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