/**
 * @typedef {import("discord.js").TextChannel} DiscordJs.TextChannel
 * @typedef {import("discord.js").User} DiscordJs.User
 */

const Azure = require("./azure"),
    Exception = require("./exception"),
    settings = require("./settings"),
    Warning = require("./warning");

/**
 * @type {typeof import("./discord")}
 */
let Discord;

setTimeout(() => {
    Discord = require("./discord");
}, 0);

//   ###                                          #
//  #   #                                         #
//  #       ###   ## #   ## #    ###   # ##    ## #   ###
//  #      #   #  # # #  # # #      #  ##  #  #  ##  #
//  #      #   #  # # #  # # #   ####  #   #  #   #   ###
//  #   #  #   #  # # #  # # #  #   #  #   #  #  ##      #
//   ###    ###   #   #  #   #   ####  #   #   ## #  ####
/**
 * A class that handles commands given by chat.
 */
class Commands {
    //  ###    ##   ###   # #    ##   ###    ###
    // ##     # ##  #  #  # #   # ##  #  #  ##
    //   ##   ##    #     # #   ##    #       ##
    // ###     ##   #      #     ##   #     ###
    /**
     * Gets the current list of servers and their status.
     * @param {DiscordJs.User} user The user initiating the command.
     * @param {DiscordJs.TextChannel} channel The channel the message was sent over.
     * @param {string} message The text of the command.
     * @returns {Promise<boolean>} A promise that resolves with whether the command completed successfully.
     */
    async servers(user, channel, message) {
        if (message) {
            return false;
        }

        const msg = Discord.richEmbed({
            title: "Overload Azure Server Status",
            fields: []
        });

        const offline = [],
            online = [];

        Object.keys(settings.servers).sort().forEach((region) => {
            const server = settings.servers[region];

            if (server.started) {
                online.push(region);
            } else {
                offline.push(region);
            }
        });

        if (offline.length > 0) {
            msg.addField("Offline Servers - Use `!start <region>` to start a server.", offline.join("\n"));
        }

        if (online.length > 0) {
            msg.addField("Online Servers - Use `!extend <region>` to extend the server's shutdown time.", online.map((r) => `${r} - ${settings.servers[r].ipAddress}`).join("\n"));
        }

        await Discord.richQueue(msg, channel);
        return true;
    }

    //         #                 #
    //         #                 #
    //  ###   ###    ###  ###   ###
    // ##      #    #  #  #  #   #
    //   ##    #    # ##  #      #
    // ###      ##   # #  #       ##
    /**
     * Starts the server in the requested region.
     * @param {DiscordJs.User} user The user initiating the command.
     * @param {DiscordJs.TextChannel} channel The channel the message was sent over.
     * @param {string} message The text of the command.
     * @returns {Promise<boolean>} A promise that resolves with whether the command completed successfully.
     */
    async start(user, channel, message) {
        if (!message) {
            return false;
        }

        message = message.toLowerCase();

        if (!settings.servers[message]) {
            await Discord.queue(`Sorry, ${user}, but this is not a valid server.  Use the \`!servers\` command to see the list of servers.`, channel);
            throw new Warning("Server does not exist.");
        }

        if (settings.servers[message].started) {
            await Discord.queue(`Sorry, ${user}, but this server is already running.  Did you mean to \`!extend ${message}\` instead?`, channel);
            throw new Warning("Server already started.");
        }

        try {
            await Azure.start(settings.servers[message]);
        } catch (err) {
            await Discord.queue(`Sorry, ${user}, but there was an error starting the server.  An admin has been notified.`, channel);
            throw new Exception("Error starting server.", err);
        }

        settings.servers[message].started = true;
        settings.servers[message].warningTimeout = setTimeout(async () => {
            await Discord.queue(`The ${message} server will automatically shut down in 20 minutes.  Issue the \`!extend ${message}\` command to reset the shutdown timer to an hour.`, channel);
        }, 2400000);
        settings.servers[message].timeout = setTimeout(async () => {
            Azure.stop(settings.servers[message]);
            settings.servers[message].started = false;
            await Discord.queue(`The ${message} server is being shutdown.  Thanks for playing!`, channel);
        }, 3600000);

        await Discord.queue(`${user}, the ${message} server has been started at **${settings.servers[message].ipAddress}** and should be available in a couple of minutes.  The server will automatically shut down in one hour unless you issue the \`!extend ${message}\` command.`, channel);
        return true;
    }

    //              #                   #
    //              #                   #
    //  ##   #  #  ###    ##   ###    ###
    // # ##   ##    #    # ##  #  #  #  #
    // ##     ##    #    ##    #  #  #  #
    //  ##   #  #    ##   ##   #  #   ###
    /**
     * Extends a server in the requested region.
     * @param {DiscordJs.User} user The user initiating the command.
     * @param {DiscordJs.TextChannel} channel The channel the message was sent over.
     * @param {string} message The text of the command.
     * @returns {Promise<boolean>} A promise that resolves with whether the command completed successfully.
     */
    async extend(user, channel, message) {
        if (!message) {
            return false;
        }

        message = message.toLowerCase();

        if (!settings.servers[message]) {
            await Discord.queue(`Sorry, ${user}, but this is not a valid server.  Use the \`!servers\` command to see the list of servers.`, channel);
            throw new Warning("Server does not exist.");
        }

        if (!settings.servers[message].started) {
            await Discord.queue(`Sorry, ${user}, but this server is not running.  Did you mean to \`!start ${message}\` instead?`, channel);
            throw new Warning("Server not started.");
        }

        settings.servers[message].started = true;
        clearTimeout(settings.servers[message].warningTimeout);
        clearTimeout(settings.servers[message].timeout);
        settings.servers[message].warningTimeout = setTimeout(async () => {
            await Discord.queue(`The ${message} server will automatically shut down in 20 minutes.  Issue the \`!extend ${message}\` command to reset the shutdown timer to an hour.`, channel);
        }, 2400000);
        settings.servers[message].timeout = setTimeout(async () => {
            Azure.stop(settings.servers[message]);
            settings.servers[message].started = false;
            await Discord.queue(`The ${message} server is being shutdown.  Thanks for playing!`, channel);
        }, 3600000);

        await Discord.queue(`${user}, the ${message} server has been extended.  The server will automatically shut down in one hour unless you issue the \`!extend ${message}\` command.`, channel);
        return true;
    }
}

module.exports = Commands;
