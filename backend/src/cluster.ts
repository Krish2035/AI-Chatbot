import cluster from 'cluster';
import os from 'os';
import dotenv from 'dotenv';
import app from './app';
import { checkDbConnection } from './db';

dotenv.config();

const PORT = Number(process.env.PORT) || 5000;
const numCPUs = Math.min(os.cpus().length, 4); // Scale up to 4 worker processes

if (cluster.isPrimary) {
  console.log(`=================================================`);
  console.log(`🚀 Primary Load Balancer Master PID: ${process.pid}`);
  console.log(`⚖️  Distributing traffic across ${numCPUs} CPU worker processes`);
  console.log(`=================================================`);

  // Fork worker instances for load balancing
  for (let i = 0; i < numCPUs; i++) {
    cluster.fork();
  }

  // Auto-healing: restart worker if it dies
  cluster.on('exit', (worker, code, signal) => {
    console.warn(`⚠️ Worker process ${worker.process.pid} exited (${signal || code}). Respawning...`);
    cluster.fork();
  });
} else {
  // Worker process
  async function startWorker() {
    await checkDbConnection();

    app.listen(PORT, () => {
      console.log(`⚡ Worker ${process.pid} listening on port ${PORT}`);
    });
  }

  startWorker();
}
