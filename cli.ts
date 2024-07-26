// cli.js

const readline = require('readline');
const { Worker } = require('worker_threads');

// Create readline interface for input
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

// Function to run a task in a worker thread
function runTask(taskId) {
  return new Promise((resolve, reject) => {
    const worker = new Worker('./worker.js', { workerData: { taskId } });

    worker.on('message', (message) => {
      console.log(`Worker ${taskId}: ${message}`);
    });

    worker.on('error', (error) => {
      reject(`Worker ${taskId} error: ${error}`);
    });

    worker.on('exit', (code) => {
      if (code !== 0) {
        reject(`Worker ${taskId} exited with code ${code}`);
      } else {
        resolve(`Worker ${taskId} completed`);
      }
    });
  });
}

// Function to handle user input
function handleInput() {
  rl.question('Enter command (start <taskId> or exit): ', async (input) => {
    const [command, taskId] = input.split(' ');

    if (command === 'start' && taskId) {
      console.log(`Starting task ${taskId}...`);
      try {
        const result = await runTask(taskId);
        console.log(result);
      } catch (error) {
        console.error(error);
      }
    } else if (command === 'exit') {
      console.log('Exiting...');
      rl.close();
      return;
    } else {
      console.log('Invalid command. Use "start <taskId>" to start a task or "exit" to quit.');
    }

    handleInput();
  });
}

// Start handling input
handleInput();
