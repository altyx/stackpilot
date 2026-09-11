#!/usr/bin/env node
/**
 * Surveille le flux d'événements Docker exposé par Portainer et pousse une
 * notification Expo quand un conteneur tombe.
 *
 * Le flux `/events` est une connexion HTTP longue qui émet un objet JSON par
 * ligne. On la garde ouverte et on la rétablit avec un recul exponentiel, plutôt
 * que d'interroger l'API en boucle.
 */

import http from 'node:http';
import https from 'node:https';

const config = {
  portainerUrl: required('PORTAINER_URL').replace(/\/+$/, '').replace(/\/api$/i, ''),
  portainerToken: required('PORTAINER_TOKEN'),
  endpointId: Number(required('ENDPOINT_ID')),
  pushTokens: required('EXPO_PUSH_TOKENS')
    .split(',')
    .map((token) => token.trim())
    .filter(Boolean),
  /** Conteneurs à ignorer, par nom exact, séparés par des virgules. */
  ignore: new Set(
    (process.env.IGNORE_CONTAINERS ?? '')
      .split(',')
      .map((name) => name.trim())
      .filter(Boolean),
  ),
  /** Fenêtre anti-doublon : une même alerte n'est pas répétée avant ce délai. */
  dedupeSeconds: Number(process.env.DEDUPE_SECONDS ?? 120),
  /** Accepte le certificat auto-signé de Portainer, pour ce flux uniquement. */
  insecureTls: /^(1|true|yes|on)$/i.test(process.env.PORTAINER_INSECURE_TLS ?? ''),
};

function required(name) {
  const value = process.env[name];
  if (!value) {
    console.error(`Variable d'environnement manquante : ${name}`);
    process.exit(1);
  }
  return value;
}

if (Number.isNaN(config.endpointId)) {
  console.error('ENDPOINT_ID doit être un entier.');
  process.exit(1);
}

/** Surchargeable pour les tests ; en production, laisser la valeur par défaut. */
const EXPO_PUSH_URL = process.env.EXPO_PUSH_URL ?? 'https://exp.host/--/api/v2/push/send';

/**
 * Ce qui mérite de réveiller quelqu'un. `die` est volontairement filtré sur le
 * code de sortie : un arrêt demandé depuis l'application sort en 0, et n'a pas à
 * déclencher d'alerte.
 */
function describeEvent(event) {
  const action = event.Action ?? '';
  const attributes = event.Actor?.Attributes ?? {};
  const name = attributes.name ?? event.Actor?.ID?.slice(0, 12) ?? 'conteneur';

  if (action === 'die') {
    const exitCode = attributes.exitCode ?? '0';
    if (exitCode === '0') return null;
    return { name, reason: `Arrêt anormal (code ${exitCode})`, key: `die:${exitCode}` };
  }
  if (action === 'health_status: unhealthy') {
    return { name, reason: 'Passé en unhealthy', key: 'unhealthy' };
  }
  if (action === 'oom') {
    return { name, reason: 'Mémoire épuisée (OOM)', key: 'oom' };
  }
  if (action === 'restart') {
    return { name, reason: 'Redémarrage', key: 'restart' };
  }
  return null;
}

const recentAlerts = new Map();

/** Docker peut répéter un événement quand un conteneur boucle sur un redémarrage. */
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
    console.error(`Envoi refusé par Expo (HTTP ${response.status}) : ${await response.text()}`);
    return;
  }

  // Expo répond 200 même quand un jeton est invalide : le détail est dans les tickets.
  const { data } = await response.json();
  for (const ticket of data ?? []) {
    if (ticket.status === 'error') {
      console.error(`Ticket en erreur : ${ticket.message} (${ticket.details?.error ?? '?'})`);
    }
  }
  console.log(`Alerte envoyée : ${alert.name} — ${alert.reason}`);
}

function eventsUrl() {
  const filters = encodeURIComponent(JSON.stringify({ type: ['container'] }));
  return `${config.portainerUrl}/api/endpoints/${config.endpointId}/docker/events?filters=${filters}`;
}

/**
 * Le flux passe par `node:https` et non par `fetch`, afin de n'assouplir la
 * vérification TLS que sur cette connexion. `NODE_TLS_REJECT_UNAUTHORIZED=0`
 * l'assouplirait pour tout le processus, donc aussi pour l'envoi vers Expo, qui
 * traverse Internet.
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
      `Certificat refusé (${error.code}). Portainer présente par défaut un ` +
      'certificat auto-signé : si ce service et Portainer sont sur la même ' +
      'machine, posez PORTAINER_INSECURE_TLS=1. Sinon, donnez un certificat ' +
      'valide à Portainer.'
    );
  }
  // Un échec de connexion remonte souvent en AggregateError (double pile
  // IPv4/IPv6), dont le message est vide : sans ce cas, le journal ne dirait rien.
  if (error instanceof AggregateError) {
    const causes = [...new Set(error.errors.map((e) => e.code || e.message).filter(Boolean))];
    return `Connexion impossible (${causes.join(', ') || 'cause inconnue'}).`;
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
    throw new Error(`Portainer a refusé le flux (HTTP ${response.statusCode}) : ${body.trim()}`);
  }

  console.log(`Connecté au flux d'événements de l'environnement ${config.endpointId}.`);

  let buffer = '';
  for await (const chunk of response) {
    buffer += Buffer.from(chunk).toString('utf8');

    // Le flux est du NDJSON : une ligne peut arriver coupée en deux paquets.
    let newline;
    while ((newline = buffer.indexOf('\n')) !== -1) {
      const line = buffer.slice(0, newline).trim();
      buffer = buffer.slice(newline + 1);
      if (line) handleLine(line);
    }
  }

  throw new Error('Le flux a été fermé par le serveur.');
}

function handleLine(line) {
  let event;
  try {
    event = JSON.parse(line);
  } catch {
    console.error(`Ligne illisible ignorée : ${line.slice(0, 120)}`);
    return;
  }

  const alert = describeEvent(event);
  if (!alert) return;
  if (config.ignore.has(alert.name)) return;

  const containerId = event.Actor?.ID ?? '';
  if (isDuplicate(containerId, alert.key)) return;

  push(alert, containerId).catch((error) => console.error(`Envoi échoué : ${error.message}`));
}

async function main() {
  console.log(
    `Surveillance de ${config.portainerUrl} · environnement ${config.endpointId} · ${config.pushTokens.length} appareil(s).`,
  );
  if (config.insecureTls) {
    console.log(
      'Vérification TLS désactivée pour le flux Portainer. L\'envoi vers Expo reste vérifié.',
    );
  }

  let backoff = 1000;
  for (;;) {
    try {
      await consumeEvents();
      backoff = 1000;
    } catch (error) {
      console.error(`Flux interrompu : ${error.message}`);
    }
    console.log(`Nouvelle tentative dans ${Math.round(backoff / 1000)} s.`);
    await new Promise((resolve) => setTimeout(resolve, backoff));
    backoff = Math.min(backoff * 2, 60_000);
  }
}

main();
