const readline = require('readline')
const { WebSocket } = require('ws')
const { INCOMING_MESSAGE_TYPES, OUTGOING_MESSAGE_TYPES } = require('./utils.js') 

const STATE = {
    NONE: '0',
    STARTUP: '1',
    LOGIN: '2',
    CREATE_ACCOUNT: '3',
    SELECT_CHAT: '4',
    IN_CHAT: '5'
}

let state = { state: STATE.NONE, waiting_timeout: false, my_username: null, contact: null }

const io = readline.createInterface({
    input: process.stdin,
    output: process.stdout
})

const ws = new WebSocket('ws://0.0.0.0:6969/')

ws.on('open', on_open)

ws.on('message', data => {
   handle_message(JSON.parse(data.toString())) 
})

function on_open() {
    prompt_startup()
}

function prompt_startup() {
    state.state = STATE.STARTUP
    io.question('Type 1 for login, 2 for creating a new account\n', answer => {
        if (answer == 1) {
            prompt_login()
        } else if (answer == 2) {
            prompt_create_account()
        } else {
            prompt_startup()
        }
    })
}

function prompt_login() {
    state.state = STATE.LOGIN

    io.question('Please enter your username\n', username => {
        state.username = username
        state.waiting_timeout = true
        send_control_message(OUTGOING_MESSAGE_TYPES.LOGIN, username)

        setTimeout(() => {
            handle_message({ type: INCOMING_MESSAGE_TYPES.TIMEOUT, payload: '' })
        }, 500)
    })
}

function prompt_create_account() {
    state.state = STATE.CREATE_ACCOUNT

    io.question('Please enter the username you want\n', username => {
        state.username = username
        state.waiting_timeout = true
        send_control_message(OUTGOING_MESSAGE_TYPES.CREATE_ACCOUNT, username)

        setTimeout(() => {
            handle_message({ type: INCOMING_MESSAGE_TYPES.TIMEOUT, payload: '' })
        }, 500)
    })
}

function prompt_select_chat() {
    state.state = STATE.SELECT_CHAT

    io.question('Please enter the user you would like to chat with\n', username => {
        state.waiting_timeout = true
        state.contact = username
        send_control_message(OUTGOING_MESSAGE_TYPES.FETCH_CHAT, username)

        setTimeout(() => {
            handle_message({ type: INCOMING_MESSAGE_TYPES.TIMEOUT, payload: '' })
        }, 500)
    })
}

function prompt_write_message() {
    state.state = STATE.IN_CHAT
    io.question('', message => {
        if (message == '\\quit') {
            prompt_select_chat()
            return
        }
        
        send_user_message(OUTGOING_MESSAGE_TYPES.MESSAGE, message)

        prompt_write_message()
    })
}

function handle_message(message) {
    if (message.type != INCOMING_MESSAGE_TYPES.TIMEOUT) {
        state.waiting_timeout = false
    }

    switch (message.type) {
        case INCOMING_MESSAGE_TYPES.INVALID_USERNAME:
            handle_invalid_username(message)
            break
        case INCOMING_MESSAGE_TYPES.DUPLICATE_USERNAME:
            handle_duplicate_username(message)
            break
        case INCOMING_MESSAGE_TYPES.MESSAGE:
            handle_user_message(message)
            break
        case INCOMING_MESSAGE_TYPES.TIMEOUT:
            handle_timeout(message)
            break
        case INCOMING_MESSAGE_TYPES.SUCCESSFUL_LOGIN:
            handle_successful_login(message)
            break
        case INCOMING_MESSAGE_TYPES.SUCCESSFUL_CREATE_ACCOUNT:
            handle_successful_create_account(message)
            break
        case INCOMING_MESSAGE_TYPES.CHAT_HISTORY:
            handle_chat_history(message)
            break
    }

}

function handle_user_message(message) {
    if (state.state == STATE.IN_CHAT && message.from == state.contact) {
        console.log(message.from, ':', message.message)
    }
}

function handle_invalid_username(message) {
    if (state.state == STATE.CREATE_ACCOUNT) {
        console.log('This username is not valid, pleasy select another username.')
        prompt_create_account()
    } else if (state.state == STATE.LOGIN) {
        console.log('This username is not valid; please check spelling and try again.')
        prompt_login()
    } else if (state.state == STATE.SELECT_CHAT) {
        console.log('There is no such user; please check spelling and try again.')
        prompt_select_chat()
    }
}

function handle_duplicate_username(message) {
    if (state.state == STATE.CREATE_ACCOUNT) {
        console.log('This username has already been taken, please choose another username.')
        prompt_create_account()
    }
}

function handle_timeout(message) {
    if (!state.waiting_timeout) {
        return
    }
    
    if (state.state == STATE.CREATE_ACCOUNT ||
        state.state == STATE.LOGIN ||
        state.state == STATE.SELECT_CHAT) {
        console.log('Server timed out, please try again.')
        if (state.state == STATE.CREATE_ACCOUNT) {
            prompt_create_account()
        } else if (state.state == STATE.LOGIN) {
            prompt_login()
        } else if (state.state == STATE.SELECT_CHAT) {
            prompt_select_chat()
        }
    }
}

function handle_successful_login(message) {
    if (state.state == STATE.LOGIN) {
        console.log('Login successful.')
        prompt_select_chat()
    }
}

function handle_successful_create_account(message) {
    if (state.state == STATE.CREATE_ACCOUNT) {
        console.log('Account successfully created.')
        prompt_select_chat()
    }
}

function handle_chat_history(messages) {
    if (state.state == STATE.SELECT_CHAT) {
        console.log('Type your message, or type \'\\quit\' to go to select chat screen')
        for (let message of messages.messages) {
            if (message.from == state.username) {
                console.log('you :', message.payload)
            } else {
                console.log(message.from, ':', message.payload)
            }
        }
        prompt_write_message()
    }
}

function send_control_message(type, username = '') {
    ws.send(JSON.stringify({ type, username }))
}

function send_user_message(type, message = '') {
    ws.send(JSON.stringify({ type, to: state.contact, message }))
}
