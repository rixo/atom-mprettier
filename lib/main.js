const {CompositeDisposable} = require('atom')
let Formatter
const getFormatter = () => Formatter || (Formatter = require('./formatter'))
const newFormatter = editor => new (getFormatter())(editor)

module.exports = {
  activate () {
    let skipFormat = false

    this.disposables = new CompositeDisposable(
      atom.workspace.observeActiveTextEditor(editor => {
        this.disposeEditorDisposable()
        if (!editor) return
        this.editorDisposable = editor.buffer.onWillSave(() => {
          if (!skipFormat) {
            skipFormat = true
            newFormatter(editor).format(true).finally(() => {
              skipFormat = false
            })
          }
        })
      }),
      atom.commands.add('atom-text-editor:not([mini])', {
        'mprettier:format' () {
          newFormatter(this.getModel()).format()
        },
        'mprettier:save-without-format' () {
          skipFormat = true
          const editor = this.getModel()
          editor.save().then(() => {
            skipFormat = false
          })
        },
        'mprettier:clip-debug-info' () {
          newFormatter(this.getModel()).clipDebugInfo()
        },
        'mprettier:toggle-disable-file' () {
          getFormatter().toggleDisableFile(this.getModel().getPath())
        }
      })
    )
  },
  deactivate () {
    this.disposables.dispose()
    this.disposeEditorDisposable()
  },
  disposeEditorDisposable () {
    if (this.editorDisposable) {
      this.editorDisposable.dispose()
      this.editorDisposable = null
    }
  }
}
