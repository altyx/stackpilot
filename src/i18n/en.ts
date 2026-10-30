import type {
  ContainerAction,
  ImagePruneScope,
  ImageStatus,
  StackAction,
  VolumePruneScope,
} from '../api/types';
import { CERTIFICATE_HELP_EN } from '../help/certificates';
import type { SecondaryAction } from '../lib/containerActions';
import type { DiskCategoryKey } from '../lib/disk';
import { formatBytes, formatDate, formatPercent, plural, type LocaleFormat } from '../lib/format';
import type { LogRangeKey } from '../lib/logs';
import type { ProblemKind } from '../lib/overview';
import type { UpdateBlocker } from '../lib/recreate';
import type { EnvDiff, EnvError } from '../lib/stackEnv';
import type { StackKind } from '../lib/stacks';
import type { Appearance } from '../settings/storage';

const format: LocaleFormat = {
  months: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'],
  dateTime: (day, time) => `${day}, ${time}`,
  decimal: '.',
  byteUnits: ['B', 'kB', 'MB', 'GB', 'TB'],
  percent: (value) => `${value}%`,
};

const CONTAINER_STATES: Record<string, string> = {
  created: 'Created',
  running: 'Running',
  paused: 'Paused',
  restarting: 'Restarting',
  removing: 'Removing',
  exited: 'Stopped',
  dead: 'Dead',
};

const CONTAINER_ACTIONS: Record<ContainerAction, string> = {
  start: 'Start',
  stop: 'Stop',
  restart: 'Restart',
  pause: 'Pause',
  unpause: 'Resume',
  kill: 'Kill',
};

const containers = (count: number) => plural(count, 'container');
const images = (count: number) => plural(count, 'image');
const volumes = (count: number) => plural(count, 'volume');

/**
 * English, the reference catalog: its shape is the `Strings` type every other
 * language must fill in full.
 */
