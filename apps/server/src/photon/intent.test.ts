import { describe, expect, it, vi } from 'vitest';
import { AiError, type Generate } from '../gemini';
import { cleanDueDate, parseIntent } from './intent';
import { isAllowedSender } from './agent';

const TODAY = '2026-10-18';
const reply = (obj: unknown) => vi.fn<Generate>(async () => JSON.stringify(obj));

describe('parseIntent (M16)', () => {
  it('keeps a valid reminder date and trims the name', async () => {
    const i = await parseIntent(reply({ intent: 'remind', target: { personName: '  John Park ', dueDate: '2026-10-23', note: 'email' } }), 'remind me to email John Friday', undefined, TODAY);
    expect(i).toEqual({ intent: 'remind', target: { personName: 'John Park', dueDate: '2026-10-23', note: 'email' } });
  });
  it('drops past, far-future and impossible dates', () => {
    expect(cleanDueDate('2026-10-17', TODAY)).toBeUndefined();
    expect(cleanDueDate('2028-01-01', TODAY)).toBeUndefined();
    expect(cleanDueDate('2026-02-30', TODAY)).toBeUndefined();
    expect(cleanDueDate('Friday', TODAY)).toBeUndefined();
    expect(cleanDueDate('2026-10-18', TODAY)).toBe('2026-10-18');
  });
  it('falls back to a question: empty question, a remind without a name, or an AI error', async () => {
    expect(await parseIntent(reply({ intent: 'query' }), 'who is at Stripe?', undefined, TODAY)).toEqual({ intent: 'query', question: 'who is at Stripe?' });
    expect(await parseIntent(reply({ intent: 'remind', target: { personName: '  ' } }), 'remind me', undefined, TODAY)).toEqual({ intent: 'query', question: 'remind me' });
    const failing = vi.fn<Generate>(async () => {
      throw new AiError('rate_limited', 'busy');
    });
    expect(await parseIntent(failing, 'had coffee with Abbey', undefined, TODAY)).toEqual({ intent: 'query', question: 'had coffee with Abbey' });
  });
  it('passes recent conversation and today to the model', async () => {
    const g = reply({ intent: 'log_contact', target: { personName: 'Abbey Chen' } });
    await parseIntent(g, 'had coffee with her', 'user: who do I know at Microsoft?\nagent: Abbey Chen', TODAY);
    const text = JSON.stringify(g.mock.calls[0]![0].parts);
    expect(text).toContain('Today is 2026-10-18');
    expect(text).toContain('Recent conversation');
  });
});

describe('isAllowedSender (M16)', () => {
  const allowed = ['+15555550123', 'me@example.com'];
  it('matches the owner in any phone format, and an Apple ID email', () => {
    expect(isAllowedSender('+15555550123', allowed)).toBe(true);
    expect(isAllowedSender('any;-;+15555550123', allowed)).toBe(true);
    expect(isAllowedSender('(555) 555-0123', allowed)).toBe(true);
    expect(isAllowedSender('ME@example.com', allowed)).toBe(true);
  });
  it('rejects everyone else, and an empty list allows no one', () => {
    expect(isAllowedSender('+15555550124', allowed)).toBe(false);
    expect(isAllowedSender(undefined, allowed)).toBe(false);
    expect(isAllowedSender('+15555550123', [])).toBe(false);
  });
});
