const { exec, spawn } = require("child_process")
const path = require("path")

// why tf is svelte not detected automatically?
const defaultParsers = {
  ".svelte": "svelte",
}

const getDefaultParser = (filename) =>
  Object.entries(defaultParsers).find(([ext]) => filename.endsWith(ext))?.[1]

const getNodePath = () => atom.config.get(`mprettier.nodePath`)

module.exports = (prettier) => {
  const formatEditor = async (editor, save = false) => {
    const file = editor.getPath()

    if (!file) return

    // const prettier = path.join(path.dirname(libPath), "bin", "prettier.cjs")

    const format = async (parser) =>
      new Promise((resolve, reject) => {
        const node = getNodePath()

        const code = editor.getText()

        const cmd = `${node} ${prettier} --parser ${parser}`

        const cwd = path.dirname(file)

        const child = spawn(node, [prettier, "--parser", parser], { cwd })

        const stdout = []
        child.stdout.on("data", (data) => {
          stdout.push(data)
        })

        const stderr = []
        child.stderr.on("data", (data) => {
          stderr.push(data)
        })

        child.on("close", (code) => {
          if (code !== 0) {
            const error = stderr.join("")
            console.error(
              "Prettier v3 formatting error (non 0 exit code)",
              error
            )
            reject(new Error("Prettier v3 formatting error (non 0 exit code)"))
            return
          }

          const point = editor.getCursorBufferPosition()
          editor.setText(stdout.join(""))
          editor.setCursorBufferPosition(point)

          return Promise.resolve()
            .then(async () => {
              if (save) {
                await editor.save()
              }
            })
            .then(resolve, reject)
        })

        child.stdin.write(code, "utf8", (err) => {
          if (err) {
            console.log("Prettier v3 stdin error", err)
            child.kill()
            reject(err)
            return
          }
          child.stdin.end()
        })
      })

    return new Promise((resolve, reject) => {
      const node = getNodePath()
      const cmd = `${node} ${prettier} --file-info ${file}`
      exec(cmd, { cwd: path.dirname(file) }, (error, stdout, stderr) => {
        if (error) {
          console.error("Prettier v3 error (file-info)", error, stderr)
        } else {
          const { ignored, inferredParser } = JSON.parse(stdout)

          if (ignored) return

          const parser = inferredParser || getDefaultParser(file)

          if (!parser) {
            console.warn("Prettier v3 error: parser not found for %s", file)
          }

          format(parser).then(resolve, reject)
        }
      })
    })
  }

  return {
    clearConfigCache: prettier.clearConfigCache,
    resolveConfig: prettier.resolveConfig,
    formatEditor,
  }
}
