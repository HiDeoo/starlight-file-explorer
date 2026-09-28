import { expect, test } from 'vitest'

import { EntryTagName, processEntries, type Entry, type EntryProps } from '../src/libs/entries'

test('processes entries', () => {
  const { tree } = processTestEntries(
    root(folder('folder-1', {}, file('file-2'), folder('folder-2', {}, file('file-3'))), file('file-1')),
  )

  expect(tree).toMatchObject([
    {
      name: 'folder-1',
      type: 'folder',
      children: [
        { name: 'file-2', type: 'file' },
        { name: 'folder-2', type: 'folder', children: [{ name: 'file-3', type: 'file' }] },
      ],
    },
    { name: 'file-1', type: 'file' },
  ])
})

test('extracts nested entries', () => {
  const { list } = processTestEntries(folder('folder-1', {}, '<p>Folder 1</p>', file('file-2', {}, '<p>File 2</p>')))

  expect(list.map((entry) => entry.content)).toEqual(['<p>Folder 1</p>', '<p>File 2</p>'])
})

test('extracts descriptions', () => {
  const { list } = processTestEntries(root(file('file-1', { description: 'Description 1' }), file('file-2')))

  expect(list.map((entry) => entry.description)).toEqual(['Description 1', undefined])
})

test('extracts badges', () => {
  const { list } = processTestEntries(
    root(
      file('file-1', { badges: ['New', { text: 'Beta', variant: 'caution' }] }),
      file('file-2', { badges: 'New' }),
      file('file-3'),
    ),
  )

  expect(list.map((entry) => entry.badges)).toEqual([
    [{ text: 'New' }, { text: 'Beta', variant: 'caution' }],
    [{ text: 'New' }],
    [],
  ])
})

test('resolves icons', () => {
  const { list } = processTestEntries(
    root(
      folder('folder-1a', {}, file('file-2')),
      folder('folder-1b', { icon: 'star' }),
      file('file-1a.ts', { icon: 'rocket' }),
      file('file-1b.ts'),
    ),
  )

  expect(list.map((entry) => [entry.name, entry.icon])).toEqual([
    ['folder-1a', 'seti:folder'],
    ['file-2', 'seti:default'],
    ['folder-1b', 'star'],
    ['file-1a.ts', 'rocket'],
    ['file-1b.ts', 'seti:typescript'],
  ])
})

test('lists all entries with unique IDs', () => {
  const { list } = processTestEntries(root(folder('folder-1', {}, file('file-2')), file('file-1')))

  expect(list.map((entry) => [entry.name, entry.id])).toEqual([
    ['folder-1', '/folder-1/'],
    ['file-2', '/folder-1/file-2'],
    ['file-1', '/file-1'],
  ])
})

test('prefixes IDs with numbers for paths already used on the page', () => {
  const pathCounts = new Map<string, number>()

  processTestEntries(root(file('file-1')), pathCounts)
  processTestEntries(root(file('file-1')), pathCounts)

  const { list } = processTestEntries(root(file('file-1'), file('file-2')), pathCounts)

  expect(list.map((entry) => [entry.name, entry.id])).toEqual([
    ['file-1', '2/file-1'],
    ['file-2', '/file-2'],
  ])
})

test.for([
  {
    description: 'the selected file',
    html: root(file('file-1a'), file('file-1b', { selected: true })),
    expected: 'file-1b',
  },
  {
    description: 'the selected folder',
    html: root(file('file-1'), folder('folder-1', { selected: true })),
    expected: 'folder-1',
  },
  {
    description: 'the first file',
    html: root(folder('folder-1', {}, file('file-2')), file('file-1')),
    expected: 'file-2',
  },
  {
    description: 'the first entry without files',
    html: folder('folder-1', {}, folder('folder-2')),
    expected: 'folder-1',
  },
])('selects $description', ({ expected, html }) => {
  expect(processTestEntries(html).selected.name).toBe(expected)
})

test('throws with multiple selected entries', () => {
  expect(() =>
    processTestEntries(
      root(
        folder('folder-1', { selected: true }, file('file-2', { selected: true })),
        file('file-1', { selected: true }),
      ),
    ),
  ).toThrowErrorMatchingInlineSnapshot(`
    The \`<FileExplorer>\` component expects only one entry to be selected.

    ---

    Remove the \`selected\` prop from all but one of the following entries:

    - \`folder-1/\`
    - \`folder-1/file-2\`
    - \`file-1\`
  `)
})

