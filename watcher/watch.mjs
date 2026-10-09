#!/usr/bin/env node
/**
 * Watches the Docker event stream exposed by Portainer and pushes an Expo
 * notification when a container goes down.
 *
 * The `/events` stream is a long-lived HTTP connection that emits one JSON
 * object per line. It is kept open and re-established with exponential
 * backoff, rather than polling the API in a loop.
 */

import http from 'node:http';
import https from 'node:https';

const config = {
  portainerUrl: required('PORTAINER_URL')
    .replace(/\/+$/, '')
    .replace(/\/api$/i, ''),
  portainerToken: required('PORTAINER_TOKEN'),
  endpointId: Number(required('ENDPOINT_ID')),
  pushTokens: required('EXPO_PUSH_TOKENS')
    .split(',')
    .map((token) => token.trim())
    .filter(Boolean),
  /** Containers to ignore, by exact name, comma-separated. */
  ignore: new Set(
    (process.env.IGNORE_CONTAINERS ?? '')
      .split(',')
      .map((name) => name.trim())
      .filter(Boolean),
  ),
  /** De-duplication window: the same alert is not repeated within this delay. */
  dedupeSeconds: Number(process.env.DEDUPE_SECONDS ?? 120),
  /** Accepts Portainer's self-signed certificate, for this stream only. */
  insecureTls: /^(1|true|yes|on)$/i.test(process.env.PORTAINER_INSECURE_TLS ?? ''),
};

function required(name) {
  const value = process.env[name];
  if (!value) {
    console.error(`Missing environment variable: ${name}`);
    process.exit(1);
  }
  return value;
}

if (Number.isNaN(config.endpointId)) {
  console.error('ENDPOINT_ID must be an integer.');
  process.exit(1);
}

/** Overridable for tests; in production, keep the default. */
const EXPO_PUSH_URL = process.env.EXPO_PUSH_URL ?? 'https://exp.host/--/api/v2/push/send';

/**
 * What deserves waking someone up. `die` is deliberately filtered on the exit
 * code: a stop requested from the app exits with 0, and must not trigger an
 * alert.
 */
function describeEvent(event) {
  const action = event.Action ?? '';
  const attributes = event.Actor?.Attributes ?? {};
  const name = attributes.name ?? event.Actor?.ID?.slice(0, 12) ?? 'container';

  if (action === 'die') {
    const exitCode = attributes.exitCode ?? '0';
    if (exitCode === '0') return null;
    return { name, reason: `Exited abnormally (code ${exitCode})`, key: `die:${exitCode}` };
  }
  if (action === 'health_status: unhealthy') {
    return { name, reason: 'Became unhealthy', key: 'unhealthy' };
  }
  if (action === 'oom') {
    return { name, reason: 'Out of memory (OOM)', key: 'oom' };
  }
  if (action === 'restart') {
    return { name, reason: 'Restarted', key: 'restart' };
  }
  return null;
}

const recentAlerts = new Map();

/** Docker can repeat an event when a container is stuck in a restart loop. */
function isDuplicate(containerId, key) {
  const now = Date.now();
  for (const [seen, at] of recentAlerts) {
    if (now - at > config.dedupeSeconds * 1000) recentAlerts.delete(seen);
  }
  const fingerprint = `${containerId}:${key}`;
  if (recentAlerts.has(fingerprint)) return true;
  recentAlerts.set(fingerprint, now);
  return false;
}

async function push(alert, containerId) {
  const messages = config.pushTokens.map((to) => ({
    to,
    sound: 'default',
    title: alert.name,
    body: alert.reason,
    priority: 'high',
    channelId: 'containers',
    data: {
      endpointId: config.endpointId,
      containerId,
      containerName: alert.name,
      reason: alert.reason,
    },
  }));

  const response = await fetch(EXPO_PUSH_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify(messages),
  });

  if (!response.ok) {
    console.error(`Expo refused the push (HTTP ${response.status}): ${await response.text()}`);
    return;
  }

  // Expo answers 200 even when a token is invalid: the detail is in the tickets.
  const { data } = await response.json();
  for (const ticket of data ?? []) {
    if (ticket.status === 'error') {
      console.error(`Ticket error: ${ticket.message} (${ticket.details?.error ?? '?'})`);
    }
  }
  console.log(`Alert sent: ${alert.name} — ${alert.reason}`);
}

