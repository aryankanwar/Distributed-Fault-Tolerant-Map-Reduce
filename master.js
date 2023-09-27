const http = require('http');
const net = require('net');
const fs = require('fs');
const { RPCServer } = require('rpc-websockets');

const BASE_FILES = '/tmp/mr-'

const MAP = 'map';
const REDUCE = 'reduce';

const IDLE = 'idle';
const WORKING = 'working'; 
const DONE = 'done';

class Task {
  constructor(action, file, tempToResFiles) {
    this.action = action;
    this.file = file;
    this.tempToResFiles = tempToResFiles;
  }
}

class Work {
  constructor(id, status, timeout, task) {
    this.id = id;
    this.status = status; 
    this.timeout = timeout;
    this.task = task;
  }
}

class SyncResponse {
  constructor(newWork, allDone, nReduce) {
    this.newWork = newWork;
    this.allDone = allDone;
    this.nReduce = nReduce;
  }
}

class KeyValue {
  constructor(key, value) {
    this.key = key;
    this.value = value;
  }
}

class Master {
  constructor() {
    this.activeWorks = {};
    this.mapTasks = [];
    this.reduceTasks = [];
    this.mapActiveWorks = 0;
    this.reduceActiveWorks = 0;
    this.nReduce = 0;
    this.mu = {
      lock: () => {},
      unlock: () => {}
    };
    this.doneCond = {
      broadcast: () => {},
      wait: () => {}
    };
    this.filesMu = {
      lock: () => {},
      unlock: () => {}
    };
    this.started = false;
    this.allDone = false;
  }

  init(files, nReduce) {
    this.activeWorks = {};
    this.mapActiveWorks = 0;
    this.reduceActiveWorks = 0; 
    this.mapTasks = [];
    this.reduceTasks = [];
    this.nReduce = nReduce;
    this.started = true;
    this.doneCond = {
      broadcast: () => {},
      wait: () => {}
    };
  }

  createTasks(files) {
    const reduceTaskFiles = [];
    
    for (let i = 0; i < this.nReduce; i++) {
      const out = `${BASE_FILES}output-${i+1}`;
      const reduceFile = `${BASE_FILES}mr-reduce-in-${i+1}`;
      reduceTaskFiles.push(reduceFile);
      
      fs.writeFileSync(out, '');
      fs.writeFileSync(reduceFile, '');
    }
    
    this.mu.lock();
    this.addTasks(MAP, ...files);
    this.addTasks(REDUCE, ...reduceTaskFiles);
    this.mu.unlock();
  }

  addTasks(action, ...files) {
    const tasks = [];
    
    for (let file of files) {
      tasks.push(new Task(action, file, {})); 
    }
    
    if (action === MAP) {
      this.mapTasks.push(...tasks);
    } else {
      this.reduceTasks.push(...tasks);
    }
  }

  removeActiveWork(work) {
    if (this.activeWorks[work.id]) {
      delete this.activeWorks[work.id];
      
      if (work.task.action === MAP) {
        this.mapActiveWorks--;
      } else if (work.task.action === REDUCE) {
        this.reduceActiveWorks--;
      }
    }
  }

  checker() {
    setInterval(() => {
      console.log('Current status:', 
        'activeWorks:', Object.keys(this.activeWorks).length,
        '| mapTasks:', this.mapTasks.length,
        '| reduceTasks:', this.reduceTasks.length,
        '| mapActiveWorks:', this.mapActiveWorks,
        '| reduceActiveWorks:', this.reduceActiveWorks
      );

      Object.values(this.activeWorks).forEach(w => {
        if (Date.now() > w.timeout) {
          this.removeActiveWork(w);
          this.addTasks(w.task.action, w.task.file); 
        }
      });

      this.allDone = this.mapActiveWorks === 0 && 
        this.reduceActiveWorks === 0 &&
        this.mapTasks.length === 0 &&
        this.reduceTasks.length === 0 &&
        this.started;

      if (this.allDone) {
        this.doneCond.broadcast();
        return;  
      }

    }, 100);
  }

