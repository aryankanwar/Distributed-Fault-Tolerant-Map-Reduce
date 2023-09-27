const rpc = require('rpc-websockets').Client;
const fs = require('fs');
const { hashFnv32a } = require('fnv-plus');
const { encode, decode } = require('json-encoder-decoder');

class KeyValue {
  constructor(key, value) {
    this.key = key;
    this.value = value;
  }
}

class Work {
  constructor(status) {
    this.status = status;
  }
}

async function worker() {
  
  const sock = '/tmp/master.sock';
  
  const client = new rpc(sock);
  
  let work = new Work('idle');
  
  while(true) {
  
    const response = await client.call('Master.Sync', [work]);
    
    if(!response) {
      console.log('Master disconnected, exiting');
      process.exit(0);
    }
    
    work.nReduce = response.nReduce;
    
    if(response.allDone) {
      console.log('All work complete, exiting');
      return;
    }
    
    if(response.newWork) {
      work = response.newWork;
      await doWork(work);
    } else {
      work.status = 'idle';
      await new Promise(resolve => setTimeout(resolve, 100)); 
    }
  }
}

async function doWork(work) {

  if(work.task.action === 'map') {
    await map(work.task);
  } else if(work.task.action === 'reduce') {
    await reduce(work.task);
  }
  
  work.status = 'done';
}

async function map(task) {

  const data = fs.readFileSync(task.file, 'utf8');
  
  const kvs = mapf(task.file, data);
  
  const buckets = {};
  
  for(let kv of kvs) {
    const idx = hashFnv32a(kv.key) % work.nReduce;
    if(!buckets[idx]) buckets[idx] = [];
    buckets[idx].push(kv);
  }
  
  for(let idx in buckets) {
    const tempFile = `/tmp/${Date.now()}`;
    fs.writeFileSync(tempFile, encode(buckets[idx])); 
    task.tempToResFiles[tempFile] = `mr-${idx}`;
  }
  
}

function mapf(filename, data) {
  // mapping logic
  return [];
}

async function reduce(task) {

  const kvs = decode(fs.readFileSync(task.file, 'utf8'));
  
  kvs.sort((a, b) => a.key > b.key);
  
  const buckets = {};
  
  for(let i = 0; i < kvs.length; i++) {
    // accumulate values for same key
    const output = reducef(kvs[i].key, values); 
    
    const idx = hashFnv32a(kvs[i].key) % work.nReduce;
    if(!buckets[idx]) buckets[idx] = [];
    buckets[idx].push({key: kvs[i].key, value: output});
  }
  
  for(let idx in buckets) {
     const tempFile = `/tmp/${Date.now()}`;
     fs.writeFileSync(tempFile, encode(buckets[idx]));
     task.tempToResFiles[tempFile] = `output-${idx}`;
  }

}

function reducef(key, values) {
  // reducing logic  
  return '';
}

worker();