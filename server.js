const tmi = require('tmi.js');
const dotenv = require('dotenv');

dotenv.config();

let voteSkipCounter = 0;
let users = [];
const limit = Number.parseInt(process.env.LIMIT_TO_SKIP) || 5;
const prefix = process.env.PREFIX || "!";

const commands = [{
    name: "voteskip",
    exec: cmdVoteSkip,
    args: [
            {arg: "", requireModVip: false},
            {arg: "reset", requireModVip: true}
        ]
}]

const outputCommand = process.env.OUTPUT_COMMAND || "!skipsound";

const client = new tmi.Client({
    identity: {
        username: process.env.CLIENT_ID,
        password: process.env.OAUTH,
    },
    channels: [ process.env.CHANNEL_NAME ]
});

client.connect().catch(console.error);

function sleep (time) {
    return new Promise((resolve) => setTimeout(resolve, time));
}

function checkIsModOrVIPOrBroadCaster(tags){
    return tags.mod || tags.badges.vip || tags.badges.broadcaster;
}

function checkRequirePermission(tags, getArg){
    const noPermitMsg = `@${tags.username}, você não possui permissão para este comando!`;
    if(getArg.requireModVip && !(checkIsModOrVIPOrBroadCaster(tags))){
        return noPermitMsg;
    }
    return false;
}

function cmdVoteSkip(command, tags, args = []){
    let getArg = args.length === 0 ? command.args[0] : false;
    if(getArg) {
        const checkPermissions = checkRequirePermission(tags, getArg);
        if (checkPermissions){
            return checkPermissions;
        }
        if(users.includes(tags['user-id'])){
            return `@${tags.username} já está na lista de usuários da votação!`;
        }  else{
            if (voteSkipCounter < limit){
                users.push(tags['user-id']);
                voteSkipCounter++;
                return `@${tags.username} pediu para pular a música, ${voteSkipCounter}/${limit}!`;
            }  
            if (voteSkipCounter >= limit) {
                sleep(1500).then(() => {
                    users = [];
                    voteSkipCounter = 0;
                    return outputCommand;
                })
            }
        } 
    } else {
        getArg = command.args.find((arg) => arg.arg ===  args[0]);
        if (getArg) {
            const checkPermissions = checkRequirePermission(tags, getArg);
            if (checkPermissions){
                return checkPermissions;
            }
            users = [];
            voteSkipCounter = 0;
            return `@${tags.username} resetou o voteskip!`;
        } 
    }
    return false;
}

function treatCommand(channel, tags, message){
    const args = message.split(" ");
    const cmd = args.shift();
    const command = commands.filter((e) => e.name === cmd);

    if (command){
        const msg = command[0].exec(command[0], tags, args);
        if (msg){
            client.say(channel, msg);
        }
    }
}

client.on('message', (channel, tags, message, self) => {
    if(self) return;
    if(message.startsWith(prefix)){
        treatCommand(channel, tags, message.toLowerCase().slice(1));
    }
});