  createNewWork() {
    let task;
    
    if (this.mapTasks.length > 0) {
      task = this.mapTasks.shift();
      this.mapActiveWorks++;
    } else if (this.mapTasks.length === 0 && this.mapActiveWorks === 0 && this.reduceTasks.length > 0) {
      task = this.reduceTasks.shift();
      this.reduceActiveWorks++;
    }
    
    if (task) {
      const id = Date.now().toString();
      const timeout = Date.now() + 10000;
      
      const work = new Work(id, WORKING, timeout, task);
      this.activeWorks[id] = work;
      return work;
    }
  }

  updateFiles(task) {
    this.filesMu.lock();
    
    if (task.action === MAP) {
      Object.entries(task.tempToResFiles).forEach(([temp, res]) => {
        const tempStream = fs.createReadStream(temp);
        const resStream = fs.createWriteStream(res, { flags: 'a' });

        const tempDecoder = new JSONDecoder(tempStream);
        const resEncoder = new JSONEncoder(resStream);
        
        for(;;) {
          const kv = tempDecoder.decode();
          if (!kv) break;
          resEncoder.write(kv);  
        }
        
        tempStream.close();
        resStream.close();
      });
    } else if (task.action === REDUCE) {
      Object.entries(task.tempToResFiles).forEach(([temp, res]) => {
        const tempStream = fs.createReadStream(temp);
        const resStream = fs.createWriteStream(res, { flags: 'a' });
      
        const tempDecoder = new JSONDecoder(tempStream);
        
        for(;;) {
          const kv = tempDecoder.decode();
          if (!kv) break;
          resStream.write(`${kv.key} ${kv.value}\n`);
        }
        
        tempStream.close();
        resStream.close();
      });
    }
    
    this.filesMu.unlock();
    this.cleanWorkerFiles(task);
  }

  cleanWorkerFiles(task) {
    this.filesMu.lock();

    Object.keys(task.tempToResFiles).forEach(temp => {
      fs.unlinkSync(temp); 
    });
    
    this.filesMu.unlock();
  }

  sync(work, response) {
    this.mu.lock();
    
    switch(work.status) {
      case IDLE:
        response.newWork = this.createNewWork();
        break;
        
      case DONE:
        if (this.activeWorks[work.id]) {
          this.updateFiles(work.task);
          this.removeActiveWork(work);
          response.newWork = this.createNewWork();
        } else {
          console.log('Dead worker alive again', work.task);
          this.cleanWorkerFiles(work.task);
          response.newWork = this.createNewWork();
        }
        break;
    }

    this.allDone = this.mapActiveWorks === 0 && 
      this.reduceActiveWorks === 0 &&
      this.mapTasks.length === 0 &&
      this.reduceTasks.length === 0 &&
      this.started;
      
    response.allDone = this.allDone;
    response.nReduce = this.nReduce;
    
    this.mu.unlock();
  }

  server() {
    const rpcServer = new RPCServer();
    rpcServer.register('Master', this);

    const sockname = '/tmp/master.sock';
    fs.unlinkSync(sockname);
    
    rpcServer.listen(sockname, () => {
      console.log('Master listening on', sockname);
    });
  }
}

function makeMaster(files, nReduce) {
  const m = new Master();
  
  m.init(files, nReduce);
  m.createTasks(files);
  
  console.log('Init done');
  
  m.checker();
  m.server();
  
  return m;
}

function main(args) {
  if (args.length < 2) {
    console.error('Usage: master inputfiles...');
    process.exit(1);
  }

  const m = makeMaster(args.slice(1), 10);

  const checkDone = () => {
    if (m.done()) {
      console.log('Done!');
      process.exit(0);
    } else {
      setTimeout(checkDone, 1000); 
    }
  };
  
  checkDone();
}

main(process.argv);