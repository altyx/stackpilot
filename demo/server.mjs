// Fake Portainer API serving a fixed homelab, for store screenshots and the
// accounts store reviewers sign in with. Answers the routes StackPilot calls,
// with the shapes of src/api/types.ts. See README.md.
import { createHash, timingSafeEqual } from 'node:crypto';
import http from 'node:http';

const PORT = Number(process.env.PORT ?? process.argv[2] ?? 9000);
const USERNAME = process.env.DEMO_USERNAME ?? 'demo';
const PASSWORD = process.env.DEMO_PASSWORD ?? 'stackpilot-demo';
const API_KEY = process.env.DEMO_API_KEY ?? 'ptr_stackpilot-demo';
// Reviewers stop, delete and prune: the homelab comes back after a while, so
// the next one finds it whole.
const RESET_MINUTES = Number(process.env.DEMO_RESET_MINUTES ?? 30);
const NOW = Date.now();
const DAY = 86_400_000;
const GB = 1_000_000_000;
const MB = 1_000_000;

const hex = (seed) => createHash('sha256').update(seed).digest('hex');
const iso = (ms) => new Date(ms).toISOString();
const unix = (ms) => Math.floor(ms / 1000);

// ---------------------------------------------------------------- images
const IMAGES = [
  ['ghcr.io/immich-app/immich-server:release', 1.21 * GB, 12],
  ['ghcr.io/immich-app/immich-machine-learning:release', 1.52 * GB, 12],
  ['tensorchord/pgvecto-rs:pg14-v0.2.0', 0.452 * GB, 64],
  ['redis:7.4-alpine', 0.041 * GB, 20],
  ['traefik:v3.1', 0.182 * GB, 30],
  ['nextcloud:29-apache', 1.24 * GB, 18],
  ['mariadb:11.4', 0.405 * GB, 25],
  ['grafana/grafana:11.2.0', 0.466 * GB, 22],
  ['prom/prometheus:v2.54.1', 0.289 * GB, 22],
  ['prom/node-exporter:v1.8.2', 0.023 * GB, 40],
  ['gcr.io/cadvisor/cadvisor:v0.49.1', 0.081 * GB, 60],
  ['vaultwarden/server:1.32.0', 0.239 * GB, 15],
  ['ghcr.io/home-assistant/home-assistant:stable', 1.83 * GB, 9],
  ['eclipse-mosquitto:2', 0.013 * GB, 50],
  ['ghcr.io/paperless-ngx/paperless-ngx:2.12', 1.61 * GB, 21],
  ['portainer/portainer-ee:2.21.2', 0.293 * GB, 28],
  ['louislam/uptime-kuma:1', 0.452 * GB, 33],
  ['restic/restic:0.17.1', 0.031 * GB, 26],
  // Left behind by updates and builds: nothing runs on them.
  ['nextcloud:28-apache', 1.12 * GB, 95],
  ['postgres:15-alpine', 0.245 * GB, 120],
  ['node:20-alpine', 0.135 * GB, 80],
  ['dangling-seed-2', 0.612 * GB, 44],
  ['dangling-seed-4', 0.208 * GB, 71],
].map(([tag, size, ageDays]) => ({
  Id: `sha256:${hex(tag)}`,
  ParentId: '',
  RepoTags: tag.startsWith('dangling-') ? null : [tag],
  RepoDigests: !tag.startsWith('dangling-')
    ? [`${tag.split(':')[0]}@sha256:${hex(`digest-${tag}`)}`]
    : null,
  Created: unix(NOW - ageDays * DAY),
  Size: Math.round(size),
  SharedSize: 0,
  Labels: null,
}));
const imageId = (tag) => IMAGES.find((image) => image.RepoTags?.[0] === tag).Id;

// Images the registry has a newer build of, per Portainer's indicator.
const OUTDATED = new Set([
  'ghcr.io/immich-app/immich-server:release',
  'ghcr.io/immich-app/immich-machine-learning:release',
  'grafana/grafana:11.2.0',
]);

