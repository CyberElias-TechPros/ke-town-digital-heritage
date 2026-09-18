/**
 * Notification creation + realtime fan-out + lightweight activity logging.
 * Every write path funnels through here so no user story can silently
 * skip the person who should hear about it.
 */
import { newId } from './crypto';
import { run } from './db';
import { emit } from '../realtime';
import type { Env } from '../types';

export interface NotifyInput {
  userId: string;
  type: string;
  message: string;
  title?: string;
  link?: string;
  fromId?: string | null;
  data?: Record<string, unknown>;
}

export async function notify(env: Env, input: NotifyInput): Promise<string> {
  const id = newId('ntf_');
  if (input.userId && input.userId !== (input.fromId ?? '')) {
    await run(
      env.DB,
      `INSERT INTO notifications (id, user_id, from_id, type, title, message, link, data, read, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, 0, datetime('now'))`,
      id,
      input.userId,
      input.fromId ?? null,
      input.type,
      input.title ?? '',
      input.message,
      input.link ?? null,
      JSON.stringify(input.data ?? {}),
    );
    await emit(
      env,
      'notification',
      {
        _id: id,
        id,
        type: input.type,
        title: input.title ?? '',
        message: input.message,
        link: input.link,
        read: false,
        createdAt: new Date().toISOString(),
      },
      { userIds: [input.userId], room: `user:${input.userId}` },
    );
  }
  return id;
}

export async function notifyMany(env: Env, userIds: string[], input: Omit<NotifyInput, 'userId'>): Promise<void> {
  for (const userId of new Set(userIds.filter(Boolean))) {
    await notify(env, { ...input, userId });
  }
}

export async function logActivity(
  env: Env,
  input: {
    userId: string;
    type: string;
    targetType?: string;
    targetId?: string;
    message?: string;
    data?: Record<string, unknown>;
    visibility?: string;
  },
): Promise<void> {
  await run(
    env.DB,
    `INSERT INTO activities (id, user_id, type, target_type, target_id, message, data, visibility, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))`,
    newId('act_'),
    input.userId,
    input.type,
    input.targetType ?? null,
    input.targetId ?? null,
    input.message ?? '',
    JSON.stringify(input.data ?? {}),
    input.visibility ?? 'public',
  );
}

export async function trackAnalytics(
  env: Env,
  input: {
    userId?: string | null;
    eventType: string;
    entityType?: string;
    entityId?: string;
    value?: number;
    request?: Request;
  },
): Promise<void> {
  const headers = input.request?.headers;
  const ua = headers?.get('user-agent') ?? '';
  const device = /mobile/i.test(ua) ? 'mobile' : /tablet/i.test(ua) ? 'tablet' : 'desktop';
  await run(
    env.DB,
    `INSERT INTO analytics_events
       (id, user_id, event_type, entity_type, entity_id, session_id, referrer, country, device, value, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))`,
    newId('an_'),
    input.userId ?? null,
    input.eventType,
    input.entityType ?? '',
    input.entityId ?? '',
    '',
    headers?.get('referer') ?? '',
    (input.request as Request & { cf?: { country?: string } })?.cf?.country ?? '',
    device,
    input.value ?? 0,
  );
}

export async function audit(
  env: Env,
  input: { userId?: string | null; action: string; resource?: string; resourceId?: string; details?: unknown },
): Promise<void> {
  await run(
    env.DB,
    `INSERT INTO audit_logs (id, user_id, action, resource, resource_id, details, created_at)
     VALUES (?, ?, ?, ?, ?, ?, datetime('now'))`,
    newId('aud_'),
    input.userId ?? null,
    input.action,
    input.resource ?? null,
    input.resourceId ?? null,
    JSON.stringify(input.details ?? {}),
  );
}
