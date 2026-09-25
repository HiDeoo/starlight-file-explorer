import type { StarlightIcon } from '@astrojs/starlight/types'
import { AstroError } from 'astro/errors'
import type { Element, Root } from 'hast'
import { toHtml } from 'hast-util-to-html'
import { htmlToHast } from 'satteri'

import { getFileIconName } from '../vendor/starlight'

export const EntryTagName = 'starlight-file-explorer-entry'

export function processEntries(html: string, pathCounts: Map<string, number>): Entries {
  const tree = htmlToHast(html, { fragment: true })
  if (tree.type !== 'root') {
    throw new Error(`Expected \`htmlToHast()\` to return a root node but received \`${tree.type}\`.`)
  }

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
    const { dataBadges, dataCollapsed, dataDescription, dataIcon, dataName, dataSelected, dataType } = node.properties

    const name = String(dataName ?? '')

    const component = dataType === 'folder' ? '<Folder>' : '<File>'
    const location = parent ? `inside \`${getEntryPath(parent)}\`` : 'at the root of the `<FileExplorer>` component'

    if (!name.trim()) {
      throw new AstroError(
        `The \`${component}\` component expects a non-empty \`name\` prop.`,
        `Set a non-empty \`name\` prop on the \`${component}\` component ${location}.`,
      )
    }

    if (name.includes('/')) {
      throw new AstroError(
        `The \`${component}\` component expects a \`name\` prop without slashes.`,
        `Replace the \`${name}\` name of the \`${component}\` component ${location} with a single path segment, and use \`<Folder>\` components for nesting.`,
      )
    }

    const icon = dataIcon ? (String(dataIcon) as StarlightIcon) : undefined

    const entry: Entry = {
      badges: dataBadges
        ? [JSON.parse(String(dataBadges)) as BadgesProp]
            .flat()
            .map((badge) => (typeof badge === 'string' ? { text: badge } : badge))
        : [],
      content: '',
      description: dataDescription ? String(dataDescription) : undefined,
      id: '',
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

    // IDs start with a slash to avoid collisions with heading slugs, and are prefixed with a number when the path is
    // already used by another file explorer on the same page.
    const path = getEntryPath(entry)
    const pathCount = pathCounts.get(path) ?? 0
    entry.id = `${pathCount || ''}/${path}`
    pathCounts.set(path, pathCount + 1)

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
  assertUniquePaths(list)
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

function assertUniquePaths(entries: Entry[]) {
  // We don't use `getEntryPath()` on the entry as its trailing slash on folders would prevent detecting a folder and
  // a file having the same name in the same parent.
  const paths = Map.groupBy(entries, (entry) => `${entry.parent ? getEntryPath(entry.parent) : ''}${entry.name}`)

  for (const duplicates of paths.values()) {
    if (duplicates.length <= 1) continue

    throw new AstroError(
      'The `<FileExplorer>` component expects unique names in each folder.',
      `Rename or remove all but one of the following entries:\n\n${duplicates.map((entry) => `- \`${getEntryPath(entry)}\``).join('\n')}`,
    )
  }
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
  badges: Badge[]
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
  badges?: BadgesProp
  description?: string
  icon?: StarlightIcon
  name: string
  selected?: boolean
}

interface Badge {
  text: string
  variant?: 'caution' | 'danger' | 'default' | 'note' | 'success' | 'tip'
}

type BadgesProp = string | (string | Badge)[]
