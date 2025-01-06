const ProcessSpawner = require('util/process.js')
const path = require('path')
const fs = require('fs')

class Keyring {
  constructor () {
    this.name = 'Keyring'
  }

  getDownloadLink () {
    return null
  }

  getSetupMode () {
    return null
  }

  isUnlocked () {
    return true
  }

  // Get local path for `secret-tool` binary
  getLocalPath () {
    return path.join(
      window.globalArgs['user-data-path'],
      'tools',
      'secret-tool'
    )
  }

  // Locate the CLI tool (local or global)
  async _getToolPath () {
    const localPath = this.getLocalPath()
    try {
      await fs.promises.access(localPath, fs.constants.X_OK)
      return localPath
    } catch (e) {}

    const global = await new ProcessSpawner('secret-tool').checkCommandExists()
    if (global) {
      return 'secret-tool'
    }

    return null
  }

  // Ensure CLI tool is configured
  async checkIfConfigured () {
    this.path = await this._getToolPath()
    return this.path != null
  }

  // Store a password
  async storePassword (username, website, password) {
    if (!this.checkIfConfigured()) throw new Error('Keyring not configured.')

    const label = `Password for ${website}` // User-friendly label
    const attributes = ['username', username, 'website', website] // Unique attributes

    const args = ['store', '--label', label, ...attributes]

    const process = new ProcessSpawner(this.path, args)

    try {
      // Use `stdin` to provide the password
      const result = await process.executeSyncInAsyncContext(password)
      return result
    } catch (ex) {
      console.error('Error storing password:', ex)
      throw ex
    }
  }

  async getSuggestions (domain) {
    if (!this.checkIfConfigured()) throw new Error('Keyring not configured.')

    const process = new ProcessSpawner('/bin/bash', [
      '-c',
      `secret-tool search --all domain ${this.sanitize(
        domain
      )} viamin true 2>&1`
    ])

    try {
      const data = await process.execute()
      const credentials = this._rawCredentialstoJSON(data)
      return credentials
    } catch (ex) {
      console.error('Error retrieving credentials:', ex)
      return []
    }
  }

  async saveCredential (domain, username, password) {
    if (!this.checkIfConfigured()) throw new Error('Keyring not configured.')

    const label = `Password for ${domain}` // User-friendly label
    const attributes = [
      'username',
      username,
      'domain',
      domain,
      'viamin',
      'true'
    ] // Unique attributes

    const args = ['store', '--label', label, ...attributes]

    const process = new ProcessSpawner(this.path, args)

    try {
      const result = await process.executeSyncInAsyncContext(password)
    } catch (ex) {
      console.error('Error storing password:', ex)
      throw ex
    }
  }

  async deleteCredential (domain, username) {
    if (!this.checkIfConfigured()) throw new Error('Keyring not configured.')

    const args = [
      'clear',
      'username',
      username,
      'domain',
      domain,
      'viamin',
      'true'
    ]

    const process = new ProcessSpawner(this.path, args)

    try {
      const result = await process.execute()
    } catch (ex) {
      console.error('Error storing password:', ex)
      throw ex
    }
  }

  _rawCredentialstoJSON (data) {
    const test = data.split(/[^]\[.*\]\n/gm)
    const result = []
    test.forEach((curr) => {
      const password = curr.match(/(?<=secret = ).*$/gm)[0] ?? null
      const domain = curr.match(/(?<=attribute.domain = ).*$/gm)[0] ?? null
      const username = curr.match(/(?<=attribute.username = ).*$/gm)[0] ?? null
      if (!password || !domain || !username) return

      result.push({
        password,
        domain,
        username,
        manager: 'Keyring'
      })
    })
    return result
  }

  async getAllCredentials () {
    if (!this.checkIfConfigured()) throw new Error('Keyring not configured.')

    const process = new ProcessSpawner('/bin/bash', [
      '-c',
      'secret-tool search --all viamin true 2>&1'
    ])

    try {
      const data = await process.execute()
      const credentials = this._rawCredentialstoJSON(data)
      return credentials
    } catch (ex) {
      console.error('Error retrieving credentials:', ex)
      return []
    }
  }

  // Basic domain name cleanup
  sanitize (domain) {
    return domain.replace(/[^a-zA-Z0-9.-]/g, '')
  }
}

module.exports = Keyring