// ------------------------------------------------------------ containers
const C = (name, image, opts = {}) => ({ name, image, ...opts });
const CONTAINERS = [
  C('traefik', 'traefik:v3.1', {
    stack: 'traefik',
    health: 'healthy',
    up: '6 days',
    cpu: 1.2,
    mem: 64,
    vols: [['traefik_letsencrypt', '/letsencrypt']],
  }),
  C('immich-server', 'ghcr.io/immich-app/immich-server:release', {
    stack: 'immich',
    health: 'healthy',
    up: '2 days',
    cpu: 6.8,
    mem: 742,
    vols: [['immich_upload', '/usr/src/app/upload']],
  }),
  C('immich-machine-learning', 'ghcr.io/immich-app/immich-machine-learning:release', {
    stack: 'immich',
    health: 'healthy',
    up: '2 days',
    cpu: 38.4,
    mem: 1910,
    vols: [['immich_model-cache', '/cache']],
  }),
  C('immich-postgres', 'tensorchord/pgvecto-rs:pg14-v0.2.0', {
    stack: 'immich',
    health: 'healthy',
    up: '2 days',
    cpu: 2.1,
    mem: 389,
    vols: [['immich_pgdata', '/var/lib/postgresql/data']],
  }),
  C('immich-redis', 'redis:7.4-alpine', {
    stack: 'immich',
    health: 'healthy',
    up: '2 days',
    cpu: 0.4,
    mem: 12,
  }),
  C('nextcloud-app', 'nextcloud:29-apache', {
    stack: 'nextcloud',
    up: '11 days',
    cpu: 3.6,
    mem: 286,
    vols: [['nextcloud_html', '/var/www/html']],
  }),
  C('nextcloud-cron', 'nextcloud:29-apache', {
    stack: 'nextcloud',
    up: '11 days',
    cpu: 0.2,
    mem: 41,
    vols: [['nextcloud_html', '/var/www/html']],
  }),
  C('nextcloud-db', 'mariadb:11.4', {
    stack: 'nextcloud',
    health: 'healthy',
    up: '11 days',
    cpu: 1.4,
    mem: 214,
    vols: [['nextcloud_db', '/var/lib/mysql']],
  }),
  C('grafana', 'grafana/grafana:11.2.0', {
    stack: 'monitoring',
    up: '4 days',
    cpu: 0.9,
    mem: 118,
    vols: [['monitoring_grafana-data', '/var/lib/grafana']],
  }),
  C('prometheus', 'prom/prometheus:v2.54.1', {
    stack: 'monitoring',
    up: '4 days',
    cpu: 4.3,
    mem: 512,
    vols: [['monitoring_prometheus-data', '/prometheus']],
  }),
  C('node-exporter', 'prom/node-exporter:v1.8.2', {
    stack: 'monitoring',
    up: '4 days',
    cpu: 0.6,
    mem: 18,
  }),
  C('cadvisor', 'gcr.io/cadvisor/cadvisor:v0.49.1', {
    stack: 'monitoring',
    health: 'healthy',
    up: '4 days',
    cpu: 5.2,
    mem: 96,
  }),
  C('vaultwarden', 'vaultwarden/server:1.32.0', {
    stack: 'vaultwarden',
    health: 'healthy',
    up: '9 days',
    cpu: 0.1,
    mem: 27,
    vols: [['vaultwarden_data', '/data']],
  }),
  C('homeassistant', 'ghcr.io/home-assistant/home-assistant:stable', {
    stack: 'home-assistant',
    up: '3 days',
    cpu: 2.7,
    mem: 431,
  }),
  C('mosquitto', 'eclipse-mosquitto:2', {
    stack: 'home-assistant',
    up: '3 days',
    cpu: 0.1,
    mem: 6,
  }),
  C('paperless-webserver', 'ghcr.io/paperless-ngx/paperless-ngx:2.12', {
    stack: 'paperless',
    health: 'healthy',
    up: '5 days',
    cpu: 1.8,
    mem: 455,
    vols: [
      ['paperless_data', '/usr/src/paperless/data'],
      ['paperless_media', '/usr/src/paperless/media'],
    ],
  }),
  C('paperless-broker', 'redis:7.4-alpine', {
    stack: 'paperless',
    health: 'healthy',
    up: '5 days',
    cpu: 0.3,
    mem: 9,
  }),
  C('portainer', 'portainer/portainer-ee:2.21.2', {
    up: '6 days',
    cpu: 0.5,
    mem: 71,
    portainer: true,
    vols: [['portainer_data', '/data']],
  }),
  C('uptime-kuma', 'louislam/uptime-kuma:1', {
    health: 'healthy',
    up: '6 days',
    cpu: 1.1,
    mem: 103,
    vols: [['uptime-kuma', '/app/data']],
  }),
  C('restic-backup', 'restic/restic:0.17.1', {
    exited: 1,
    ago: '2 hours',
    vols: [['paperless_media', '/source/paperless', false]],
  }),
].map((spec) => {
  const id = hex(`container-${spec.name}`);
  const upDays = spec.up ? Number.parseInt(spec.up, 10) || 1 : 7;
  return {
    ...spec,
    id,
    created: NOW - (upDays + 3) * DAY,
    initial: spec.exited === undefined ? 'running' : 'exited',
    initialStartedAt: spec.exited === undefined ? NOW - upDays * DAY : NOW - 2.2 * 3_600_000,
  };
});
const byId = new Map(CONTAINERS.map((c) => [c.id, c]));

