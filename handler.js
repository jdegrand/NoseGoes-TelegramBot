const rp = require('request-promise');
const TELEGRAM_TOKEN = '__TELEGRAM_BOT_TOKEN__';

var noses = false;

var chats = new Map();

const nose = "👃"
const goes = "👈"
const right_hand_violation = "👉"
const modifiers = [
    '\u{1f3fb}', // skin type 1-2
    '\u{1f3fc}', // skin type 3
    '\u{1f3fd}', // skin type 4
    '\u{1f3fe}', // skin type 5
    '\u{1f3ff}', // skin type 6
];

async function sendToUser(chat_id, text) {
    const options = {
method: 'GET',
        uri: `https://api.telegram.org/bot${TELEGRAM_TOKEN}/sendMessage`,
        qs: {
            chat_id,
            text
        }
    };

    return rp(options);
}

function addToGame(chat_id, username, user_id, hasUsername) {
    if (chats.has(chat_id)) {
        var chat_members = chats.get(chat_id).members;
        chat_members.forEach((element) => {
                if (hasUsername) {
                    if (element.hasUsername) {
                        if (username == element.username) {
                            return;
                        }
                    }
                } else {
                    if (!element.hasUsername) {
                        if (user_id == element.id) {
                            return;
                        }
                    }
                }
            });
        chat_members.push({username: username, id: user_id, hasUsername: hasUsername});
    } else {
        chats.set(chat_id, {members: [{username: username, id: user_id, hasUsername: hasUsername}]});
    }
}

function removeUser(chat_id, username, hasUsername) {
    chats.get(chat_id).members.forEach((element, index, object) => {
        if (hasUsername) {
            if (element.username == username) {
                object.splice(index, 1);
                return;
            }
        } else {
            if (element.id == username) {
                object.splice(index, 1);
                return;
            }
        }
    });
}

function endGame(chat_id) {
    var user = chats.get(chat_id).members[0];
    var username = "";
    if (user.hasUsername) {
        username = "@" + user.username;
    } else {
        username = "[" + user.username + "](tg://user?id=" + user.id + ")";
    }
    return username;
}

module.exports.nosegoesbot = async event => {
    const body = JSON.parse(event.body);
    
    if (!body.message) {
        return { statusCode: 200 };
    }

    const {chat, text, from, entities} = body.message;

    if (text) {
        if (text.includes("noses")) {
            noses = true;
            var are_players = false;
            if (!entities) {
                await sendToUser(chat.id, "You have to @ some people!");
            } else { 
                if (chats.has(chat.id)) {
                    chats.delete(chat.id);
                }
                entities.forEach((element) => {
                        if (element.type == "mention") {
                            are_players = true;
                            var split_string = text.substring(element.offset + 1).split(" ");
                            addToGame(chat.id, split_string[0], 0, true);
                        } else if (element.type == "text_mention") {
                            are_players = true;
                            addToGame(chat.id, element.user.first_name, element.user.id, false);
                        }
                });
                if (are_players) {
                    if (from.username) {
                        addToGame(chat.id, from.username, from.id, true);
                    } else {
                        addToGame(chat.id, from.first_name, from.id, false);
                    }
                    var sendBack = "Nose goes!";
                    chats.get(chat.id).members.forEach((element) => {
                        if (element.hasUsername) {
                            sendBack = sendBack + " @" + element.username;
                        } else {
                            sendBack = sendBack + " [" + element.username + "](tg://user?id=" + element.id + ")";
                        }
                    });
                    await sendToUser(chat.id, sendBack);
                } else {
                    await sendToUser(chat.id, "You have to @ some people!");
                }
            }
            return { statusCode: 200 }; 
        } else if (chats.has(chat.id)) {
            var nose_flag = false;
            var goes_flag = false;
            var right_hand_flag = false;
            text_stripped = text.replace(/\s+/g, '');
            for (const ch of text_stripped) {
                if (!modifiers.includes(ch)) {
                    if (right_hand_flag) {
                        if (ch == nose) {
                            if (from.username) {
                                await sendToUser(chat.id, "Right hand violation! You lose @" + from.username);
                            } else {
                                await sendToUser(chat.id, "Right hand violation! You lose [" + from.username + "](tg://user?id=" + from.id + ")");
                            }
                            chats.delete(chat.id);
                            return { statusCode: 200 };
                        } else {
                            return { statusCode: 200 };
                        }
                    } else if (!nose_flag) {
                        if(ch == nose) {
                            nose_flag = true;
                        } else if (ch == right_hand_violation) {
                            right_hand_flag = true;
                        } else {
                            return { statusCode: 200 };
                        }
                    } else if (!goes_flag) {
                        if (ch == goes) {
                            goes_flag = true;
                            if (from.username) {
                                removeUser(chat.id, from.username, true);
                            } else {
                                removeUser(chat.id, from.id, false);
                            }

                            if (chats.get(chat.id).members.length == 1) {
                                var losingUser = endGame(chat.id);
                                await sendToUser(chat.id, "You lose! " + losingUser);
                                chats.delete(chat.id);
                            }
                            return { statusCode: 200 };
                        } else {
                            return { statusCode: 200 };
                        }
                    }
                }
            }
            return { statusCode: 200 };
        }
        return { statusCode: 200 };
    }
    return { statusCode: 200 };
};
