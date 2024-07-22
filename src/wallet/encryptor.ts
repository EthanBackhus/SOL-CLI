// imports / requires
const { program } = require("commander");
const mysql = require('mysql');
const redis = require('redis');
const crypto = require('crypto');



// declare variables


const algorithm = 'aes-256-cbc';

// Configuration for MySQL and Redis
const dbConfig = {
    host: 'localhost',
    user: 'your-username',
    password: 'your-password',
    database: 'your-database'
};

// handle CLI input
program
  .option("--password <PASSWORD>", "Specify the password to encrypt the keys")
  .option("-h, --help", "display help for command")
  .action((options) => {
    if (options.help) {
      console.log(
        "node encryption --password <PASSWORD>"
      );
      process.exit(0);
    }
    if (!options.password) {
      console.error("❌ Missing required options");
      process.exit(1);
    }
    password = options.password;
  });
program.parse();