const tmi = require('tmi.js');
const dotenv = require('dotenv');

dotenv.config();

const client = new tmi.Client({
	options: { debug: true },
	identity: {
		username: process.env.CLIENT_ID,
		password: process.env.OAUTH,
	},
	channels: [ process.env.CHANNEL_NAME ]
});
client.connect().catch(console.error);

let voteskip = 0;
let usuarios = [];
const limite = 5;

const outputCommand = process.env.OUTPUT_COMMAND;

function sleep (time) {
    return new Promise((resolve) => setTimeout(resolve, time));
}

client.on('message', (channel, tags, message, self) => {
	if(self) return;
    if(message.toLowerCase() === '!voteskip') {
        if(usuarios.includes(tags['user-id'])){
            client.say(channel, `@${tags.username} já está na lista de usuários da votação!`);
        }  else{
            if (voteskip < limite){
                usuarios.push(tags['user-id']);
                voteskip++;
                client.say(channel, `@${tags.username} pediu para pular a música, ${voteskip}/${limite} !`)
            }  
            if (voteskip >= limite) {
                sleep(1500).then(() => {
                    client.say(channel, outputCommand);
                    usuarios = [];
                    voteskip = 0;
                })
            }
        } 
    } else if (message.toLowerCase() === '!voteskip reset') {
        if(!(tags.badges.vip || tags.mod)){
            client.say(channel, `@${tags.username}, você não possui permissão para este comando!`);
        } else{
            usuarios = [];
            voteskip = 0;
            client.say(channel, `@${tags.username} resetou o voteskip!`);
        }
    }
});

