#!/usr/bin/env node

const readline = require('readline');
const fs = require('fs-extra');
const chalk = require('chalk');
const crypto = require('crypto');

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

console.log(chalk.blue.bold(`
╔══════════════════════════════════════════════════════════════╗
║                  CatchTwo Enhanced Setup                    ║
║             Welcome to the setup wizard!                    ║
╚══════════════════════════════════════════════════════════════╝
`));

console.log(chalk.cyan('This wizard will help you configure CatchTwo Enhanced with Discord bot integration.\n'));

let config = {
    sleeping: false,
    incenseMode: false,
    reactAfterCatch: false,
    logCatches: true,
    lowIVLog: "10.00",
    highIVLog: "85.00",
    logWebhook: "",
    ownerID: [],
    prefix: "!",
    globalCatch: false,
    blacklistedGuilds: ["716390832034414685"],
    botApiUrl: "http://localhost:3000/api"
};

let botConfig = {
    bot: {
        token: "",
        clientId: "",
        guildId: "",
        prefix: "!",
        embedColor: "#f5b3b3"
    },
    api: {
        port: 3000,
        host: "localhost"
    },
    database: {
        path: "./data/autocatcher_stats.db"
    },
    features: {
        webDashboard: true,
        autoBackup: true,
        statsLogging: true,
        webhookIntegration: true
    }
};

function question(query) {
    return new Promise(resolve => rl.question(query, resolve));
}

