const OUTGOING_MESSAGE_TYPES = {
    LOGIN: '0',
    CREATE_ACCOUNT: '1',
    MESSAGE: '2',
    FETCH_CHAT: '3' 
}

const INCOMING_MESSAGE_TYPES = {
    MESSAGE: '0',
    SUCCESSFUL_LOGIN: '1',
    SUCCESSFUL_CREATE_ACCOUNT: '2',
    INVALID_USERNAME: '3',
    DUPLICATE_USERNAME: '4',
    CHAT_HISTORY: '5',
    TIMEOUT: '6'
}

function get_random_int() {
    return Math.floor(Math.random() * (Math.pow(2, 64) - 1))
}

module.exports = {
    get_random_int, OUTGOING_MESSAGE_TYPES, INCOMING_MESSAGE_TYPES
}
