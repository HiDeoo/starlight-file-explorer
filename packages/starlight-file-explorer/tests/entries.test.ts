import { expect, test } from 'vitest'

import { EntryTagName, processEntries, type Entry } from '../src/libs/entries'

test('processes entries', () => {
  const { tree } = processEntries(
    root(folder('folder-1', {}, file('file-2'), folder('folder-2', {}, file('file-3'))), file('file-1')),
    0,
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
  const { list } = processEntries(folder('folder-1', {}, '<p>Folder 1</p>', file('file-2', {}, '<p>File 2</p>')), 0)

  expect(list.map((entry) => entry.content)).toEqual(['<p>Folder 1</p>', '<p>File 2</p>'])
})

test('extracts descriptions', () => {
  const { list } = processEntries(root(file('file-1', { description: 'Description 1' }), file('file-2')), 0)

  expect(list.map((entry) => entry.description)).toEqual(['Description 1', undefined])
})

test('lists all entries with unique IDs', () => {
  const { list } = processEntries(root(folder('folder-1', {}, file('file-2')), file('file-1')), 3)

  expect(list.map((entry) => [entry.name, entry.id])).toEqual([
    ['folder-1', 'sfe-3-0'],
    ['file-2', 'sfe-3-1'],
    ['file-1', 'sfe-3-2'],
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
  expect(processEntries(html, 0).selected.name).toBe(expected)
})

test('throws with multiple selected entries', () => {
  expect(() =>
    processEntries(
      root(
        folder('folder-1', { selected: true }, file('file-2', { selected: true })),
        file('file-1', { selected: true }),
      ),
      0,
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
  expect(() => processEntries(folder('folder-1', {}, file('file-2', {}, `<div>${file('file-3')}</div>`)), 0))
    .toThrowErrorMatchingInlineSnapshot(`
    The \`<File>\` component expects no nested entries.

    ---

    Move entries nested inside \`folder-1/file-2\` out of it, or use a \`<Folder>\` component instead.
  `)
})

test('throws with no entries', () => {
  expect(() => processEntries('<p>Content</p>', 0)).toThrowErrorMatchingInlineSnapshot(`
    The \`<FileExplorer>\` component expects at least one entry.

    ---

    Add at least one \`<File>\` or \`<Folder>\` component inside the \`<FileExplorer>\` component.
  `)
})

test('throws with an empty name at the root', () => {
  expect(() => processEntries(folder(''), 0)).toThrowErrorMatchingInlineSnapshot(`
    The \`<Folder>\` component expects a non-empty \`name\` prop.

    ---

    Set a non-empty \`name\` prop on the \`<Folder>\` component at the root of the \`<FileExplorer>\` component.
  `)
})

test('throws with an empty name in a folder', () => {
  expect(() => processEntries(folder('folder-1', {}, file('')), 0)).toThrowErrorMatchingInlineSnapshot(`
    The \`<File>\` component expects a non-empty \`name\` prop.

    ---

    Set a non-empty \`name\` prop on the \`<File>\` component inside \`folder-1/\`.
  `)
})

test('expands collapsed folders containing the selected entry', () => {
  const { list } = processEntries(
    root(
      folder(
        'folder-1a',
        { collapsed: true },
        folder('folder-2', { collapsed: true }, file('file-3', { selected: true })),
      ),
      folder('folder-1b', { collapsed: true }, file('file-2a')),
      folder('folder-1c', {}, file('file-2b')),
    ),
    0,
  )

  expect(list.filter((entry) => entry.type === 'folder').map((entry) => [entry.name, entry.collapsed])).toEqual([
    ['folder-1a', false],
    ['folder-2', false],
    ['folder-1b', true],
    ['folder-1c', false],
  ])
})

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
  { collapsed, description, selected }: EntryOptions,
  content: string,
) {
  const attributes = [`data-type="${type}"`, `data-name="${name}"`]
  if (collapsed) attributes.push('data-collapsed="true"')
  if (description) attributes.push(`data-description="${description}"`)
  if (selected) attributes.push('data-selected="true"')
  return `<${EntryTagName} ${attributes.join(' ')}>${content}</${EntryTagName}>`
}

interface EntryOptions {
  collapsed?: boolean
  description?: string
  selected?: boolean
}