function eventsUrl() {
  const filters = encodeURIComponent(JSON.stringify({ type: ['container'] }));
  return `${config.portainerUrl}/api/endpoints/${config.endpointId}/docker/events?filters=${filters}`;
}

/**
 * The stream goes through `node:https` rather than `fetch`, so TLS
 * verification is only relaxed on this connection. `NODE_TLS_REJECT_UNAUTHORIZED=0`
 * would relax it for the whole process, including the push to Expo, which
 * crosses the Internet.
 */
function openEventStream() {
  const url = new URL(eventsUrl());
  const client = url.protocol === 'https:' ? https : http;
  return new Promise((resolve, reject) => {
    const request = client.request(
      url,
      {
        headers: { 'X-API-Key': config.portainerToken, Accept: 'application/json' },
        rejectUnauthorized: !config.insecureTls,
      },
      resolve,
    );
    request.on('error', reject);
    request.end();
  });
}

const TLS_ERRORS = new Set([
  'DEPTH_ZERO_SELF_SIGNED_CERT',
  'SELF_SIGNED_CERT_IN_CHAIN',
  'UNABLE_TO_VERIFY_LEAF_SIGNATURE',
  'ERR_TLS_CERT_ALTNAME_INVALID',
]);

function describeConnectionError(error) {
  if (TLS_ERRORS.has(error?.code)) {
    return (
      `Certificate rejected (${error.code}). By default Portainer presents a ` +
      'self-signed certificate: if this service and Portainer run on the same ' +
      'machine, set PORTAINER_INSECURE_TLS=1. Otherwise, give Portainer a valid ' +
      'certificate.'
    );
  }
  // A connection failure often surfaces as an AggregateError (dual IPv4/IPv6
  // stack) with an empty message: without this case, the log would say nothing.
  if (error instanceof AggregateError) {
    const causes = [...new Set(error.errors.map((e) => e.code || e.message).filter(Boolean))];
    return `Cannot connect (${causes.join(', ') || 'unknown cause'}).`;
  }
  return error?.message || error?.code || String(error);
}

async function readAll(stream) {
  let text = '';
  for await (const chunk of stream) text += chunk.toString('utf8');
  return text;
}

async function consumeEvents() {
  let response;
  try {
    response = await openEventStream();
  } catch (error) {
    throw new Error(describeConnectionError(error));
  }

  if (response.statusCode < 200 || response.statusCode >= 300) {
    const body = await readAll(response);
    throw new Error(`Portainer refused the stream (HTTP ${response.statusCode}): ${body.trim()}`);
  }

  console.log(`Connected to the event stream of environment ${config.endpointId}.`);

  let buffer = '';
  for await (const chunk of response) {
    buffer += Buffer.from(chunk).toString('utf8');

    // The stream is NDJSON: a line can arrive split across two packets.
    let newline;
    while ((newline = buffer.indexOf('\n')) !== -1) {
      const line = buffer.slice(0, newline).trim();
      buffer = buffer.slice(newline + 1);
      if (line) handleLine(line);
    }
  }

  throw new Error('The server closed the stream.');
}

function handleLine(line) {
  let event;
  try {
    event = JSON.parse(line);
  } catch {
    console.error(`Ignoring unreadable line: ${line.slice(0, 120)}`);
    return;
  }

  const alert = describeEvent(event);
  if (!alert) return;
  if (config.ignore.has(alert.name)) return;

  const containerId = event.Actor?.ID ?? '';
  if (isDuplicate(containerId, alert.key)) return;

  push(alert, containerId).catch((error) => console.error(`Push failed: ${error.message}`));
}

async function main() {
  console.log(
    `Watching ${config.portainerUrl} · environment ${config.endpointId} · ${config.pushTokens.length} device(s).`,
  );
  if (config.insecureTls) {
    console.log(
      'TLS verification disabled for the Portainer stream. The push to Expo is still verified.',
    );
  }

  let backoff = 1000;
  for (;;) {
    try {
      await consumeEvents();
      backoff = 1000;
    } catch (error) {
      console.error(`Stream interrupted: ${error.message}`);
    }
    console.log(`Retrying in ${Math.round(backoff / 1000)} s.`);
    await new Promise((resolve) => setTimeout(resolve, backoff));
    backoff = Math.min(backoff * 2, 60_000);
  }
}

main();
