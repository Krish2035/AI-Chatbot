import app from './app';
import { checkDbConnection } from './db';

const PORT = process.env.PORT || 5000;

async function startServer() {
  // Check Database connection
  await checkDbConnection();

  app.listen(PORT, () => {
    console.log(`=================================================`);
    console.log(`🚀 AI Chatbot Backend Server listening on port ${PORT}`);
    console.log(`📡 Health endpoint: http://localhost:${PORT}/api/health`);
    console.log(`=================================================`);
  });
}

startServer();