// ------------------------------------------------------- mutable state
// What reviewers change: container states, deletions, stack variables.
let live;
function reset() {
  for (const c of CONTAINERS) {
    c.state = c.initial;
    c.startedAt = c.initialStartedAt;
    c.exitCode = c.exited ?? 0;
  }
  live = {
    removedContainers: new Set(),
    removedImages: new Set(),
    removedVolumes: new Set(),
    stackEnv: new Map(),
    stackUpdated: new Map(),
  };
}
reset();
setInterval(reset, RESET_MINUTES * 60_000).unref();

const containers = () => CONTAINERS.filter((c) => !live.removedContainers.has(c.id));
const images = () => IMAGES.filter((image) => !live.removedImages.has(image.Id));
const volumes = () => VOLUMES.filter((v) => !live.removedVolumes.has(v.name));
const running = (c) => c.state === 'running' || c.state === 'paused';

const since = (ms) => {
  const minutes = Math.round((Date.now() - ms) / 60_000);
  if (minutes < 1) return 'Less than a second';
  if (minutes < 60) return `${minutes} minute${minutes === 1 ? '' : 's'}`;
  const hours = Math.round(minutes / 60);
  if (hours < 48) return `${hours} hour${hours === 1 ? '' : 's'}`;
  return `${Math.round(hours / 24)} days`;
};
const statusOf = (c) => {
  if (c.state === 'paused') return `Up ${since(c.startedAt)} (Paused)`;
  if (c.state === 'running') return `Up ${since(c.startedAt)}${c.health ? ` (${c.health})` : ''}`;
  return `Exited (${c.exitCode}) ${since(c.finishedAt ?? NOW - 2 * 3_600_000)} ago`;
};

const labelsOf = (c) =>
  c.stack
    ? {
        'com.docker.compose.project': c.stack,
        'com.docker.compose.service': c.name.replace(`${c.stack}-`, ''),
      }
    : {};
const mountsOf = (c) =>
  (c.vols ?? []).map(([name, destination, rw = true]) => ({
    Type: 'volume',
    Name: name,
    Source: `/var/lib/docker/volumes/${name}/_data`,
    Destination: destination,
    RW: rw,
  }));

const summary = (c) => ({
  Id: c.id,
  Names: [`/${c.name}`],
  Image: c.image,
  ImageID: imageId(c.image),
  Command: '',
  Created: unix(c.created),
  State: c.state,
  Status: statusOf(c),
  Ports: [],
  Labels: labelsOf(c),
  Mounts: mountsOf(c),
});

const ENV = {
  'immich-server': [
    'TZ=Europe/Paris',
    'DB_HOSTNAME=immich-postgres',
    'DB_USERNAME=postgres',
    'DB_PASSWORD=s3cret',
    'DB_DATABASE_NAME=immich',
    'REDIS_HOSTNAME=immich-redis',
    'UPLOAD_LOCATION=/mnt/tank/photos',
  ],
};

