const { Client, GatewayIntentBits, EmbedBuilder, SlashCommandBuilder, REST, Routes, ActivityType } = require('discord.js');
const fs = require('fs-extra');
const path = require('path');
const sqlite3 = require('sqlite3').verbose();

// Configuration
const BOT_CONFIG = {
    token: process.env.BOT_TOKEN || 'YOUR_BOT_TOKEN_HERE',
    clientId: process.env.CLIENT_ID || 'YOUR_CLIENT_ID_HERE',
    guildId: process.env.GUILD_ID || 'YOUR_GUILD_ID_HERE',
    prefix: '!',
    embedColor: '#f5b3b3'
};

// Initialize Discord bot
const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.GuildMembers
    ]
});

// Initialize database
const db = new sqlite3.Database('./data/autocatcher_stats.db');

// Database initialization
function initializeDatabase() {
    db.serialize(() => {
        // Users table for autocatcher accounts
        db.run(`CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            discord_id TEXT UNIQUE,
            username TEXT,
            token_hash TEXT,
            guild_id TEXT,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            last_active DATETIME DEFAULT CURRENT_TIMESTAMP,
            is_active BOOLEAN DEFAULT 1
        )`);

        // Stats table for tracking catches
        db.run(`CREATE TABLE IF NOT EXISTS stats (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER,
            pokemon_caught INTEGER DEFAULT 0,
            legendary_caught INTEGER DEFAULT 0,
            mythical_caught INTEGER DEFAULT 0,
            ultrabeast_caught INTEGER DEFAULT 0,
            shiny_caught INTEGER DEFAULT 0,
            messages_spammed INTEGER DEFAULT 0,
            session_start DATETIME DEFAULT CURRENT_TIMESTAMP,
            session_end DATETIME,
            total_runtime INTEGER DEFAULT 0,
            FOREIGN KEY (user_id) REFERENCES users (id)
        )`);

        // Catches table for detailed catch logs
        db.run(`CREATE TABLE IF NOT EXISTS catches (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER,
            pokemon_name TEXT,
            level INTEGER,
            iv_percentage REAL,
            pokemon_number INTEGER,
            rarity TEXT,
            is_shiny BOOLEAN DEFAULT 0,
            caught_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (user_id) REFERENCES users (id)
        )`);

        // Settings table for bot configuration
        db.run(`CREATE TABLE IF NOT EXISTS settings (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER,
            setting_name TEXT,
            setting_value TEXT,
            FOREIGN KEY (user_id) REFERENCES users (id)
        )`);
    });
}

