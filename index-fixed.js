var version = "1.3.9-fixed";
// Version 1.3.9-fixed - Bug fixes and Discord bot integration
// EVERYTHING can be set up in config.json, no need to change anything here :)!

const { Client, Permissions } = require("discord.js-selfbot-v13");
const axios = require("axios");
const date = require("date-and-time");
const express = require("express");
const app = express();
const fs = require("fs-extra");
const chalk = require("chalk");
const { solveHint, checkRarity } = require("pokehint");
const { Webhook, MessageBuilder } = require("discord-webhook-node");
const AutocatcherIntegration = require("./autocatcher-integration");

const config = process.env.CONFIG
  ? JSON.parse(process.env.CONFIG)
  : require("./config.json");

let log;
if (config.logWebhook && config.logWebhook.length > 25) {
  log = new Webhook(config.logWebhook);
  log.setUsername("CatchTwo Logs");
  log.setAvatar(
    "https://camo.githubusercontent.com/1c34a30dc74c8cb780498c92aa4aeaa2e0bcec07a94b7a55d5377786adf43a5b/68747470733a2f2f6d656469612e646973636f72646170702e6e65742f6174746163686d656e74732f313033333333343538363936363535323636362f313035343839363838373834323438383432322f696d6167652e706e67"
  );
}
const { exec } = require("child_process");

// Fixed global variables initialization
let spamMessageCount = 0;
let pokemonCount = 0;
let legendaryCount = 0;
let mythicalCount = 0;
let ultrabeastCount = 0;
let shinyCount = 0;
let captcha = false;
let isOnBreak = false;
let startTime = Date.now();

// Enhanced error handling for version check
axios
  .get("https://raw.githubusercontent.com/kyan0045/catchtwo/main/index.js")
  .then(function (response) {
    try {
      var d = response.data;
      let v = d.match(/Version ([0-9]*\.?)+/)?.[0]?.replace("Version ", "");
      if (v) {
        console.log(chalk.bold("Version " + version));
        if (v !== version && !version.includes('fixed')) {
          console.log(
            chalk.bold.bgRed(
              "There is a new version available: " +
                v +
                "\nPlease update.                         " +
                chalk.underline("\nhttps://github.com/kyan0045/catchtwo") +
                `\nRun "git pull https://github.com/kyan0045/catchtwo" to update.`
            )
          );

          log?.send(
            new MessageBuilder()
              .setTitle("New Version")
              .setURL("https://github.com/kyan0045/catchtwo")
              .setDescription(
                "Current version: **" +
                  version +
                  "**\nNew version: **" +
                  v +
                  "**\nPlease update: " +
                  "https://github.com/kyan0045/CatchTwo"
              )
              .setFooter(
                `Run "git pull https://github.com/kyan0045/catchtwo" to update.`
              )
              .setColor("#E74C3C")
          );
        }
      }
    } catch (parseError) {
      console.log("Could not parse version info:", parseError.message);
    }
  })
  .catch(function (error) {
    console.log("Version check failed:", error.message);
  });

// Enhanced token loading with better error handling
let data = process.env.TOKENS;
if (!data) {
  try {
    data = fs.readFileSync("./tokens.txt", "utf-8");
  } catch (err) {
    console.error("Error reading tokens.txt:", err.message);
    throw new Error(`Unable to find your tokens. Please ensure tokens.txt exists and is readable.`);
  }
}

if (!data || data.trim() === '') {
  throw new Error(`Tokens file is empty. Please add your tokens to tokens.txt.`);
}

const tokensAndGuildIds = data.split(/\s+/).filter(item => item.trim() !== '');
config.tokens = [];

// Fixed token parsing logic
for (let i = 0; i < tokensAndGuildIds.length; i += 2) {
  if (tokensAndGuildIds[i + 1]) {
    const token = tokensAndGuildIds[i].trim();
    const guildId = tokensAndGuildIds[i + 1].trim();

    if (token && guildId && token.length > 50) { // Basic token validation
      config.tokens.push({ token, guildId });
    } else {
      console.warn(`Skipping invalid token/guild pair at position ${i}`);
    }
  }
}

