const RpcServer = require('http-jsonrpc-server')
const simpleParser = require('mailparser').simpleParser
const SMTPServer = require('smtp-server').SMTPServer

let sentEmails = {}

const server = new SMTPServer({
    secure: false,
    authOptional: true,
    allowInsecureAuth: true,
    hideSTARTTLS: false,
    disabledCommands: [
        'STARTTLS'
    ],
    onAuth(auth, session, callback) {
        if (auth.password !== 'password') {
            return callback(new Error('Invalid password my man'))
        }
        callback(null, {
            user: 'test',
        })
    },
    onData(stream, session, callback) {
        // print message to console and time stamp
        let rawEmail = ''
        stream.on('data', (chunk) => {
            rawEmail += chunk.toString()
        })
        stream.on('end', async () => {
            callback(null, 'Message Received')
            try {
                const parsedEmail = await simpleParser(rawEmail)
                if (!sentEmails[parsedEmail.to.text]) {
                    sentEmails[parsedEmail.to.text] = []
                }
                sentEmails[parsedEmail.to.text].push(rawEmail)
                console.log(parsedEmail)
                console.log('received email to be sent to: ', parsedEmail.to.text)
            } catch (e) {
                console.error('error parsing email', e)
            }
        })
    },
})

server.listen(26)
console.log('SMTP server listening on port', 26)

async function clearAllMails(params) {
    sentEmails = {}
}

async function retrieveLastMailSentForEmail(params) {
    if (!params) {
        throw new Error('params passed to JSON RPC method are undefined')
    }
    if (!sentEmails[params.email] || sentEmails[params.email].length === 0) {
        throw new Error('no sent emails found for: ' + params.email)
    }
    return {
        email: sentEmails[params.email][0],
    }
}

const rpcServer = new RpcServer({
    methods: {
        retrieveLastMailSentForEmail,
        clearAllMails,
    },
})

rpcServer.setMethod('clearAllMails', clearAllMails)
rpcServer.setMethod('retrieveLastMailSentForEmail',
    retrieveLastMailSentForEmail)

rpcServer.listen(9090, '0.0.0.0').then((port) => {
    console.log(`RPC server is listening on port ${port}`)
})