const inspect = (c) => ({
  Id: c.id,
  Name: `/${c.name}`,
  Created: iso(c.created),
  Image: imageId(c.image),
  State: {
    Status: c.state,
    Running: running(c),
    Paused: c.state === 'paused',
    Restarting: false,
    ExitCode: running(c) ? 0 : c.exitCode,
    StartedAt: iso(c.startedAt),
    FinishedAt: running(c) ? '0001-01-01T00:00:00Z' : iso(c.finishedAt ?? NOW - 2 * 3_600_000),
    ...(c.health && running(c) ? { Health: { Status: c.health, FailingStreak: 0 } } : {}),
  },
  Config: {
    Image: c.image,
    Env: ENV[c.name] ?? [
      'TZ=Europe/Paris',
      'PATH=/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin',
    ],
    Cmd: null,
    Labels: labelsOf(c),
  },
  HostConfig: {
    RestartPolicy: {
      Name: c.initial === 'running' ? 'unless-stopped' : 'no',
      MaximumRetryCount: 0,
    },
    NetworkMode: c.stack ? `${c.stack}_default` : 'bridge',
  },
  Mounts: mountsOf(c),
  NetworkSettings: {
    Networks: Object.fromEntries(
      [
        c.stack ? `${c.stack}_default` : 'bridge',
        ...([
          'immich-server',
          'nextcloud-app',
          'grafana',
          'vaultwarden',
          'paperless-webserver',
        ].includes(c.name)
          ? ['proxy']
          : []),
      ].map((n, i) => [
        n,
        {
          IPAddress: `172.${18 + i}.0.${(c.id.charCodeAt(0) % 200) + 2}`,
          Gateway: `172.${18 + i}.0.1`,
        },
      ]),
    ),
  },
  IsPortainer: c.portainer === true,
});

// Two readings a second apart, as `docker stats --no-stream` makes them.
const CORES = 8;
const stats = (c) => {
  const systemDelta = 1_000_000_000 * CORES;
  const cpuDelta = Math.round(((c.cpu ?? 0) / 100 / CORES) * systemDelta);
  return {
    cpu_stats: {
      cpu_usage: { total_usage: 9_000_000_000 + cpuDelta },
      system_cpu_usage: 500_000_000_000 + systemDelta,
      online_cpus: CORES,
    },
    precpu_stats: {
      cpu_usage: { total_usage: 9_000_000_000 },
      system_cpu_usage: 500_000_000_000,
      online_cpus: CORES,
    },
    memory_stats: {
      usage: Math.round((c.mem ?? 10) * 1.12 * MB),
      limit: 32 * GB,
      stats: { inactive_file: Math.round((c.mem ?? 10) * 0.12 * MB) },
    },
  };
};

// ------------------------------------------------------------- volumes
const VOLUMES = [
  ['immich_pgdata', 2.41 * GB, 'immich'],
  ['immich_model-cache', 1.07 * GB, 'immich'],
  ['immich_upload', 38.6 * GB, 'immich'],
  ['nextcloud_html', 0.512 * GB, 'nextcloud'],
  ['nextcloud_db', 0.384 * GB, 'nextcloud'],
  ['monitoring_grafana-data', 0.046 * GB, 'monitoring'],
  ['monitoring_prometheus-data', 3.18 * GB, 'monitoring'],
  ['vaultwarden_data', 0.012 * GB, 'vaultwarden'],
  ['paperless_data', 0.151 * GB, 'paperless'],
  ['paperless_media', 4.62 * GB, 'paperless'],
  ['traefik_letsencrypt', 0.00003 * GB, 'traefik'],
  ['portainer_data', 0.0081 * GB, null],
  ['uptime-kuma', 0.061 * GB, null],
  ['old-postgres-data', 0.82 * GB, null],
  ['minecraft_world', 1.94 * GB, 'minecraft'],
].map(([name, size, project, anonymous], index) => ({
  name,
  size: Math.round(size),
  summary: {
    Name: name,
    Driver: 'local',
    Mountpoint: `/var/lib/docker/volumes/${name}/_data`,
    CreatedAt: iso(NOW - (20 + index * 9) * DAY),
    Scope: 'local',
    Labels: anonymous
      ? { 'com.docker.volume.anonymous': '' }
      : project
        ? {
            'com.docker.compose.project': project,
            'com.docker.compose.volume': name.replace(`${project}_`, ''),
          }
        : null,
    Options: null,
  },
}));

const refCount = (name) =>
  containers().filter((c) => (c.vols ?? []).some(([v]) => v === name)).length;

// --------------------------------------------------------------- stacks
const COMPOSE_IMMICH = `name: immich

services:
  immich-server:
    container_name: immich-server
    image: ghcr.io/immich-app/immich-server:\${IMMICH_VERSION:-release}
    volumes:
      - \${UPLOAD_LOCATION}:/usr/src/app/upload
      - /etc/localtime:/etc/localtime:ro
    environment:
      DB_PASSWORD: \${DB_PASSWORD}
    depends_on:
      - redis
      - database
    restart: always
    healthcheck:
      disable: false

  immich-machine-learning:
    container_name: immich-machine-learning
    image: ghcr.io/immich-app/immich-machine-learning:\${IMMICH_VERSION:-release}
    volumes:
      - model-cache:/cache
    restart: always

  redis:
    container_name: immich-redis
    image: redis:7.4-alpine
    restart: always

  database:
    container_name: immich-postgres
    image: tensorchord/pgvecto-rs:pg14-v0.2.0
    environment:
      POSTGRES_PASSWORD: \${DB_PASSWORD}
      POSTGRES_USER: \${DB_USERNAME}
      POSTGRES_DB: \${DB_DATABASE_NAME}
    volumes:
      - pgdata:/var/lib/postgresql/data
    restart: always

volumes:
  model-cache:
  pgdata:
`;