// Utility functions
function formatUptime(milliseconds) {
    const seconds = Math.floor(milliseconds / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (days > 0) return `${days}d ${hours % 24}h ${minutes % 60}m`;
    if (hours > 0) return `${hours}h ${minutes % 60}m`;
    if (minutes > 0) return `${minutes}m ${seconds % 60}s`;
    return `${seconds}s`;
}

function calculateRate(count, timeInMinutes) {
    if (timeInMinutes === 0) return '0.00';
    return ((count / timeInMinutes) * 60).toFixed(2);
}

// Command handlers
const commands = {
    async stats(interaction) {
        const userId = interaction.options.getString('user') || interaction.user.id;
        
        db.get(`
            SELECT u.*, s.* FROM users u 
            LEFT JOIN stats s ON u.id = s.user_id 
            WHERE u.discord_id = ? AND s.session_end IS NULL
            ORDER BY s.session_start DESC LIMIT 1
        `, [userId], (err, row) => {
            if (err) {
                console.error(err);
                return interaction.reply('❌ Database error occurred.');
            }

            if (!row) {
                return interaction.reply('❌ No stats found for this user. Make sure the autocatcher is registered.');
            }

            const currentTime = Date.now();
            const sessionStart = new Date(row.session_start).getTime();
            const runtime = currentTime - sessionStart;
            const runtimeMinutes = runtime / (1000 * 60);

            const embed = new EmbedBuilder()
                .setTitle(`📊 Autocatcher Stats - ${row.username || 'Unknown User'}`)
                .setColor(BOT_CONFIG.embedColor)
                .setThumbnail('https://camo.githubusercontent.com/1c34a30dc74c8cb780498c92aa4aeaa2e0bcec07a94b7a55d5377786adf43a5b/68747470733a2f2f6d656469612e646973636f72646170702e6e65742f6174746163686d656e74732f313033333333343538363936363535323636362f313035343839363838373834323438383432322f696d6167652e706e67')
                .addFields(
                    { name: '⏱️ Runtime', value: formatUptime(runtime), inline: true },
                    { name: '🎯 Status', value: row.is_active ? '🟢 Active' : '🔴 Inactive', inline: true },
                    { name: '📅 Session Started', value: `<t:${Math.floor(sessionStart / 1000)}:R>`, inline: true },
                    { name: '🎮 Pokémon Caught', value: `${row.pokemon_caught || 0}`, inline: true },
                    { name: '📈 Catch Rate', value: `${calculateRate(row.pokemon_caught || 0, runtimeMinutes)}/hr`, inline: true },
                    { name: '💬 Messages Sent', value: `${row.messages_spammed || 0}`, inline: true },
                    { name: '🌟 Legendaries', value: `${row.legendary_caught || 0}`, inline: true },
                    { name: '✨ Mythicals', value: `${row.mythical_caught || 0}`, inline: true },
                    { name: '👑 Ultra Beasts', value: `${row.ultrabeast_caught || 0}`, inline: true },
                    { name: '💎 Shinies', value: `${row.shiny_caught || 0}`, inline: true },
                    { name: '🎯 Shiny Rate', value: `${calculateRate(row.shiny_caught || 0, runtimeMinutes)}/hr`, inline: true },
                    { name: '📊 Total Rate', value: `${calculateRate((row.legendary_caught || 0) + (row.mythical_caught || 0) + (row.ultrabeast_caught || 0), runtimeMinutes)}/hr`, inline: true }
                )
                .setFooter({ text: 'CatchTwo Stats Bot | Last updated' })
                .setTimestamp();

            interaction.reply({ embeds: [embed] });
        });
    },

    async leaderboard(interaction) {
        const type = interaction.options.getString('type') || 'total';
        const limit = interaction.options.getInteger('limit') || 10;

        let orderBy = 'pokemon_caught';
        let title = '🏆 Total Catches Leaderboard';
        
        switch (type) {
            case 'shiny':
                orderBy = 'shiny_caught';
                title = '💎 Shiny Catches Leaderboard';
                break;
            case 'legendary':
                orderBy = 'legendary_caught';
                title = '🌟 Legendary Catches Leaderboard';
                break;
            case 'mythical':
                orderBy = 'mythical_caught';
                title = '✨ Mythical Catches Leaderboard';
                break;
            case 'ultrabeast':
                orderBy = 'ultrabeast_caught';
                title = '👑 Ultra Beast Catches Leaderboard';
                break;
        }

        db.all(`
            SELECT u.username, u.discord_id, s.${orderBy} as count, s.pokemon_caught, s.session_start
            FROM users u 
            JOIN stats s ON u.id = s.user_id 
            WHERE s.session_end IS NULL AND u.is_active = 1
            ORDER BY s.${orderBy} DESC 
            LIMIT ?
        `, [limit], (err, rows) => {
            if (err) {
                console.error(err);
                return interaction.reply('❌ Database error occurred.');
            }

            if (!rows || rows.length === 0) {
                return interaction.reply('❌ No active users found.');
            }

            const embed = new EmbedBuilder()
                .setTitle(title)
                .setColor(BOT_CONFIG.embedColor)
                .setThumbnail('https://camo.githubusercontent.com/1c34a30dc74c8cb780498c92aa4aeaa2e0bcec07a94b7a55d5377786adf43a5b/68747470733a2f2f6d656469612e646973636f72646170702e6e65742f6174746163686d656e74732f313033333333343538363936363535323636362f313035343839363838373834323438383432322f696d6167652e706e67')
                .setFooter({ text: 'CatchTwo Stats Bot' })
                .setTimestamp();

            let description = '';
            rows.forEach((row, index) => {
                const medal = index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : `${index + 1}.`;
                const sessionStart = new Date(row.session_start).getTime();
                const runtime = Date.now() - sessionStart;
                const runtimeMinutes = runtime / (1000 * 60);
                const rate = calculateRate(row.count, runtimeMinutes);
                
                description += `${medal} **${row.username || 'Unknown'}** - ${row.count} (${rate}/hr)\n`;
            });

            embed.setDescription(description);
            interaction.reply({ embeds: [embed] });
        });
    },

    async register(interaction) {
        const username = interaction.options.getString('username');
        const tokenHash = interaction.options.getString('token_hash');
        const guildId = interaction.options.getString('guild_id');

        db.run(`
            INSERT OR REPLACE INTO users (discord_id, username, token_hash, guild_id) 
            VALUES (?, ?, ?, ?)
        `, [interaction.user.id, username, tokenHash, guildId], function(err) {
            if (err) {
                console.error(err);
                return interaction.reply('❌ Failed to register user.');
            }

            // Create initial stats entry
            db.run(`
                INSERT INTO stats (user_id, session_start) 
                VALUES (?, datetime('now'))
            `, [this.lastID], (err) => {
                if (err) console.error(err);
            });

            const embed = new EmbedBuilder()
                .setTitle('✅ Registration Successful')
                .setDescription(`Successfully registered **${username}** for autocatcher monitoring.`)
                .setColor('#00ff00')
                .addFields(
                    { name: 'Username', value: username, inline: true },
                    { name: 'Guild ID', value: guildId, inline: true },
                    { name: 'Discord User', value: `<@${interaction.user.id}>`, inline: true }
                )
                .setFooter({ text: 'CatchTwo Stats Bot' })
                .setTimestamp();

            interaction.reply({ embeds: [embed] });
        });
    },

    async recent(interaction) {
        const userId = interaction.options.getString('user') || interaction.user.id;
        const limit = interaction.options.getInteger('limit') || 10;

        db.all(`
            SELECT c.*, u.username 
            FROM catches c 
            JOIN users u ON c.user_id = u.id 
            WHERE u.discord_id = ? 
            ORDER BY c.caught_at DESC 
            LIMIT ?
        `, [userId, limit], (err, rows) => {
            if (err) {
                console.error(err);
                return interaction.reply('❌ Database error occurred.');
            }

            if (!rows || rows.length === 0) {
                return interaction.reply('❌ No recent catches found.');
            }

            const embed = new EmbedBuilder()
                .setTitle(`🎯 Recent Catches - ${rows[0].username || 'Unknown User'}`)
                .setColor(BOT_CONFIG.embedColor)
                .setFooter({ text: 'CatchTwo Stats Bot' })
                .setTimestamp();

            let description = '';
            rows.forEach(catch_ => {
                const shinyIcon = catch_.is_shiny ? '✨' : '';
                const rarityIcon = catch_.rarity === 'Legendary' ? '🌟' : 
                                  catch_.rarity === 'Mythical' ? '✨' : 
                                  catch_.rarity === 'Ultra Beast' ? '👑' : '🎮';
                
                description += `${rarityIcon}${shinyIcon} **${catch_.pokemon_name}** (Lv.${catch_.level}) - ${catch_.iv_percentage}% IV\n`;
                description += `> Caught <t:${Math.floor(new Date(catch_.caught_at).getTime() / 1000)}:R>\n\n`;
            });

            embed.setDescription(description);
            interaction.reply({ embeds: [embed] });
        });
    },

    async help(interaction) {
        const embed = new EmbedBuilder()
            .setTitle('🤖 CatchTwo Stats Bot Commands')
            .setDescription('Here are all available commands for managing your Pokétwo autocatcher stats:')
            .setColor(BOT_CONFIG.embedColor)
            .addFields(
                { name: '/stats [user]', value: 'View detailed statistics for a user', inline: false },
                { name: '/leaderboard [type] [limit]', value: 'View leaderboards (total, shiny, legendary, mythical, ultrabeast)', inline: false },
                { name: '/register <username> <token_hash> <guild_id>', value: 'Register your autocatcher for monitoring', inline: false },
                { name: '/recent [user] [limit]', value: 'View recent catches for a user', inline: false },
                { name: '/status', value: 'View bot status and active users', inline: false },
                { name: '/help', value: 'Show this help message', inline: false }
            )
            .setThumbnail('https://camo.githubusercontent.com/1c34a30dc74c8cb780498c92aa4aeaa2e0bcec07a94b7a55d5377786adf43a5b/68747470733a2f2f6d656469612e646973636f72646170702e6e65742f6174746163686d656e74732f313033333333343538363936363535323636362f313035343839363838373834323438383432322f696d6167652e706e67')
            .setFooter({ text: 'CatchTwo Stats Bot | github.com/kyan0045/CatchTwo' })
            .setTimestamp();

        interaction.reply({ embeds: [embed] });
    },

    async status(interaction) {
        db.all(`
            SELECT COUNT(*) as total_users, 
                   SUM(CASE WHEN is_active = 1 THEN 1 ELSE 0 END) as active_users,
                   SUM(pokemon_caught) as total_catches,
                   SUM(shiny_caught) as total_shinies
            FROM users u 
            LEFT JOIN stats s ON u.id = s.user_id 
            WHERE s.session_end IS NULL
        `, (err, rows) => {
            if (err) {
                console.error(err);
                return interaction.reply('❌ Database error occurred.');
            }

            const stats = rows[0] || { total_users: 0, active_users: 0, total_catches: 0, total_shinies: 0 };
            
            const embed = new EmbedBuilder()
                .setTitle('📊 Bot Status')
                .setColor(BOT_CONFIG.embedColor)
                .addFields(
                    { name: '👥 Total Users', value: `${stats.total_users || 0}`, inline: true },
                    { name: '🟢 Active Users', value: `${stats.active_users || 0}`, inline: true },
                    { name: '⏱️ Bot Uptime', value: formatUptime(client.uptime), inline: true },
                    { name: '🎮 Total Catches', value: `${stats.total_catches || 0}`, inline: true },
                    { name: '💎 Total Shinies', value: `${stats.total_shinies || 0}`, inline: true },
                    { name: '🏓 Ping', value: `${client.ws.ping}ms`, inline: true }
                )
                .setFooter({ text: 'CatchTwo Stats Bot' })
                .setTimestamp();

            interaction.reply({ embeds: [embed] });
        });
    }
};

// Slash command definitions
const slashCommands = [
    new SlashCommandBuilder()
        .setName('stats')
        .setDescription('View autocatcher statistics')
        .addStringOption(option =>
            option.setName('user')
                .setDescription('Discord user ID to view stats for')
                .setRequired(false)),
    
    new SlashCommandBuilder()
        .setName('leaderboard')
        .setDescription('View leaderboards')
        .addStringOption(option =>
            option.setName('type')
                .setDescription('Type of leaderboard')
                .setRequired(false)
                .addChoices(
                    { name: 'Total Catches', value: 'total' },
                    { name: 'Shiny Catches', value: 'shiny' },
                    { name: 'Legendary Catches', value: 'legendary' },
                    { name: 'Mythical Catches', value: 'mythical' },
                    { name: 'Ultra Beast Catches', value: 'ultrabeast' }
                ))
        .addIntegerOption(option =>
            option.setName('limit')
                .setDescription('Number of users to show (1-25)')
                .setRequired(false)
                .setMinValue(1)
                .setMaxValue(25)),

    new SlashCommandBuilder()
        .setName('register')
        .setDescription('Register your autocatcher for monitoring')
        .addStringOption(option =>
            option.setName('username')
                .setDescription('Your autocatcher username')
                .setRequired(true))
        .addStringOption(option =>
            option.setName('token_hash')
                .setDescription('Hash of your token (for identification)')
                .setRequired(true))
        .addStringOption(option =>
            option.setName('guild_id')
                .setDescription('Guild ID where your autocatcher operates')
                .setRequired(true)),

    new SlashCommandBuilder()
        .setName('recent')
        .setDescription('View recent catches')
        .addStringOption(option =>
            option.setName('user')
                .setDescription('Discord user ID to view catches for')
                .setRequired(false))
        .addIntegerOption(option =>
            option.setName('limit')
                .setDescription('Number of catches to show (1-25)')
                .setRequired(false)
                .setMinValue(1)
                .setMaxValue(25)),

    new SlashCommandBuilder()
        .setName('status')
        .setDescription('View bot status and statistics'),

    new SlashCommandBuilder()
        .setName('help')
        .setDescription('Show help information')
];

// Event handlers
client.once('ready', () => {
    console.log(`✅ Bot logged in as ${client.user.tag}`);
    console.log(`🌐 Serving ${client.guilds.cache.size} guilds`);
    
    client.user.setActivity('Pokétwo autocatchers', { type: ActivityType.Watching });
    
    initializeDatabase();
    console.log('✅ Database initialized');

    // Register slash commands
    const rest = new REST({ version: '10' }).setToken(BOT_CONFIG.token);
    
    (async () => {
        try {
            console.log('🔄 Started refreshing application (/) commands.');
            
            await rest.put(
                Routes.applicationGuildCommands(BOT_CONFIG.clientId, BOT_CONFIG.guildId),
                { body: slashCommands }
            );

            console.log('✅ Successfully reloaded application (/) commands.');
        } catch (error) {
            console.error('❌ Error registering commands:', error);
        }
    })();
});

client.on('interactionCreate', async interaction => {
    if (!interaction.isChatInputCommand()) return;

    const { commandName } = interaction;
    
    if (commands[commandName]) {
        try {
            await commands[commandName](interaction);
        } catch (error) {
            console.error(`Error executing ${commandName}:`, error);
            const errorMessage = 'There was an error while executing this command!';
            
            if (interaction.replied || interaction.deferred) {
                await interaction.followUp({ content: errorMessage, ephemeral: true });
            } else {
                await interaction.reply({ content: errorMessage, ephemeral: true });
            }
        }
    }
});

client.on('error', error => {
    console.error('Discord client error:', error);
});

process.on('unhandledRejection', error => {
    console.error('Unhandled promise rejection:', error);
});

// API endpoints for autocatcher integration
const express = require('express');
const path = require('path');
const app = express();
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Endpoint to update stats from autocatcher
app.post('/api/update-stats', (req, res) => {
    const { discord_id, stats } = req.body;
    
    if (!discord_id || !stats) {
        return res.status(400).json({ error: 'Missing discord_id or stats' });
    }

    db.get('SELECT id FROM users WHERE discord_id = ?', [discord_id], (err, user) => {
        if (err || !user) {
            return res.status(404).json({ error: 'User not found' });
        }

        db.run(`
            UPDATE stats SET 
                pokemon_caught = ?,
                legendary_caught = ?,
                mythical_caught = ?,
                ultrabeast_caught = ?,
                shiny_caught = ?,
                messages_spammed = ?,
                last_active = datetime('now')
            WHERE user_id = ? AND session_end IS NULL
        `, [
            stats.pokemon_caught || 0,
            stats.legendary_caught || 0,
            stats.mythical_caught || 0,
            stats.ultrabeast_caught || 0,
            stats.shiny_caught || 0,
            stats.messages_spammed || 0,
            user.id
        ], (err) => {
            if (err) {
                console.error(err);
                return res.status(500).json({ error: 'Database error' });
            }
            
            res.json({ success: true });
        });
    });
});

// Endpoint to log catches
app.post('/api/log-catch', (req, res) => {
    const { discord_id, catch_data } = req.body;
    
    if (!discord_id || !catch_data) {
        return res.status(400).json({ error: 'Missing discord_id or catch_data' });
    }

    db.get('SELECT id FROM users WHERE discord_id = ?', [discord_id], (err, user) => {
        if (err || !user) {
            return res.status(404).json({ error: 'User not found' });
        }

        db.run(`
            INSERT INTO catches (user_id, pokemon_name, level, iv_percentage, pokemon_number, rarity, is_shiny)
            VALUES (?, ?, ?, ?, ?, ?, ?)
        `, [
            user.id,
            catch_data.pokemon_name,
            catch_data.level,
            catch_data.iv_percentage,
            catch_data.pokemon_number,
            catch_data.rarity,
            catch_data.is_shiny || false
        ], (err) => {
            if (err) {
                console.error(err);
                return res.status(500).json({ error: 'Database error' });
            }
            
            res.json({ success: true });
        });
    });
});

// Dashboard API endpoint
app.get('/api/dashboard-stats', (req, res) => {
    // Get overall statistics
    db.get(`
        SELECT 
            COUNT(DISTINCT u.id) as total_users,
            SUM(CASE WHEN u.is_active = 1 THEN 1 ELSE 0 END) as active_users,
            SUM(s.pokemon_caught) as total_catches,
            SUM(s.shiny_caught) as total_shinies,
            SUM(s.legendary_caught) as total_legendaries,
            SUM(s.mythical_caught) as total_mythicals,
            SUM(s.ultrabeast_caught) as total_ultrabeasts,
            AVG(CAST((julianday('now') - julianday(s.session_start)) * 24 * 3600 AS INTEGER)) as avg_runtime
        FROM users u 
        LEFT JOIN stats s ON u.id = s.user_id 
        WHERE s.session_end IS NULL
    `, (err, overall) => {
        if (err) {
            console.error(err);
            return res.status(500).json({ error: 'Database error' });
        }

        // Get user statistics
        db.all(`
            SELECT 
                u.username, 
                u.discord_id,
                u.is_active,
                s.pokemon_caught,
                s.shiny_caught,
                s.legendary_caught,
                s.mythical_caught,
                s.ultrabeast_caught,
                s.messages_spammed,
                CAST((julianday('now') - julianday(s.session_start)) * 24 * 3600 AS INTEGER) as runtime,
                s.session_start
            FROM users u 
            JOIN stats s ON u.id = s.user_id 
            WHERE s.session_end IS NULL
            ORDER BY s.pokemon_caught DESC
            LIMIT 20
        `, (err, users) => {
            if (err) {
                console.error(err);
                return res.status(500).json({ error: 'Database error' });
            }

            // Get recent catches
            db.all(`
                SELECT 
                    c.pokemon_name,
                    c.level,
                    c.iv_percentage,
                    c.rarity,
                    c.is_shiny,
                    c.caught_at,
                    u.username
                FROM catches c
                JOIN users u ON c.user_id = u.id
                ORDER BY c.caught_at DESC
                LIMIT 50
            `, (err, catches) => {
                if (err) {
                    console.error(err);
                    return res.status(500).json({ error: 'Database error' });
                }

                // Generate hourly stats for the last 24 hours
                db.all(`
                    SELECT 
                        strftime('%Y-%m-%d %H:00:00', c.caught_at) as hour,
                        COUNT(*) as catches,
                        SUM(CASE WHEN c.is_shiny = 1 THEN 1 ELSE 0 END) as shinies
                    FROM catches c
                    WHERE c.caught_at >= datetime('now', '-24 hours')
                    GROUP BY strftime('%Y-%m-%d %H:00:00', c.caught_at)
                    ORDER BY hour
                `, (err, hourlyStats) => {
                    if (err) {
                        console.error(err);
                        return res.status(500).json({ error: 'Database error' });
                    }

                    // Calculate distribution
                    const distribution = {
                        regular: (overall.total_catches || 0) - (overall.total_legendaries || 0) - (overall.total_mythicals || 0) - (overall.total_ultrabeasts || 0),
                        legendary: overall.total_legendaries || 0,
                        mythical: overall.total_mythicals || 0,
                        ultrabeast: overall.total_ultrabeasts || 0,
                        shiny: overall.total_shinies || 0
                    };

                    res.json({
                        overall: {
                            ...overall,
                            total_runtime: overall.avg_runtime || 0
                        },
                        users: users || [],
                        recent_catches: catches || [],
                        hourly_stats: hourlyStats || [],
                        distribution
                    });
                });
            });
        });
    });
});

// Register autocatcher endpoint
app.post('/api/register-autocatcher', (req, res) => {
    const { discord_id, username, token_hash, guild_id } = req.body;
    
    if (!discord_id || !username) {
        return res.status(400).json({ error: 'Missing required fields' });
    }

    db.get('SELECT id FROM users WHERE discord_id = ?', [discord_id], (err, existing) => {
        if (err) {
            console.error(err);
            return res.status(500).json({ error: 'Database error' });
        }

        if (existing) {
            return res.status(409).json({ error: 'User already registered' });
        }

        db.run(`
            INSERT INTO users (discord_id, username, token_hash, guild_id) 
            VALUES (?, ?, ?, ?)
        `, [discord_id, username, token_hash, guild_id], function(err) {
            if (err) {
                console.error(err);
                return res.status(500).json({ error: 'Database error' });
            }

            // Create initial stats entry
            db.run(`
                INSERT INTO stats (user_id, session_start) 
                VALUES (?, datetime('now'))
            `, [this.lastID], (err) => {
                if (err) console.error(err);
            });

            res.json({ success: true, user_id: this.lastID });
        });
    });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`🌐 API server running on port ${PORT}`);
});

// Login to Discord
if (BOT_CONFIG.token === 'YOUR_BOT_TOKEN_HERE') {
    console.log('❌ Please set your bot token in the environment variables or config!');
    process.exit(1);
} else {
    client.login(BOT_CONFIG.token);
}

module.exports = { client, db };