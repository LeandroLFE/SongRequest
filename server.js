const tmi = require('tmi.js');
const dotenv = require('dotenv');

dotenv.config();

let voteskip = 0;
let users = [];
const limit = Number.parseInt(process.env.LIMIT_TO_SKIP) || 5;
const prefix = process.env.PREFIX || "!";

const client = new tmi.Client({
    identity: {
        username: process.env.CLIENT_ID,
        password: process.env.OAUTH,
    },
    channels: [ process.env.CHANNEL_NAME ]
});
client.connect().catch(console.error);

const outputCommand = process.env.OUTPUT_COMMAND;

function sleep (time) {
    return new Promise((resolve) => setTimeout(resolve, time));
}

client.on('message', (channel, tags, message, self) => {
    if(self) return;
    if(message.toLowerCase() === '!voteskip') {
        if(users.includes(tags['user-id'])){
            client.say(channel, `@${tags.username} já está na lista de usuários da votação!`);
        }  else{
            if (voteskip < limit){
                users.push(tags['user-id']);
                voteskip++;
                client.say(channel, `@${tags.username} pediu para pular a música, ${voteskip}/${limit} !`)
            }  
            if (voteskip >= limit) {
                sleep(1500).then(() => {
                    client.say(channel, outputCommand);
                    users = [];
                    voteskip = 0;
                })
            }
        } 
    } else if (message.toLowerCase() === '!voteskip reset') {
        if(!(tags.badges.vip || tags.mod)){
            client.say(channel, `@${tags.username}, você não possui permissão para este comando!`);
        } else{
            users = [];
            voteskip = 0;
            client.say(channel, `@${tags.username} resetou o voteskip!`);
        }
    }
});