const S = (id, name, opts = {}) => ({
  Id: id,
  Name: name,
  Type: 2,
  EndpointId: 1,
  EntryPoint: 'docker-compose.yml',
  Env: [],
  Status: 1,
  CreationDate: unix(NOW - (40 + id * 6) * DAY),
  CreatedBy: 'admin',
  UpdateDate: unix(NOW - (2 + id) * DAY),
  UpdatedBy: 'admin',
  GitConfig: null,
  AutoUpdate: null,
  ...opts,
});
const STACKS = [
  S(3, 'immich', {
    EntryPoint: 'immich/docker-compose.yml',
    UpdateDate: unix(NOW - 2 * DAY),
    GitConfig: {
      URL: 'https://github.com/homelab/stacks.git',
      ReferenceName: 'refs/heads/main',
      ConfigFilePath: 'immich/docker-compose.yml',
    },
    AutoUpdate: { Interval: '1h' },
    Env: [
      { name: 'IMMICH_VERSION', value: 'release' },
      { name: 'UPLOAD_LOCATION', value: '/mnt/tank/photos' },
      { name: 'DB_USERNAME', value: 'postgres' },
      { name: 'DB_PASSWORD', value: 'correct-horse-battery' },
      { name: 'DB_DATABASE_NAME', value: 'immich' },
      { name: 'TZ', value: 'Europe/Paris' },
    ],
  }),
  S(1, 'traefik', {
    Env: [
      { name: 'ACME_EMAIL', value: 'admin@example.com' },
      { name: 'CF_DNS_API_TOKEN', value: 'cf-token' },
    ],
  }),
  S(2, 'nextcloud', {
    Env: [
      { name: 'MYSQL_PASSWORD', value: 'x' },
      { name: 'NEXTCLOUD_TRUSTED_DOMAINS', value: 'cloud.example.com' },
    ],
  }),
  S(4, 'monitoring', {
    GitConfig: {
      URL: 'https://github.com/homelab/stacks.git',
      ReferenceName: 'refs/heads/main',
      ConfigFilePath: 'monitoring/docker-compose.yml',
    },
    AutoUpdate: { Interval: '1h' },
  }),
  S(5, 'vaultwarden', {
    Env: [
      { name: 'DOMAIN', value: 'https://vault.example.com' },
      { name: 'ADMIN_TOKEN', value: 'x' },
    ],
  }),
  S(6, 'paperless'),
  S(7, 'minecraft', { Status: 2, UpdateDate: unix(NOW - 30 * DAY) }),
];

const STACK_OUTDATED = new Set(['immich', 'monitoring']);

// -------------------------------------------------------------- logs
const LOGS = [
  ['Initializing Immich v1.117.0'],
  ['Detected CPU Cores: 8'],
  ['Starting api worker'],
  ['Starting microservices worker'],
  ['[Nest] 7  - LOG [Microservices:EventRepository] Initialized websocket server'],
  ['[Nest] 7  - LOG [Microservices:MapRepository] Initializing metadata repository'],
  ['[Nest] 17 - LOG [Api:NestFactory] Starting Nest application...'],
  ['[Nest] 17 - LOG [Api:InstanceLoader] TypeOrmModule dependencies initialized'],
  ['[Nest] 17 - LOG [Api:RoutesResolver] ServerController {/api/server}'],
  ['[Nest] 17 - LOG [Api:NestApplication] Nest application successfully started'],
  [
    '[Nest] 17 - LOG [Api:Bootstrap] Immich Server is listening on http://[::1]:2283 [v1.117.0] [PRODUCTION]',
  ],
  ['[Nest] 7  - LOG [Microservices:JobService] Queueing thumbnail generation for 24 assets'],
  ['[Nest] 7  - LOG [Microservices:MediaService] Generated thumbnails for IMG_4821.HEIC'],
  ['[Nest] 7  - LOG [Microservices:MediaService] Generated thumbnails for IMG_4822.HEIC'],
  ['[Nest] 7  - LOG [Microservices:MetadataService] Extracted metadata for 24 assets'],
  ['[Nest] 17 - LOG [Api:EventRepository] Websocket Connect: Wv1u7Y0pTi4tXnBzAAAB'],
  ['[Nest] 7  - LOG [Microservices:SmartInfoService] Encoded CLIP embeddings for 24 assets'],
  ['[Nest] 7  - LOG [Microservices:PersonService] Detected 3 faces in IMG_4822.HEIC'],
  ['[Nest] 17 - LOG [Api:AssetMediaService] Upload complete: 12 assets from iPhone'],
  ['[Nest] 7  - LOG [Microservices:JobService] Library scan finished in 1.42s'],
];
const logText = () => {
  const start = NOW - 25 * 60_000;
  return (
    LOGS.map(([text], i) => `${iso(start + i * 73_421).replace('Z', '123456Z')} ${text}`).join(
      '\n',
    ) + '\n'
  );
};

