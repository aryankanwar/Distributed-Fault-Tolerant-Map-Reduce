const cluster = require('cluster');
const fs = require('fs');
const path = require('path');
const os = require('os');

const counts = {};
const timings = [];

const numWorkers = os.cpus().length;
const workers = [];

if (cluster.isMaster) {
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

  // Fork workers
  for (let i = 0; i < numWorkers; i++) {
    const worker = cluster.fork();
    workers.push(worker);
  }
  
  // Send initial tasks to workers
  tasks.slice(0, numWorkers).forEach(distributeTask);


  // Function to distribute tasks in a round-robin fashion
  function distributeTask(task) {
    const worker = workers[taskIndex % numWorkers];
    worker.send({ ...task, start: task.start });
    taskIndex++;
  }

/*
The reason for looping through each worker and attaching a message handler, rather than just
Is because this code is running in the master process, which forks multiple worker processes.
The master needs to listen for messages coming back from each worker separately.
If we just did:
worker.on('message'...
This would only listen to messages from a single worker, the last one forked.
By looping through the workers array and attaching the handler to each one, \the master can now listen to all its workers:*/

  // Handle messages from workers
  workers.forEach(worker => {
    worker.on('message', (msg) => {
      //dont use         Object.assign(counts, msg.counts);
      /*Object.assign is doing a shallow merge, 
      so each worker was gets a reference to the same counts object. 
      By merging manually, each worker has its own isolated counts, 
      which then get aggregated correctly in the master.*/

      if (msg.counts) {
        for (const key in msg.counts) {
          if (counts[key]) {
            counts[key] += msg.counts[key];
          } else {
            counts[key] = msg.counts[key];
          }
        }
      }
      if (msg.elapsed) {
        timings.push({
          id: msg.id,
          elapsed: msg.elapsed
        });
        console.log(`Task ${msg.id} took ${msg.elapsed} ms`);
      }

      const nextTask = tasks[taskIndex++];
      if (nextTask) {
        distributeTask(nextTask);
      } 
      else {
        console.log(counts);
        console.log(timings);
        fs.writeFileSync('output.txt', JSON.stringify({
          counts,
          timings
        }, null, 2));
      }
    });
  });
}
