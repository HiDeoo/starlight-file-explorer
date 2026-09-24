import type { StarlightIcon } from '@astrojs/starlight/types'
import { AstroError } from 'astro/errors'
import type { Element, Root } from 'hast'
import { toHtml } from 'hast-util-to-html'
import { htmlToHast } from 'satteri'

import { getFileIconName } from '../vendor/starlight'

export const EntryTagName = 'starlight-file-explorer-entry'

export function processEntries(html: string, instance: number): Entries {
  const tree = htmlToHast(html, { fragment: true })
  if (tree.type !== 'root') {
    throw new Error(`Expected \`htmlToHast()\` to return a root node but received \`${tree.type}\`.`)
  }

  let count = 0
  const list: Entry[] = []
  const selectedEntries: Entry[] = []

  function extractEntries(parent: Root | Element, parentEntry?: Entry): Entry[] {
    const entries: Entry[] = []

    parent.children = parent.children.filter((child) => {
      if (child.type !== 'element') return true

      if (child.tagName !== EntryTagName) {
        entries.push(...extractEntries(child, parentEntry))
        return true
      }

      if (parentEntry?.type === 'file') {
        throw new AstroError(
          'The `<File>` component expects no nested entries.',
          `Move entries nested inside \`${getEntryPath(parentEntry)}\` out of it, or use a \`<Folder>\` component instead.`,
        )
      }

      entries.push(getEntryFromNode(child, parentEntry))

      return false
    })

    return entries
  }

  function getEntryFromNode(node: Element, parent?: FolderEntry): Entry {
    const { dataCollapsed, dataDescription, dataIcon, dataName, dataSelected, dataType } = node.properties

    const name = String(dataName ?? '')

    if (!name.trim()) {
      const component = dataType === 'folder' ? '<Folder>' : '<File>'
      throw new AstroError(
        `The \`${component}\` component expects a non-empty \`name\` prop.`,
        `Set a non-empty \`name\` prop on the \`${component}\` component ${parent ? `inside \`${getEntryPath(parent)}\`` : 'at the root of the `<FileExplorer>` component'}.`,
      )
    }

    const icon = dataIcon ? (String(dataIcon) as StarlightIcon) : undefined

    const entry: Entry = {
      content: '',
      description: dataDescription ? String(dataDescription) : undefined,
      id: `sfe-${instance}-${count++}`,
      name,
      parent,
      ...(dataType === 'folder'
        ? {
            type: 'folder',
            children: [],
            collapsed: dataCollapsed !== undefined,
            icon: icon ?? 'seti:folder',
          }
        : {
            type: 'file',
            icon: icon ?? getFileIconName(name) ?? 'seti:default',
          }),
    }

    list.push(entry)

    if (dataSelected !== undefined) {
      selectedEntries.push(entry)
    }

    // We walk over files too, to report entries nested inside them.
    const children = extractEntries(node, entry)

    if (entry.type === 'folder') {
      entry.children = children
    }

    entry.content = toHtml(node.children)

    return entry
  }

  const entries = extractEntries(tree)
  assertSingleSelectedEntry(selectedEntries)

  // Pick the unique selected entry, falling back to the first file or the first folder.
  const selected = selectedEntries[0] ?? list.find((entry) => entry.type === 'file') ?? list[0]

  if (!selected) {
    throw new AstroError(
      'The `<FileExplorer>` component expects at least one entry.',
      'Add at least one `<File>` or `<Folder>` component inside the `<FileExplorer>` component.',
    )
  }

  // Expand all parent folders of the selected entry.
  for (let entry = selected.parent; entry; entry = entry.parent) {
    entry.collapsed = false
  }

  return { list, selected, tree: entries }
}

export function getEntryPath(entry: Entry) {
  let path = entry.type === 'folder' ? `${entry.name}/` : entry.name
  for (let parent = entry.parent; parent; parent = parent.parent) path = `${parent.name}/${path}`
  return path
}

function assertSingleSelectedEntry(entries: Entry[]) {
  if (entries.length <= 1) return

  throw new AstroError(
    'The `<FileExplorer>` component expects only one entry to be selected.',
    `Remove the \`selected\` prop from all but one of the following entries:\n\n${entries.map((entry) => `- \`${getEntryPath(entry)}\``).join('\n')}`,
  )
}

interface Entries {
  list: Entry[]
  selected: Entry
  tree: Entry[]
}

interface BaseEntry {
  content: string
  description: string | undefined
  icon: StarlightIcon
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

// TODO(HiDeoo) JSDoc
export interface EntryProps {
  description?: string
  icon?: StarlightIcon
  name: string
  selected?: boolean
}
