#!/usr/bin/env node

const { spawn } = require('child_process');
const chalk = require('chalk');
const fs = require('fs-extra');
const path = require('path');

console.log(chalk.blue.bold(`
╔══════════════════════════════════════════════════════════════╗
║                   CatchTwo Enhanced Startup                 ║
║              Starting Autocatcher + Discord Bot             ║
╚══════════════════════════════════════════════════════════════╝
`));

// Check if required files exist
const requiredFiles = [
    'config.json',
    'tokens.txt',
    'bot-config.json',
    'index-fixed.js',
    'bot.js',
    'autocatcher-integration.js'
];

const missingFiles = requiredFiles.filter(file => !fs.existsSync(path.join(__dirname, file)));

if (missingFiles.length > 0) {
    console.error(chalk.red('❌ Missing required files:'));
    missingFiles.forEach(file => console.error(chalk.red(`   - ${file}`)));
    console.log(chalk.yellow('\n📝 Please ensure all required files are present before starting.'));
    process.exit(1);
}

// Check environment variables for Discord bot
const requiredEnvVars = ['BOT_TOKEN', 'CLIENT_ID', 'GUILD_ID'];
const missingEnvVars = requiredEnvVars.filter(varName => !process.env[varName]);

if (missingEnvVars.length > 0) {
    console.log(chalk.yellow('⚠️  Missing environment variables for Discord bot:'));
    missingEnvVars.forEach(varName => console.log(chalk.yellow(`   - ${varName}`)));
    console.log(chalk.cyan('\n💡 Set these environment variables or update bot-config.json'));
    console.log(chalk.cyan('   The autocatcher will still work, but Discord bot features will be limited.'));
}

// Create data directory if it doesn't exist
fs.ensureDirSync(path.join(__dirname, 'data'));

let autocatcherProcess;
let botProcess;
let isShuttingDown = false;

function startAutocatcher() {
    console.log(chalk.green('🚀 Starting Autocatcher...'));
    
    autocatcherProcess = spawn('node', ['index-fixed.js'], {
        stdio: 'inherit',
        cwd: __dirname
    });

    autocatcherProcess.on('close', (code) => {
        if (!isShuttingDown) {
            console.log(chalk.yellow(`⚠️  Autocatcher exited with code ${code}. Restarting in 5 seconds...`));
            setTimeout(startAutocatcher, 5000);
        }
    });

    autocatcherProcess.on('error', (error) => {
        console.error(chalk.red('❌ Autocatcher error:'), error.message);
        if (!isShuttingDown) {
            setTimeout(startAutocatcher, 10000);
        }
    });
}

function startDiscordBot() {
    console.log(chalk.green('🤖 Starting Discord Bot...'));
    
    botProcess = spawn('node', ['bot.js'], {
        stdio: 'inherit',
        cwd: __dirname,
        env: { ...process.env }
    });

    botProcess.on('close', (code) => {
        if (!isShuttingDown) {
            console.log(chalk.yellow(`⚠️  Discord bot exited with code ${code}. Restarting in 10 seconds...`));
            setTimeout(startDiscordBot, 10000);
        }
    });

    botProcess.on('error', (error) => {
        console.error(chalk.red('❌ Discord bot error:'), error.message);
        if (!isShuttingDown) {
            setTimeout(startDiscordBot, 15000);
        }
    });
}

// Start both processes
console.log(chalk.blue('🔄 Initializing systems...\n'));

// Start autocatcher first
startAutocatcher();

// Wait a bit, then start Discord bot
setTimeout(() => {
    if (process.env.BOT_TOKEN && process.env.BOT_TOKEN !== 'YOUR_BOT_TOKEN_HERE') {
        startDiscordBot();
    } else {
        console.log(chalk.yellow('⚠️  Discord bot not started - missing valid BOT_TOKEN'));
        console.log(chalk.cyan('   Set BOT_TOKEN environment variable to enable Discord bot features'));
    }
}, 3000);

// Graceful shutdown handling
function gracefulShutdown(signal) {
    console.log(chalk.blue(`\n🛑 Received ${signal}. Shutting down gracefully...`));
    isShuttingDown = true;

    const shutdownPromises = [];

    if (autocatcherProcess && !autocatcherProcess.killed) {
        console.log(chalk.yellow('🔄 Stopping autocatcher...'));
        autocatcherProcess.kill('SIGTERM');
        
        shutdownPromises.push(new Promise((resolve) => {
            autocatcherProcess.on('close', resolve);
            setTimeout(() => {
                if (!autocatcherProcess.killed) {
                    console.log(chalk.red('⚠️  Force killing autocatcher...'));
                    autocatcherProcess.kill('SIGKILL');
                }
                resolve();
            }, 5000);
        }));
    }

    if (botProcess && !botProcess.killed) {
        console.log(chalk.yellow('🔄 Stopping Discord bot...'));
        botProcess.kill('SIGTERM');
        
        shutdownPromises.push(new Promise((resolve) => {
            botProcess.on('close', resolve);
            setTimeout(() => {
                if (!botProcess.killed) {
                    console.log(chalk.red('⚠️  Force killing Discord bot...'));
                    botProcess.kill('SIGKILL');
                }
                resolve();
            }, 5000);
        }));
    }

    Promise.all(shutdownPromises).then(() => {
        console.log(chalk.green('✅ All processes stopped. Goodbye!'));
        process.exit(0);
    });

    // Fallback: force exit after 15 seconds
    setTimeout(() => {
        console.log(chalk.red('⚠️  Force exiting after timeout'));
        process.exit(1);
    }, 15000);
}

// Handle various shutdown signals
process.on('SIGINT', () => gracefulShutdown('SIGINT'));
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGQUIT', () => gracefulShutdown('SIGQUIT'));

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
    console.error(chalk.red('💥 Uncaught Exception:'), error);
    gracefulShutdown('EXCEPTION');
});

process.on('unhandledRejection', (reason, promise) => {
    console.error(chalk.red('💥 Unhandled Rejection at:'), promise, 'reason:', reason);
    gracefulShutdown('REJECTION');
});

// Display running status
setInterval(() => {
    if (!isShuttingDown) {
        const autocatcherStatus = autocatcherProcess && !autocatcherProcess.killed ? '🟢' : '🔴';
        const botStatus = botProcess && !botProcess.killed ? '🟢' : '🔴';
        
        console.log(chalk.gray(`\n📊 Status: Autocatcher ${autocatcherStatus} | Discord Bot ${botStatus} | ${new Date().toLocaleTimeString()}`));
    }
}, 300000); // Every 5 minutes

console.log(chalk.green('\n✅ Startup complete! Both systems are initializing...'));
console.log(chalk.cyan('💡 Press Ctrl+C to stop all processes gracefully'));
console.log(chalk.cyan('💡 Check the logs above for any configuration issues\n'));