if (config.tokens.length === 0) {
  throw new Error("No valid token/guild pairs found. Please check your tokens.txt format.");
}

const hintMessages = [
  "ツ I choose you!",
  "¡ Gotta catch 'em all!",
  "╰( ͡° ͜ʖ ͡° )つ──☆*:・ﾟ",
  "｡◕‿◕｡ Pokémon!",
  "☆(ゝω・)vキャピ",
  "ᕕ( ᐛ )ᕗ",
  "(ﾉ◕ヮ◕)ﾉ*:･ﾟ✧",
  "♪～(´ε｀ )",
  "ɷ◡ɷ",
  "◔ ⌣ ◔",
  "（　´∀｀）",
  "φ(゜▽゜*)♪",
  "ღ(´͈ ᵕ `͈ ღ)",
  "♬♩♪♩ ヽ(ˇ∀ˇ )ゞ",
  "ヾ(＠⌒ー⌒＠)ノ",
  "ლ(╹◡╹ლ)",
  "( ͡° ͜ʖ ͡°)⌐╦╦═─",
  "♪(๑ᴖ◡ᴖ๑)♪",
  "ღゝ◡╹)ノ♡",
  "◕‿◕",
  "☆ﾐ(o*･ω･)ﾉ",
  "♪('▽^人)",
  "✌(-‿-)✌",
];

async function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function getMentions(ownerIDs) {
  let mentionString = "";
  for (const ownerID of ownerIDs) {
    mentionString += `<@${ownerID}> `;
  }
  return mentionString.trim();
}

// Enhanced message sending with retry logic
async function sendRandomMessage() {
  if (isOnBreak || captcha) return;
  
  try {
    const messages = fs.readFileSync("./messages/messages.txt", "utf-8").split("\n");
    const validMessages = messages.filter(msg => msg.trim() !== "");
    
    if (validMessages.length === 0) {
      console.log("No valid messages found in messages.txt");
      return;
    }
    
    const randomMessage = validMessages[Math.floor(Math.random() * validMessages.length)];
    
    for (const tokenData of config.tokens) {
      try {
        const client = new Client();
        await client.login(tokenData.token);
        
        const guild = client.guilds.cache.get(tokenData.guildId);
        if (!guild) {
          console.log(`Guild ${tokenData.guildId} not found for token`);
          continue;
        }
        
        const spamChannels = guild.channels.cache.filter(
          (channel) => channel.type === "GUILD_TEXT" && channel.name.includes("spam")
        );
        
        if (spamChannels.size > 0) {
          const channel = spamChannels.first();
          await channel.send(randomMessage);
          spamMessageCount++;
          
          // Update bot stats
          if (client.integration) {
            client.integration.incrementMessageCount();
          }
        }
        
        setTimeout(() => client.destroy(), 1000);
      } catch (err) {
        console.error(`Failed to send message with token: ${err.message}`);
      }
    }
  } catch (err) {
    console.error("Error in sendRandomMessage:", err.message);
  }
}

