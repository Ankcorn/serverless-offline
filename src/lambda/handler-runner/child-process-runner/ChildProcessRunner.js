import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { log } from '@serverless/utils/log.js'
import { execaNode } from 'execa'

const __dirname = dirname(fileURLToPath(import.meta.url))
const childProcessHelperPath = resolve(__dirname, 'childProcessHelper.js')

export default class ChildProcessRunner {
  #env = null

  #functionKey = null

  #handlerName = null

  #handlerPath = null

  #timeout = null

  constructor(funOptions, env) {
    const { functionKey, handlerName, handlerPath, timeout } = funOptions

    this.#env = env
    this.#functionKey = functionKey
    this.#handlerName = handlerName
    this.#handlerPath = handlerPath
    this.#timeout = timeout
  }

  // no-op
  // () => void
  cleanup() {}

  async run(event, context) {
    const childProcess = execaNode(
      childProcessHelperPath,
      [this.#functionKey, this.#handlerName, this.#handlerPath],
      {
        env: this.#env,
        stdio: 'inherit',
      },
    )

    let message

    try {
      message = new Promise((res, rej) => {
        childProcess.on('message', (data) => {
          if (data.error) rej(data.error)
          else res(data)
        })
      })
    } finally {
      childProcess.kill()
    }

    childProcess.send({
      context,
      event,
      timeout: this.#timeout,
    })

    let result

    try {
      result = await message
    } catch (err) {
      // TODO
      log.error(err)

      throw err
    }

    return result
  }
}
