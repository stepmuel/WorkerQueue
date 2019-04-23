# WorkerQueue

A queue based web worker API to simplify multithreading in JavaScript. 

This repository was created for my [blog post](http://heap.ch/blog/2016/02/04/workerQueue/) which contains additional information.

The code was used for [Map Miner](https://github.com/stepmuel/mapminer), an interactive data visualizer to explore player positions within a minecraft world. There is also an [interactive demo](http://heapcraft.net/mapminer/).

## Usage

```javascript
var wq = new workerQueue();

var job = function(arg) {
  return "hi " + arg.name;
};

var callback = function(result) {
  console.log(result);
};

wq.add(job, {name: "world"}, callback);

```

More advanced usage:

```javascript
var wq = new workerQueue();

// configuration (default values)

// number of threads
wq.maxWorkers = 1;

// minimum delay between dispatches in ms
// (use for throttling)
wq.delay = 0;

// worker prototype (copied on initialization)
// define before first 'add' call!

wq.worker.foo = "bar";
wq.worker.bar = function () {
  this.foo = "baz";
};

// called after copying data 
wq.worker.init = function() {
  // access previously defined properties
  this.bar();
};

var job = function(arg, transferList) {
  var data = new Uint8Array(1024*32);
  var result = {};
  result.buffer = data.buffer;
  result.foo = this.foo;
  // add buffer to transfer list
  transferList.push(data.buffer);
  return result;
};

var callback = function(result, job) {
  console.log("foo: " + result.foo);
  // job sequence number
  console.log("foo: " + job.id);
  // execution time (use to update wq.delay)
  var dt = new Date().getTime() - job.start;
  console.log("dt: " + dt);
};

function update() {
  // remove pending jobs
  wq.queue.splice(0,wq.queue.length);
  wq.add(job, {}, callback);
};
```