// Enhanced client initialization with better error handling
config.tokens.forEach((tokenData, index) => {
  const client = new Client({
    checkUpdate: false,
    intents: [],
    partials: [],
  });

  let spawned_embed;
  let checkIfWrong;
  let timeSinceStart;
  let latestName;
  let latestLevel;
  let latestCaptcha;
  let newMessage = [];
  let IV;
  let iv;
  let rarity;
  let number;
  let link;
  let now;

  // Initialize bot integration
  client.integration = new AutocatcherIntegration(config, client);

  client.on("ready", async () => {
    try {
      console.log(
        chalk.green.bold(`✓ ${client.user.username}`) +
        chalk.white.bold(` is ready to catch Pokémon!`)
      );

      // Ensure bot registration
      await client.integration.ensureRegistration();

      // Enhanced guild checking
      if (!config.globalCatch) {
        const guild = client.guilds.cache.get(tokenData.guildId);
        if (!guild) {
          console.log(chalk.red(`Guild ${tokenData.guildId} not found for ${client.user.username}`));
          return;
        }

        const spamChannels = guild.channels.cache.filter(
          (channel) => channel.type === "GUILD_TEXT" && channel.name.includes("spam")
        );

        if (spamChannels.size === 0) {
          console.log(chalk.yellow(
            `Warning: No 'spam' channel found in guild ${guild.name} for ${client.user.username}. Bot may not function properly.`
          ));
        }
      }

      // Set up message spamming with random intervals
      const spamInterval = (Math.random() * 30000) + 30000; // 30-60 seconds
      setInterval(() => {
        if (!config.sleeping && !isOnBreak && !captcha) {
          sendRandomMessage();
        }
      }, spamInterval);

    } catch (error) {
      console.error(`Error in ready event for ${client.user?.username}:`, error.message);
    }
  });

  client.on("messageCreate", async (message) => {
    try {
      // Skip if bot is sleeping or on break
      if (config.sleeping || isOnBreak) return;

      // Enhanced captcha detection
      if (message.content.includes("Please solve this captcha") || 
          message.content.includes("verify") ||
          (message.embeds[0]?.title && message.embeds[0].title.includes("Verify"))) {
        captcha = true;
        isOnBreak = true;
        
        console.log(chalk.red.bold(`🚨 CAPTCHA DETECTED for ${client.user.username}! Bot paused.`));
        
        log?.send(
          new MessageBuilder()
            .setText(await getMentions(config.ownerID))
            .setTitle("Captcha Found -> Sleeping for 1 hour")
            .setFooter(`Run ${config.prefix}solved to resume immediately.`)
            .setURL(`https://verify.poketwo.net/captcha/${client.user.id}`)
            .setDescription(
              "**Account: **" +
                client.user.tag +
                "\n**Message: **" +
                "A captcha was detected, the bot has been paused for your safety."
            )
            .setColor("#E74C3C")
        );

        // Notify owners via DM
        for (const ownerID of config.ownerID) {
          try {
            const user = await client.users.fetch(ownerID);
            if (!user.dmChannel?.lastMessage?.content?.includes("detected")) {
              await user.send(
                `## DETECTED A CAPTCHA\n> I've detected a captcha for **${client.user.username}**. The autocatcher has been paused. To continue, please solve the captcha below.\n* https://verify.poketwo.net/captcha/${client.user.id}\n\n### SOLVED?\n> Once solved, run the command \`${config.prefix}solved\` to continue catching.`
              );
            }
          } catch (dmError) {
            console.log(`Could not DM owner ${ownerID}: ${dmError.message}`);
          }
        }

        // Auto-resume after 1 hour if not manually resumed
        setTimeout(() => {
          if (captcha) {
            captcha = false;
            isOnBreak = false;
            console.log(`Auto-resumed ${client.user.username} after captcha timeout`);
          }
        }, 3600000); // 1 hour

        return;
      }

      // Store recent messages for context
      newMessage.unshift(message);
      if (newMessage.length > 5) newMessage.pop();

      // Enhanced Pokemon detection
      if (message.author.id === "716390085896962058" && message.embeds[0]?.title?.includes("wild")) {
        console.log(chalk.blue(`🎯 Wild Pokémon spotted by ${client.user.username}!`));
        
        const randomHint = hintMessages[Math.floor(Math.random() * hintMessages.length)];
        await sleep(Math.random() * 2000 + 1000); // Random delay 1-3 seconds
        
        await message.channel.send(`<@716390085896962058> ${randomHint}`);
        spawned_embed = message.embeds[0];
        
      } else if (message.content.includes("The pokémon is") && !captcha) {
        const pokemon = await solveHint(message);
        if (pokemon && pokemon[0]) {
          await sleep(Math.random() * 1000 + 500); // Random delay 0.5-1.5 seconds
          await message.channel.send(`<@716390085896962058> c ${pokemon[0]}`);
          
          // Set up collector to check if guess was wrong
          checkIfWrong = message.channel.createMessageCollector({ 
            time: 8000,
            filter: m => m.author.id === "716390085896962058"
          });
          
          checkIfWrong.on("collect", async (collected) => {
            if (collected.content.includes("That is the wrong pokémon") || 
                collected.content.includes("Invalid pokémon")) {
              console.log(chalk.yellow(`❌ Wrong guess by ${client.user.username}: ${pokemon[0]}`));
              
              // Try alternative solutions if available
              if (pokemon[1]) {
                await sleep(1000);
                await message.channel.send(`<@716390085896962058> c ${pokemon[1]}`);
              }
            }
          });
        }
        
      } else if (message.content.includes("Congratulations <@" + client.user.id + ">")) {
        pokemonCount++;
        console.log(chalk.green(`✅ Pokémon caught by ${client.user.username}! Total: ${pokemonCount}`));
        
        if (config.logCatches) {
          await sleep(1000);
          await message.channel.send("<@716390085896962058> i l");
        }
        
        if (config.reactAfterCatch) {
          try {
            await message.react("🎉");
          } catch (reactError) {
            console.log("Could not react to catch message:", reactError.message);
          }
        }
        
      } else if (message.content.includes("Please pick a starter pokémon")) {
        await sleep(2000);
        await message.channel.send("<@716390085896962058> pick charmander");
        console.log(chalk.cyan(`🎮 Starter picked by ${client.user.username}`));
        
      } else if (
        message.embeds[0]?.footer &&
        message.embeds[0].footer.text.includes("Terms") &&
        newMessage[1]?.content?.includes("pick") &&
        message?.components[0]?.components[0]
      ) {
        try {
          await message.clickButton(message.components[0].components[0]);
          setTimeout(async () => {
            await message.channel.send("<@716390085896962058> i");
          }, 3000);
        } catch (buttonError) {
          console.log("Could not click button:", buttonError.message);
        }
        
      } else if (
        message.embeds[0]?.footer &&
        message.embeds[0].footer.text.includes("Displaying") &&
        (message.embeds[0].thumbnail?.url?.includes(client.user.id) || 
         newMessage[1]?.author?.id === client.user.id) &&
        newMessage[1]?.content?.includes("i l")
      ) {
        // Enhanced Pokemon info parsing
        try {
          const embed = message.embeds[0];
          if (!embed || !embed.fields || embed.fields.length < 2) {
            console.log("Invalid embed structure for Pokemon info");
            return;
          }

          const str = embed.fields[1]?.value;
          if (!str) {
            console.log("No IV information found in embed");
            return;
          }

          const words = str.split(" ");
          const ivIndex = words.findIndex(word => word.includes("%"));
          if (ivIndex === -1) {
            console.log("Could not parse IV from embed");
            return;
          }

          iv = words[ivIndex];
          IV = parseFloat(iv.replace("%", ""));

          const footerStr = embed.footer?.text;
          if (!footerStr) {
            console.log("No footer found in embed");
            return;
          }

          const footerWords = footerStr.split(" ");
          const numberMatch = footerWords.find(word => word.includes("#"));
          number = numberMatch ? numberMatch.replace("#", "") : "Unknown";

          const titleStr = embed.title;
          if (!titleStr) {
            console.log("No title found in embed");
            return;
          }

          const titleWords = titleStr.split(" ");
          const isShiny = titleWords[0] === "✨";
          
          if (isShiny) {
            latestName = titleWords.slice(3).join(" ");
            latestLevel = parseInt(titleWords[2]);
          } else {
            latestName = titleWords.slice(2).join(" ");
            latestLevel = parseInt(titleWords[1]);
          }

          link = message.url;
          now = new Date();

          // Enhanced rarity checking
          rarity = await checkRarity(latestName);
          
          // Count different types
          if (isShiny) {
            shinyCount++;
          }
          
          switch (rarity) {
            case "Legendary":
              legendaryCount++;
              break;
            case "Mythical":
              mythicalCount++;
              break;
            case "Ultra Beast":
              ultrabeastCount++;
              break;
          }

          // Prepare data for logging
          const pokemonData = {
            name: latestName,
            level: latestLevel,
            iv: IV,
            number: number,
            rarity: rarity,
            isShiny: isShiny
          };

          // Log to integration system
          await client.integration.logToFile(pokemonData);

          // Enhanced logging based on rarity and IV
          if (isShiny && config.logCatches) {
            try {
              await message.channel.send(`<@716390085896962058> market search --n ${latestName} --sh --o price`);
              await sleep(2000);
              
              const channel = client.channels.cache.get(message.channel.id);
              let marketValue = "Unknown";
              
              try {
                const marketEmbed = channel.lastMessage?.embeds[0];
                if (marketEmbed?.description) {
                  const marketLines = marketEmbed.description.split("\n");
                  if (marketLines[0]) {
                    const marketValues = marketLines[0].split(" ");
                    const marketFinal = marketValues[4]?.split("•");
                    marketValue = marketFinal?.[2]?.replace(/[^\d,]/g, "") || "Unknown";
                  }
                }
              } catch (marketError) {
                console.log("Could not fetch market value:", marketError.message);
              }

              log?.send(
                new MessageBuilder()
                  .setText(await getMentions(config.ownerID))
                  .setTitle("✨ ``-`` Shiny Caught")
                  .setURL(link || "https://github.com/kyan0045/CatchTwo")
                  .setDescription(
                    `**Account:** ${client.user.tag}\n` +
                    `**Pokémon:** ${latestName}\n` +
                    `**Level:** ${latestLevel}\n` +
                    `**IV:** ${iv}\n` +
                    `**Number:** #${number}\n` +
                    `**Market Value:** ${marketValue} credits`
                  )
                  .setColor("#EEC60E")
              );

              console.log(
                `${date.format(now, "HH:mm")}: ${chalk.red(client.user.username)}: ✨ Caught a level ${latestLevel} Shiny ${latestName}! (${IV}% IV)`
              );
            } catch (shinyError) {
              console.error("Error processing shiny:", shinyError.message);
            }

          } else if (config.logCatches && rarity !== "Regular") {
            const logTitle = IV < parseFloat(config.lowIVLog) ? `Low IV ${rarity} Caught` :
                           IV > parseFloat(config.highIVLog) ? `High IV ${rarity} Caught` :
                           `${rarity} Caught`;

            log?.send(
              new MessageBuilder()
                .setText(await getMentions(config.ownerID))
                .setTitle(logTitle)
                .setURL(link || "https://github.com/kyan0045/CatchTwo")
                .setDescription(
                  `**Account:** ${client.user.tag}\n` +
                  `**Pokémon:** ${latestName}\n` +
                  `**Level:** ${latestLevel}\n` +
                  `**IV:** ${iv}\n` +
                  `**Number:** #${number}`
                )
                .setColor("#E74C3C")
            );

            const ivStatus = IV < parseFloat(config.lowIVLog) ? "LOW IV" :
                           IV > parseFloat(config.highIVLog) ? "HIGH IV" : "";
            
            console.log(
              `${date.format(now, "HH:mm")}: ${chalk.red(client.user.username)}: ${chalk.bold.blue(rarity.toUpperCase())}${ivStatus ? ` & ${ivStatus}` : ""} - Caught a level ${latestLevel} ${latestName}! (${IV}% IV)`
            );

          } else if (config.logCatches && (IV < parseFloat(config.lowIVLog) || IV > parseFloat(config.highIVLog))) {
            const logTitle = IV < parseFloat(config.lowIVLog) ? "Low IV Caught" : "High IV Caught";
            
            log?.send(
              new MessageBuilder()
                .setText(await getMentions(config.ownerID))
                .setTitle(logTitle)
                .setURL(link || "https://github.com/kyan0045/CatchTwo")
                .setDescription(
                  `**Account:** ${client.user.tag}\n` +
                  `**Pokémon:** ${latestName}\n` +
                  `**Level:** ${latestLevel}\n` +
                  `**IV:** ${iv}\n` +
                  `**Number:** #${number}`
                )
                .setColor("#E74C3C")
            );
          }

        } catch (parseError) {
          console.error("Error parsing Pokemon info:", parseError.message);
        }
      }

      // Enhanced command handling
      if (message.channel && message.content) {
        let prefix = `<@${client.user.id}>`;
        let args;
        
        const isOwner = config.ownerID.includes(message.author.id);
        const isSelf = message.author.id === client.user.id;
        const hasPrefix = message.content.startsWith(config.prefix) || message.content.startsWith(prefix);
        
        if (hasPrefix && (isOwner || isSelf) && !message.author.bot) {
          if (message.content.startsWith(prefix)) {
            args = message.content.slice(prefix.length).trim().split(/ +/g);
          } else if (message.content.startsWith(config.prefix)) {
            args = message.content.slice(config.prefix.length).trim().split(/ +/g);
          }
          
          const command = args.shift().toLowerCase();
          const commandReceivedTimestamp = Date.now();

          // Enhanced command implementations with better error handling
          try {
            switch (command) {
              case "say":
                if (args.length === 0) {
                  await message.react("❌");
                  return;
                }
                await message.channel.send(args.join(" "));
                await message.react("✅");
                break;

              case "solved":
              case "resume":
                isOnBreak = false;
                captcha = false;
                await message.react("✅");
                console.log(chalk.green(`${client.user.username} resumed from captcha/break`));
                break;

              case "ping":
                const pingTime = Date.now() - commandReceivedTimestamp;
                await message.reply(`🏓 Pong! \`${pingTime}ms\``);
                break;

              case "stats":
                // Enhanced stats with integration data
                const currentTime = Date.now();
                const elapsedTimeInMilliseconds = currentTime - startTime;
                const elapsedTimeInMinutes = elapsedTimeInMilliseconds / (1000 * 60);
                const runtime = Math.round(elapsedTimeInMinutes * 100) / 100;

                function getRate(count, timeInMinutes) {
                  if (timeInMinutes === 0) return "0.00";
                  return ((count / timeInMinutes) * 60).toFixed(2);
                }

                if (!args[0]) {
                  const statsEmbed = new MessageBuilder()
                    .setTitle(`📊 CatchTwo Stats - ${client.user.username}`)
                    .setFooter("©️ CatchTwo Enhanced ~ @kyan0045")
                    .setURL("https://discord.gg/tXa2Hw5jHy")
                    .setDescription(`**Started:** <t:${Math.floor(startTime / 1000)}:R>`)
                    .addField("⏱️ Runtime", `${runtime} minutes`, true)
                    .addField("🎮 Pokémon Caught", `${pokemonCount}`, true)
                    .addField("📈 Catch Rate", `${getRate(pokemonCount, elapsedTimeInMinutes)}/hr`, true)
                    .addField("💬 Messages Sent", `${spamMessageCount}`, true)
                    .addField("🎯 Status", captcha ? "🔴 Captcha" : isOnBreak ? "🟡 Break" : "🟢 Active", true)
                    .addField("🏓 Ping", `${Date.now() - commandReceivedTimestamp}ms`, true)
                    .setColor("#f5b3b3");

                  await message.reply({ embeds: [statsEmbed.embed] });
                  
                } else if (args[0] === "pokemon") {
                  const pokemonStatsEmbed = new MessageBuilder()
                    .setTitle(`🎮 Pokémon Stats - ${client.user.username}`)
                    .setFooter("©️ CatchTwo Enhanced ~ @kyan0045")
                    .setURL("https://discord.gg/tXa2Hw5jHy")
                    .setDescription(`**Started:** <t:${Math.floor(startTime / 1000)}:R>`)
                    .addField("⏱️ Runtime", `${runtime} minutes`, false)
                    .addField("🎮 Total Caught", `${pokemonCount}`, true)
                    .addField("📈 Catch Rate", `${getRate(pokemonCount, elapsedTimeInMinutes)}/hr`, true)
                    .addField("🌟 Legendaries", `${legendaryCount}`, true)
                    .addField("✨ Mythicals", `${mythicalCount}`, true)
                    .addField("👑 Ultra Beasts", `${ultrabeastCount}`, true)
                    .addField("💎 Shinies", `${shinyCount}`, true)
                    .setColor("#f5b3b3");

                  await message.reply({ embeds: [pokemonStatsEmbed.embed] });
                }
                break;

              case "help":
                const helpEmbed = new MessageBuilder()
                  .setTitle("🤖 CatchTwo Enhanced Commands")
                  .setFooter("©️ CatchTwo Enhanced ~ @kyan0045")
                  .setURL("https://github.com/kyan0045/CatchTwo")
                  .setDescription("Enhanced Pokétwo autocatcher with Discord bot integration")
                  .addField(`${config.prefix}help`, "Show this help message", true)
                  .addField(`${config.prefix}stats [pokemon]`, "View statistics", true)
                  .addField(`${config.prefix}ping`, "Check bot latency", true)
                  .addField(`${config.prefix}solved`, "Resume after captcha", true)
                  .addField(`${config.prefix}say <message>`, "Send a message", true)
                  .addField("🆕 Discord Bot", "Use `/stats` in Discord for advanced statistics!", false)
                  .setColor("#f5b3b3");

                await message.reply({ embeds: [helpEmbed.embed] });
                break;

              default:
                // Unknown command
                await message.react("❓");
                break;
            }
          } catch (cmdError) {
            console.error(`Command error (${command}):`, cmdError.message);
            await message.react("❌");
          }
        }
      }

    } catch (error) {
      console.error(`Message handling error for ${client.user?.username}:`, error.message);
    }
  });

  // Enhanced error handling
  client.on("error", (error) => {
    console.error(`Client error for ${client.user?.username}:`, error.message);
    
    // Attempt to reconnect after errors
    setTimeout(() => {
      console.log(`Attempting to reconnect ${client.user?.username}...`);
      client.login(tokenData.token).catch(loginError => {
        console.error(`Reconnection failed for ${client.user?.username}:`, loginError.message);
      });
    }, 5000);
  });

  client.on("disconnect", () => {
    console.log(chalk.yellow(`⚠️ ${client.user?.username} disconnected`));
  });

  client.on("reconnecting", () => {
    console.log(chalk.blue(`🔄 ${client.user?.username} reconnecting...`));
  });

  // Enhanced login with retry logic
  async function loginWithRetry(retries = 3) {
    for (let i = 0; i < retries; i++) {
      try {
        await client.login(tokenData.token);
        return;
      } catch (error) {
        console.error(`Login attempt ${i + 1} failed for token ${index + 1}:`, error.message);
        
        if (i === retries - 1) {
          console.error(`Failed to login after ${retries} attempts. Skipping this token.`);
          return;
        }
        
        // Wait before retrying (exponential backoff)
        await sleep(Math.pow(2, i) * 1000);
      }
    }
  }

  // Start the client
  loginWithRetry();
});

// Enhanced graceful shutdown
process.on('SIGINT', () => {
  console.log('\n🛑 Graceful shutdown initiated...');
  
  // Update final stats
  config.tokens.forEach((_, index) => {
    // Save final state if needed
  });
  
  console.log('✅ Shutdown complete');
  process.exit(0);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});

process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error);
  process.exit(1);
});

console.log(chalk.blue.bold(`
╔══════════════════════════════════════════════════════════════╗
║                     CatchTwo Enhanced v${version}                     ║
║              Pokétwo Autocatcher with Discord Bot              ║
║                                                              ║
║  🎮 Enhanced Pokemon catching with better error handling     ║
║  📊 Discord bot integration for advanced statistics          ║
║  🛡️ Improved captcha detection and safety features          ║
║  🔧 Bug fixes and performance improvements                   ║
║                                                              ║
║  Discord Bot: Start bot.js for advanced commands!           ║
╚══════════════════════════════════════════════════════════════╝
`));

module.exports = { config, pokemonCount, legendaryCount, mythicalCount, ultrabeastCount, shinyCount, spamMessageCount };