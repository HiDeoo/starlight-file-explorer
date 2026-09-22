import type { Element, Root } from 'hast'
import { toHtml } from 'hast-util-to-html'
import { htmlToHast } from 'satteri'

export const EntryTagName = 'starlight-file-explorer-entry'

export function processEntries(html: string, instance: number): Entries {
  const tree = htmlToHast(html, { fragment: true })
  if (tree.type !== 'root') throw new Error('// TODO(HiDeoo)')

  let count = 0
  const list: Entry[] = []

  function extractEntries(parent: Root | Element): Entry[] {
    const entries: Entry[] = []

    parent.children = parent.children.filter((child) => {
      if (child.type !== 'element') return true

      if (child.tagName !== EntryTagName) {
        entries.push(...extractEntries(child))
        return true
      }

      entries.push(getEntryFromNode(child))

      return false
    })

    return entries
  }

  function getEntryFromNode(node: Element): Entry {
    const { dataName, dataType } = node.properties

    const children = extractEntries(node)

    const entry: Entry = {
      children,
      content: toHtml(node.children),
      id: `sfe-${instance}-${count++}`,
      name: String(dataName),
      type: dataType === 'folder' ? 'folder' : 'file',
    }

    list.push(entry)

    return entry
  }

  return {
    list,
    tree: extractEntries(tree),
  }
}

interface Entries {
  list: Entry[]
  tree: Entry[]
}

export interface Entry {
  children: Entry[]
  content: string
  id: string
  name: string
  type: 'file' | 'folder'
}
