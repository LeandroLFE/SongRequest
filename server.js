const tmi = require('tmi.js');
const dotenv = require('dotenv');

dotenv.config();

let voteSkipCounter = 0;
let users = [];

let cooldownCounter = 0;
let cooldownOn = false;
let startCooldown = new Date();
let durationCooldown = 0;
let endCooldown = new Date();

let threadCooldown = 0;
let songCounter = 1;

const cooldownTimeInSeconds = 120;

const limit = Number.parseInt(process.env.LIMIT_TO_SKIP) || 5;
const prefix = process.env.PREFIX || "!";

const commands = [{
    name: "voteskip",
    exec: cmdVoteSkip,
    args: [
            {arg: "", requireModVip: false, cooldown: cooldownTimeInSeconds*1000},
            {arg: "reset", requireModVip: true, cooldown: cooldownTimeInSeconds*1000}
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

function sleep (time, thread_count, counter) {
    return new Promise((resolve) => {
        return setTimeout(resolve.bind(null, [thread_count, counter]), time)
    });
}

function checkIsModOrVIPOrBroadCaster(tags){
    return tags.mod || tags.badges.vip || tags.badges.broadcaster;
}

Date.prototype.addSeconds = function(seconds) {
    const date = new Date(this.valueOf());
    date.setSeconds(date.getSeconds() + seconds);
    return date;
}

Date.prototype.untilInSeconds = function(otherDate) {
    return Number.parseInt((otherDate.getTime() - this.getTime()) / 1000);
}

function checkRequirePermission(tags, getArg){
    const noPermitMsg = `@${tags.username}, você não possui permissão para este comando!`;
    if(getArg.requireModVip && !(checkIsModOrVIPOrBroadCaster(tags))){
        return noPermitMsg;
    }
    return false;
}

function executeCooldown(){
    startCooldown = new Date(Date.now());
    threadCooldown++;
    if(!cooldownOn && cooldownCounter > 0){
        sleep(cooldownCounter, threadCooldown, songCounter).then((args) => {
            const thread_count = args[0]; 
            const counter = args[1];
            if(songCounter === counter && thread_count >= threadCooldown && threadCooldown !== 0){
                cooldownCounter = 0;
                cooldownOn = false;
                threadCooldown = 0;
                songCounter++;
                voteSkipCounter = 0;
            }
        })
        console.log(`Thread count: ${threadCooldown}`);
        endCooldown = startCooldown.addSeconds(cooldownTimeInSeconds);
        cooldownOn = true;
    } else if (cooldownCounter > 0){
        durationCooldown = startCooldown.untilInSeconds(endCooldown);
        console.log(`Em cooldown, aguarde ${durationCooldown}s`);
    }
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
                cooldownCounter = getArg.cooldown;
                cooldownOn = false;
                return `@${tags.username} pediu para pular a música, ${voteSkipCounter}/${limit}!`;
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
        if(voteSkipCounter > 0){
            executeCooldown()
        }
        if (msg){
            client.say(channel, msg);
        }
        if (cmd === 'voteskip' && voteSkipCounter >= limit) {
            sleep(1500).then(() => {
                users = [];
                cooldownCounter = 0;
                threadCooldown = 0;
                songCounter++;
                voteSkipCounter = 0;
                client.say(channel, outputCommand);
            })
        }
    }
}

client.on('message', (channel, tags, message, self) => {
    if(self) return;
    if(message.startsWith(prefix)){
        treatCommand(channel, tags, message.toLowerCase().slice(1))
    }
});