// ------------------------------------------------------------- routes
const ENDPOINTS = [
  {
    Id: 1,
    Name: 'homelab',
    Type: 1,
    URL: 'unix:///var/run/docker.sock',
    Status: 1,
    EnableImageNotification: true,
    Snapshots: [],
  },
  {
    Id: 2,
    Name: 'vps-frankfurt',
    Type: 2,
    URL: 'tcp://10.8.0.12:9001',
    Status: 1,
    EnableImageNotification: true,
    Snapshots: [
      {
        DockerVersion: '27.2.0',
        RunningContainerCount: 7,
        StoppedContainerCount: 0,
        ImageCount: 9,
      },
    ],
  },
  {
    Id: 3,
    Name: 'raspberry-pi',
    Type: 2,
    URL: 'tcp://192.168.1.42:9001',
    Status: 1,
    EnableImageNotification: false,
    Snapshots: [
      {
        DockerVersion: '26.1.4',
        RunningContainerCount: 4,
        StoppedContainerCount: 2,
        ImageCount: 6,
      },
    ],
  },
];

const endpoint = (e) =>
  e.Id !== 1
    ? e
    : {
        ...e,
        Snapshots: [
          {
            DockerVersion: '27.3.1',
            RunningContainerCount: containers().filter(running).length,
            StoppedContainerCount: containers().filter((c) => !running(c)).length,
            ImageCount: images().length,
            VolumeCount: volumes().length,
            StackCount: STACKS.length + 1,
          },
        ],
      };

const stack = (s) => ({
  ...s,
  Env: live.stackEnv.get(s.Id) ?? s.Env,
  UpdateDate: live.stackUpdated.get(s.Id) ?? s.UpdateDate,
});

// A failure the client turns into a PortainerError, as Docker words it.
class HttpError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}
const NO_CONTENT = Symbol('no content');

// Docker answers 304 when the container is already in the requested state.
function containerAction(c, action) {
  const was = c.state;
  const now = Date.now();
  if (action === 'start') {
    if (running(c)) return 304;
    c.state = 'running';
    c.startedAt = now;
  } else if (action === 'stop' || action === 'kill') {
    if (!running(c)) return 304;
    c.state = 'exited';
    c.exitCode = action === 'kill' ? 137 : 0;
    c.finishedAt = now;
  } else if (action === 'restart') {
    c.state = 'running';
    c.startedAt = now;
  } else if (action === 'pause') {
    if (c.state !== 'running') throw new HttpError(409, `Container ${c.id} is not running`);
    c.state = 'paused';
  } else if (action === 'unpause') {
    if (c.state !== 'paused') throw new HttpError(409, `Container ${c.id} is not paused`);
    c.state = 'running';
  } else {
    return undefined;
  }
  return was === c.state && action !== 'restart' ? 304 : NO_CONTENT;
}

function pruneImages(query) {
  const filters = JSON.parse(query.get('filters') ?? '{}');
  const danglingOnly = filters.dangling?.[0] !== 'false';
  const used = new Set(containers().map((c) => imageId(c.image)));
  const pruned = images().filter((i) => !used.has(i.Id) && (!danglingOnly || !i.RepoTags));
  for (const i of pruned) live.removedImages.add(i.Id);
  return {
    ImagesDeleted: pruned.length ? pruned.map((i) => ({ Deleted: i.Id })) : null,
    SpaceReclaimed: pruned.reduce((sum, i) => sum + i.Size, 0),
  };
}

