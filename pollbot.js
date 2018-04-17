const auth = require("./auth")

const Discord = require("discord.js");
const bot = new Discord.Client();

const prefix = "\/\/";
var polls = {};

function parseVote(msg) {
    let notVoted = true;
    polls[msg.guild.id].voted.forEach(user => {
        notVoted = (notVoted && user !== msg.author.id);
    });
    if(!notVoted) return false;
    let num = msg.cleanContent.replace("\/\/", "");
    if(!num.match(/^\d+$/)) return false;
    if(parseInt(num)-1 < 0) return false;
    polls[msg.guild.id].count[num-1]++;
    polls[msg.guild.id].voted.push(msg.author.id);
    msg.channel.send("Ding!");
    console.log(polls[msg.guild.id].count);

}
function startPoll(msg, title, options = []) {
    polls[msg.guild.id] = {
        title: title,
        listening: true,
        options: [],
        count: [],
        voted: []
    };
    options.forEach(o => {
        polls[msg.guild.id].options.push(o);
        polls[msg.guild.id].count.push(0);
    });
    let e = new Discord.RichEmbed();
    let eDesc = "";
    options.forEach((o, i) => {
        eDesc += `[${i+1}] ${o}\n`;
    });
    e.setTitle(title).setDescription("\`\`\`" + eDesc + "\`\`\`").setFooter("Vote with //#");
    msg.channel.send({embed: e});
}
function stopPoll(msg) {
    polls[msg.guild.id].listening = false;
    let e = new Discord.RichEmbed();
    let eDesc = "";
    polls[msg.guild.id].options.forEach((o, i) => {
        eDesc += `[${o}] ${polls[msg.guild.id].count[i]}\n`;
    });
    let winner = [0,0];
    polls[msg.guild.id].count.forEach((o, i) => {
        if(o > winner[1]) winner = [i, o];
    });
    e.setTitle("Poll results for [" + polls[msg.guild.id].title + "]").setDescription(eDesc).addField("Winner", polls[msg.guild.id].options[winner[0]]);
    msg.channel.send({embed: e});
}

bot.on("guildCreate", g => {
    g.owner.send(`Hey! Thanks for inviting me to your server. People with the permission to view the audit log (\`VIEW_AUDIT_LOG\`) can start votes with:\`\`\`${prefix}start topic:[your poll topic] 1:[option 1] 2:[option 2] 3:[option 3]...\`\`\`These parameters can be used in any order.\nYou can also cancel the current poll with:\`\`\`${prefix}stop\`\`\`Have fun!`);
});
bot.on("message", msg => {
    if(msg.channel.type !== "text") return;
    if(!msg.cleanContent.startsWith(prefix)) return;

    let err = false;
    let cmd = msg.cleanContent.trim().slice(prefix.length);
    if(msg.guild.member(msg.author.id).hasPermission("VIEW_AUDIT_LOG") && cmd.includes("start")) {
        let params = cmd.match(/\w+:(|\s)\[.*?\]/g);
        let title = "";
        let options = [];
        params.forEach(prop => {
            let param = prop.replace(/:(|\s)\[.*?\]/g, "");
            let arg = prop.replace(/^\w+:(|\s)\[|\]$/g, "");
            if(param === "title" && !title) title = arg;
            if(!isNaN(param)) options.push(arg);
        });
        if(!title || !options) err = true;
        else startPoll(msg, title, options);
    }
    else if(msg.guild.member(msg.author.id).hasPermission("VIEW_AUDIT_LOG") && cmd.includes("stop")) {
        stopPoll(msg);
        console.log("stopped poll");
    }
    else if(msg.guild.member(msg.author.id).hasPermission("VIEW_AUDIT_LOG") && cmd.includes("status")) {
        let active = "No poll currently active.";
        if(polls[msg.guild.id])
            if(polls[msg.guild.id].listening)
                active = "Poll active: "+polls[msg.guild.id].title;
        let e = new Discord.RichEmbed();
        e.setTitle("Poll Status").setDescription(active);
        if(active.startsWith("Poll active")) {
            let total = 0;
            polls[msg.guild.id].count.forEach(v => {
                total += v;
            });
            let percentages = [];
            polls[msg.guild.id].count.forEach(v => {
                percentages.push(Math.round(v/total*10));
            });
            let graph =  "```Perl";
            for(let layer = 0; layer < 10; layer++) {
                percentages.forEach(p => {
                    if(p > 9-layer) graph += "█ ";
                    else if(p == 0 && layer == 9) graph += "_ ";
                    else graph += "  ";
                });
                graph += "\n";
            }
            percentages.forEach((p, i) => {
                graph += i+1 + " ";
            });
            graph += "```";
            e.addField("Votes", graph);
        }
    }
    else if(polls[msg.guild.id])
        if(polls[msg.guild.id].listening)
            parseVote(msg);
        else err = true;
    else err = true;
    if(err) msg.channel.send(`\`${cmd}\` is either not a valid command or has been used incorrectly.`);
});

bot.login(auth.TOKEN);
