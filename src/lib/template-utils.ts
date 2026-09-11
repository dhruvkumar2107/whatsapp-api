export function extractTemplateFields(
  components: Array<{ type: string; text?: string; parameters?: unknown[] }>
) {
  const header = components.find((c) => c.type === 'HEADER')
  const body = components.find((c) => c.type === 'BODY')
  const footer = components.find((c) => c.type === 'FOOTER')
  const buttons = components.find((c) => c.type === 'BUTTONS')

  return {
    header: header ? { type: 'text', text: header.text || '' } : undefined,
    body: body ? { text: body.text || '' } : undefined,
    footer: footer?.text || undefined,
    buttons: buttons?.text ? JSON.parse(buttons.text) : undefined,
  }
}