function pruneVolumes(query) {
  const filters = JSON.parse(query.get('filters') ?? '{}');
  const all = filters.all?.[0] === 'true';
  // Without `all`, Docker 23+ only prunes anonymous volumes.
  const pruned = volumes().filter(
    (v) =>
      refCount(v.name) === 0 &&
      (all || v.summary.Labels?.['com.docker.volume.anonymous'] !== undefined),
  );
  for (const v of pruned) live.removedVolumes.add(v.name);
  return {
    VolumesDeleted: pruned.length ? pruned.map((v) => v.name) : null,
    SpaceReclaimed: pruned.reduce((sum, v) => sum + v.size, 0),
  };
}

function route(method, path, query, body) {
  if (path === '/api/status') return { Version: '2.21.2', InstanceID: 'demo' };
  if (path === '/api/endpoints') return ENDPOINTS.map(endpoint);
  let m;
  if ((m = path.match(/^\/api\/endpoints\/(\d+)$/))) {
    const found = ENDPOINTS.find((e) => e.Id === Number(m[1]));
    return found && endpoint(found);
  }
  if (path === '/api/stacks') return STACKS.map(stack);
  if ((m = path.match(/^\/api\/stacks\/(\d+)(\/git\/redeploy)?$/)) && method === 'PUT') {
    const found = STACKS.find((s) => s.Id === Number(m[1]));
    if (!found) return undefined;
    if (Array.isArray(body?.Env)) live.stackEnv.set(found.Id, body.Env);
    live.stackUpdated.set(found.Id, unix(Date.now()));
    for (const c of containers().filter((c) => c.stack === found.Name)) {
      c.state = 'running';
      c.startedAt = Date.now();
    }
    return stack(found);
  }
  if ((m = path.match(/^\/api\/stacks\/(\d+)\/file$/))) {
    const found = STACKS.find((s) => s.Id === Number(m[1]));
    return {
      StackFileContent:
        found?.Name === 'immich'
          ? COMPOSE_IMMICH
          : `services:\n  ${found?.Name}:\n    image: ${found?.Name}\n`,
    };
  }
  if ((m = path.match(/^\/api\/stacks\/(\d+)\/images_status$/))) {
    const found = STACKS.find((s) => s.Id === Number(m[1]));
    return { Status: STACK_OUTDATED.has(found?.Name) ? 'outdated' : 'updated' };
  }
  if ((m = path.match(/^\/api\/docker\/\d+\/containers\/([0-9a-f]+)\/(image_status|recreate)$/))) {
    const c = byId.get(m[1]);
    if (!c || live.removedContainers.has(c.id)) return undefined;
    if (m[2] === 'recreate') {
      c.state = 'running';
      c.startedAt = Date.now();
      return inspect(c);
    }
    return { Status: OUTDATED.has(c.image) ? 'outdated' : 'updated' };
  }
  if (!(m = path.match(/^\/api\/endpoints\/(\d+)\/docker(\/.*)$/))) return undefined;
  const local = Number(m[1]) === 1;
  const docker = m[2];
  if (docker === '/containers/json') return local ? containers().map(summary) : [];
  if (docker === '/images/json') return local ? images() : [];
  if (docker === '/volumes') {
    return { Volumes: local ? volumes().map((v) => v.summary) : [], Warnings: null };
  }
  if (docker === '/info') {
    return {
      NCPU: CORES,
      MemTotal: 32 * GB,
      ServerVersion: '27.3.1',
      OperatingSystem: 'Debian GNU/Linux 12 (bookworm)',
    };
  }
  if (docker === '/system/df') {
    return {
      LayersSize: 11.8 * GB,
      Images: images().map((image) => ({
        Size: image.Size,
        SharedSize: Math.round(image.Size * 0.15),
        Containers: containers().filter((c) => imageId(c.image) === image.Id).length,
      })),
      Containers: containers().map((c) => ({
        SizeRw: c.initial === 'running' ? 24 * MB : 1.3 * GB,
        State: c.state,
      })),
      Volumes: volumes().map((v) => ({
        Name: v.name,
        UsageData: { Size: v.size, RefCount: refCount(v.name) },
      })),
      BuildCache: [{ Size: 1.38 * GB, InUse: false }],
    };
  }
  if (!local) return undefined;
  if (docker === '/images/prune' && method === 'POST') return pruneImages(query);
  if (docker === '/volumes/prune' && method === 'POST') return pruneVolumes(query);
  if ((m = docker.match(/^\/images\/(.+)$/)) && method === 'DELETE') {
    const id = decodeURIComponent(m[1]);
    const image = images().find((i) => i.Id === id || i.RepoTags?.includes(id));
    if (!image) return undefined;
    if (containers().some((c) => imageId(c.image) === image.Id)) {
      throw new HttpError(409, `conflict: unable to delete ${id} - image is being used`);
    }
    live.removedImages.add(image.Id);
    return [...(image.RepoTags ?? []).map((tag) => ({ Untagged: tag })), { Deleted: image.Id }];
  }
  if ((m = docker.match(/^\/volumes\/(.+)$/)) && method === 'DELETE') {
    const name = decodeURIComponent(m[1]);
    if (!volumes().some((v) => v.name === name)) return undefined;
    if (refCount(name) > 0) throw new HttpError(409, `remove ${name}: volume is in use`);
    live.removedVolumes.add(name);
    return NO_CONTENT;
  }
  if (!(m = docker.match(/^\/containers\/([0-9a-f]+)(?:\/(\w+))?$/))) return undefined;
  const c = byId.get(m[1]);
  if (!c || live.removedContainers.has(c.id)) return undefined;
  const sub = m[2];
  if (method === 'DELETE' && !sub) {
    if (running(c) && query.get('force') !== 'true') {
      throw new HttpError(409, `cannot remove container "/${c.name}": container is running`);
    }
    live.removedContainers.add(c.id);
    return NO_CONTENT;
  }
  if (method === 'POST') return containerAction(c, sub);
  if (sub === 'json') return inspect(c);
  if (sub === 'stats') return stats(c);
  // Following asks for lines after the last one: nothing new in the demo.
  if (sub === 'logs') return { text: query.get('since') ? '' : logText() };
  return undefined;
}

