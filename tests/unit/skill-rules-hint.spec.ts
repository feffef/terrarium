import { describe, expect, it } from 'vitest'
import { invokedSkill, rulesForSkill, skillRulesHint, type RuleFile } from '../../scripts/skill-rules-hint.ts'

const rule = (file: string, paths: string[], body: string): RuleFile => ({
  file,
  text: `---\nadr: x\npaths:\n${paths.map((p) => `  - "${p}"`).join('\n')}\n---\n${body}\n`,
})
const RULES = [
  rule('adr-0012.md', ['layers/blog/content/**', '.agents/skills/blog-post/**'], '# ADR-0012: Pingbacks'),
  rule('adr-0005.md', ['.agents/skills/**'], '# ADR-0005: Skills are Platform code'),
  { file: 'adr-0003.md', text: '---\nadr: y\n---\n# ADR-0003: always loaded\n' },
]

describe('invokedSkill', () => {
  it('reads a Skill tool call and a slash-command prompt', () => {
    expect(invokedSkill({ tool_name: 'Skill', tool_input: { skill: 'blog-post' } })).toBe('blog-post')
    expect(invokedSkill({ hook_event_name: 'UserPromptSubmit', prompt: '/digest catch up' })).toBe('digest')
    expect(invokedSkill({ prompt: '<command-name>/digest</command-name>' })).toBe('digest')
  })

  it('ignores other tools, plain prompts and namespaced Skills', () => {
    expect(invokedSkill({ tool_name: 'Bash', tool_input: { command: 'ls' } })).toBeNull()
    expect(invokedSkill({ prompt: 'please write a post' })).toBeNull()
    expect(invokedSkill({ tool_name: 'Skill', tool_input: { skill: 'anthropic-skills:pdf' } })).toBeNull()
  })
})

describe('rulesForSkill / skillRulesHint', () => {
  it('picks only rules that name the Skill\'s own directory', () => {
    expect(rulesForSkill('blog-post', RULES).map((r) => r.file)).toEqual(['adr-0012.md'])
    expect(rulesForSkill('digest', RULES)).toEqual([])
  })

  it('shows the rule text without its frontmatter, and nothing when no rule fits', () => {
    const hint = skillRulesHint('blog-post', RULES) ?? ''
    expect(hint).toContain('# ADR-0012: Pingbacks')
    expect(hint).not.toContain('adr: x')
    expect(skillRulesHint('digest', RULES)).toBeNull()
  })
})
