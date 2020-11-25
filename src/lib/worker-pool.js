/**
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *      http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import Worker from 'jest-worker';

export class WorkerPool {
  constructor ({ workerPath, concurrency }) {
    // concurrency = 0;
    if (concurrency === false || concurrency === 0) {
      return { enqueue: t => require(workerPath).process(t) };
    }

    const worker = new Worker(workerPath, {
      enableWorkerThreads: false,
      numWorkers: concurrency
    });
    let pending = 0;
    let timer;
    function check () {
      clearTimeout(timer);
      if (--pending === 0) {
        timer = setTimeout(() => {
          worker.end();
        }, 10);
      }
    }
    worker.enqueue = task => {
      clearTimeout(timer);
      const p = worker.process(task);
      pending++;
      p.then(check);
      return p;
    };
    return worker;
  }
}

/*
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

  // terminateAll () {
  //   let worker;
  //   while ((worker = this.workers.pop())) {
  //     worker.terminate();
  //   }
  // }

  cleanup () {
    clearTimeout(this.cleanupTimer);
    const worker = this.getFreeWorker();
    if (worker) {
      worker.end();
      this.cleanupTimer = setTimeout(this.cleanup.bind(this), 100);
    }
  }

  getFreeWorker () {
    return this.freeWorkers.pop();
  }

  addWorker () {
    if (this.workers.length >= this.concurrency) return;
    const worker = this.runInBand ? require(this.workerPath) : new Worker(this.workerPath, {
      enableWorkerThreads: true,
      numWorkers: 1
      // maxRetries: 0
    });
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
    clearTimeout(this.cleanupTimer);
    if (!this.queue.length) {
      this.cleanupTimer = setTimeout(this.cleanup.bind(this), 100);
      return;
    }
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
*/