// --------------------------------------------------------------- auth
const JWT = `demo.${hex(`jwt-${USERNAME}-${PASSWORD}`)}`;
const same = (a, b) =>
  typeof a === 'string' && a.length === b.length && timingSafeEqual(Buffer.from(a), Buffer.from(b));

function authorized(req) {
  const bearer = req.headers.authorization?.replace(/^Bearer /, '');
  return same(req.headers['x-api-key'], API_KEY) || same(bearer, JWT);
}

function login(body) {
  if (same(body?.username, USERNAME) && same(body?.password, PASSWORD)) return { jwt: JWT };
  throw new HttpError(422, 'Invalid credentials');
}

// ------------------------------------------------------------- server
const readBody = (req) =>
  new Promise((resolve) => {
    let raw = '';
    req.on('data', (chunk) => {
      // Nothing the app sends comes close: refuse to buffer anything bigger.
      raw += chunk;
      if (raw.length > 1_000_000) req.destroy();
    });
    req.on('end', () => {
      try {
        resolve(raw ? JSON.parse(raw) : undefined);
      } catch {
        resolve(undefined);
      }
    });
  });

function send(res, status, payload) {
  if (payload === undefined) {
    res.writeHead(status);
    res.end();
    return;
  }
  const text = typeof payload === 'string';
  res.writeHead(status, { 'Content-Type': text ? 'text/plain' : 'application/json' });
  res.end(text ? payload : JSON.stringify(payload));
}

http
  .createServer(async (req, res) => {
    const url = new URL(req.url, 'http://demo');
    const path = url.pathname;
    let status = 200;
    try {
      const body = req.method === 'GET' ? undefined : await readBody(req);
      let result;
      if (path === '/api/auth' && req.method === 'POST') {
        result = login(body);
      } else if (path !== '/api/status' && !authorized(req)) {
        throw new HttpError(401, 'Unauthorized');
      } else {
        result = route(req.method, path, url.searchParams, body);
      }
      if (result === undefined) throw new HttpError(404, 'Not found in the demo');
      if (result === NO_CONTENT || result === 304) {
        status = result === 304 ? 304 : 204;
        send(res, status);
      } else if (result && typeof result === 'object' && Object.keys(result).join() === 'text') {
        send(res, status, result.text);
      } else {
        send(res, status, result);
      }
    } catch (error) {
      status = error instanceof HttpError ? error.status : 500;
      send(res, status, { message: error instanceof Error ? error.message : String(error) });
    }
    console.log(req.method, path, status);
  })
  .listen(PORT, () => console.log(`Demo Portainer on http://localhost:${PORT}`));