test('throws with entries nested in a file', () => {
  expect(() => processTestEntries(folder('folder-1', {}, file('file-2', {}, `<div>${file('file-3')}</div>`))))
    .toThrowErrorMatchingInlineSnapshot(`
    The \`<File>\` component expects no nested entries.

    ---

    Move entries nested inside \`folder-1/file-2\` out of it, or use a \`<Folder>\` component instead.
  `)
})

test('throws with no entries', () => {
  expect(() => processTestEntries('<p>Content</p>')).toThrowErrorMatchingInlineSnapshot(`
    The \`<FileExplorer>\` component expects at least one entry.

    ---

    Add at least one \`<File>\` or \`<Folder>\` component inside the \`<FileExplorer>\` component.
  `)
})

test('throws with an empty name at the root', () => {
  expect(() => processTestEntries(folder(''))).toThrowErrorMatchingInlineSnapshot(`
    The \`<Folder>\` component expects a non-empty \`name\` prop.

    ---

    Set a non-empty \`name\` prop on the \`<Folder>\` component at the root of the \`<FileExplorer>\` component.
  `)
})

test('throws with an empty name in a folder', () => {
  expect(() => processTestEntries(folder('folder-1', {}, file('')))).toThrowErrorMatchingInlineSnapshot(`
    The \`<File>\` component expects a non-empty \`name\` prop.

    ---

    Set a non-empty \`name\` prop on the \`<File>\` component inside \`folder-1/\`.
  `)
})

test('throws with a slash in a name', () => {
  expect(() => processTestEntries(folder('folder-1', {}, folder('folder-2/folder-3'))))
    .toThrowErrorMatchingInlineSnapshot(`
    The \`<Folder>\` component expects a \`name\` prop without slashes.

    ---

    Replace the \`folder-2/folder-3\` name of the \`<Folder>\` component inside \`folder-1/\` with a single path segment, and use \`<Folder>\` components for nesting.
  `)
})

test('throws when a file and a folder share the same path', () => {
  expect(() => processTestEntries(root(file('entry-1'), folder('entry-1')))).toThrowErrorMatchingInlineSnapshot(`
    The \`<FileExplorer>\` component expects unique names in each folder.

    ---

    Rename or remove all but one of the following entries:

    - \`entry-1\`
    - \`entry-1/\`
  `)
})

test('throws when entries share the same path', () => {
  expect(() => processTestEntries(folder('folder-1', {}, file('file-2'), file('file-2'), file('file-2'))))
    .toThrowErrorMatchingInlineSnapshot(`
    The \`<FileExplorer>\` component expects unique names in each folder.

    ---

    Rename or remove all but one of the following entries:

    - \`folder-1/file-2\`
    - \`folder-1/file-2\`
    - \`folder-1/file-2\`
  `)
})

test('expands collapsed folders containing the selected entry', () => {
  const { list } = processTestEntries(
    root(
      folder(
        'folder-1a',
        { collapsed: true },
        folder('folder-2', { collapsed: true }, file('file-3', { selected: true })),
      ),
      folder('folder-1b', { collapsed: true }, file('file-2a')),
      folder('folder-1c', {}, file('file-2b')),
    ),
  )

  expect(list.filter((entry) => entry.type === 'folder').map((entry) => [entry.name, entry.collapsed])).toEqual([
    ['folder-1a', false],
    ['folder-2', false],
    ['folder-1b', true],
    ['folder-1c', false],
  ])
})

function processTestEntries(html: string, pathCounts = new Map<string, number>()) {
  return processEntries(html, pathCounts)
}

function root(...entries: string[]) {
  return entries.join('')
}

function file(name: string, options: EntryOptions = {}, content = '') {
  return makeEntry('file', name, options, content)
}

function folder(name: string, options: EntryOptions = {}, ...content: string[]) {
  return makeEntry('folder', name, options, content.join(''))
}

function makeEntry(
  type: Entry['type'],
  name: string,
  { badges, collapsed, description, icon, selected }: EntryOptions,
  content: string,
) {
  const attributes = [`data-type="${type}"`, `data-name="${name}"`]
  if (badges) attributes.push(`data-badges='${JSON.stringify(badges)}'`)
  if (collapsed) attributes.push('data-collapsed="true"')
  if (description) attributes.push(`data-description="${description}"`)
  if (icon) attributes.push(`data-icon="${icon}"`)
  if (selected) attributes.push('data-selected="true"')
  return `<${EntryTagName} ${attributes.join(' ')}>${content}</${EntryTagName}>`
}

interface EntryOptions {
  badges?: EntryProps['badges']
  collapsed?: boolean
  description?: EntryProps['description']
  icon?: EntryProps['icon']
  selected?: EntryProps['selected']
}
