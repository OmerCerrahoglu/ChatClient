const { MongoClient } = require('mongodb')
const { WebSocketServer } = require('ws')
const { INCOMING_MESSAGE_TYPES, OUTGOING_MESSAGE_TYPES, get_random_int } = require('./utils.js')

const mongo_url = 'mongodb://localhost:27017'

let mongo_db
let user_db
let chat_db

const mongo_db_name = 'chat_client'

MongoClient.connect(mongo_url, (err, database) => {
    mongo_db = database.db(mongo_db_name)
    user_db = mongo_db.collection('users')
    chat_db = mongo_db.collection('chats')

    console.log('Connected to db')

    start_server()
})

let wss

function start_server() {
    wss = new WebSocketServer({ port: 6969 })

    wss.on('connection', on_connect)
}

let username_to_ws = {}
let ws_to_username = {}

function on_connect(ws) {
    ws.id = get_random_int()

    ws.on('message', data => {
        on_message(ws, JSON.parse(data.toString()))
    })

    console.log("New client connected")
}

function on_message(ws, message) {
    console.log(message, ws_to_username[ws.id])
    switch (message.type) {
        case OUTGOING_MESSAGE_TYPES.LOGIN:
            handle_login(ws, message)
            break
        case OUTGOING_MESSAGE_TYPES.CREATE_ACCOUNT:
            handle_create_account(ws, message)
            break
        case OUTGOING_MESSAGE_TYPES.MESSAGE:
            handle_message(ws, message)
            break
        case OUTGOING_MESSAGE_TYPES.FETCH_CHAT:
            handle_fetch_chat(ws, message)
            break
    }
}

async function handle_login(ws, message) {
    username = message.username
    
    console.log('User trying to login', username)

    found_users = await user_db.find({ username }).toArray()

    if (found_users.length == 0) {
        send_control(ws, INCOMING_MESSAGE_TYPES.INVALID_USERNAME)
        return
    }

    username_to_ws[username] = ws
    ws_to_username[ws.id] = username

    send_control(ws, INCOMING_MESSAGE_TYPES.SUCCESSFUL_LOGIN)
}

async function handle_create_account(ws, message) {
    username = message.username
    
    found_users = await user_db.find({ username }).toArray()

    if (found_users.length > 0) {
        send_control(ws, INCOMING_MESSAGE_TYPES.DUPLICATE_USERNAME)
        return
    }

    user_db.insertOne({ username })

    username_to_ws[username] = ws
    ws_to_username[ws.id] = username

    send_control(ws, INCOMING_MESSAGE_TYPES.SUCCESSFUL_CREATE_ACCOUNT)
}

async function handle_message(ws, message) {
    console.log(ws_to_username)
    from = ws_to_username[ws.id]

    console.log('Received message from', from, 'to', message.to, 'message', message)

    await chat_db.insertOne({ from: from, to: message.to, message: message.message, timestamp: Date.now() })

    if (message.to in username_to_ws) {
        send_message(username_to_ws[message.to], INCOMING_MESSAGE_TYPES.MESSAGE, from, message.message)
    }
}

async function handle_fetch_chat(ws, message) {
    from = ws_to_username[ws.id]
    to = message.username

    found_users = await user_db.find({ username: to }).toArray()

    if (found_users.length == 0) {
        send_control(ws, INCOMING_MESSAGE_TYPES.INVALID_USERNAME)
        return
    }

    from_to_to = await chat_db.find({ from, to }).toArray()
    to_to_from = await chat_db.find({ from: to, to: from }).toArray()


    // TODO(omer) fix
    send_chat_history(ws,
                      INCOMING_MESSAGE_TYPES.CHAT_HISTORY,
                      from_to_to.concat(to_to_from)
                                .sort((m1, m2) => { return m1.timestamp - m2.timestamp })
                                .map(m => { return { from: m.from, to: m.to, payload: m.message } }))
}

function send_control(ws, type, payload = '') {
    ws.send(JSON.stringify({ type, payload }))
}

function send_message(ws, type, from, message) {
    ws.send(JSON.stringify({ type, from, message }))
}

function send_chat_history(ws, type, messages) {
    ws.send(JSON.stringify({ type, messages }))
}