export const en = {
  date: (value: string | number) => formatDate(value, format),
  bytes: (value: number) => formatBytes(value, format),
  percent: (value: number) => formatPercent(value, format),
  /** Docker's state names, worded for the screen; an unknown one shows as is. */
  containerState: (state: string) => CONTAINER_STATES[state] ?? state,

  common: {
    cancel: 'Cancel',
    back: 'Back',
    retry: 'Retry',
    close: 'Close',
    save: 'Save',
    edit: 'Edit',
    delete: 'Delete',
    copy: 'Copy',
    copied: 'Copied',
    loading: 'Loading…',
    unknownError: 'Unknown error.',
    unexpectedError: 'An unexpected error occurred.',
    all: 'All',
    running: 'Running',
    stopped: 'Stopped',
    used: 'Used',
    unused: 'Unused',
    noMatch: 'Nothing matches this filter.',
    noContainers: 'No containers',
    andMore: (count: number) => `and ${count} more`,
    show: (name: string) => `Show ${name}`,
    hide: (name: string) => `Hide ${name}`,
    deleteNamed: (name: string) => `Delete ${name}`,
    runningRatio: (running: number, total: number) => `${running}/${total} running`,
    actionFailed: 'Action failed',
    actionNotApplied: 'The action could not be applied.',
    deleteFailed: 'Delete failed',
    cleanupComplete: 'Cleanup complete',
    cleanupFailed: 'Cleanup failed',
    cannotOpenLink: 'Cannot open link',
    noAppForLink: 'No app can open this address.',
    signInAgain: 'Sign in again',
    /** Option of a cleanup sheet: what it targets, how many, how big. */
    pruneOption: (label: string, count: number, size: string | null, none: string) =>
      count === 0 ? `${label} · ${none}` : `${label} · ${count}${size ? ` · ${size}` : ''}`,
    /** Badge of an image or a volume card, apart for French genders. */
    usage: {
      image: { used: (count: number) => `used · ${count}`, unused: 'unused' },
      volume: { used: (count: number) => `used · ${count}`, unused: 'unused' },
    },
    typeToConfirm: 'To confirm, type ',
    typeToConfirmLabel: (phrase: string) => `Type ${phrase} to confirm`,
  },

  nav: {
    openMenu: 'Open menu',
    overview: 'Overview',
    containers: 'Containers',
    stacks: 'Stacks',
    images: 'Images',
    volumes: 'Volumes',
    environments: 'Environments',
    settings: 'Settings',
    notifications: 'Notifications',
    changelog: "What's new",
    certificates: 'HTTPS certificate',
    restoringSession: 'Restoring session…',
    noEnvironmentOpen: 'No environment open',
    environment: 'Environment',
    signOut: 'Sign out',
  },

  errors: {
    urlRequired: 'The instance URL is required.',
    timeout: 'The Portainer instance did not respond in time.',
    refusedOverHttps:
      'Connection refused. If the instance responds in a browser, the cause is ' +
      'almost always its TLS certificate: the system rejects a self-signed ' +
      'certificate, and the app has no way to accept it.',
    unreachable: 'Cannot reach the Portainer instance. Check the URL and the network.',
    unauthorized: 'Authentication refused: invalid or expired token.',
    forbidden: 'Access denied: this account has no rights on this resource.',
    notFound: 'Resource not found on this instance.',
    conflict: 'Conflict: the resource is already in that state.',
    http: (status: number) => `Portainer error (HTTP ${status}).`,
    sessionExpired: 'Session expired. Sign in again.',
    noSessionToken: 'Portainer replied without a session token.',
    invalidEndpoint: (id: string) => `Invalid environment id (${id}).`,
    imageInUse:
      'Image in use: a container, maybe a stopped one, still depends on it. Delete it first.',
    volumeInUse: 'Volume in use: a container, maybe a stopped one, still uses it. Delete it first.',
    emptyStackFile: 'The stack file is empty: Portainer would refuse the redeploy.',
  },

  login: {
    title: 'Sign in to Portainer',
    subtitle: "Credentials are stored in the device's secure keychain.",
    sessionExpired: 'Your session has expired. Sign in again to continue.',
    tokenRevoked: 'Portainer rejected the access token: it has probably been revoked.',
    instanceUrl: 'Instance URL',
    accessToken: 'Access token',
    credentials: 'Credentials',
    username: 'Username',
    password: 'Password',
    showInput: 'Show input',
    hideInput: 'Hide input',
    failed: 'Unable to sign in.',
    fixCertificate: 'Fix a certificate problem',
    submit: 'Sign in',
    legalBefore: 'By signing in, you accept the ',
    legalTerms: 'terms of use',
    legalMiddle: '. See also the ',
    legalPrivacy: 'privacy policy',
    legalAfter: '.',
    apiKeyHint:
      'Create an access token in Portainer › My account › Access tokens. It never expires and can be revoked on the server.',
    jwtHint:
      'Signing in with credentials opens a temporary JWT session; Portainer ends it after a few hours.',
  },

  notifications: {
    registrationFailed: 'Registration failed',
    copiedMessage: 'The token is on the clipboard.',
    intro:
      'Alerts are pushed by a service that watches the Docker event stream on your server. This screen provides the token that service needs to reach this device.',
    tokenTitle: "This device's token",
    allowToGetToken: "Allow notifications to get this device's token.",
    copyToken: 'Copy token',
    denied:
      'Notifications are turned off. Turn them back on in the system settings, then register again.',
    allow: 'Allow notifications',
    setup: 'Setup',
    steps: [
      'Deploy the watcher/ service on your server (see its README).',
      'Paste this token into its EXPO_PUSH_TOKENS variable.',
      'The service alerts you when a container crashes, turns unhealthy, restarts or runs out of memory.',
    ],
    footnote:
      'Remote notifications need a physical device and a compiled build of the app: they work neither in a simulator nor in Expo Go.',
    needsDevice:
      'Remote notifications need a physical device: APNs does not issue a token to a simulator.',
    expoGo:
      'Expo Go does not receive remote notifications. Install a compiled build of the app (dev build) to turn them on.',
    noProjectId: 'No EAS projectId in the configuration: run `eas init`, then rebuild the app.',
    channelName: 'Container alerts',
    stateChange: 'State change',
  },

  changelog: {
    allReleases: 'All releases on GitHub',
    version: (version: string) => `Version ${version}`,
    installed: 'Installed',
  },

  legal: {
    lastUpdated: (date: string) => `Last updated: ${date}`,
    /** Said where a text exists in English only; empty in English itself. */
    englishOnly: '',
  },

  endpoints: {
    loading: 'Loading environments…',
    empty: 'No environments',
    emptyHint: 'This account cannot access any environment on this instance.',
    online: 'Online',
    offline: 'Offline',
    localSocket: 'local socket',
    kubernetes: 'Kubernetes environment — not supported by the app.',
    snapshot: (running: number, stopped: number, imageCount: number) =>
      `${running} running · ${stopped} stopped · ${images(imageCount)}`,
    noSnapshot: 'No snapshot available',
  },

  overview: {
    loading: 'Loading environment…',
    atAGlance: 'At a glance',
    resources: 'Resources',
    diskSpace: 'Disk space',
    imageUpdates: 'Image updates',
    runningCaption: 'running',
    loadingCaption: 'loading…',
    noStacks: 'no stacks',
    partialStacks: (count: number) => `${count} partial`,
    stoppedStacks: (count: number) => `${count} stopped`,
    allRunning: 'all running',
    // Apart for images and volumes: French agrees them in gender.
    allImagesInUse: 'all in use',
    allVolumesInUse: 'all in use',
    unusedImages: (count: number) => `${count} unused`,
    unusedVolumes: (count: number) => `${count} unused`,
    allGood: 'All good',
    toCheck: (count: number) => `${containers(count)} to check`,
    allGoodHint: 'No container is unhealthy, stuck restarting or exited abnormally.',
    toCheckHint: 'Tap a container to see its logs and act on it.',
    problems: {
      unhealthy: 'Failing healthcheck',
      restarting: 'Restart loop',
      crashed: 'Exited abnormally',
      dead: 'Dead',
    } satisfies Record<ProblemKind, string>,
    healthTitle: 'Container health',
    healthy: 'Healthy',
    unhealthy: 'Unhealthy',
    noHealthcheck: 'No healthcheck',
    starting: (count: number) => `${count} starting, not checked yet.`,
    nothingToMeasure: 'No running containers: nothing to measure.',
    measuringUsage: 'Measuring usage…',
    cpu: 'CPU',
    cpuValue: (percent: string, cores: number) => `${percent} of ${plural(cores, 'core')}`,
    memory: 'Memory',
    topConsumers: 'Top consumers',
    resourcesFootnote:
      'A snapshot of the running containers. 100% for a container means one full core.',
    noResponse: (count: number) => `${containers(count)} did not respond.`,
    measuringDisk: 'Measuring disk usage…',
    usedByDocker: 'used by Docker',
    diskCategories: {
      images: 'Images',
      containers: 'Containers',
      volumes: 'Volumes',
      buildCache: 'Build cache',
    } satisfies Record<DiskCategoryKey, string>,
    reclaimable: (size: string) => `${size} reclaimable by removing what is no longer used.`,
    updatesUnsupported:
      "Portainer does not compare this environment's images with their registry. This check is part of Portainer Business, once the update indicator is turned on for the environment.",
    comparing: 'Comparing with registries…',
    allUpToDate: 'All images are up to date',
    toUpdate: (count: number) => `${images(count)} to update`,
    seeWhich: 'See which images',
    dataUnavailable: 'Data unavailable.',
  },

  containers: {
    loading: 'Loading containers…',
    filterPlaceholder: 'Filter by name or image',
    summary: (shown: number, stacks: number) =>
      `${containers(shown)}${stacks > 0 ? ` · ${plural(stacks, 'stack')}` : ''}`,
    noStack: 'No stack',
    stackActions: (title: string) => `Actions for the ${title} stack`,
  },

  container: {
    loading: 'Loading container…',
    actions: CONTAINER_ACTIONS,
    confirmTitle: (action: ContainerAction) => `${CONTAINER_ACTIONS[action]} container?`,
    impact: (action: ContainerAction, name: string) => {
      if (action === 'restart') return `${name} will restart and be briefly unavailable.`;
      if (action === 'stop') return `${name} will stay stopped until it is started again.`;
      if (action === 'pause') return `${name} will not respond until it is resumed.`;
      if (action === 'kill') {
        return (
          `${name} will be stopped immediately, with no chance to shut down cleanly: ` +
          'writes in progress may be lost.'
        );
      }
      return '';
    },
    moreActions: 'More actions',
    health: (status: string) => `health: ${status}`,
    updateImage: 'Update image',
    pulling: 'Pulling the image and recreating the container… This can take several minutes.',
    blockers: {
      portainer: 'Portainer cannot recreate its own container: update it from the host.',
      swarm: 'This container belongs to a Swarm service: update the service instead.',
      autoRemove: 'This container removes itself when it stops (--rm): it cannot be recreated.',
      untagged: 'The image has no tag: there is nothing to pull from a registry.',
    } satisfies Record<UpdateBlocker, string>,
    id: 'ID',
    created: 'Created',
    started: 'Started',
    exitCode: 'Exit code',
    restartPolicy: 'Restart policy',
    network: 'Network',
    envVariables: 'Env. variables',
    volumes: 'Volumes',
    deleteNotApplied: 'The container could not be deleted.',
    imageUpdated: 'Image updated',
    imageUpdatedMessage: (name: string) => `${name} was recreated with the latest image.`,
    updateFailed: 'Update failed',
    recreateNotApplied: 'The container could not be recreated.',
    deleteTitle: 'Delete container?',
    removal: (name: string, running: boolean) =>
      (running ? `${name} will be stopped, then deleted. ` : `${name} will be deleted. `) +
      'Anything not in a volume is lost; it will have to be recreated to run again.',
    alsoVolumes: 'Also delete its anonymous volumes',
    namedVolumesKept: 'Named volumes are always kept.',
    updateTitle: 'Update image?',
    update: 'Update',
    updateMessage: (name: string, image: string) =>
      `Portainer will pull the latest version of ${image}, then delete ${name} ` +
      'and recreate it with the same configuration. Any data not kept in a volume ' +
      'will be lost.',
    menu: {
      pause: {
        label: 'Pause',
        hint: 'Freezes its processes without stopping them: it stops responding until resumed.',
      },
      unpause: { label: 'Resume', hint: 'Restarts its processes where they were frozen.' },
      kill: {
        label: 'Kill',
        hint: 'Stops it at once, without letting the application shut down cleanly.',
      },
      remove: { label: 'Delete container', hint: 'Its named volumes are kept.' },
    } satisfies Record<SecondaryAction, { label: string; hint: string }>,
    imageStatus: {
      updated: 'Image up to date',
      outdated: 'Image update available',
      processing: 'Checking image…',
      unknown: 'Image status unknown',
    } satisfies Record<ImageStatus, string>,
  },

  logs: {
    show: 'Show logs',
    title: 'Logs',
    shareTitle: (name: string) => `Logs for ${name}`,
    sharingFailed: 'Sharing failed',
    notShared: 'The logs could not be shared.',
    status: (lines: number, live: boolean) => `${plural(lines, 'line')}${live ? ' · live' : ''}`,
    unavailable: 'Logs unavailable.',
    empty: 'No output in this range.',
    truncated: (shown: number) =>
      `Showing the last ${shown} lines: switch to full screen to read them all.`,
    fullscreenTitle: (name: string) => `Logs · ${name}`,
    follow: 'Follow live',
    timestamps: 'Show timestamps',
    copy: 'Copy logs',
    copied: 'Logs copied',
    share: 'Share logs',
    fullscreen: 'Full screen',
    exitFullscreen: 'Exit full screen',
    ranges: {
      'tail-100': '100 lines',
      'tail-500': '500 lines',
      'tail-2000': '2,000 lines',
      'since-15m': '15 min',
      'since-1h': '1 h',
      'since-24h': '24 h',
    } satisfies Record<LogRangeKey, string>,
  },

  stacks: {
    loading: 'Loading stacks…',
    filterPlaceholder: 'Filter by name',
    summary: (total: number, managed: number, external: number) =>
      `${plural(total, 'stack')} · ${managed} managed by Portainer` +
      (external > 0 ? ` · ${external} external` : ''),
    detailsUnavailable: (message: string) => `Portainer details unavailable: ${message}`,
    unknownError: 'unknown error',
    empty: 'No stacks',
    kinds: {
      compose: 'Compose',
      swarm: 'Swarm',
      external: 'External',
    } satisfies Record<StackKind, string>,
    outsidePortainer: 'Deployed outside Portainer',
    origin: (date: string | null, user: string) =>
      [date ? `Created ${date}` : '', user ? `by ${user}` : ''].filter(Boolean).join(' ') ||
      'Managed by Portainer',
    git: (reference: string, interval?: string) =>
      `Git · ${reference}${interval ? ` · auto update every ${interval}` : ''}`,
    result: (action: StackAction, succeeded: number, failed: number) => {
      const verb = action === 'start' ? 'started' : 'stopped';
      return failed === 0
        ? `${containers(succeeded)} ${verb}.`
        : `${containers(succeeded)} ${verb}, ${failed} failed.`;
    },
    startStack: 'Start stack',
    stopStack: 'Stop stack',
    confirmTitle: (action: StackAction): string =>
      action === 'start' ? 'Start stack?' : 'Stop stack?',
    actions: { start: 'Start', stop: 'Stop' } satisfies Record<StackAction, string>,
    sheetSummary: (running: number, total: number) =>
      `${running}/${total} running · ${containers(total)}`,
    impact: (action: StackAction, total: number, title: string) => {
      const verb = action === 'start' ? 'started' : 'stopped';
      return total > 1
        ? `All ${total} containers of the ${title} stack will be ${verb}, including those hidden by a filter.`
        : `The container of the ${title} stack will be ${verb}.`;
    },
    imageStatus: {
      updated: 'Images up to date',
      outdated: 'Image update available',
      processing: 'Checking images…',
      unknown: 'Image status unknown',
    } satisfies Record<ImageStatus, string>,
  },

  stack: {
    loading: 'Loading stack…',
    notFound: 'Stack not found',
    notFoundHint: 'It may have been deleted, or its containers are gone.',
    redeployed: 'Stack redeployed',
    redeployedMessage: (name: string) => `${name} was redeployed.`,
    redeployFailed: 'Redeploy failed',
    redeployNotApplied: 'The stack could not be redeployed.',
    externalNote: 'Stack deployed outside Portainer: only its containers are known.',
    startStop: 'Start / stop',
    redeploy: 'Redeploy',
    redeploying: 'Redeploying… Pulling images can take several minutes.',
    type: 'Type',
    portainerStatus: 'Portainer status',
    active: 'Active',
    inactive: 'Inactive',
    created: 'Created',
    by: 'By',
    updated: 'Updated',
    file: 'File',
    gitRepository: 'Git repository',
    reference: 'Reference',
    autoUpdate: 'Auto update',
    autoUpdateEvery: (interval: string) => `Every ${interval}`,
    autoUpdateByWebhook: 'By webhook',
    webhook: 'Webhook',
    yes: 'Yes',
    no: 'No',
    envTitle: 'Environment variables',
    noVariables: 'No variables defined in Portainer.',
    containers: 'Containers',
    saveTitle: 'Save and redeploy?',
    saveConfirm: 'Save and redeploy',
    /** Names, not values: a changed password shouldn't be echoed back on screen. */
    envChange: (diff: EnvDiff) => {
      const parts = [
        diff.added.length ? `Added: ${diff.added.join(', ')}.` : '',
        diff.changed.length ? `Changed: ${diff.changed.join(', ')}.` : '',
        diff.removed.length ? `Removed: ${diff.removed.join(', ')}.` : '',
      ].filter(Boolean);
      const summary = parts.length ? parts.join(' ') : 'No variable changed.';
      return `${summary} The stack will be redeployed to apply them: the affected containers will be recreated.`;
    },
    namePlaceholder: 'NAME',
    valuePlaceholder: 'value',
    nameLabel: 'Variable name',
    valueOf: (name: string) => `Value of ${name || 'the variable'}`,
    removeVariable: (name: string) => `Remove ${name || 'the variable'}`,
    addVariable: '+ Add a variable',
    envError: (error: EnvError) =>
      error.kind === 'required'
        ? 'Name required.'
        : error.kind === 'invalid'
          ? 'Letters, digits and _ only, not starting with a digit.'
          : `${error.name} is already defined above.`,
    showFile: 'Show Compose file',
    fileTitle: 'Compose file',
    hideSecrets: 'Hide secrets',
    revealSecrets: (count: number) => `Reveal secrets (${count})`,
    fileUnavailable: 'File unavailable.',
    emptyFile: 'Empty file.',
    hideFile: 'Hide Compose file',
    redeployTitle: (name: string) => `Redeploy ${name}`,
    redeployGit: (branch: string) =>
      `Fetches the latest version of ${branch}, then recreates the services that changed.`,
    redeployFile: 'Recreates the services from the compose file stored in Portainer.',
    trackedBranch: 'the tracked branch',
    updateFromGit: 'Update from Git',
    gitWithImages: 'From Git, with the latest images',
    pullAndRedeploy: 'Pull images and redeploy',
    redeployConfirmTitle: (name: string) => `Redeploy ${name}?`,
    redeployImpact: (pullImages: boolean) =>
      'The affected containers will be recreated: the service is briefly interrupted, and ' +
      'anything not in a volume is lost.' +
      (pullImages ? ' Pulling images can take several minutes.' : ''),
  },

  images: {
    loading: 'Loading images…',
    deleteNotApplied: 'The image could not be deleted.',
    pruneNotApplied: 'The images could not be deleted.',
    summary: (total: number, unused: number, reclaimable: string | null) =>
      `${images(total)} · ${unused} unused${reclaimable ? ` · ${reclaimable} reclaimable` : ''}`,
    cleanUp: 'Clean up images',
    // Apart from the shared filters: French agrees them with "image", feminine.
    filters: { all: 'All', used: 'Used', unused: 'Unused', outdated: 'Outdated' },
    none: 'none',
    allUpToDate: 'All images are up to date',
    empty: 'No images',
    deleteTitle: 'Delete image?',
    deleteConfirm: 'Delete image',
    removal: (label: string, size: string, tags: number) =>
      `${label} (${size}) will be removed from the environment` +
      (tags > 1 ? `, along with its ${tags} tags. ` : '. ') +
      'It will have to be pulled again to be reused.',
    noneDeleted: 'No image was deleted.',
    deleted: (count: number, freed: string) => `${images(count)} deleted · ${freed} freed.`,
    newVersion: 'New version available',
    dangling: 'Untagged image (dangling)',
    tags: (count: number) => `${count} tags`,
    scopes: {
      dangling: 'Untagged images',
      unused: 'All unused images',
    } satisfies Record<ImagePruneScope, string>,
    pruneMessage: 'Only images that no container uses, even a stopped one, are deleted.',
    pruneTitle: (count: number) => (count > 1 ? `Delete ${count} images?` : 'Delete image?'),
    pruneImpact: (scope: ImagePruneScope) =>
      scope === 'dangling'
        ? 'Untagged images, left over from builds or updates, will be deleted.'
        : 'All unused images will be deleted, tagged ones included. ' +
          'They will have to be pulled again to create a container from them.',
    pruneConfirm: 'Clean up',
  },

  volumes: {
    loading: 'Loading volumes…',
    deleteNotApplied: 'The volume could not be deleted.',
    pruneNotApplied: 'The volumes could not be deleted.',
    summary: (total: number, unused: number, reclaimable: string | null) =>
      `${volumes(total)} · ${unused} unused${reclaimable ? ` · ${reclaimable} reclaimable` : ''}`,
    cleanUp: 'Clean up volumes',
    none: 'none',
    empty: 'No volumes',
    deleteTitle: 'Delete volume?',
    deletePermanently: 'Delete permanently',
    /** Typed to confirm deleting a volume whose name is unreadable. */
    confirmWord: 'delete',
    removal: (name: string, size: string | null) =>
      `${name}${size ? ` (${size})` : ''} and all its ` +
      'data will be permanently deleted. There is no way to recover it.',
    /**
     * Docker decides on its side what is unused: a gap with the preview means
     * the list was stale, worth saying rather than hiding.
     */
    deleted: (deleted: number, expected: number, freed: string | null) => {
      if (deleted === 0) return 'No volume was deleted.';
      const gap = deleted !== expected ? ` (${expected} expected)` : '';
      return `${volumes(deleted)} deleted${freed ? ` · ${freed} freed` : ''}${gap}.`;
    },
    anonymous: 'anonymous',
    scopes: {
      anonymous: 'Anonymous volumes',
      all: 'All unused volumes',
    } satisfies Record<VolumePruneScope, string>,
    pruneMessage:
      'Only volumes that no container uses, even a stopped one, are deleted. Their data is lost for good.',
    oldEngine:
      'This Docker engine, older than version 23, cannot limit the cleanup to anonymous volumes: only the full cleanup is offered.',
    pruneTitle: (count: number) => (count > 1 ? `Delete ${count} volumes?` : 'Delete volume?'),
    pruneImpact: {
      anonymous: 'Unused anonymous volumes and their data will be permanently deleted.',
      all: 'All unused volumes, named ones included, will be deleted along with their data. There is no way to recover it.',
    } satisfies Record<VolumePruneScope, string>,
  },

  certificates: CERTIFICATE_HELP_EN,

  settings: {
    appearance: 'Appearance',
    appearances: {
      system: 'Same as device',
      light: 'Light',
      dark: 'Dark',
    } satisfies Record<Appearance, string>,
    language: 'Language',
    refresh: 'Refresh',
    refreshHint:
      'The container list updates on its own. A longer interval saves battery and mobile data; in manual mode, pull the list down to refresh it.',
    interval: (ms: number | null) =>
      ms === null ? 'Manual' : ms === 60_000 ? 'Every minute' : `Every ${ms / 1000} seconds`,
    notifications: 'Notifications',
    alerts: 'Alerts for your containers',
    alertsHint: 'The token your monitoring service needs',
    help: 'Help',
    reportProblem: 'Report a problem',
    reportProblemHint:
      'Opens GitHub with the version and device pre-filled — nothing about your instance',
    certificate: 'HTTPS certificate',
    certificateHint: 'Get this phone to trust a self-signed or private certificate',
    sourceCode: 'Source code',
    about: 'About',
    whatsNew: "What's new",
    version: (version: string) => `Version ${version}`,
    terms: 'Terms of use',
    privacy: 'Privacy policy',
  },
};

export type Strings = typeof en;
