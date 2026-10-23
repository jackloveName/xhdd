export default function legacy () {
  if (!Array.prototype.flat) {
    // eslint-disable-next-line no-extend-native
    Array.prototype.flat = function (depth = 1) {
      depth = Number.isNaN(Number(depth)) ? 1 : Number(depth)
      const flatten = (arr, currentDepth) => {
        let result = []
        arr.forEach((item) => {
          if (Array.isArray(item) && currentDepth > 0) {
            result = result.concat(flatten(item, currentDepth - 1))
          } else {
            result.push(item)
          }
        })
        return result
      }
      return flatten(this, depth)
    }
  }

  // #ifdef H5
  if (typeof Element !== 'undefined' && !Element.prototype.append) {
    Element.prototype.append = function () {
      const args = Array.prototype.slice.call(arguments)
      const fragment = document.createDocumentFragment()
      args.forEach((item) => {
        fragment.appendChild(item instanceof Node ? item : document.createTextNode(String(item)))
      })
      this.appendChild(fragment)
    }
  }
  // #endif
}
