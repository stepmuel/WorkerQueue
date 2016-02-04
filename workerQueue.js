
function workerQueue() {
	this.worker = {}; // worker prototype
	this.workersIdle = [];
	this.workersBusy = [];
	this.maxWorkers = 1;
	this.queue = [];
	this.jobs = {};
	this.nextID = 1;
	this.isWaiting = false;
	this.delay = 0;
	this.add = function(func, args, callback) {
		if (callback===undefined) callback = function() {};
		var job = {id: this.nextID++, func: func, args: args, callback: callback};
		if (window.Worker) {
			this.queue.push(job);
			this.dispatch();
		} else {
			// no web worker support
			if (this.worker.init) {
				this.worker.init();
				delete this.worker.init;
			}
			job.start = new Date().getTime();
			var res = func.call(this.worker, args, []);
			callback(res, job);
		}
	};
	this.dispatch = function() {
		// are jobs available?
		if (this.queue.length==0) return;
		// is execution delayed? 
		if (this.isWaiting) return;
		var worker = this.getWorker();
		// is a worker available?
		if (worker==null) return;
		this.workersBusy.push(worker);
		var job = this.queue.shift();
		// save execution start time
		job.start = new Date().getTime();
		// save job to make callback accessible later
		this.jobs[job.id] = job;
		// send job to worker
		var code = '('+job.func.toString()+')';
		var data = {id: job.id, code: code, args: job.args};
		worker.postMessage(data);
		// pause dispatching
		if (this.delay>0) {
			this.isWaiting = true;
			var wq = this; // make this accessible
			setTimeout(function() {
				wq.isWaiting = false;
				wq.dispatch();
			}, this.delay);
		}
	};
	this.getWorker = function() {
		var wq = this;
		var idle = this.workersIdle;
		var busy = this.workersBusy;
		// dequeue idle worker
		var worker = idle.shift();
		if (worker!==undefined) return worker;
		// worker quota exhausted?
		if (busy.length+idle.length>=this.maxWorkers) return null;
		// create new worker
		var onmessage = function(e) {
			var d = e.data;
			var func = eval(d.code);
			var transferList = [];
			var res = func(d.args, transferList);
			if (d.id===undefined) return;
			postMessage({res: res, id: d.id}, transferList);
		};
		var blob = new Blob(["this.onmessage = "+onmessage.toString()],{type: "text/javascript"});
		worker = new Worker(window.URL.createObjectURL(blob));
		// set properties from worker prototype
		var propertySet = function(a) {
			this[a.k] = a.eval ? eval(a.v) : a.v;
		};
		var data = {code: '('+propertySet.toString()+')'};
		var args = {};
		for (var k in this.worker) {
			var v = this.worker[k];
			if (v instanceof Function) {
				var code = '('+v.toString()+')';
				args = {k: k, v: code, eval: true};
			} else {
				args = {k: k, v: v, eval: false};
			}
			data.args = args;
			worker.postMessage(data);
		}
		// call worker init function
		if (this.worker.init!==undefined) {
			worker.postMessage({code: '(function(){init();})'});
		}
		// install local message handler
		worker.onmessage = function(e) {
			// remove self from busy list
			var i = busy.indexOf(this);
			if (i!=-1) busy.splice(i, 1);
			// add self to idle list
			idle.push(this);
			// execute callback
			var job = wq.jobs[e.data.id];
			job.callback(e.data.res, job);
			delete wq.jobs[e.data.id];
			// run next job
			wq.dispatch();
		}
		return worker;
	}
};



