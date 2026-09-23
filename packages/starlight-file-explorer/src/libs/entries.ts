import { AstroError } from 'astro/errors'
import type { Element, Root } from 'hast'
import { toHtml } from 'hast-util-to-html'
import { htmlToHast } from 'satteri'

export const EntryTagName = 'starlight-file-explorer-entry'

export function processEntries(html: string, instance: number): Entries {
  const tree = htmlToHast(html, { fragment: true })
  if (tree.type !== 'root') throw new Error('// TODO(HiDeoo)')

  let count = 0
  const list: Entry[] = []
  const selectedEntries: Entry[] = []

  function extractEntries(parent: Root | Element, parentEntry?: FolderEntry): Entry[] {
    const entries: Entry[] = []

    parent.children = parent.children.filter((child) => {
      if (child.type !== 'element') return true

      if (child.tagName !== EntryTagName) {
        entries.push(...extractEntries(child, parentEntry))
        return true
      }

      entries.push(getEntryFromNode(child, parentEntry))

      return false
    })

    return entries
  }

  function getEntryFromNode(node: Element, parent?: FolderEntry): Entry {
    const { dataCollapsed, dataName, dataSelected, dataType } = node.properties

    const entry: Entry = {
      content: '',
      id: `sfe-${instance}-${count++}`,
      name: String(dataName),
      parent,
      ...(dataType === 'folder'
        ? {
            type: 'folder',
            children: [],
            collapsed: dataCollapsed !== undefined,
          }
        : {
            type: 'file',
          }),
    }

    list.push(entry)

    if (dataSelected !== undefined) {
      selectedEntries.push(entry)
    }

    if (entry.type === 'folder') {
      entry.children = extractEntries(node, entry)
    }

    entry.content = toHtml(node.children)

    return entry
  }

  const entries = extractEntries(tree)
  assertSingleSelectedEntry(selectedEntries)

  // Pick the unique selected entry, falling back to the first file or the first folder.
  const selected = selectedEntries[0] ?? list.find((entry) => entry.type === 'file') ?? list[0]

  // Expand all parent folders of the selected entry.
  for (let entry = selected?.parent; entry; entry = entry.parent) {
    entry.collapsed = false
  }

  return { list, selected, tree: entries }
}

function assertSingleSelectedEntry(entries: Entry[]) {
  if (entries.length <= 1) return

  throw new AstroError(
    'Multiple entries are selected in a `<FileExplorer>` component.',
    `Only one entry can use the \`selected\` prop. The following entries are currently selected:\n\n${entries.map((entry) => `- ${getEntryPath(entry)}`).join('\n')}`,
  )
}

function getEntryPath(entry: Entry) {
  let path = entry.type === 'folder' ? `${entry.name}/` : entry.name
  for (let parent = entry.parent; parent; parent = parent.parent) path = `${parent.name}/${path}`
  return path
}

interface Entries {
  list: Entry[]
  selected: Entry | undefined
  tree: Entry[]
}

interface BaseEntry {
  content: string
  id: string
  name: string
  parent: FolderEntry | undefined
}

interface FileEntry extends BaseEntry {
  type: 'file'
}

interface FolderEntry extends BaseEntry {
  type: 'folder'
  children: Entry[]
  collapsed: boolean
}

export type Entry = FileEntry | FolderEntry
