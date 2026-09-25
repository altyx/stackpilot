/** Types for the Portainer API and the Docker API exposed through its proxy. */

export type AuthMode = 'apiKey' | 'jwt';

export interface Session {
  /** Instance base URL, without the `/api` suffix (e.g. https://portainer.lan:9443). */
  baseUrl: string;
  mode: AuthMode;
  /** `ptr_...` access token in apiKey mode, JWT in jwt mode. */
  token: string;
  /** Set in jwt mode only, for display purposes. */
  username?: string;
}

export interface PortainerStatus {
  Version: string;
  InstanceID?: string;
}

/** Portainer environment types (`EndpointType`). */
export enum EndpointType {
  DockerLocal = 1,
  DockerAgent = 2,
  Azure = 3,
  DockerEdgeAgent = 4,
  KubernetesLocal = 5,
  KubernetesAgent = 6,
  KubernetesEdgeAgent = 7,
}

export interface Endpoint {
  Id: number;
  Name: string;
  Type: EndpointType;
  URL: string;
  GroupId?: number;
  Status: number; // 1 = up, 2 = down
  Snapshots?: DockerSnapshot[];
  /**
   * "Image up to date indicator" toggle, set per environment. Only exists in
   * Business Edition: the field is absent from Community Edition payloads.
   */
  EnableImageNotification?: boolean;
}

export interface DockerSnapshot {
  DockerVersion?: string;
  RunningContainerCount?: number;
  StoppedContainerCount?: number;
  HealthyContainerCount?: number;
  UnhealthyContainerCount?: number;
  ImageCount?: number;
  VolumeCount?: number;
  StackCount?: number;
  TotalCPU?: number;
  TotalMemory?: number;
}

export type ContainerState =
  'created' | 'running' | 'paused' | 'restarting' | 'removing' | 'exited' | 'dead';

export interface ContainerPort {
  IP?: string;
  PrivatePort: number;
  PublicPort?: number;
  Type: string;
}

export interface ContainerMount {
  Type: string;
  /** Set only for `volume`-type mounts. */
  Name?: string;
  Source: string;
  Destination: string;
  RW: boolean;
}

/** Item from `GET /containers/json`. */
export interface ContainerSummary {
  Id: string;
  Names: string[];
  Image: string;
  ImageID: string;
  Command: string;
  Created: number;
  State: ContainerState;
  Status: string;
  Ports: ContainerPort[];
  Labels: Record<string, string>;
  Mounts?: ContainerMount[];
}

/** Item from `GET /images/json`. */
export interface ImageSummary {
  Id: string;
  ParentId: string;
  RepoTags: string[] | null;
  RepoDigests: string[] | null;
  Created: number;
  Size: number;
  SharedSize: number;
  Labels: Record<string, string> | null;
}

/** Item from `DELETE /images/{id}`: one entry per tag removed or layer deleted. */
export interface ImageDeleteItem {
  Untagged?: string;
  Deleted?: string;
}

/** Response from `POST /images/prune`. */
export interface ImagePruneResponse {
  ImagesDeleted: ImageDeleteItem[] | null;
  SpaceReclaimed: number;
}

/** Outcome of an image cleanup, with Docker's `null` turned into a list. */
export interface ImagePruneResult {
  deleted: ImageDeleteItem[];
  spaceReclaimed: number;
}

/**
 * Scope of an image cleanup, mirroring `docker image prune`: untagged images
 * only, or every image no container references (`--all`).
 */
export type ImagePruneScope = 'dangling' | 'unused';

/** Item from `GET /volumes`. */
export interface VolumeSummary {
  Name: string;
  Driver: string;
  Mountpoint: string;
  CreatedAt?: string;
  Scope: string;
  Labels: Record<string, string> | null;
  Options: Record<string, string> | null;
}

export interface VolumeListResponse {
  Volumes: VolumeSummary[] | null;
  Warnings: string[] | null;
}

/** Subset of `GET /containers/{id}/json` used by the app. */
export interface ContainerInspect {
  Id: string;
  Name: string;
  Created: string;
  Image: string;
  State: {
    Status: ContainerState;
    Running: boolean;
    Paused: boolean;
    Restarting: boolean;
    ExitCode: number;
    StartedAt: string;
    FinishedAt: string;
    Health?: { Status: string; FailingStreak: number };
  };
  Config: {
    Image: string;
    Env: string[] | null;
    Cmd: string[] | null;
    Labels: Record<string, string>;
  };
  HostConfig: {
    RestartPolicy?: { Name: string; MaximumRetryCount: number };
    NetworkMode?: string;
    AutoRemove?: boolean;
  };
  Mounts: {
    Type: string;
    Source: string;
    Destination: string;
    RW: boolean;
  }[];
  NetworkSettings: {
    Networks: Record<string, { IPAddress: string; Gateway: string }>;
  };
  /** Added by Portainer's proxy on the container running Portainer itself. */
  IsPortainer?: boolean;
}

/**
 * Whether a container's image matches the one in its registry, as reported
 * by Portainer's "image up to date indicator" (Business Edition).
 */
export type ImageStatus = 'updated' | 'outdated' | 'processing' | 'unknown';

/** Payload of `GET /docker/{env}/containers/{id}/image_status`. */
export interface ImageStatusResponse {
  Status: string;
  Message?: string;
}

export type ContainerAction = 'start' | 'stop' | 'restart' | 'pause' | 'unpause' | 'kill';

/** How Portainer deploys a stack (`StackType`). */
export enum StackType {
  DockerSwarm = 1,
  DockerCompose = 2,
  Kubernetes = 3,
}

/** Whether Portainer considers the stack deployed (`StackStatus`). */
export enum StackStatus {
  Active = 1,
  Inactive = 2,
}

export interface StackEnv {
  name: string;
  value: string;
}

export interface StackGitConfig {
  URL: string;
  ReferenceName: string;
  ConfigFilePath: string;
}

export interface StackAutoUpdate {
  /** Polling interval such as `5m`, empty when only the webhook triggers. */
  Interval?: string;
  Webhook?: string;
  ForceUpdate?: boolean;
  ForcePullImage?: boolean;
}

/**
 * Stack recorded by Portainer (`GET /stacks`). Stacks deployed outside
 * Portainer only exist as Compose labels on their containers.
 */
export interface PortainerStack {
  Id: number;
  Name: string;
  Type: StackType;
  EndpointId: number;
  SwarmId?: string;
  EntryPoint: string;
  Env: StackEnv[] | null;
  Status: StackStatus;
  /** Unix seconds; 0 when unknown. */
  CreationDate: number;
  CreatedBy: string;
  UpdateDate: number;
  UpdatedBy: string;
  GitConfig?: StackGitConfig | null;
  AutoUpdate?: StackAutoUpdate | null;
  Webhook?: string;
  FromAppTemplate?: boolean;
}

/** Payload of `GET /stacks/{id}/file`. */
export interface StackFile {
  StackFileContent: string;
}

/** Grouped actions offered at the stack level. */
export type StackAction = Extract<ContainerAction, 'start' | 'stop'>;
