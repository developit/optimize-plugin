import os from 'os';
import Worker from 'jest-worker';

export class WorkerPool {
  constructor ({ workerPath, concurrency }) {
    this.concurrency = Math.max(1, Math.round(concurrency || os.cpus().length || 1));
    this.runInBand = concurrency === 0 || concurrency === false;
    this.workerPath = workerPath;
    this.queue = [];
    this.workers = [];
    this.freeWorkers = [];
  }

  getFreeWorker () {
    return this.freeWorkers.pop();
  }

  addWorker () {
    if (this.workers.length >= this.concurrency) return;
    const worker = this.runInBand ? require(this.workerPath) : new Worker(this.workerPath);
    this.workers.push(worker);
    return worker;
  }

  enqueue (item) {
    return new Promise((resolve, reject) => {
      if (this.queue.push({ item, resolve, reject }) === 1) {
        this.process();
      }
    });
  }

  async process () {
    if (!this.queue.length) return;
    const worker = this.getFreeWorker() || this.addWorker();
    if (!worker) {
      console.log('queue full');
      return;
    }
    const { item, resolve, reject } = this.queue.pop();
    try {
      const result = await worker.process(item);
      resolve(result);
    } catch (e) {
      reject(e);
    }
    this.freeWorkers.unshift(worker);
    this.process();
  }
}

// class MockWorkerPool extends WorkerPool {
//   constructor(options) {
//     super({
//       ...options,
//       concurrency: 1
//     });
//   }
//   getFreeWorker() {
//     return require(this.workerPath);
//   }
// }
