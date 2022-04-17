const readline = require('readline')

const io = readline.createInterface({
    input: process.stdin,
    output: process.stdout
})

io.question('Test0', m => {
    console.log(m)
})

console.log('Test')

io.question('Test1', m => {
    console.log('1', m)
})