async function setup() {
    try {
        console.log(chalk.yellow('📋 Step 1: Basic Configuration\n'));

        // Owner Discord ID
        const ownerIds = await question('Enter your Discord User ID(s) (comma-separated): ');
        if (ownerIds.trim()) {
            config.ownerID = ownerIds.split(',').map(id => id.trim());
            console.log(chalk.green(`✓ Set ${config.ownerID.length} owner ID(s)\n`));
        }

        // Webhook URL
        const webhook = await question('Enter Discord webhook URL for logging (optional): ');
        if (webhook.trim()) {
            config.logWebhook = webhook.trim();
            console.log(chalk.green('✓ Webhook configured\n'));
        }

        // Command prefix
        const prefix = await question('Enter command prefix (default: !): ');
        if (prefix.trim()) {
            config.prefix = prefix.trim();
            botConfig.bot.prefix = prefix.trim();
        }
        console.log(chalk.green(`✓ Prefix set to: ${config.prefix}\n`));

        // Global catch
        const globalCatch = await question('Enable global catching? (y/N): ');
        config.globalCatch = globalCatch.toLowerCase().startsWith('y');
        console.log(chalk.green(`✓ Global catch: ${config.globalCatch ? 'enabled' : 'disabled'}\n`));

        console.log(chalk.yellow('🤖 Step 2: Discord Bot Configuration\n'));

        // Bot token
        const botToken = await question('Enter Discord Bot Token (for /stats commands): ');
        if (botToken.trim()) {
            botConfig.bot.token = botToken.trim();
            console.log(chalk.green('✓ Bot token configured\n'));
        }

        // Client ID
        const clientId = await question('Enter Discord Bot Client ID: ');
        if (clientId.trim()) {
            botConfig.bot.clientId = clientId.trim();
            console.log(chalk.green('✓ Client ID configured\n'));
        }

        // Guild ID
        const guildId = await question('Enter Discord Server ID for slash commands: ');
        if (guildId.trim()) {
            botConfig.bot.guildId = guildId.trim();
            console.log(chalk.green('✓ Guild ID configured\n'));
        }

        console.log(chalk.yellow('🎮 Step 3: Autocatcher Accounts\n'));

        let tokens = [];
        let addingTokens = true;
        let tokenIndex = 1;

        while (addingTokens) {
            console.log(chalk.cyan(`Account ${tokenIndex}:`));
            const token = await question('  Discord account token: ');
            
            if (!token.trim()) {
                if (tokens.length === 0) {
                    console.log(chalk.red('⚠️  You need at least one token to continue!'));
                    continue;
                }
                addingTokens = false;
                break;
            }

            const guildIdForToken = await question('  Guild ID for this account: ');
            
            if (!guildIdForToken.trim()) {
                console.log(chalk.red('⚠️  Guild ID is required!'));
                continue;
            }

            tokens.push(`${token.trim()} ${guildIdForToken.trim()}`);
            console.log(chalk.green(`✓ Account ${tokenIndex} configured\n`));
            
            tokenIndex++;
            
            if (tokens.length >= 5) {
                console.log(chalk.yellow('ℹ️  You can add more tokens later by editing tokens.txt\n'));
                addingTokens = false;
            } else {
                const addMore = await question('Add another account? (y/N): ');
                addingTokens = addMore.toLowerCase().startsWith('y');
            }
        }

        console.log(chalk.yellow('💾 Step 4: Saving Configuration\n'));

        // Create directories
        await fs.ensureDir('./data');
        await fs.ensureDir('./messages');
        await fs.ensureDir('./public');

        // Save config files
        await fs.writeJSON('./config.json', config, { spaces: 2 });
        console.log(chalk.green('✓ config.json saved'));

        await fs.writeJSON('./bot-config.json', botConfig, { spaces: 2 });
        console.log(chalk.green('✓ bot-config.json saved'));

        await fs.writeFile('./tokens.txt', tokens.join('\n'));
        console.log(chalk.green('✓ tokens.txt saved'));

        // Create default messages if they don't exist
        if (!await fs.pathExists('./messages/messages.txt')) {
            const defaultMessages = [
                "pokemon go brrr",
                "catch them all!",
                "gotta catch em all",
                "pokemon master in training",
                "hunting for shinies",
                "level grinding time",
                "pokemon adventure continues",
                "catch rate is life",
                "shiny hunting mode activated",
                "pokemon trainer life"
            ];
            await fs.writeFile('./messages/messages.txt', defaultMessages.join('\n'));
            console.log(chalk.green('✓ Default messages created'));
        }

        // Create environment file for easy setup
        const envContent = `# CatchTwo Enhanced Environment Variables
BOT_TOKEN=${botConfig.bot.token}
CLIENT_ID=${botConfig.bot.clientId}
GUILD_ID=${botConfig.bot.guildId}
PORT=${botConfig.api.port}

# Optional: Use these instead of config files
# CONFIG='${JSON.stringify(config)}'
# TOKENS='${tokens.join('\\n')}'
`;
        await fs.writeFile('./.env.example', envContent);
        console.log(chalk.green('✓ .env.example created'));

        console.log(chalk.green.bold('\n🎉 Setup Complete!\n'));

        console.log(chalk.cyan('📖 Next Steps:'));
        console.log(chalk.white('1. Install dependencies: ') + chalk.yellow('npm install'));
        console.log(chalk.white('2. Start the system: ') + chalk.yellow('node start-all.js'));
        console.log(chalk.white('3. Or start components separately:'));
        console.log(chalk.white('   - Autocatcher only: ') + chalk.yellow('node index-fixed.js'));
        console.log(chalk.white('   - Discord bot only: ') + chalk.yellow('node bot.js'));
        console.log(chalk.white('4. Access web dashboard: ') + chalk.yellow('http://localhost:3000'));

        console.log(chalk.cyan('\n🔧 Configuration Files Created:'));
        console.log(chalk.white('• config.json - Autocatcher settings'));
        console.log(chalk.white('• bot-config.json - Discord bot settings'));
        console.log(chalk.white('• tokens.txt - Discord account tokens'));
        console.log(chalk.white('• .env.example - Environment variables template'));

        if (botConfig.bot.token) {
            console.log(chalk.cyan('\n🤖 Discord Bot Setup:'));
            console.log(chalk.white('1. Invite your bot to your server with these permissions:'));
            console.log(chalk.yellow(`   https://discord.com/api/oauth2/authorize?client_id=${botConfig.bot.clientId}&permissions=2048&scope=bot%20applications.commands`));
            console.log(chalk.white('2. Use ') + chalk.yellow('/register') + chalk.white(' command to register your autocatcher accounts'));
            console.log(chalk.white('3. Use ') + chalk.yellow('/stats') + chalk.white(' to view statistics'));
        }

        console.log(chalk.cyan('\n⚠️  Important Notes:'));
        console.log(chalk.white('• Keep your tokens secure and never share them'));
        console.log(chalk.white('• Make sure to follow Discord Terms of Service'));
        console.log(chalk.white('• Use the captcha solving feature responsibly'));
        console.log(chalk.white('• Check logs regularly for any issues'));

        console.log(chalk.cyan('\n💡 Tips:'));
        console.log(chalk.white('• Use ') + chalk.yellow(config.prefix + 'help') + chalk.white(' for autocatcher commands'));
        console.log(chalk.white('• Check the web dashboard for real-time statistics'));
        console.log(chalk.white('• Join our Discord server for support: ') + chalk.yellow('https://discord.gg/tXa2Hw5jHy'));

        console.log(chalk.green.bold('\n✨ Happy Pokemon catching! ✨\n'));

    } catch (error) {
        console.error(chalk.red('\n❌ Setup failed:'), error.message);
        console.log(chalk.yellow('\n💡 You can run this setup again or configure manually.'));
    } finally {
        rl.close();
    }
}

// Validate existing setup
async function validateSetup() {
    const issues = [];

    if (!await fs.pathExists('./config.json')) {
        issues.push('config.json not found');
    }

    if (!await fs.pathExists('./tokens.txt')) {
        issues.push('tokens.txt not found');
    }

    if (!await fs.pathExists('./package.json')) {
        issues.push('package.json not found - run npm init or git clone the project');
    }

    return issues;
}

// Main execution
async function main() {
    const issues = await validateSetup();
    
    if (issues.length > 0) {
        console.log(chalk.yellow('⚠️  Setup issues detected:'));
        issues.forEach(issue => console.log(chalk.red(`   • ${issue}`)));
        console.log('');
    }

    const shouldSetup = await question(chalk.cyan('Do you want to run the setup wizard? (Y/n): '));
    
    if (shouldSetup.toLowerCase() === 'n') {
        console.log(chalk.yellow('Setup cancelled. You can run this script again anytime.'));
        rl.close();
        return;
    }

    await setup();
}

main().catch(error => {
    console.error(chalk.red('Setup error:'), error);
    rl.close();
});