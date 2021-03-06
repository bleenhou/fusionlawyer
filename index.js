'use strict'
const fetch = require('node-fetch')
const express = require('express')
const config = require('./config.js')
const helpers = require('./helpers.js')

const app = express()
global.Headers = fetch.Headers

app.listen(config.port, () => console.log(`Sample app listening on port ${config.port}!`))

app.set('view engine', 'ejs')
app.use(express.static(__dirname + '/public'))

let oauth2
let access_token
global.strong = config.strong

// Home page
app.get('/', (req, res) => {
  res.render('pages/Homepage.ejs')
})

// Login
app.get('/login', (req, res) => {
  oauth2 = helpers.oauth2Creation()

  const authorizationUri = helpers.getAuthUri(oauth2)

  res.redirect(authorizationUri)
})

// Callback service parsing the authorization token and asking for the access token
app.get('/callback', async (req, res, next) => {
  const code = req.query.code

  try {
    const tokenConfig = helpers.getTokenConfig(code)
    const result = await oauth2.authorizationCode.getToken(tokenConfig)
    const accessToken = oauth2.accessToken.create(result)

    access_token = accessToken.token.access_token

  } catch (error) {
    return res.render('pages/error', { error: error.message })
  }

  res.render('pages/auth', { token: access_token })
})

// Get results
app.get('/results', async (req, res, next) => {
  try {
    var url = config.baseUrl + '/retail-us/me/account/v1/accounts'

    const accountsResponse = await fetch(url, {
      method: 'get',
      headers: new Headers({
        Authorization: 'Bearer ' + access_token,
        Accept: 'application/json',
        'Content-Type': 'application/json'
      })
    })

    if (!accountsResponse.ok) {
      return res.render('pages/error', { error: accountsResponse.statusText });
    }
    
    const accounts = await accountsResponse.json()
    const accountNumber = accounts[0].accountId
    console.log("Account number : " + accountNumber)

    var url = config.baseUrl + '/retail-us/me/account/v1/accounts/' + accountNumber + '/transactions'
    const transactionsResponse = await fetch(url, {
      method: 'get',
      headers: new Headers({
        Authorization: 'Bearer ' + access_token,
        Accept: 'application/json',
        'Content-Type': 'application/json'
      })
    })

    if (!transactionsResponse.ok) {
      return res.render('pages/error', { error: transactionsResponse.statusText });
    }

    const transactions = await transactionsResponse.json()    
    console.log("transactions")
    console.log(transactions)
    
    return res.render('pages/results', { entities: transactions.items })
  } catch (error) {
    return res.render('pages/error', { error: error })
  }
})

// Logout
app.get('/logout', (req, res) => {
  access_token = null
  res.render('pages/logout', { logout: "You successfully removed the access token." })
})