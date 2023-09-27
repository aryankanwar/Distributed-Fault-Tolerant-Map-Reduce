const fs = require('fs');
const path = require('path');

const BASE_FILES = "files/";

const IDLE = "Idle";
const DONE = "Done"; 
const WORKING = "Working";

const MAP = "Map";
const REDUCE = "Reduce";

class KeyValue {
  constructor(key, value) {
    this.key = key;
    this.value = value; 
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

class Task {
  constructor(action, file, tempToResFiles) {
    this.action = action;
    this.file = file;
    this.tempToResFiles = tempToResFiles;
  }
}

class SyncResponse {
  constructor(newWork, nReduce, allDone) {
    this.newWork = newWork;
    this.nReduce = nReduce;
    this.allDone = allDone;
  }
}

function mapf(filename, contents) {
  const regex = /\W+/g; 
  const words = contents.split(regex);
  
  const kvs = [];
  for (let word of words) {
    const kv = new KeyValue(word, '1');
    kvs.push(kv);
  }
  
  return kvs;
}

function reducef(key, values) {
  return values.length;
} 

function masterSock() {
  return path.join('/tmp', `824-mr-${process.pid}`); 
}

// Rest of master coordination logic would go here

module.exports = {
  BASE_FILES,
  
  IDLE,
  DONE,
  WORKING,
  
  MAP, 
  REDUCE,
  
  KeyValue,
  Work,
  Task,
  SyncResponse,
  
  mapf,
  reducef,
  masterSock  
};